import { writable, derived, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { openKeyboard } from "./keyboard.js";
import { groups } from "./groups.js";

/*
 * Estado de la vista Juegos: qué filtros de tienda están habilitados (persistente),
 * el filtro activo y la búsqueda (UI). Las acciones `search` / `filterPrev` /
 * `filterNext` (atajos de mando) operan sobre esto desde App.svelte.
 */

export const STORE_DEFS = [
  { id: "steam", label: "Steam" },
  { id: "gog", label: "GOG" },
  { id: "epic", label: "Epic" },
];

// Filtros de tienda habilitados (persistente).
export const enabledStores = writable({ steam: true, gog: true, epic: true });

export async function initLibrary() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.enabledStores) {
    enabledStores.set({ steam: true, gog: true, epic: true, ...cfg.enabledStores });
  }
}

export async function setStoreEnabled(store, on) {
  enabledStores.update((s) => ({ ...s, [store]: on }));
  // Si el filtro activo era esa tienda y se desactiva, vuelve a "Todos".
  if (!on && get(activeFilter) === store) activeFilter.set("all");
  await patchAppConfig({ enabledStores: get(enabledStores) });
}

// Lista de filtros visibles: "Todos" + tiendas habilitadas + grupos personalizados.
export const filterList = derived([enabledStores, groups], ([$en, $groups]) => [
  { id: "all", label: "Todos", type: "all" },
  ...STORE_DEFS.filter((s) => $en[s.id] !== false).map((s) => ({ ...s, type: "store" })),
  ...$groups.map((g) => ({ id: g.id, label: g.name, type: "group" })),
]);

// Estado de UI (no persistente).
export const activeFilter = writable("all");
export const query = writable("");

export function setFilter(id) {
  activeFilter.set(id);
}

export function cycleFilter(dir) {
  const list = get(filterList);
  const i = list.findIndex((f) => f.id === get(activeFilter));
  const idx = i < 0 ? 0 : i;
  activeFilter.set(list[(idx + dir + list.length) % list.length].id);
}

export async function runSearch() {
  const q = await openKeyboard(get(query), "Buscar juego");
  if (q !== null) query.set(q);
}
