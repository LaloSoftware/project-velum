import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { listSubfolders, allowVideoFolder } from "../ipc/index.js";

/*
 * Biblioteca de álbumes de Video (Multimedia → Videos). Mismo modelo que
 * musicLibrary.js/imageLibrary.js: cada álbum = una carpeta que el usuario
 * agrega (el id es el path absoluto), más "carpetas raíz" (videoLibraryRoots)
 * cuyas subcarpetas directas se agregan solas como álbum (syncLibraryRoots).
 *
 * Diferencia con las otras dos: los videos se reproducen vía el protocolo
 * asset de Tauri (streaming, ver util/asset.js::videoUrl), que necesita el
 * scope concedido en runtime (allowVideoFolder) — no persiste entre
 * reinicios, así que initVideoLibrary()/syncLibraryRoots() lo vuelven a
 * conceder para cada álbum/raíz conocido en cada sesión.
 */

export const videoAlbums = writable([]);
export const videoLibraryRoots = writable([]);

export async function initVideoLibrary() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.videoAlbums)) videoAlbums.set(cfg.videoAlbums);
  if (cfg && Array.isArray(cfg.videoLibraryRoots)) videoLibraryRoots.set(cfg.videoLibraryRoots);
  await Promise.all([
    ...get(videoAlbums).map((a) => allowVideoFolder(a.id)),
    ...get(videoLibraryRoots).map((r) => allowVideoFolder(r.path)),
  ]);
}

async function persist() {
  await patchAppConfig({ videoAlbums: get(videoAlbums) });
}

async function persistRoots() {
  await patchAppConfig({ videoLibraryRoots: get(videoLibraryRoots) });
}

function folderName(path) {
  const clean = path.replace(/[\\/]+$/, ""); // sin separador final
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export async function addAlbumFolder(path) {
  if (!path) return null;
  const existing = get(videoAlbums).find((a) => a.id === path);
  if (existing) return existing;
  await allowVideoFolder(path);
  const album = { id: path, name: folderName(path), addedAt: Date.now() };
  videoAlbums.update((l) => [...l, album]);
  await persist();
  return album;
}

export async function removeAlbum(id) {
  videoAlbums.update((l) => l.filter((a) => a.id !== id));
  await persist();
}

export async function renameAlbum(id, name) {
  if (!name) return;
  videoAlbums.update((l) => l.map((a) => (a.id === id ? { ...a, name } : a)));
  await persist();
}

export async function addLibraryRoot(path) {
  if (!path) return null;
  const existing = get(videoLibraryRoots).find((r) => r.path === path);
  if (existing) return existing;
  await allowVideoFolder(path);
  const root = { path, addedAt: Date.now() };
  videoLibraryRoots.update((l) => [...l, root]);
  await persistRoots();
  await syncLibraryRoots();
  return root;
}

export async function removeLibraryRoot(path) {
  videoLibraryRoots.update((l) => l.filter((r) => r.path !== path));
  await persistRoots();
}

// Por cada carpeta raíz, agrega como álbum cada subcarpeta que todavía no
// esté en videoAlbums (mismo dedup por id/path que ya usa addAlbumFolder) —
// ver musicLibrary.js::syncLibraryRoots (mismo criterio, no borra álbumes si
// una subcarpeta desaparece). addAlbumFolder ya concede el scope de cada
// subcarpeta nueva.
export async function syncLibraryRoots() {
  const roots = get(videoLibraryRoots);
  if (!roots.length) return;
  for (const root of roots) {
    const subs = await listSubfolders(root.path);
    for (const sub of subs) {
      await addAlbumFolder(sub.path);
    }
  }
}
