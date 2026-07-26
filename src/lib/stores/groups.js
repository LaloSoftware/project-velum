import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Grupos personalizados: colecciones manuales de juegos, aparte de las librerías
 * por defecto (Steam/GOG/Epic). Cada grupo = { id, name, gameIds: [] }.
 * Se asignan juego a juego desde el detalle del juego. Persistente.
 */

export const groups = writable([]);

export async function initGroups() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.groups)) groups.set(cfg.groups);
}

async function persist() {
  await patchAppConfig({ groups: get(groups) });
}

export async function createGroup(name, firstGameId = null) {
  const g = {
    id: `g_${Date.now()}`,
    name: name || "Grupo",
    gameIds: firstGameId ? [firstGameId] : [],
  };
  groups.update((l) => [...l, g]);
  await persist();
  return g;
}

export async function deleteGroup(id) {
  groups.update((l) => l.filter((g) => g.id !== id));
  await persist();
}

export async function toggleGameInGroup(groupId, gameId) {
  groups.update((l) =>
    l.map((g) => {
      if (g.id !== groupId) return g;
      const has = g.gameIds.includes(gameId);
      return {
        ...g,
        gameIds: has ? g.gameIds.filter((x) => x !== gameId) : [...g.gameIds, gameId],
      };
    })
  );
  await persist();
}
