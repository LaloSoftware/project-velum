import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { audioUrl } from "../util/asset.js";
import { scanAlbum } from "../ipc/index.js";

/*
 * Reproductor de música (biblioteca personal, Multimedia → Música) — store
 * driver sin componente propio, mismo espíritu que soundtrackPlayer.js pero
 * con una cola real (álbum/playlist) en vez de "loop del juego enfocado".
 * Sigue sonando aunque se navegue fuera de Multimedia (ver
 * docs/theming.md o el plan del módulo para el diseño completo).
 *
 * Solo `volume` persiste (patchAppConfig); cola/shuffle/posición son de
 * sesión — evita depender de autoplay al arrancar, que las políticas de
 * autoplay del WebView pueden bloquear sin gesto de usuario.
 */

const DEFAULT_STATE = {
  current: null, // {path, title, albumId, albumName} | null
  queue: [], // [{path, title, albumId, albumName}]
  index: -1,
  shuffleOrder: null, // number[] | null — permutación de índices de queue
  shuffle: false,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  source: null, // {type: "album"|"playlist", id} | null
};

export const musicPlayer = writable({ ...DEFAULT_STATE });

let audioEl = null;
let currentPath = null;
let _volumeLoaded = false;

// Fisher–Yates, con `keepFirst` (índice de la pista de arranque) forzado a la
// posición 0 del orden — así "reproducir álbum aleatorio" sigue empezando
// por la pista elegida en vez de una cualquiera.
function shuffledIndices(n, keepFirst) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (keepFirst != null) {
    const pos = idx.indexOf(keepFirst);
    if (pos > 0) [idx[0], idx[pos]] = [idx[pos], idx[0]];
  }
  return idx;
}

function playOrder(s) {
  return s.shuffle && s.shuffleOrder ? s.shuffleOrder : s.queue.map((_, i) => i);
}

function ensureAudioEl() {
  if (audioEl) return audioEl;
  audioEl = new Audio();
  audioEl.loop = false;
  audioEl.addEventListener("ended", () => next());
  audioEl.addEventListener("timeupdate", () => {
    musicPlayer.update((s) => ({ ...s, currentTime: audioEl.currentTime || 0 }));
  });
  audioEl.addEventListener("loadedmetadata", () => {
    musicPlayer.update((s) => ({ ...s, duration: audioEl.duration || 0 }));
  });
  return audioEl;
}

// Resuelve y reproduce `track` — guard de "misma pista" para no reiniciar en
// llamadas redundantes (mismo criterio que soundtrackPlayer.js).
async function loadAndPlay(track) {
  const el = ensureAudioEl();
  if (!track) {
    el.pause();
    el.src = "";
    currentPath = null;
    musicPlayer.update((s) => ({ ...s, current: null, playing: false, currentTime: 0, duration: 0 }));
    return;
  }
  if (track.path === currentPath) {
    el.play().catch(() => {});
    musicPlayer.update((s) => ({ ...s, playing: true }));
    return;
  }
  currentPath = track.path;
  musicPlayer.update((s) => ({ ...s, current: track, playing: false, currentTime: 0, duration: 0 }));
  const url = await audioUrl(track.path);
  if (currentPath !== track.path) return; // cambió mientras resolvía la URL
  if (!url) return;
  el.src = url;
  el.volume = get(musicPlayer).volume ?? 1;
  el.play().catch(() => {});
  musicPlayer.update((s) => ({ ...s, playing: true }));
}

async function startQueue(queue, source, startIndex, shuffle) {
  if (!queue.length) return;
  const shuffleOrder = shuffle ? shuffledIndices(queue.length, startIndex) : null;
  musicPlayer.update((s) => ({ ...s, queue, source, shuffle, shuffleOrder, index: startIndex }));
  await loadAndPlay(queue[startIndex]);
}

// Cache en memoria del escaneo completo de cada álbum (tracks + discos) —
// evita re-escanear la carpeta en cada reproducción dentro de la misma sesión
// (la carpeta real sigue siendo la fuente de verdad; ver invalidateAlbumTracks).
// Un solo fetch, dos usos: la UI agrupada (MusicAlbumDetail) consume el scan
// tal cual, y tracksForAlbum deriva de acá la cola plana para reproducción.
const albumScanCache = new Map();
export async function getAlbumScan(album) {
  if (albumScanCache.has(album.id)) return albumScanCache.get(album.id);
  const scan = await scanAlbum(album.id);
  albumScanCache.set(album.id, scan);
  return scan;
}
export function invalidateAlbumTracks(albumId) {
  albumScanCache.delete(albumId);
}

// Cola plana para reproducción: pistas sueltas primero, luego cada disco en
// orden — numeración/orden continuos, igual que se muestran agrupadas en
// MusicAlbumDetail.svelte.
async function tracksForAlbum(album) {
  const scan = await getAlbumScan(album);
  const flat = [
    ...scan.tracks.map((t) => ({ path: t.path, title: t.name, albumId: album.id, albumName: album.name })),
    ...scan.discs.flatMap((d) =>
      d.tracks.map((t) => ({
        path: t.path,
        title: t.name,
        albumId: album.id,
        albumName: album.name,
        discName: d.name,
      }))
    ),
  ];
  return flat;
}

