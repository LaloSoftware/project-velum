import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Biblioteca de álbumes de Música (Multimedia → Música). Cada álbum = una
 * carpeta que el usuario agrega — sin recursión en subcarpetas (regla de
 * negocio: carpeta = álbum). El id es el path absoluto de la carpeta (mismo
 * criterio que artOverrides/soundtrackOverrides: la ruta ES la clave). Las
 * pistas NO se persisten acá — se listan on-demand (ver
 * MusicAlbumDetail.svelte / listAudioFiles), la carpeta real es la fuente de
 * verdad.
 */

export const musicAlbums = writable([]);

export async function initMusicLibrary() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.musicAlbums)) musicAlbums.set(cfg.musicAlbums);
}

async function persist() {
  await patchAppConfig({ musicAlbums: get(musicAlbums) });
}

function folderName(path) {
  const clean = path.replace(/[\\/]+$/, ""); // sin separador final
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export async function addAlbumFolder(path) {
  if (!path) return null;
  const existing = get(musicAlbums).find((a) => a.id === path);
  if (existing) return existing;
  const album = { id: path, name: folderName(path), addedAt: Date.now() };
  musicAlbums.update((l) => [...l, album]);
  await persist();
  return album;
}

export async function removeAlbum(id) {
  musicAlbums.update((l) => l.filter((a) => a.id !== id));
  await persist();
}

export async function renameAlbum(id, name) {
  if (!name) return;
  musicAlbums.update((l) => l.map((a) => (a.id === id ? { ...a, name } : a)));
  await persist();
}
