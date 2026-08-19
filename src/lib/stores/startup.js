import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Configuración de inicio: con qué vista arranca la app y si arranca en
 * pantalla completa. El autoarranque con Windows (tauri-plugin-autostart,
 * StartupSection.svelte) vive aparte — el plugin es la fuente de verdad
 * (lee/escribe la entrada real del SO), no hay estado propio acá.
 */

const DEFAULTS = { initialView: "home", fullscreen: false };

export const startup = writable({ ...DEFAULTS });

export async function initStartup() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.startup) startup.set({ ...DEFAULTS, ...cfg.startup });
}

export async function updateStartup(patch) {
  startup.update((s) => ({ ...s, ...patch }));
  await patchAppConfig({ startup: get(startup) });
}
