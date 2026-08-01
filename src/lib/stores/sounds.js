import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Configuración de sonidos de la app. Por ahora solo el de arranque; los de
 * navegación (más adelante) sumarán sus propias claves a este mismo store.
 */
const DEFAULTS = { startupEnabled: true, startupSound: "startintsound_0", startupVolume: 1 };

export const soundSettings = writable({ ...DEFAULTS });

export async function initSounds() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.sounds) soundSettings.set({ ...DEFAULTS, ...cfg.sounds });
}

export async function updateSounds(patch) {
  soundSettings.update((s) => ({ ...s, ...patch }));
  await patchAppConfig({ sounds: get(soundSettings) });
}
