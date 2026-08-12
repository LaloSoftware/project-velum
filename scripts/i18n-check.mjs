#!/usr/bin/env node
/*
 * Verificador de los diccionarios de i18n. Sin dependencias (node:fs + regex),
 * igual que el resto de scripts/ del repo.
 *
 *   node scripts/i18n-check.mjs            paridad + claves usadas sin definir
 *   node scripts/i18n-check.mjs --unused   además, claves definidas sin usar
 *
 * Sale con código 1 si hay algún error — pensado para correrlo antes de cerrar
 * cada tanda de traducción (ver docs/i18n.md).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = join(ROOT, "src/lib/i18n/locales");
const CANONICAL = "es-419";

// El propio runtime (src/lib/i18n/) se excluye del escaneo: no es consumidor
// de claves, y sí contiene ejemplos en comentarios y el prefijo dinámico
// `tr("errors." + code)` — los tomaría por claves reales.
const I18N_DIR = join(ROOT, "src/lib/i18n");

function walk(dir, out = []) {
  if (dir === I18N_DIR) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(svelte|js)$/.test(p)) out.push(p);
  }
  return out;
}

const dicts = {};
for (const f of readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".js"))) {
  const id = f.replace(/\.js$/, "");
  dicts[id] = (await import(pathToFileURL(join(LOCALES_DIR, f)).href)).default;
}

const ids = Object.keys(dicts);
if (!ids.includes(CANONICAL)) {
  console.error(`[i18n] falta el idioma canónico ${CANONICAL} en ${LOCALES_DIR}`);
  process.exit(1);
}

let errors = 0;
const err = (msg) => {
  errors++;
  console.error(`[i18n] ${msg}`);
};

// --- 1. Paridad de claves entre idiomas -------------------------------------
const canonicalKeys = new Set(Object.keys(dicts[CANONICAL]));
for (const id of ids) {
  if (id === CANONICAL) continue;
  const keys = new Set(Object.keys(dicts[id]));
  for (const k of canonicalKeys) if (!keys.has(k)) err(`${id}: falta la clave "${k}"`);
  for (const k of keys) if (!canonicalKeys.has(k)) err(`${id}: clave sobrante "${k}" (no está en ${CANONICAL})`);
}

// --- 2. Plurales bien formados ----------------------------------------------
for (const id of ids) {
  for (const [k, v] of Object.entries(dicts[id])) {
    if (v && typeof v === "object" && !("other" in v)) {
      err(`${id}: la entrada plural "${k}" no tiene "other" (es la categoría de respaldo)`);
    }
  }
}

// --- 3. Claves usadas en el código ------------------------------------------
// Se detectan las formas literales; las dinámicas ("detail.sections." + id) no
// se pueden resolver estáticamente y se reportan aparte para revisarlas a ojo.
const USE_RE = /(?:\$t|\bt|\btr)\(\s*"([^"]+)"|(?:labelKey|defaultKey)\s*:\s*"([^"]+)"/g;
const DYNAMIC_RE = /(?:\$t|\bt|\btr)\(\s*"[^"]*"\s*\+/g;

const used = new Set();
let dynamic = 0;
for (const file of walk(join(ROOT, "src"))) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(USE_RE)) used.add(m[1] ?? m[2]);
  dynamic += [...src.matchAll(DYNAMIC_RE)].length;
}

for (const k of used) {
  if (!canonicalKeys.has(k)) err(`clave usada en el código pero no definida en ${CANONICAL}: "${k}"`);
}

if (process.argv.includes("--unused")) {
  const unused = [...canonicalKeys].filter((k) => !used.has(k));
  if (unused.length) {
    console.log(
      `\n[i18n] ${unused.length} clave(s) definidas y no usadas literalmente ` +
        `(pueden construirse dinámicamente — hay ${dynamic} usos dinámicos):`
    );
    for (const k of unused) console.log(`  ${k}`);
  }
}

const total = canonicalKeys.size;
if (errors) {
  console.error(`\n[i18n] ${errors} error(es) — ${total} claves en ${CANONICAL}, ${ids.length} idiomas`);
  process.exit(1);
}
console.log(`[i18n] OK — ${total} claves × ${ids.length} idiomas, ${used.size} usadas en el código`);
