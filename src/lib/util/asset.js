/*
 * Resuelve rutas de imagen para la WebView.
 *   - URLs ya cargables (http/https/data/blob) → se devuelven tal cual (p. ej.
 *     carátulas remotas de GOG).
 *   - Rutas de fichero locales (carátulas de Steam en disco) → se piden al
 *     backend (`read_image`), que devuelve un `data:` URI. Es más fiable que el
 *     protocolo asset + scope. El resultado se cachea por ruta.
 *   - En modo web (sin Tauri) → null (el llamador cae a su placeholder).
 */

import { isTauri } from "../ipc/index.js";

const READY = /^(https?:|data:|blob:)/i;
const cache = new Map(); // path → data URI | null (o Promise en vuelo)

let _invoke = null;
async function invoke(cmd, args) {
  if (!_invoke) {
    const core = await import("@tauri-apps/api/core");
    _invoke = core.invoke;
  }
  return _invoke(cmd, args);
}

export async function imageUrl(path) {
  if (!path) return null;
  if (READY.test(path)) return path;
  if (!isTauri) return null;
  if (cache.has(path)) return cache.get(path);

  const p = invoke("read_image", { path })
    .then((uri) => {
      cache.set(path, uri);
      return uri;
    })
    .catch(() => {
      cache.set(path, null);
      return null;
    });
  cache.set(path, p); // evita peticiones duplicadas mientras está en vuelo
  return p;
}

// Igual que imageUrl(), para el soundtrack por-juego (ver stores/soundtrackOverrides.js).
const audioCache = new Map();

export async function audioUrl(path) {
  if (!path) return null;
  if (READY.test(path)) return path;
  if (!isTauri) return null;
  if (audioCache.has(path)) return audioCache.get(path);

  const p = invoke("read_audio", { path })
    .then((uri) => {
      audioCache.set(path, uri);
      return uri;
    })
    .catch(() => {
      audioCache.set(path, null);
      return null;
    });
  audioCache.set(path, p);
  return p;
}
