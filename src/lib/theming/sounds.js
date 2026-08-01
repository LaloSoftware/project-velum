/*
 * Sonidos de la app, organizados como
 *   src/assets/sounds/<categoria>/<nombre>.ogg
 * (ej. startup/startintsound_0.ogg). Se usa siempre OGG Vorbis: mismo audio
 * que los .wav que puedan acompañar en la carpeta, con muchísimo menos peso
 * (~13x en el set de arranque) — acorde al objetivo de mínimo consumo de
 * recursos del proyecto.
 *
 * `import.meta.glob` descubre los .ogg en build-time; se arma un mapa
 * { [categoria]: { [nombre]: urlDelAsset } }.
 */
const modules = import.meta.glob("/src/assets/sounds/*/*.ogg", {
  eager: true,
  query: "?url",
  import: "default",
});

const SOUNDS = {};
for (const path in modules) {
  const m = path.match(/sounds\/([^/]+)\/([^/]+)\.ogg$/);
  if (!m) continue;
  const [, category, name] = m;
  (SOUNDS[category] ??= {})[name] = modules[path];
}

// Nombres de sonido disponibles en una categoría (ordenados), o [] si no hay.
export function soundNames(category) {
  return Object.keys(SOUNDS[category] || {}).sort();
}

// URL del sonido, o null si no existe.
export function soundFor(category, name) {
  return SOUNDS[category]?.[name] || null;
}
