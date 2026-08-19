import { writable, derived, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { t } from "../i18n/index.js";

/*
 * Atajos de mando configurables: mapa `botón físico -> acción`.
 * Las direcciones (d-pad/stick) NO se remapean (son navegación fija);
 * solo los botones de acción. Ver docs/input.md.
 */

// Acciones asignables (con etiqueta para la UI de remapeo). Los `id` se
// persisten en `bindings`: no se renombran.
export const ACTIONS = [
  { id: "accept", labelKey: "input.actions.accept" },
  { id: "north", labelKey: "input.actions.north" },
  { id: "back", labelKey: "input.actions.back" },
  { id: "west", labelKey: "input.actions.west" },
  { id: "menu", labelKey: "input.actions.menu" },
  { id: "quick", labelKey: "input.actions.quick" },
  { id: "tabLeft", labelKey: "input.actions.tabLeft" },
  { id: "tabRight", labelKey: "input.actions.tabRight" },
  { id: "search", labelKey: "input.actions.search" },
  { id: "filterPrev", labelKey: "input.actions.filterPrev" },
  { id: "filterNext", labelKey: "input.actions.filterNext" },
  { id: "filters", labelKey: "input.actions.filters" },
  { id: "context", labelKey: "input.actions.context" },
];

/*
 * Etiqueta legible de cada botón físico. Derivado (no un objeto plano) porque
 * se pinta en la UI de atajos y en el overlay de "volver al launcher": tiene
 * que cambiar en caliente al cambiar de idioma.
 *
 * Solo se traduce el DESCRIPTOR, nunca el token: "A", "B", "LB", "RT",
 * "Start", "Cross", "Circle" son la nomenclatura impresa en el propio mando y
 * es la misma en cualquier idioma. Lo traducible es "Triángulo"/"Cuadrado" y
 * las aclaraciones de los sticks.
 */
export const BUTTON_LABELS = derived(t, ($t) => ({
  south: "A / Cross",
  east: "B / Circle",
  north: `Y / ${$t("input.buttons.triangle")}`,
  west: `X / ${$t("input.buttons.square")}`,
  l1: "LB / L1",
  r1: "RB / R1",
  lt: "LT / L2",
  rt: "RT / R2",
  l3: `L3 (${$t("input.buttons.leftStick")})`,
  r3: `R3 (${$t("input.buttons.rightStick")})`,
  start: "Start / Options",
  select: "Select / Share",
  guide: "Guide / PS",
}));

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
