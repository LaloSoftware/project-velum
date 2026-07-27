import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Registro LOCAL de "última vez jugado" por id de juego. Se actualiza cada vez
 * que lanzamos algo desde el launcher, así aparece en "Reciente" (Inicio) al
 * instante y sin depender de que la tienda (Steam/GOG) lo registre. Se combina
 * con el lastPlayed del backend tomando el más reciente (ver stores/games.js).
 */

export const playtimes = writable({}); // { [gameId]: epochSeconds }

export async function initPlaytimes() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.playtimes) playtimes.set(cfg.playtimes);
}

export async function recordPlay(id) {
  if (!id) return;
  playtimes.update((m) => ({ ...m, [id]: Math.floor(Date.now() / 1000) }));
  await patchAppConfig({ playtimes: get(playtimes) });
}
