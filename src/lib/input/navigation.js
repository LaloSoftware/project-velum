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

// Grupo de foco (región) al que pertenece un elemento, o null.
function groupOf(el) {
  return el.closest?.("[data-focus-group]") || null;
}

// Mejor candidato en la dirección `dir` dentro de una lista (por geometría).
function bestCandidate(cur, list, dir) {
  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width / 2;
  const cy = cr.top + cr.height / 2;

  let best = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;

    let valid = false;
    let primary = 0;
    let secondary = 0;
    if (dir === "left") (valid = dx < -1), (primary = -dx), (secondary = Math.abs(dy));
    if (dir === "right") (valid = dx > 1), (primary = dx), (secondary = Math.abs(dy));
    if (dir === "up") (valid = dy < -1), (primary = -dy), (secondary = Math.abs(dx));
    if (dir === "down") (valid = dy > 1), (primary = dy), (secondary = Math.abs(dx));
    if (!valid) continue;

    const score = primary + secondary * 2.2; // penaliza desalineación perpendicular
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

// Un <input type="range"> enfocado usa Izquierda/Derecha para ajustar su valor
// (patrón estándar de sliders en UIs de mando) en vez de mover el foco.
function adjustRange(el, dir) {
  const step = Number(el.step) || 1;
  const min = Number(el.min) || 0;
  const max = Number(el.max) || 100;
  const cur = Number(el.value);
  const next = dir === "left" ? Math.max(min, cur - step) : Math.min(max, cur + step);
  if (next === cur) return;
  el.value = String(next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function move(dir) {
  const cur0 = current();
  if (cur0?.tagName === "INPUT" && cur0.type === "range" && (dir === "left" || dir === "right")) {
    return adjustRange(cur0, dir);
  }

  const list = focusables();
  if (!list.length) return;
  const cur = current();
  if (!cur) return focusFirst();

  // Si hay regiones (focus groups): primero dentro del mismo grupo; si no hay
  // candidato en esa dirección, se cruza al mejor candidato de otra región.
  const group = groupOf(cur);
  let best;
  if (group) {
    const inGroup = list.filter((el) => groupOf(el) === group);
    const outGroup = list.filter((el) => groupOf(el) !== group);
    best = bestCandidate(cur, inGroup, dir) || bestCandidate(cur, outGroup, dir);
  } else {
    best = bestCandidate(cur, list, dir);
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

// Menú contextual (acción `context`): dispara `gmcontext` en el elemento enfocado.
export function context() {
  const cur = current();
  if (cur) cur.dispatchEvent(new CustomEvent("gmcontext", { bubbles: true }));
}

// Enfoca el primer focusable dentro de un contenedor (para "entrar" a una región).
export function focusFirstIn(container) {
  if (!container) return;
  const el = [...container.querySelectorAll("[data-focusable]")].find(isVisible);
  if (el) focusEl(el);
}
