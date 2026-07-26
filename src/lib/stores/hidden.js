import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * "Blacklist": juegos/apps ocultos de la interfaz. Persistente. Solo se quitan
 * desde Configuración > Ocultos.
 */

export const hidden = writable([]); // array de ids

export async function initHidden() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.hidden)) hidden.set(cfg.hidden);
}

async function persist() {
  await patchAppConfig({ hidden: get(hidden) });
}

export async function hide(id) {
  if (!get(hidden).includes(id)) {
    hidden.update((l) => [...l, id]);
    await persist();
  }
}

export async function unhide(id) {
  hidden.update((l) => l.filter((x) => x !== id));
  await persist();
}
