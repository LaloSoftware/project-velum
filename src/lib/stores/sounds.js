import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { soundFor } from "../theming/sounds.js";
import { musicPlayer } from "./musicPlayer.js";

/*
 * Configuración de sonidos de la app: arranque, navegación y notificaciones.
 *
 * Navegación (categoría "navigation") solo tiene 2 archivos de momento, cada
 * uno con un propósito fijo (no hay selector — no hay más opciones aún):
 *   - directional_0: "aceptar", moverse entre tarjetas/menús, cualquier
 *     movimiento direccional (up/down/left/right) y cambio de pestaña.
 *   - directional_1: cerrar modales al cancelar/retroceder (B / Esc).
 * Notificaciones (categoría "notifications"):
 *   - notification_0: mensaje de error (ver stores/ui.js reportError) — no
 *     para toasts normales.
 *   - notification_1: abrir el menú de Configuración o el de Sistema (QAM).
 *   - notification_2: cerrar cualquiera de esos dos menús.
 */
const NAV_PRIMARY_SOUND = "directional_0";
const NAV_BACK_SOUND = "directional_1";
const NOTIFICATION_SOUND = "notification_0";
const MENU_OPEN_SOUND = "notification_1";
const MENU_CLOSE_SOUND = "notification_2";

const DEFAULTS = {
  startupEnabled: true,
  startupSound: "startintsound_0",
  startupVolume: 1,
  navigationEnabled: true,
  navigationVolume: 1,
  notificationsEnabled: true,
  notificationsVolume: 1,
  // Reproductor de música (Multimedia → Música) — los 3 habilitados por
  // defecto. stopMusicOnGame/stopMusicOnApp separados a propósito: game.kind
  // está disponible en playsession.js::startPlay, así que se puede distinguir.
  // "Detener" = pausar sin auto-reanudar (musicPlayer.pauseForSession()), no
  // un detener destructivo — al volver, la cola sigue intacta.
  stopMusicOnGame: true,
  stopMusicOnApp: true,
  // Silencia SOLO la categoría "navigation" (mover/aceptar/cancelar/cambio de
  // pestaña) mientras suena música — notificaciones/errores y abrir/cerrar
  // menús (categoría "notifications") siguen sonando siempre.
  muteNavDuringMusic: true,
};

export const soundSettings = writable({ ...DEFAULTS });

export async function initSounds() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.sounds) soundSettings.set({ ...DEFAULTS, ...cfg.sounds });
}

export async function updateSounds(patch) {
  soundSettings.update((s) => ({ ...s, ...patch }));
  await patchAppConfig({ sounds: get(soundSettings) });
}

function play(category, name, enabled, volume) {
  if (!enabled) return;
  if (category === "navigation" && get(soundSettings).muteNavDuringMusic && get(musicPlayer).playing) {
    return;
  }
  const url = soundFor(category, name);
  if (!url) return;
  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(() => {});
}

// Aceptar, moverse entre tarjetas/menús, dirección, cambio de pestaña.
export function playNavPrimary() {
  const s = get(soundSettings);
  play("navigation", NAV_PRIMARY_SOUND, s.navigationEnabled, s.navigationVolume);
}

// Cancelar / retroceder (cierra el modal o vista activa).
export function playNavBack() {
  const s = get(soundSettings);
  play("navigation", NAV_BACK_SOUND, s.navigationEnabled, s.navigationVolume);
}

// Mensaje de error (ver stores/ui.js reportError).
export function playNotification() {
  const s = get(soundSettings);
  play("notifications", NOTIFICATION_SOUND, s.notificationsEnabled, s.notificationsVolume);
}

// Abrir/cerrar el menú de Configuración o el de Sistema (QAM).
export function playMenuOpen() {
  const s = get(soundSettings);
  play("notifications", MENU_OPEN_SOUND, s.notificationsEnabled, s.notificationsVolume);
}
export function playMenuClose() {
  const s = get(soundSettings);
  play("notifications", MENU_CLOSE_SOUND, s.notificationsEnabled, s.notificationsVolume);
}
