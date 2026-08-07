import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { loadGames } from "./games.js";
import { recordPlay } from "./playtimes.js";
import { syncNow } from "./steamAccount.js";
import { launchGame, focusGame, isTauri, steamOpenInstall } from "../ipc/index.js";
import { onRawButton } from "../input/index.js";
import { showToast, reportError } from "./ui.js";
import {
  isFullscreen,
  minimizeWindow,
  unminimizeAndFocus,
  enterFullscreenIf,
} from "../util/window.js";

/*
 * Sesión "en juego" (F3): al lanzar, el launcher se suspende (minimiza) y bloquea
 * el input (ver App.svelte + PlayingOverlay); al cerrarse el juego (evento
 * `gm://game-ended` del backend) o al pulsar el botón de volver, se restaura.
 */

export const session = writable(null); // { game } | null

// Config del botón de "volver al launcher" (persistente).
const DEFAULT_PLAY = { returnButton: "guide", returnMode: "press", holdMs: 800 };
export const playConfig = writable({ ...DEFAULT_PLAY });

let wasFullscreen = false;
let holdTimer = null;

export async function initPlaySession() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.play) playConfig.set({ ...DEFAULT_PLAY, ...cfg.play });

  // Botón de volver (pulsar / mantener) vía eventos crudos de mando.
  onRawButton((name, pressed) => {
    if (!get(session)) return;
    const { returnButton, returnMode, holdMs } = get(playConfig);
    if (name !== returnButton) return;
    if (pressed) {
      if (returnMode === "hold") {
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => endPlay(), holdMs);
      } else {
        endPlay();
      }
    } else {
      clearTimeout(holdTimer); // soltó antes de completar el "mantener"
      holdTimer = null;
    }
  });

  // Respaldo de teclado (dev, sin mando): tecla "g" = volver (modo pulsar).
  window.addEventListener("keydown", (e) => {
    if (get(session) && e.key === "g") endPlay();
  });

  // Fin del juego detectado por el backend → restaurar.
  if (isTauri) {
    try {
      const { listen } = await import("@tauri-apps/api/event");
      await listen("gm://game-ended", () => endPlay());
    } catch (err) {
      reportError(err, "playsession:listen");
    }
  }
}

export async function startPlay(game) {
  // Ya jugando → traer la instancia al frente en vez de relanzar.
  if (get(session)) {
    await focusGame();
    return;
  }
  try {
    wasFullscreen = await isFullscreen();
    recordPlay(game.id); // aparece en "Reciente" al instante
    session.set({ game }); // overlay + bloqueo de input inmediatos
    await launchGame(game.id, game.launchTarget, game.installDir);
    await minimizeWindow();
  } catch (e) {
    reportError(e, "playsession:startPlay");
    // Si falla el lanzamiento, no dejar el launcher atascado en reposo.
    await endPlay();
  }
}

// Abrir Steam para instalar un "fantasma" (Fase 9, ver docs/accounts.md) usa
// la MISMA suspensión que un juego real (overlay + bloqueo de input) — sin
// esto, el poll de XInput suplementario (fix/control-input) sigue leyendo el
// mando sin importar qué ventana tenga el foco: al confirmar la instalación
// con el control, ese mismo botón le llegaba TAMBIÉN a GM en segundo plano y
// disparaba downloadFromSteam() de nuevo, reabriendo la misma página de Steam.
// No usa launchGame (no hay installDir que vigilar, el juego no está
// instalado todavía) — el regreso es manual, igual que cualquier juego sin
// vigía de proceso resuelto (mantener el botón de volver).
export async function startSteamDownload(game, appid) {
  if (get(session)) {
    await focusGame();
    return;
  }
  try {
    wasFullscreen = await isFullscreen();
    session.set({ game, mode: "steam-download" });
    await steamOpenInstall(appid);
    await minimizeWindow();
  } catch (e) {
    reportError(e, "playsession:startSteamDownload");
    await endPlay();
  }
}

export async function endPlay() {
  const s = get(session);
  if (!s) return;
  clearTimeout(holdTimer);
  holdTimer = null;
  session.set(null);
  await unminimizeAndFocus();
  await enterFullscreenIf(wasFullscreen);
  // Al volver del juego, refrescar la biblioteca para reflejar el nuevo
  // "última vez jugado" (Steam actualiza el ACF al cerrar) → Inicio se reordena.
  loadGames().catch((e) => reportError(e, "playsession:reload"));
  // Si se jugó un juego de Steam, sincronizar logros en segundo plano por si
  // se desbloqueó alguno — silenciosa (sin toasts) y sin `await`: syncNow()
  // ya atrapa sus propios errores, no debe demorar la restauración de arriba.
  if (s.game?.store === "steam") syncNow({ silent: true });
}

export async function updatePlayConfig(patch) {
  playConfig.update((c) => ({ ...c, ...patch }));
  await patchAppConfig({ play: get(playConfig) });
  showToast("Preferencia guardada");
}
