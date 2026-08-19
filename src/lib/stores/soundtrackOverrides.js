import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Soundtrack por juego (personalización manual desde el detalle): un archivo
 * de audio local que se reproduce en loop mientras el juego está enfocado en
 * Inicio o se ve su Detalle (ver stores/soundtrackPlayer.js). Cada entrada:
 * { path, volume } — volume 0..1, independiente del volumen global de
 * Sonidos (Ajustes > Sonidos). Persistente.
 */

export const soundtrack = writable({}); // { [gameId]: { path, volume } }

export async function initSoundtrack() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.soundtrack) soundtrack.set(cfg.soundtrack);
}

export async function setSoundtrackPath(id, path) {
  soundtrack.update((m) => {
    if (!path) {
      const { [id]: _drop, ...rest } = m;
      return rest;
    }
    return { ...m, [id]: { ...(m[id] || {}), path, volume: m[id]?.volume ?? 1 } };
  });
  await patchAppConfig({ soundtrack: get(soundtrack) });
}

export async function setSoundtrackVolume(id, volume) {
  soundtrack.update((m) => (m[id] ? { ...m, [id]: { ...m[id], volume } } : m));
  await patchAppConfig({ soundtrack: get(soundtrack) });
}
