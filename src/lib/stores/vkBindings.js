import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Atajos de MANDO exclusivos del teclado virtual (independientes del resto,
 * ver stores/bindings.js). Antes, "escribir espacio"/"borrar"/"mayúsculas"/
 * "cancelar"/"confirmar" reutilizaban el mismo botón físico que Detalle/
 * Menú de tarjeta/Pestañas/Volver — reasignar uno movía el otro también.
 * Ahora son su propio mapa `botón físico -> acción de teclado virtual`,
 * consultado SOLO mientras `stores/keyboard.js` -> `vk.open` es true (ver
 * `input/index.js` -> handleRaw). Si un botón no tiene entrada aquí, cae al
 * mapa normal de bindings.js sin cambios (así "Aceptar" sigue escribiendo la
 * tecla del teclado en pantalla igual que antes: activar el foco es
 * genérico, no hace falta un atajo de teclado virtual aparte para eso).
 *
 * No hay tabla de teclado físico/mouse aquí: con teclado físico se escribe
 * directo (ver handlePhysicalTyping en input/index.js) — no tiene sentido
 * "reasignar" qué tecla escribe una letra.
 */

export const VK_ACTIONS = [
  { id: "vkSpace", label: "Espacio" },
  { id: "vkBackspace", label: "Borrar" },
  { id: "vkShift", label: "Alternar mayúsculas" },
  { id: "vkCancel", label: "Cancelar (sin guardar)" },
  { id: "vkConfirm", label: "Confirmar y cerrar" },
];

// Semilla = mismos botones físicos que antes reinterpretaban su acción
// normal dentro del teclado virtual (north→espacio, west→borrar, l1/r1→
// mayúsculas, east→cancelar/B, rt→confirmar).
const DEFAULTS = {
  north: "vkSpace",
  west: "vkBackspace",
  l1: "vkShift",
  r1: "vkShift",
  east: "vkCancel",
  rt: "vkConfirm",
};

export const vkBindings = writable({ ...DEFAULTS });

export async function initVkBindings() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.vkBindings) vkBindings.set({ ...DEFAULTS, ...cfg.vkBindings });
}

// Acción de teclado virtual asignada a un botón crudo (o null).
export function resolveVk(buttonId) {
  return get(vkBindings)[buttonId] || null;
}

// Botón asignado actualmente a una acción de teclado virtual (el primero que la tenga).
export function buttonForVkAction(action) {
  const m = get(vkBindings);
  return Object.keys(m).find((b) => m[b] === action) || null;
}

// Mismo patrón swap que bindings.js:assignAction.
export async function assignVkAction(action, button) {
  vkBindings.update((m) => {
    const next = { ...m };
    const prevButtonOfAction = Object.keys(next).find((b) => next[b] === action);
    const prevActionOfButton = next[button] || null;
    next[button] = action;
    if (prevButtonOfAction && prevButtonOfAction !== button) {
      next[prevButtonOfAction] = prevActionOfButton;
    }
    return next;
  });
  await persistVkBindings();
}

export async function resetVkBindings() {
  vkBindings.set({ ...DEFAULTS });
  await persistVkBindings();
}

async function persistVkBindings() {
  await patchAppConfig({ vkBindings: get(vkBindings) });
}
