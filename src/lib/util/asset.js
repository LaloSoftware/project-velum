/*
 * Resuelve rutas de imagen/audio/video locales para la WebView.
 *   - URLs ya cargables (http/https/data/blob) → se devuelven tal cual (p. ej.
 *     carátulas remotas de GOG).
 *   - Imagen/audio: rutas de fichero locales → se piden al backend
 *     (`read_image`/`read_audio`), que devuelve un `data:` URI (cacheado por
 *     ruta). Es más fiable que el protocolo asset + scope para archivos
 *     chicos — así se descartó ese protocolo para imágenes en su momento.
 *   - Video: mismo protocolo asset (`videoUrl`, más abajo) — un archivo de
 *     cientos de MB/GB no puede cargarse entero a memoria como data URI sin
 *     reventar recursos, necesita streaming real.
 *   - En modo web (sin Tauri) → null (el llamador cae a su placeholder).
 */

import { isTauri } from "../ipc/index.js";

const READY = /^(https?:|data:|blob:)/i;
const cache = new Map(); // path → data URI | null (o Promise en vuelo)

// "Bust" de versión para forzar un repintado real (ver stores/artRefresh.js):
// cambiar el bust cambia la cadena de la ruta, lo que invalida la entrada del
// `cache` de abajo (la clave es la ruta completa) y fuerza a la WebView a
// revalidar de verdad una URL remota (un simple #fragmento no lo lograría, el
// navegador cachea ignorándolo). `data:`/`blob:` no se bustean (no tiene
// sentido: no hay nada del otro lado que pueda haber cambiado).
const BUST_MARK = "#gmv=";
export function bustPath(path, bust) {
  if (!path || !bust) return path;
  if (/^(data:|blob:)/i.test(path)) return path;
  if (/^https?:/i.test(path)) {
    return `${path}${path.includes("?") ? "&" : "?"}gmv=${bust}`;
  }
  return `${path}${BUST_MARK}${bust}`;
}

// Recorta el sufijo de bust de una ruta LOCAL antes de pedírsela al backend
// (read_image no debe recibir el "#gmv=…" como parte del path del fichero).
function stripBust(path) {
  const i = path.indexOf(BUST_MARK);
  return i === -1 ? path : path.slice(0, i);
}

let _invoke = null;
async function invoke(cmd, args) {
  if (!_invoke) {
    const core = await import("@tauri-apps/api/core");
    _invoke = core.invoke;
  }
  return _invoke(cmd, args);
}

// Cola con límite de concurrencia para read_image — un álbum con muchas
// imágenes dispararía cientos de lecturas simultáneas (cada una lee el
// archivo completo + lo codifica a base64) si se piden todas de una.
// ImageThumb.svelte ya evita pedir las que no se ven (lazyVisible.js), pero
// el margen de precarga + una grilla grande puede dejar varias decenas
// "visibles" al mismo tiempo — sin este límite, esas decenas igual se piden
// todas juntas. Acá se procesan de a MAX_CONCURRENT por vez, en el orden en
// que se encolan (scroll hacia abajo = llegan en orden), dando el efecto de
// "cargar por lotes" en vez de todo de golpe.
const MAX_CONCURRENT_IMAGE_LOADS = 5;
let activeImageLoads = 0;
const imageQueue = [];
function runImageQueue() {
  while (activeImageLoads < MAX_CONCURRENT_IMAGE_LOADS && imageQueue.length) {
    const job = imageQueue.shift();
    activeImageLoads++;
    job().finally(() => {
      activeImageLoads--;
      runImageQueue();
    });
  }
}
function enqueueImageLoad(task) {
  return new Promise((resolve, reject) => {
    imageQueue.push(() => task().then(resolve, reject));
    runImageQueue();
  });
}

export async function imageUrl(path) {
  if (!path) return null;
  if (READY.test(path)) return path;
  if (!isTauri) return null;
  if (cache.has(path)) return cache.get(path);

  const p = enqueueImageLoad(() => invoke("read_image", { path: stripBust(path) }))
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

// Video (Multimedia → Videos): a diferencia de imagen/audio, NO se carga a
// memoria como data URI (un archivo de cientos de MB/GB reventaría memoria
// y tardaría en arrancar) — usa el protocolo `asset` de Tauri, que streamea
// directo desde disco con seek real. La carpeta debe estar autorizada de
// antemano (`allowVideoFolder`, ver stores/videoLibrary.js) o el `<video>`
// recibe un 403. Sin caché (no hace falta: convertFileSrc es síncrono/local
// una vez cargado el módulo, no una llamada a Rust).
let _convertFileSrc = null;
export async function videoUrl(path) {
  if (!path) return null;
  if (READY.test(path)) return path;
  if (!isTauri) return null;
  if (!_convertFileSrc) {
    const core = await import("@tauri-apps/api/core");
    _convertFileSrc = core.convertFileSrc;
  }
  return _convertFileSrc(path);
}
