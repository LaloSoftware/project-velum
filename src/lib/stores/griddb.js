import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { recordImportedOverride } from "./artoverrides.js";
import { showToast } from "./ui.js";
import { tr } from "../i18n/index.js";
import {
  isTauri,
  griddbSetKey,
  griddbHasKey,
  griddbClearKey,
  griddbGameByPlatform,
  griddbSearch,
  griddbImages,
  artImportUrl,
} from "../ipc/index.js";

/*
 * SteamGridDB (Fase 3, feature-imagenes.md) — busca y trae carátulas/heroes/
 * logos elegidos a mano desde GridDbPickerModal.svelte. La API key vive en el
 * keyring del SO (nunca en config.json, mismo criterio que Steam); lo que sí
 * se persiste acá es el slice `griddb`: filtros y la caché de resolución
 * juego-local → juego-SteamGridDB.
 *
 * Los 4 slots personalizables (mismos que artoverrides.js) mapean a un
 * endpoint de la API ("kind") y, salvo logo, a una lista de resoluciones
 * válidas — ver el spec en feature-imagenes.md, verificado contra
 * https://www.steamgriddb.com/static/openapi.yml.
 */
export const GRIDDB_SLOTS = {
  cover: {
    kind: "grids",
    dims: ["600x900", "342x482", "660x930", "512x512", "1024x1024"],
    native: "600x900",
  },
  wide: { kind: "grids", dims: ["460x215", "920x430"], native: "920x430" },
  hero: { kind: "heroes", dims: ["1920x620", "3840x1240", "1600x650"], native: "1920x620" },
  logo: { kind: "logos", dims: null, native: null }, // la API no acepta `dimensions` en logos
};

// Estilos y formatos por endpoint — listas distintas para grids/heroes/logos
// (mismos valores exactos que validan en Rust, griddb/mod.rs).
export const GRIDDB_STYLES = {
  grids: ["alternate", "blurred", "white_logo", "material", "no_logo"],
  heroes: ["alternate", "blurred", "material"],
  logos: ["official", "white", "black", "custom"],
};
export const GRIDDB_MIMES = {
  grids: ["image/png", "image/jpeg", "image/webp"],
  heroes: ["image/png", "image/jpeg", "image/webp"],
  logos: ["image/png", "image/webp"],
};

// Plataforma externa de SteamGridDB por tienda, solo para las verificadas —
// ver "Fuera de alcance"/nota de la Fase 3 en feature-imagenes.md: EA→origin
// y Ubisoft→uplay quedaron señalados como "a verificar" (no hay forma de
// confirmar el id exacto sin una instalación real de esos launchers), así
// que NO se mapean todavía — mandar un id adivinado sería peor que no
// mandar nada (podría emparejar con el juego equivocado). GOG no tiene id
// externo en SteamGridDB en absoluto (ver docs/steamgriddb.md). Todos estos
// caen a búsqueda por nombre (griddbSearch), igual que un juego sin tienda.
function platformIdFor(game) {
  if (game?.store === "steam") {
    const appid = game.id.split(":")[1];
    return appid ? { platform: "steam", platformId: appid } : null;
  }
  return null;
}

// --- API key ---
export const griddbKeyLinked = writable(false);

export async function initGriddbKey() {
  if (!isTauri) return;
  griddbKeyLinked.set(await griddbHasKey());
}

export async function setGriddbKeyValue(key) {
  await griddbSetKey(key);
  griddbKeyLinked.set(true);
  showToast(tr("griddb.toast.keyLinked"));
}

export async function clearGriddbKeyValue() {
  await griddbClearKey();
  griddbKeyLinked.set(false);
  showToast(tr("griddb.toast.keyCleared"));
}

// --- Filtros ---
// Categorías (adultos/humor/epilepsia/animadas): preferencia GLOBAL,
// compartida por los 4 slots — si alguien no quiere ver contenido adulto, no
// lo quiere en ningún slot. Interruptores de mostrar/ocultar (2 estados), no
// los 3 que permite la API ("true" = SOLO esa categoría no se expone: no es
// una intención real de nadie configurando una consola de sala).
const DEFAULT_GLOBAL_FILTERS = { nsfw: "false", humor: "false", epilepsy: "false", animated: false };
// Estilo/resolución/formato: dependen del endpoint, se persisten POR SLOT.
const DEFAULT_SLOT_FILTERS = () =>
  Object.fromEntries(
    Object.entries(GRIDDB_SLOTS).map(([slot, cfg]) => [
      slot,
      { styles: [], dimensions: cfg.native ? [cfg.native] : [], mimes: [] },
    ])
  );

