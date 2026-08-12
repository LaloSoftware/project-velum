import { writable, get } from "svelte/store";
import { locale, localeMeta } from "../i18n/index.js";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Orden de las tarjetas en Juegos y Aplicaciones. Persistente y SEPARADO por
 * vista (juegos/apps). No afecta a Inicio (que ordena por "reciente").
 * El orden por tamaño solo se ofrece si hay datos de `sizeBytes`.
 */

// scope: 'both' | 'games' (plataforma solo tiene sentido en juegos).
export const SORT_OPTIONS = [
  { id: "original", label: "Original", scope: "both", needsSize: false },
  { id: "title-asc", label: "Título A → Z", scope: "both", needsSize: false },
  { id: "title-desc", label: "Título Z → A", scope: "both", needsSize: false },
  { id: "store-asc", label: "Plataforma A → Z", scope: "games", needsSize: false },
  { id: "store-desc", label: "Plataforma Z → A", scope: "games", needsSize: false },
  { id: "size-asc", label: "Tamaño (menor → mayor)", scope: "both", needsSize: true },
  { id: "size-desc", label: "Tamaño (mayor → menor)", scope: "both", needsSize: true },
];

export const sortGames = writable("original");
export const sortApps = writable("original");

export async function initSorting() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.sort) {
    if (cfg.sort.games) sortGames.set(cfg.sort.games);
    if (cfg.sort.apps) sortApps.set(cfg.sort.apps);
  }
}

async function persist() {
  await patchAppConfig({ sort: { games: get(sortGames), apps: get(sortApps) } });
}

export async function setSortGames(id) {
  sortGames.set(id);
  await persist();
}
export async function setSortApps(id) {
  sortApps.set(id);
  await persist();
}

// ¿Hay al menos un elemento con tamaño conocido? (para mostrar orden por tamaño)
export function hasSizeData(list) {
  return Array.isArray(list) && list.some((g) => typeof g?.sizeBytes === "number");
}

// Opciones aplicables a una lista concreta (scope + disponibilidad de tamaño).
export function sortOptionsFor(scope, list) {
  const withSize = hasSizeData(list);
  return SORT_OPTIONS.filter(
    (o) => (o.scope === "both" || o.scope === scope) && (!o.needsSize || withSize)
  );
}

// Devuelve una NUEVA lista ordenada según `id` (no muta la original).
export function sortList(list, id) {
  const arr = Array.isArray(list) ? [...list] : [];
  const byTitle = (a, b) =>
    (a.title || "").localeCompare(b.title || "", localeMeta(get(locale)).intl, { sensitivity: "base" });
  const size = (g) => (typeof g?.sizeBytes === "number" ? g.sizeBytes : -1);
  switch (id) {
    case "title-asc":
      return arr.sort(byTitle);
    case "title-desc":
      return arr.sort((a, b) => byTitle(b, a));
    case "store-asc":
      return arr.sort((a, b) => (a.store || "").localeCompare(b.store || "") || byTitle(a, b));
    case "store-desc":
      return arr.sort((a, b) => (b.store || "").localeCompare(a.store || "") || byTitle(a, b));
    case "size-asc":
      return arr.sort((a, b) => size(a) - size(b) || byTitle(a, b));
    case "size-desc":
      return arr.sort((a, b) => size(b) - size(a) || byTitle(a, b));
    default:
      return arr; // 'original'
  }
}
