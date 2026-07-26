import { writable, derived } from "svelte/store";
import { listGames } from "../ipc/index.js";

export const games = writable([]);
export const gamesLoaded = writable(false);

// Recientes: solo con lastPlayed, orden descendente.
export const recentGames = derived(games, ($games) =>
  $games
    .filter((g) => g.kind === "game" && g.lastPlayed)
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
);

export const onlyGames = derived(games, ($g) => $g.filter((x) => x.kind === "game"));
export const onlyApps = derived(games, ($g) => $g.filter((x) => x.kind === "app"));

export async function loadGames() {
  const list = await listGames();
  games.set(list);
  gamesLoaded.set(true);
}
