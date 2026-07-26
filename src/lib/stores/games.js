import { writable, derived } from "svelte/store";
import { listGames } from "../ipc/index.js";
import { hidden } from "./hidden.js";

export const games = writable([]);
export const gamesLoaded = writable(false);

// Juegos/apps VISIBLES = todos menos los ocultos (blacklist).
export const visible = derived([games, hidden], ([$g, $h]) =>
  $g.filter((x) => !$h.includes(x.id))
);

// Recientes: solo con lastPlayed, orden descendente (sobre los visibles).
export const recentGames = derived(visible, ($v) =>
  $v
    .filter((g) => g.kind === "game" && g.lastPlayed)
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
);

export const onlyGames = derived(visible, ($v) => $v.filter((x) => x.kind === "game"));
export const onlyApps = derived(visible, ($v) => $v.filter((x) => x.kind === "app"));

export async function loadGames() {
  const list = await listGames();
  games.set(list);
  gamesLoaded.set(true);
}
