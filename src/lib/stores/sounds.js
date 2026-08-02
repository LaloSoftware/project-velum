import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { soundFor } from "../theming/sounds.js";

/*
 * Configuración de sonidos de la app: arranque, navegación y notificaciones.
 *
 * Navegación (categoría "navigation") solo tiene 2 archivos de momento, cada
 * uno con un propósito fijo (no hay selector — no hay más opciones aún):
 *   - directional_0: "aceptar", moverse entre tarjetas/menús, cualquier
 *     movimiento direccional (up/down/left/right) y cambio de pestaña.
 *   - directional_1: cerrar modales al cancelar/retroceder (B / Esc).
 * Notificaciones (categoría "notifications") solo suena para errores por
 * ahora (ver stores/ui.js reportError) — no para toasts normales.
 */
const NAV_PRIMARY_SOUND = "directional_0";
const NAV_BACK_SOUND = "directional_1";
const NOTIFICATION_SOUND = "notification_0";

const DEFAULTS = {
  startupEnabled: true,
  startupSound: "startintsound_0",
  startupVolume: 1,
  navigationEnabled: true,
  navigationVolume: 1,
  notificationsEnabled: true,
  notificationsVolume: 1,
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
