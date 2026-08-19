import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { listSubfolders } from "../ipc/index.js";

/*
 * Biblioteca de álbumes de Imágenes (Multimedia → Imágenes). Mismo modelo
 * que musicLibrary.js: cada álbum = una carpeta que el usuario agrega (el id
 * es el path absoluto), más "carpetas raíz" (imageLibraryRoots) cuyas
 * subcarpetas directas se agregan solas como álbum (syncLibraryRoots). Las
 * imágenes NO se persisten acá — se listan on-demand (ver
 * ImageAlbumDetail.svelte / listImageFiles), la carpeta real es la fuente de
 * verdad.
 */

export const imageAlbums = writable([]);
export const imageLibraryRoots = writable([]);

export async function initImageLibrary() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.imageAlbums)) imageAlbums.set(cfg.imageAlbums);
  if (cfg && Array.isArray(cfg.imageLibraryRoots)) imageLibraryRoots.set(cfg.imageLibraryRoots);
}

async function persist() {
  await patchAppConfig({ imageAlbums: get(imageAlbums) });
}

async function persistRoots() {
  await patchAppConfig({ imageLibraryRoots: get(imageLibraryRoots) });
}

function folderName(path) {
  const clean = path.replace(/[\\/]+$/, ""); // sin separador final
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export async function addAlbumFolder(path) {
  if (!path) return null;
  const existing = get(imageAlbums).find((a) => a.id === path);
  if (existing) return existing;
  const album = { id: path, name: folderName(path), addedAt: Date.now() };
  imageAlbums.update((l) => [...l, album]);
  await persist();
  return album;
}

export async function removeAlbum(id) {
  imageAlbums.update((l) => l.filter((a) => a.id !== id));
  await persist();
}

export async function renameAlbum(id, name) {
  if (!name) return;
  imageAlbums.update((l) => l.map((a) => (a.id === id ? { ...a, name } : a)));
  await persist();
}

export async function addLibraryRoot(path) {
  if (!path) return null;
  const existing = get(imageLibraryRoots).find((r) => r.path === path);
  if (existing) return existing;
  const root = { path, addedAt: Date.now() };
  imageLibraryRoots.update((l) => [...l, root]);
  await persistRoots();
  await syncLibraryRoots();
  return root;
}

export async function removeLibraryRoot(path) {
  imageLibraryRoots.update((l) => l.filter((r) => r.path !== path));
  await persistRoots();
}

// Por cada carpeta raíz, agrega como álbum cada subcarpeta que todavía no
// esté en imageAlbums (mismo dedup por id/path que ya usa addAlbumFolder) —
// ver musicLibrary.js::syncLibraryRoots (mismo criterio, no borra álbumes si
// una subcarpeta desaparece).
export async function syncLibraryRoots() {
  const roots = get(imageLibraryRoots);
  if (!roots.length) return;
  for (const root of roots) {
    const subs = await listSubfolders(root.path);
    for (const sub of subs) {
      await addAlbumFolder(sub.path);
    }
  }
}
