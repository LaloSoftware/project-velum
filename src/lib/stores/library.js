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
  { id: "ea", label: "EA" },
  { id: "ubisoft", label: "Ubisoft" },
];

// Filtros de tienda habilitados (persistente).
export const enabledStores = writable({
  steam: true,
  gog: true,
  epic: true,
  ea: true,
  ubisoft: true,
});

// Alineación de la barra de filtros: left | center | right (persistente).
export const filterAlign = writable("left");

// Alineación de las tarjetas en los grids (Juegos/Apps): left | center | right.
// Los espaciados entre tarjetas (gap) no cambian; solo hacia qué lado se agrupan.
export const cardAlign = writable("center");

// Filtro de instalación (solo Juegos): "all" | "installed" | "not-installed".
// Solo tiene efecto real en juegos de Steam de una cuenta vinculada (únicos
// con `installed: false` hoy, ver docs/accounts.md) — el resto no trae ese
// campo y `matchesInstallFilter` los trata siempre como instalados.
export const INSTALL_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "installed", label: "Instalados" },
  { value: "not-installed", label: "No instalados" },
];
export const installFilter = writable("all");

export function matchesInstallFilter(game, filter) {
  if (filter === "installed") return game.installed !== false;
  if (filter === "not-installed") return game.installed === false;
  return true;
}

export async function initLibrary() {
  const cfg = await loadAppConfig();
  if (
    cfg &&
    INSTALL_FILTER_OPTIONS.some((o) => o.value === cfg.installFilter)
  ) {
    installFilter.set(cfg.installFilter);
  }
  if (cfg && cfg.enabledStores) {
    enabledStores.set({
      steam: true,
      gog: true,
      epic: true,
      ea: true,
      ubisoft: true,
      ...cfg.enabledStores,
    });
  }
  if (cfg && cfg.filterAlign) filterAlign.set(cfg.filterAlign);
  if (cfg && cfg.cardAlign) cardAlign.set(cfg.cardAlign);
}

export async function setFilterAlign(v) {
  filterAlign.set(v);
  await patchAppConfig({ filterAlign: get(filterAlign) });
}

export async function setCardAlign(v) {
  cardAlign.set(v);
  await patchAppConfig({ cardAlign: get(cardAlign) });
}

export async function setInstallFilter(v) {
  if (!INSTALL_FILTER_OPTIONS.some((o) => o.value === v)) return;
  installFilter.set(v);
  await patchAppConfig({ installFilter: v });
}

export async function setStoreEnabled(store, on) {
  enabledStores.update((s) => ({ ...s, [store]: on }));
  // Si el filtro activo era esa tienda y se desactiva, vuelve a "Todos".
  if (!on && get(activeFilter) === store) activeFilter.set("all");
  await patchAppConfig({ enabledStores: get(enabledStores) });
}

// Lista de filtros visibles: "Todos" + tiendas habilitadas + grupos personalizados.
// Blindado: config persistida corrupta (p. ej. un grupo mal formado) no debe
// tirar este store abajo, ya que solo lo consume la vista Juegos.
export const filterList = derived([enabledStores, groups], ([$en, $groups]) => {
  try {
    const gs = Array.isArray($groups) ? $groups : [];
    return [
      { id: "all", label: "Todos", type: "all" },
      ...STORE_DEFS.filter((s) => $en?.[s.id] !== false).map((s) => ({ ...s, type: "store" })),
      ...gs
        .filter((g) => g && g.id)
        .map((g) => ({ id: g.id, label: g.name || g.id, type: "group" })),
    ];
  } catch (e) {
    console.error("[gm:error] (library:filterList)", e);
    return [{ id: "all", label: "Todos", type: "all" }];
  }
});

// Estado de UI (no persistente).
export const activeFilter = writable("all");
export const query = writable("");

export function setFilter(id) {
  activeFilter.set(id);
}

// Al entrar a la vista Juegos: siempre arranca en "Todos".
export function enterGames() {
  activeFilter.set("all");
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
