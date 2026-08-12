import { tr } from "./index.js";

/*
 * Traducción de los errores que devuelve el backend Rust.
 *
 * Contrato con Rust: el `Err(String)` de un comando Tauri es
 *   "codigo"            (p. ej. "steam.invalid_key")
 *   "codigo|detalle"    (p. ej. "steam.key_read_failed|No such keyring entry")
 * partido en el PRIMER `|`. Se eligió `|` y no un formato tipo `k=v;k=v`
 * porque el detalle viene de ureq/keyring y trae `:`, `;` y comillas sueltas
 * que romperían cualquier parseo más ambicioso.
 *
 * Todo lo que no matchee la forma de código se muestra CRUDO: los errores de
 * JS del propio frontend, los de red del WebView y cualquier mensaje viejo que
 * quede sin migrar siguen siendo legibles en vez de convertirse en una clave
 * suelta en pantalla.
 */
const CODE_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function errorMessage(err) {
  const raw = (err && err.message) || String(err);
  const sep = raw.indexOf("|");
  const code = sep === -1 ? raw : raw.slice(0, sep);
  const detail = sep === -1 ? "" : raw.slice(sep + 1);
  if (!CODE_RE.test(code)) return raw;
  return tr("errors." + code, { detail });
}
