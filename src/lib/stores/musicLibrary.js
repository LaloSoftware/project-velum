import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { listSubfolders } from "../ipc/index.js";

/*
 * Biblioteca de álbumes de Música (Multimedia → Música). Cada álbum = una
 * carpeta que el usuario agrega — sin recursión en subcarpetas propia (las
 * subcarpetas de un álbum se tratan como "discos", ver media.rs::scan_album).
 * El id es el path absoluto de la carpeta (mismo criterio que
 * artOverrides/soundtrackOverrides: la ruta ES la clave). Las pistas NO se
 * persisten acá — se escanean on-demand (ver MusicAlbumDetail.svelte /
 * scanAlbum), la carpeta real es la fuente de verdad.
 *
 * Además de álbumes agregados uno por uno, existen "carpetas raíz"
 * (musicLibraryRoots): cada subcarpeta directa de una raíz se agrega como
 * álbum automáticamente (syncLibraryRoots) — pensado para rutas tipo
 * "C:/Usuarios/Música/" con varias OSTs copiadas adentro.
 */

export const musicAlbums = writable([]);
export const musicLibraryRoots = writable([]);

export async function initMusicLibrary() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.musicAlbums)) musicAlbums.set(cfg.musicAlbums);
  if (cfg && Array.isArray(cfg.musicLibraryRoots)) musicLibraryRoots.set(cfg.musicLibraryRoots);
}

async function persist() {
  await patchAppConfig({ musicAlbums: get(musicAlbums) });
}

async function persistRoots() {
  await patchAppConfig({ musicLibraryRoots: get(musicLibraryRoots) });
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

export async function addLibraryRoot(path) {
  if (!path) return null;
  const existing = get(musicLibraryRoots).find((r) => r.path === path);
  if (existing) return existing;
  const root = { path, addedAt: Date.now() };
  musicLibraryRoots.update((l) => [...l, root]);
  await persistRoots();
  await syncLibraryRoots();
  return root;
}

export async function removeLibraryRoot(path) {
  musicLibraryRoots.update((l) => l.filter((r) => r.path !== path));
  await persistRoots();
}

// Por cada carpeta raíz, agrega como álbum cada subcarpeta que todavía no
// esté en musicAlbums (mismo dedup por id/path que ya usa addAlbumFolder) —
// barato (un solo read_dir por raíz), pensado para correr en cada entrada a
// la vista Música. No borra álbumes si una subcarpeta desaparece (la carpeta
// real es la fuente de verdad, degradación correcta en vez de borrado
// agresivo) — limitación conocida: un álbum quitado a mano puede reaparecer
// en el próximo sync mientras la carpeta siga ahí.
export async function syncLibraryRoots() {
  const roots = get(musicLibraryRoots);
  if (!roots.length) return;
  for (const root of roots) {
    const subs = await listSubfolders(root.path);
    for (const sub of subs) {
      await addAlbumFolder(sub.path);
    }
  }
}
