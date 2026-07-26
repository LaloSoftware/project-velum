/*
 * Spatial navigation.
 *
 * Mueve el foco entre elementos [data-focusable] según la geometría en pantalla,
 * dentro de un "scope" (contenedor activo: vista o overlay). Usa el foco nativo
 * del DOM, así que el estilo de foco vive en CSS ([data-focusable]:focus).
 */

let scopeEl = null;

function focusEl(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function isVisible(el) {
  if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true")
    return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function focusables() {
  const root = scopeEl || document.body;
  return [...root.querySelectorAll("[data-focusable]")].filter(isVisible);
}

function current() {
  const a = document.activeElement;
  if (a && a.hasAttribute?.("data-focusable") && (!scopeEl || scopeEl.contains(a)))
    return a;
  return null;
}

export function setScope(el) {
  scopeEl = el || null;
  focusFirst();
}

export function focusFirst() {
  const list = focusables();
  if (!list.length) return;
  const cur = current();
  if (cur && list.includes(cur)) return;
  const def = list.find((e) => e.hasAttribute("data-focus-default")) || list[0];
  focusEl(def);
}

export function move(dir) {
  const list = focusables();
  if (!list.length) return;
  const cur = current();
  if (!cur) return focusFirst();

  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width / 2;
  const cy = cr.top + cr.height / 2;

  let best = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dx = x - cx;
    const dy = y - cy;

    let valid = false;
    let primary = 0;
    let secondary = 0;
    if (dir === "left") (valid = dx < -1), (primary = -dx), (secondary = Math.abs(dy));
    if (dir === "right") (valid = dx > 1), (primary = dx), (secondary = Math.abs(dy));
    if (dir === "up") (valid = dy < -1), (primary = -dy), (secondary = Math.abs(dx));
    if (dir === "down") (valid = dy > 1), (primary = dy), (secondary = Math.abs(dx));
    if (!valid) continue;

    // Penaliza la desalineación en el eje perpendicular.
    const score = primary + secondary * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) focusEl(best);
}

export function activate() {
  const cur = current();
  if (cur) cur.click();
}

// Acción secundaria (North / Y·Triángulo): dispara un evento custom `gmdetail`
// en el elemento enfocado. P. ej. una tarjeta de juego lo escucha para abrir el detalle.
export function secondary() {
  const cur = current();
  if (cur) cur.dispatchEvent(new CustomEvent("gmdetail", { bubbles: true }));
}