export const globalFilters = writable({ ...DEFAULT_GLOBAL_FILTERS });
export const slotFilters = writable(DEFAULT_SLOT_FILTERS());

// Caché de resolución juego-local → juego-SteamGridDB: NO reactivo (no hace
// falta re-renderizar nada cuando cambia), solo evita re-resolver en cada
// apertura del modal. { [game.id]: sgdbGameId }
let resolvedGameId = {};

export async function initGriddb() {
  await initGriddbKey();
  const cfg = await loadAppConfig();
  const g = cfg?.griddb || {};
  globalFilters.set({ ...DEFAULT_GLOBAL_FILTERS, ...(g.globalFilters || {}) });
  slotFilters.set({ ...DEFAULT_SLOT_FILTERS(), ...(g.slotFilters || {}) });
  resolvedGameId = g.resolvedGameId || {};
}

async function persist() {
  await patchAppConfig({
    griddb: { globalFilters: get(globalFilters), slotFilters: get(slotFilters), resolvedGameId },
  });
}

export async function setGlobalFilter(key, value) {
  globalFilters.update((f) => ({ ...f, [key]: value }));
  await persist();
}

export async function setSlotFilter(slot, key, values) {
  slotFilters.update((f) => ({ ...f, [slot]: { ...f[slot], [key]: values } }));
  await persist();
}

// Traduce las preferencias (globales + por-slot) al shape que espera el
// backend (`GriddbFilters` en griddb/mod.rs).
function apiFilters(slot) {
  const g = get(globalFilters);
  const s = get(slotFilters)[slot] || { styles: [], dimensions: [], mimes: [] };
  return {
    styles: s.styles,
    dimensions: s.dimensions,
    mimes: s.mimes,
    types: g.animated ? ["static", "animated"] : [],
    nsfw: g.nsfw,
    humor: g.humor,
    epilepsy: g.epilepsy,
  };
}

// --- Resolución del juego ---

// Intenta resolver `game` a un juego de SteamGridDB por plataforma (solo
// Steam, ver platformIdFor). Devuelve `{ id, name }` si hay match (cacheado
// para la próxima vez), o `null` si no hay mapeo de plataforma o la API no
// encontró nada — el llamador (GridDbPickerModal) cae entonces al buscador
// y deja que la persona elija.
export async function resolveGriddbGame(game) {
  if (resolvedGameId[game.id] != null) {
    return { id: resolvedGameId[game.id], name: game.title };
  }
  const p = platformIdFor(game);
  if (!p) return null;
  const found = await griddbGameByPlatform(p.platform, p.platformId);
  if (found) {
    resolvedGameId[game.id] = found.id;
    await persist();
  }
  return found;
}

export async function searchGriddbGames(term) {
  return griddbSearch(term);
}

// El usuario elige uno de la lista de búsqueda: se cachea para no volver a
// preguntar la próxima vez que abra el modal de este mismo juego.
export async function chooseGriddbGame(localGameId, sgdbGame) {
  resolvedGameId[localGameId] = sgdbGame.id;
  await persist();
}

// --- Imágenes ---

// Caché en memoria por (kind, gameId, filtros, page) durante la sesión —
// cortesía básica con una API gratuita: reabrir el mismo slot o volver a una
// página ya vista no vuelve a pedirla. Sin invalidación por tiempo (dura toda
// la sesión); cambiar un filtro ya apunta a otra clave, no hace falta borrar
// nada.
const imageCache = new Map(); // key → Promise<GriddbImagePage>

export function fetchGriddbImages(slot, gameId, page = 0) {
  const kind = GRIDDB_SLOTS[slot]?.kind;
  if (!kind) return Promise.reject(new Error(`slot desconocido: ${slot}`));
  const filters = apiFilters(slot);
  const key = JSON.stringify([kind, gameId, filters, page]);
  if (imageCache.has(key)) return imageCache.get(key);
  const p = griddbImages(kind, gameId, filters, page).catch((e) => {
    imageCache.delete(key); // no cachear errores — podrían ser transitorios (red)
    throw e;
  });
  imageCache.set(key, p);
  return p;
}

// Descarga la imagen elegida al almacén propio (Fase 2) y la deja como
// override de `slot` para `gameId` — mismo resultado final que elegir un
// archivo a mano en ArtEditor, solo que el origen es una URL en vez de una
// ruta local (artImportUrl descarga; recordImportedOverride no vuelve a
// importar algo que artImportUrl ya copió).
export async function importGriddbImage(gameId, slot, image) {
  const storedPath = await artImportUrl(gameId, slot, image.url);
  await recordImportedOverride(gameId, slot, storedPath);
  return storedPath;
}
