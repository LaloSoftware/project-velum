/*
 * Iconos de botones de control, organizados como
 *   src/assets/icons/<estilo>/<plataforma>/<token>.svg
 * (ej. duotono/xbox/south.svg). `<token>` es el mismo identificador físico
 * que ya usa `stores/bindings.js` (south, east, l1, up, guide, ...), así que
 * añadir un estilo o plataforma nueva es solo agregar una carpeta con esos
 * mismos nombres — este resolver no necesita ninguna tabla de traducción.
 *
 * `import.meta.glob` descubre los SVGs en build-time; se arma un mapa
 * { [estilo]: { [plataforma]: { [token]: urlDelAsset } } }.
 */
const modules = import.meta.glob("/src/assets/icons/*/*/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

const ICONS = {};
for (const path in modules) {
  const m = path.match(/icons\/([^/]+)\/([^/]+)\/([^/]+)\.svg$/);
  if (!m) continue;
  const [, style, platform, token] = m;
  ((ICONS[style] ??= {})[platform] ??= {})[token] = modules[path];
}

// Devuelve la URL del icono para ese token físico, o null si no existe
// (estilo/plataforma sin ese icono, o directorio de assets vacío/incompleto).
export function iconFor(style, platform, token) {
  return ICONS[style]?.[platform]?.[token] || null;
}
