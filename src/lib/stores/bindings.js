import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Atajos de mando configurables: mapa `botón físico -> acción`.
 * Las direcciones (d-pad/stick) NO se remapean (son navegación fija);
 * solo los botones de acción. Ver docs/input.md.
 */

// Acciones asignables (con etiqueta para la UI de remapeo).
export const ACTIONS = [
  { id: "accept", label: "Aceptar / Jugar" },
  { id: "north", label: "Detalle · Espacio (teclado)" },
  { id: "back", label: "Volver / Cancelar" },
  { id: "west", label: "Borrar (teclado)" },
  { id: "menu", label: "Menú Configuración" },
  { id: "quick", label: "Menú Sistema (QAM)" },
  { id: "tabLeft", label: "Pestaña anterior" },
  { id: "tabRight", label: "Pestaña siguiente" },
  { id: "search", label: "Buscar (en Juegos)" },
  { id: "filterPrev", label: "Filtro tienda ◀ (Juegos)" },
  { id: "filterNext", label: "Filtro tienda ▶ (Juegos)" },
  { id: "filters", label: "Filtros y orden (Juegos/Apps)" },
  { id: "context", label: "Menú de tarjeta" },
];

// Etiqueta legible de cada botón físico.
export const BUTTON_LABELS = {
  south: "A / Cross",
  east: "B / Circle",
  north: "Y / Triángulo",
  west: "X / Cuadrado",
  l1: "LB / L1",
  r1: "RB / R1",
  lt: "LT / L2",
  rt: "RT / R2",
  l3: "L3 (stick izq.)",
  r3: "R3 (stick der.)",
  start: "Start / Options",
  select: "Select / Share",
  guide: "Guide / PS",
};

const DEFAULTS = {
  south: "accept",
  east: "back",
  north: "north",
  west: "west",
  l1: "tabLeft",
  r1: "tabRight",
  lt: "filterPrev",
  rt: "filterNext",
  l3: "search",
  r3: "filters",
  start: "menu",
  select: "quick",
};

// Mapa reactivo botón -> acción.
export const bindings = writable({ ...DEFAULTS });

export async function initBindings() {
  const cfg = await loadAppConfig();
  const saved = cfg?.bindings ? { ...cfg.bindings } : {};
  // "guide" (Home) ya no tiene acción individual por defecto — queda
  // reservado como modificador de combos (ver comboShortcuts.js). Si se
  // heredó "quick" del default viejo, se limpia una vez; una reasignación
  // deliberada del usuario a otra acción no se toca.
  if (saved.guide === "quick") delete saved.guide;
  bindings.set({ ...DEFAULTS, ...saved });
}

// Acción asignada a un botón crudo (o null).
export function resolve(buttonId) {
  return get(bindings)[buttonId] || null;
}

// Botón asignado actualmente a una acción (el primero que la tenga).
export function buttonForAction(action) {
  const m = get(bindings);
  return Object.keys(m).find((b) => m[b] === action) || null;
}

// Asigna `button` a `action` intercambiando (swap) con lo que hubiera, para no
// dejar acciones huérfanas ni botones duplicados.
export async function assignAction(action, button) {
  bindings.update((m) => {
    const next = { ...m };
    const prevButtonOfAction = Object.keys(next).find((b) => next[b] === action);
    const prevActionOfButton = next[button] || null;
    next[button] = action;
    if (prevButtonOfAction && prevButtonOfAction !== button) {
      next[prevButtonOfAction] = prevActionOfButton;
    }
    return next;
  });
  await persistBindings();
}

export async function resetBindings() {
  bindings.set({ ...DEFAULTS });
  await persistBindings();
}

async function persistBindings() {
  await patchAppConfig({ bindings: get(bindings) });
}
