import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { loadGames } from "./games.js";
import { session } from "./playsession.js";
import { isTauri } from "../ipc/index.js";
import { showToast, reportError } from "./ui.js";
import { tr } from "../i18n/index.js";

/*
 * Refresco de carátulas/metadatos de Steam (ver feature-imagenes.md, Fase 1).
 *
 * El arte de Steam se resuelve una sola vez (SteamSource lee rutas locales,
 * fillMissingSteamArt/mergeSteamGhosts fijan URLs deterministas del CDN) y
 * nunca se vuelve a mirar, aunque Steam actualice el arte detrás de esa misma
 * ruta/URL — hay dos cachés de por medio (el `Map` de util/asset.js, sin TTL,
 * y la caché HTTP de la WebView para las URLs del CDN). `bustPath()`
 * (util/asset.js) invalida ambas colando un número en la ruta; este store es
 * quien decide CUÁNDO subir ese número y lo persiste, para que sobreviva a un
 * reinicio (si no, la URL volvería a su forma sin bust y la WebView serviría
 * otra vez la copia vieja).
 *
 * Slice `artRefresh` de config.json: { lastCheckAt, all, byGame }.
 *   - lastCheckAt: epoch (s) de la última revisión automática (no toca la UI).
 *   - all: bust global — sube en un refresco de TODA la biblioteca.
 *   - byGame: { [gameId]: bust } — sube en un refresco puntual (un solo juego).
 * El bust EFECTIVO de un juego es max(all, byGame[id] ?? 0) — ver
 * stores/artoverrides.js::bustedArt().
 */

const DEFAULTS = { lastCheckAt: 0, all: 0, byGame: {} };
const WEEK_SECS = 7 * 24 * 3600;
const CHECK_INTERVAL_MS = 6 * 3600 * 1000; // cada 6h mientras la app siga abierta

export const artBust = writable({ all: 0, byGame: {} });

let lastCheckAt = 0;

export async function initArtRefresh() {
  const cfg = await loadAppConfig();
  const s = { ...DEFAULTS, ...(cfg?.artRefresh || {}) };
  lastCheckAt = s.lastCheckAt;
  artBust.set({ all: s.all, byGame: s.byGame });
}

async function persist(patch) {
  await patchAppConfig({ artRefresh: { lastCheckAt, ...get(artBust), ...patch } });
}

// Refresco de TODA la biblioteca — botón manual (a futuro) o revisión
// automática semanal. No descarga nada por sí mismo: solo invalida el bust y
// recarga la lista de juegos; las imágenes se vuelven a pedir de forma
// perezosa, cuando un componente visible las necesite (ver util/asset.js).
export async function refreshArt({ silent = false } = {}) {
  if (!isTauri) return;
  const now = Math.floor(Date.now() / 1000);
  // Un bust global más nuevo ya cubre cualquier bust puntual anterior — se
  // vacía byGame para no acumular entradas muertas en config.json para
  // siempre.
  artBust.set({ all: now, byGame: {} });
  await persist({ all: now, byGame: {} });
  try {
    await loadGames();
    console.log("[gm:art] biblioteca reimportada");
    if (!silent) showToast(tr("art.toast.refreshed"));
  } catch (e) {
    reportError(e, "artRefresh:refreshArt");
  }
}

// Refresco de UN juego — botón del Detalle (GameDetail.svelte).
export async function refreshGameArt(gameId) {
  if (!isTauri) return;
  const now = Math.floor(Date.now() / 1000);
  artBust.update((b) => ({ ...b, byGame: { ...b.byGame, [gameId]: now } }));
  await persist({ byGame: get(artBust).byGame });
  try {
    await loadGames();
  } catch (e) {
    reportError(e, "artRefresh:refreshGameArt");
  }
}

// Revisión automática silenciosa: se llama al arrancar y luego cada 6h
// (startArtRefreshTimer) mientras la app siga abierta, pero solo actúa si ya
// pasó una semana desde la última vez — cubre tanto "la app se reinicia
// seguido" como "el PC de la sala nunca se apaga". Se salta mientras hay una
// partida en curso (mismo criterio que las sync automáticas de Steam) para no
// competir por recursos justo cuando importa más.
export async function maybeRefreshArt() {
  if (!isTauri) return;
  if (get(session)) return;
  const now = Math.floor(Date.now() / 1000);
  if (now - lastCheckAt < WEEK_SECS) return;
  lastCheckAt = now;
  await persist({ lastCheckAt: now });
  await refreshArt({ silent: true });
}

export function startArtRefreshTimer() {
  const timer = setInterval(() => {
    maybeRefreshArt();
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(timer);
}
