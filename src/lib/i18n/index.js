import { writable, derived, get } from "svelte/store";
import es419 from "./locales/es-419.js";
import esES from "./locales/es-ES.js";
import enUS from "./locales/en-US.js";

/*
 * Runtime de i18n propio (sin dependencias — mismo criterio que el resto del
 * repo: se evita sumar librería + configuración para lo que son ~90 líneas).
 * Tres piezas:
 *   - `locale`: store con el id del idioma activo ("es-419" | "es-ES" | "en-US").
 *   - `t`: store DERIVADO que expone una función — se usa como `$t("clave", vars)`
 *     en componentes; al derivar de `locale`, cambiar el idioma re-renderiza todo
 *     lo que lo consuma, sin recargar la app.
 *   - `tr(clave, vars)`: versión imperativa (NO reactiva) para stores y funciones
 *     que arman un mensaje una sola vez (toasts, errores).
 *
 * Este módulo NO importa nada de stores/ — así puede importarse desde cualquier
 * store sin crear ciclos. La persistencia vive en stores/language.js.
 *
 * Los 3 diccionarios se importan ESTÁTICAMENTE a propósito (~20 KB gzip los tres,
 * desde disco): el idioma queda disponible sincrónicamente antes del primer
 * pintado, sin estado "cargando" ni carrera con los init*() de App.svelte.
 */

// Catálogo de idiomas de interfaz. `steamLang` es la preselección de idioma de
// Steam asociada (ver stores/language.js::steamLangFor); `intl` es el tag
// BCP-47 que se le pasa a Intl.*.
export const UI_LOCALES = [
  { id: "es-419", label: "Español (Latinoamérica)", steamLang: "latam", intl: "es-419" },
  { id: "es-ES", label: "Español (España)", steamLang: "spanish", intl: "es-ES" },
  { id: "en-US", label: "English (US)", steamLang: "english", intl: "en-US" },
];
export const DEFAULT_LOCALE = "es-419";

const DICTS = { "es-419": es419, "es-ES": esES, "en-US": enUS };

export const locale = writable(DEFAULT_LOCALE);

export function localeMeta(id) {
  return UI_LOCALES.find((l) => l.id === id) || UI_LOCALES[0];
}

// Intl.PluralRules es caro de construir: uno por idioma, cacheado.
const _plurals = new Map();
function pluralRules(id) {
  if (!_plurals.has(id)) _plurals.set(id, new Intl.PluralRules(localeMeta(id).intl));
  return _plurals.get(id);
}

// Aviso UNA sola vez por clave faltante (solo en dev): recorrer la app con el
// idioma en inglés y mirar la consola es el chequeo más barato de cobertura.
const _warned = new Set();
function lookup(id, key) {
  let v = DICTS[id]?.[key];
  if (v === undefined && id !== DEFAULT_LOCALE) v = DICTS[DEFAULT_LOCALE][key];
  if (v === undefined) {
    if (import.meta.env.DEV && !_warned.has(key)) {
      _warned.add(key);
      console.warn(`[gm:i18n] clave sin traducción: ${key}`);
    }
    return null;
  }
  return v;
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

export function translate(id, key, vars) {
  let entry = lookup(id, key);
  if (entry === null) return key; // nunca pantalla en blanco: se ve la clave
  if (typeof entry === "object") {
    // Entrada plural: { one, other } — se elige por `count` con las reglas del
    // idioma. es/en usan one/other; un idioma futuro con few/many entra sin
    // tocar este código.
    const cat = pluralRules(id).select(Number(vars?.count ?? 0));
    entry = entry[cat] ?? entry.other ?? "";
  }
  return interpolate(entry, vars);
}

export const t = derived(locale, ($l) => (key, vars) => translate($l, key, vars));

export function tr(key, vars) {
  return translate(get(locale), key, vars);
}

/*
 * Formateadores dependientes del idioma. Derivado (se reconstruye solo al
 * cambiar de idioma) y con los Intl.* cacheados adentro: el reloj de la barra
 * superior formatea una vez por segundo y no debe construir un DateTimeFormat
 * cada vez. `timeStyle: "short"` resuelve 12h/24h por idioma — es lo que
 * reemplaza a los `.toLocaleTimeString().slice(0, 5)` que rompían con AM/PM.
 */
export const fmt = derived(locale, ($l) => {
  const intl = localeMeta($l).intl;
  const time = new Intl.DateTimeFormat(intl, { timeStyle: "short" });
  const date = new Intl.DateTimeFormat(intl, { dateStyle: "medium" });
  const num = new Intl.NumberFormat(intl);
  return {
    time: (d) => time.format(d),
    date: (d) => date.format(d),
    dateTime: (d) => `${date.format(d)} ${time.format(d)}`,
    number: (n) => num.format(n),
  };
});
