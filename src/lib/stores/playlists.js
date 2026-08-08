import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Playlists (Multimedia → Música → Listas): pistas de cualquier álbum, en
 * orden propio. Las pistas se guardan DENORMALIZADAS ({path, title, albumId,
 * albumName}) a propósito — la playlist sigue mostrando información aunque
 * el álbum de origen se quite de la biblioteca, mientras el archivo siga
 * existiendo en su ruta original.
 */

export const playlists = writable([]);

export async function initPlaylists() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.playlists)) playlists.set(cfg.playlists);
}

async function persist() {
  await patchAppConfig({ playlists: get(playlists) });
}

export async function createPlaylist(name) {
  const pl = { id: `pl_${Date.now()}`, name: name || "Lista", trackIds: [], createdAt: Date.now() };
  playlists.update((l) => [...l, pl]);
  await persist();
  return pl;
}

export async function deletePlaylist(id) {
  playlists.update((l) => l.filter((p) => p.id !== id));
  await persist();
}

export async function renamePlaylist(id, name) {
  if (!name) return;
  playlists.update((l) => l.map((p) => (p.id === id ? { ...p, name } : p)));
  await persist();
}

// track = { path, title, albumId, albumName }
export async function addTrackToPlaylist(id, track) {
  playlists.update((l) =>
    l.map((p) => {
      if (p.id !== id) return p;
      if (p.trackIds.some((t) => t.path === track.path)) return p;
      return { ...p, trackIds: [...p.trackIds, track] };
    })
  );
  await persist();
}

export async function removeTrackFromPlaylist(id, path) {
  playlists.update((l) =>
    l.map((p) => (p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t.path !== path) } : p))
  );
  await persist();
}

export async function moveTrackUp(id, path) {
  playlists.update((l) =>
    l.map((p) => {
      if (p.id !== id) return p;
      const i = p.trackIds.findIndex((t) => t.path === path);
      if (i <= 0) return p;
      const tracks = [...p.trackIds];
      [tracks[i - 1], tracks[i]] = [tracks[i], tracks[i - 1]];
      return { ...p, trackIds: tracks };
    })
  );
  await persist();
}

export async function moveTrackDown(id, path) {
  playlists.update((l) =>
    l.map((p) => {
      if (p.id !== id) return p;
      const i = p.trackIds.findIndex((t) => t.path === path);
      if (i === -1 || i >= p.trackIds.length - 1) return p;
      const tracks = [...p.trackIds];
      [tracks[i], tracks[i + 1]] = [tracks[i + 1], tracks[i]];
      return { ...p, trackIds: tracks };
    })
  );
  await persist();
}
