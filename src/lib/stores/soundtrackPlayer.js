import { derived, get } from "svelte/store";
import { view, detailGame, homeFeaturedGame } from "./ui.js";
import { soundtrack } from "./soundtrackOverrides.js";
import { audioUrl } from "../util/asset.js";
import { session } from "./playsession.js";

/*
 * Reproduce en loop el soundtrack del juego "activo": el que se ve en
 * Detalle si está abierto, o si no, el destacado/enfocado en Inicio
 * (solo mientras la vista activa sea "home"). Al abrir el Detalle desde una
 * tarjeta de Inicio, ambos coinciden en el mismo juego (Home sigue montado
 * debajo del Detalle) — la reproducción continúa sin cortes en ambos
 * sentidos gracias al guard de "mismo juego/ruta" de abajo.
 */
const activeGame = derived(
  [detailGame, view, homeFeaturedGame],
  ([$detailGame, $view, $homeFeaturedGame]) =>
    $detailGame || ($view === "home" ? $homeFeaturedGame : null)
);

let audioEl = null;
let currentGameId = null;
let currentPath = null;

function stop() {
  if (audioEl) {
    audioEl.pause();
    audioEl.src = "";
    audioEl = null;
  }
  currentPath = null;
}

export function initSoundtrackPlayer() {
  activeGame.subscribe(async (game) => {
    const entry = game ? get(soundtrack)[game.id] : null;
    const path = entry?.path || null;

    if (!path) {
      stop();
      currentGameId = null;
      return;
    }
    if (game.id === currentGameId && path === currentPath) {
      if (audioEl) audioEl.volume = entry.volume ?? 1;
      return;
    }
    stop();
    currentGameId = game.id;
    currentPath = path;
    const url = await audioUrl(path);
    // El juego/ruta activos pudieron cambiar mientras se resolvía la URL.
    if (currentGameId !== game.id || currentPath !== path) return;
    if (!url) return;
    audioEl = new Audio(url);
    audioEl.loop = true;
    audioEl.volume = entry.volume ?? 1;
    audioEl.play().catch(() => {});
  });

  // Ajustar volumen (o detener si se quita el path) sin esperar a que
  // cambie el juego activo, p. ej. mientras se mueve el slider en vivo.
  soundtrack.subscribe((map) => {
    if (!currentGameId) return;
    const entry = map[currentGameId];
    if (!entry?.path) {
      stop();
      currentGameId = null;
      return;
    }
    if (entry.path === currentPath && audioEl) audioEl.volume = entry.volume ?? 1;
  });

  // Al lanzar un juego el launcher se suspende (ver stores/playsession.js) para
  // no consumir recursos mientras se juega; el soundtrack se pausa para no
  // interferir con el audio del juego en ejecución, y se retoma donde iba al
  // volver (no se reinicia).
  session.subscribe((s) => {
    if (s) {
      audioEl?.pause();
    } else if (audioEl) {
      audioEl.play().catch(() => {});
    }
  });
}
