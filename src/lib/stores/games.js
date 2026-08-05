import { writable, derived } from "svelte/store";
import { listGames } from "../ipc/index.js";
import { hidden } from "./hidden.js";
import { playtimes } from "./playtimes.js";
import { reportError } from "./ui.js";

export const games = writable([]);
export const gamesLoaded = writable(false);

// Juegos/apps VISIBLES = todos menos los ocultos (blacklist).
export const visible = derived([games, hidden], ([$g, $h]) =>
  $g.filter((x) => !$h.includes(x.id))
);

// Recientes: juegos con "última vez" (del backend o de nuestro registro local),
// orden descendente. El registro local hace que cualquier juego lanzado desde el
// launcher aparezca al instante, aunque la tienda no lo registre.
export const recentGames = derived([visible, playtimes], ([$v, $pt]) =>
  $v
    .filter((g) => g.kind === "game")
    .map((g) => ({ g, t: Math.max(g.lastPlayed || 0, $pt[g.id] || 0) }))
    .filter((x) => x.t > 0)
    .sort((a, b) => b.t - a.t)
    .map((x) => x.g)
);

export const onlyGames = derived(visible, ($v) => $v.filter((x) => x.kind === "game"));
export const onlyApps = derived(visible, ($v) => $v.filter((x) => x.kind === "app"));

// Red de seguridad: un `id` duplicado rompe los `{#each ... (g.id)}` del
// frontend (error "each_key_duplicate"). El backend ya deduplica, pero esto
// blinda también config/fixtures inesperados.
function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const g of list) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    out.push(g);
  }
  if (out.length !== list.length) {
    reportError(
      `${list.length - out.length} elemento(s) con id duplicado descartado(s)`,
      "games:dedupeById"
    );
  }
  return out;
}

// Carátulas por CDN público de Steam (sin descargar nada del lado Rust: son
// URLs deterministas por appid, e imageUrl() ya pasa directo cualquier string
// http(s):). Se pintan como background-image (GameCard/GameDetail), así que
// un 404 (no todos los juegos tienen los 4 assets) cae solo al degradado de
// color de siempre, sin romper nada.
const STEAM_CDN = "https://cdn.akamai.steamstatic.com/steam/apps";
function steamCdnArt(appid) {
  return {
    coverPath: `${STEAM_CDN}/${appid}/library_600x900.jpg`,
    widePath: `${STEAM_CDN}/${appid}/header.jpg`,
    heroPath: `${STEAM_CDN}/${appid}/library_hero.jpg`,
    logoPath: `${STEAM_CDN}/${appid}/logo.png`,
  };
}

// Juegos de Steam YA INSTALADOS cuya fuente local (library/steam.rs, grid/
// librarycache) no encontró alguna imagen quedan con ese campo en `null` — sin
// cuenta vinculada ni sync, esos juegos se quedaban sin carátula para
// siempre. Se rellena SOLO lo que vino `null` con el mismo CDN de los
// "fantasmas" (no pisa nada que sí se haya detectado localmente). Como
// `effectiveArt()` resuelve `override manual || game.coverPath`, esto
// funciona además como el valor por defecto al que "restaurar" si el usuario
// limpia un override personalizado (ArtEditor) — nunca toca `artOverrides`,
// solo la capa de abajo. No depende de tener cuenta vinculada: la URL es
// puramente por `appid`.
function fillMissingSteamArt(list) {
  const ART_KEYS = ["coverPath", "widePath", "heroPath", "logoPath"];
  return list.map((g) => {
    if (g.store !== "steam") return g;
    const appid = Number(g.id.split(":")[1]);
    if (!Number.isFinite(appid)) return g;
    const fallback = steamCdnArt(appid);
    const patch = {};
    for (const key of ART_KEYS) {
      if (!g[key]) patch[key] = fallback[key];
    }
    return Object.keys(patch).length ? { ...g, ...patch } : g;
  });
}

export async function loadGames() {
  const list = await listGames();
  games.set(fillMissingSteamArt(dedupeById(list)));
  gamesLoaded.set(true);
}

// Mete en `games` los juegos de la biblioteca de Steam vinculada (Fase 9) que
// NO están ya instalados localmente — mismo `id` que produce SteamSource
// (`steam:{appid}`, ver src-tauri/src/library/steam.rs) para que, si el
// usuario instala uno después y se vuelve a cargar la lista real, el
// duplicado se resuelva solo (dedupeById se queda con la primera aparición).
// `entries` = lo que devuelve steam_library (steamLibraryCache en ipc).
export function mergeSteamGhosts(entries) {
  games.update((list) => {
    const existingIds = new Set(list.map((g) => g.id));
    const ghosts = entries
      .filter((e) => !existingIds.has(`steam:${e.appid}`))
      .map((e) => ({
        id: `steam:${e.appid}`,
        title: e.name,
        store: "steam",
        kind: "game",
        ...steamCdnArt(e.appid),
        installDir: null,
        launchTarget: `steam://rungameid/${e.appid}`,
        lastPlayed: null,
        sizeBytes: null,
        installed: false,
      }));
    if (!ghosts.length) return list;
    console.log(`[gm:steam] ${ghosts.length} juego(s) de la cuenta sin instalar localmente`, ghosts);
    return [...list, ...ghosts];
  });
}