export async function playAlbum(album, { shuffle = false } = {}) {
  const tracks = await tracksForAlbum(album);
  await startQueue(tracks, { type: "album", id: album.id }, 0, shuffle);
}

export async function playAlbumFrom(album, path) {
  const tracks = await tracksForAlbum(album);
  const idx = Math.max(0, tracks.findIndex((t) => t.path === path));
  await startQueue(tracks, { type: "album", id: album.id }, idx, false);
}

export async function playPlaylist(playlist, { shuffle = false } = {}) {
  await startQueue(playlist.trackIds, { type: "playlist", id: playlist.id }, 0, shuffle);
}

export async function playPlaylistFrom(playlist, path) {
  const idx = Math.max(0, playlist.trackIds.findIndex((t) => t.path === path));
  await startQueue(playlist.trackIds, { type: "playlist", id: playlist.id }, idx, false);
}

export function togglePlayPause() {
  const s = get(musicPlayer);
  if (!s.current) return;
  if (s.playing) {
    audioEl?.pause();
    musicPlayer.update((st) => ({ ...st, playing: false }));
  } else {
    audioEl?.play().catch(() => {});
    musicPlayer.update((st) => ({ ...st, playing: true }));
  }
}

// Siguiente/anterior — wrap de la COLA completa (no de una sola pista, a
// diferencia del loop del soundtrack por-juego).
export function next() {
  const s = get(musicPlayer);
  if (!s.queue.length) return;
  const order = playOrder(s);
  const pos = order.indexOf(s.index);
  const nextIndex = order[(pos + 1) % order.length];
  musicPlayer.update((st) => ({ ...st, index: nextIndex }));
  loadAndPlay(s.queue[nextIndex]);
}

export function previous() {
  const s = get(musicPlayer);
  if (!s.queue.length) return;
  const order = playOrder(s);
  const pos = order.indexOf(s.index);
  const prevIndex = order[(pos - 1 + order.length) % order.length];
  musicPlayer.update((st) => ({ ...st, index: prevIndex }));
  loadAndPlay(s.queue[prevIndex]);
}

export function toggleShuffle() {
  const s = get(musicPlayer);
  if (s.shuffle) {
    musicPlayer.update((st) => ({ ...st, shuffle: false, shuffleOrder: null }));
  } else {
    musicPlayer.update((st) => ({
      ...st,
      shuffle: true,
      shuffleOrder: shuffledIndices(st.queue.length, st.index),
    }));
  }
}

// Mueve la posición de la pista actual (slider de progreso en NowPlayingView).
export function seek(time) {
  if (!audioEl || !get(musicPlayer).current) return;
  const t = Math.max(0, Math.min(audioEl.duration || 0, Number(time)));
  if (!Number.isFinite(t)) return;
  audioEl.currentTime = t;
  musicPlayer.update((s) => ({ ...s, currentTime: t }));
}

export async function setVolume(v) {
  const n = Math.max(0, Math.min(1, Number(v)));
  if (!Number.isFinite(n)) return;
  musicPlayer.update((s) => ({ ...s, volume: n }));
  if (audioEl) audioEl.volume = n;
  await patchAppConfig({ musicVolume: n });
}

// Detiene y limpia la cola por completo (a diferencia de pauseForSession).
export function stop() {
  audioEl?.pause();
  if (audioEl) audioEl.src = "";
  currentPath = null;
  musicPlayer.set({ ...DEFAULT_STATE, volume: get(musicPlayer).volume });
}

// "Detener" (Ajustes → Sonidos, al iniciar un juego/app) — pausa SIN
// auto-reanudar y SIN perder cola/posición/shuffle (distinto de stop()): al
// volver, "reproducir" en el QAM retoma justo donde iba.
export function pauseForSession() {
  const s = get(musicPlayer);
  if (!s.playing) return;
  audioEl?.pause();
  musicPlayer.update((st) => ({ ...st, playing: false }));
}

export async function initMusicPlayer() {
  if (_volumeLoaded) return;
  _volumeLoaded = true;
  const cfg = await loadAppConfig();
  if (Number.isFinite(cfg?.musicVolume)) {
    musicPlayer.update((s) => ({ ...s, volume: cfg.musicVolume }));
  }
}

// --- Acciones del menú radial de sistema (Home mantenido, ver radialMenu.js) ---
export const MUSIC_RADIAL_ACTIONS = [
  { id: "musicToggle", label: "Reproducir/pausar música" },
  { id: "musicStop", label: "Detener música" },
];
export function runMusicRadialAction(id) {
  if (id === "musicToggle") {
    togglePlayPause();
    return true;
  }
  if (id === "musicStop") {
    pauseForSession();
    return true;
  }
  return false;
}
