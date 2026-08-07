import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { QUICK_MENU_ACTIONS, runSystemAction } from "./systemActions.js";

/*
 * Menú radial de sistema (mando): mantener "Home/Guide" abre un overlay a
 * pantalla completa con 8 posiciones fijas — rombo central sobre los botones
 * de cara (south/east/north/west) + 4 alrededor sobre hombros/gatillos
 * (l1/r1/lt/rt) — cada una puede tener asignada una de las QUICK_MENU_ACTIONS
 * (systemActions.js). Soltar Home sin elegir cancela sin acción. Reemplaza al
 * combo Home+Start (retirado, ver comboShortcuts.js) SOLO para mando —
 * teclado/mouse sigue abriendo la lista de siempre (SystemQuickMenu.svelte)
 * con el atajo "openSystemMenu" existente.
 *
 * Toda la detección de "mantener Home"/congelar el resto de botones vive en
 * input/index.js (handleRaw) — este archivo solo guarda la configuración y
 * resuelve qué hacer cuando se presiona un botón mientras el radial está
 * abierto (runRadialInput).
 */

export const RADIAL_POSITIONS = ["south", "east", "north", "west", "l1", "r1", "lt", "rt"];

export const radialMenu = writable(false);

// posición -> id de QUICK_MENU_ACTIONS | null. Default: acciones más usadas en
// las 6 posiciones "naturales", lt/rt libres de sobra.
const DEFAULT_SLOTS = {
  north: "shutdown", // gesto hacia arriba, mismo criterio que "Apagar" primero en quickMenuOrder
  south: "closeApp",
  west: "minimize",
  east: "maximize",
  l1: "exitFullscreen",
  r1: "enterFullscreen",
  lt: null,
  rt: null,
};

export const radialSlots = writable({ ...DEFAULT_SLOTS });

// null = soltar Home cancela (default). Nombre de botón = ese botón cancela
// explícitamente mientras se mantiene Home (soltar Home sigue cancelando
// siempre además, sin excepción — ver input/index.js).
export const radialCancelButton = writable(null);

let _loaded = false;

export async function initRadialMenu() {
  if (_loaded) return;
  const cfg = await loadAppConfig();
  if (cfg?.radialSlots && typeof cfg.radialSlots === "object") {
    radialSlots.set({ ...DEFAULT_SLOTS, ...cfg.radialSlots });
  }
  if (RADIAL_POSITIONS.includes(cfg?.radialCancelButton)) {
    radialCancelButton.set(cfg.radialCancelButton);
  }
  _loaded = true;
}

export function openRadialMenu() {
  radialMenu.set(true);
}
export function closeRadialMenu() {
  radialMenu.set(false);
}

export async function setRadialSlot(position, actionId) {
  if (!RADIAL_POSITIONS.includes(position)) return;
  radialSlots.update((s) => ({ ...s, [position]: actionId || null }));
  await patchAppConfig({ radialSlots: get(radialSlots) });
}

export async function setRadialCancelButton(position) {
  const v = RADIAL_POSITIONS.includes(position) ? position : null;
  radialCancelButton.set(v);
  await patchAppConfig({ radialCancelButton: v });
}

// Se llama desde input/index.js con el nombre crudo de cada botón presionado
// mientras el radial está abierto. Devuelve true si hizo algo con ese botón
// (para que el llamador sepa que ya no hace falta seguir procesándolo).
export function runRadialInput(name) {
  if (!get(radialMenu)) return false;
  const cancelBtn = get(radialCancelButton);
  if (cancelBtn && name === cancelBtn) {
    closeRadialMenu();
    return true;
  }
  if (!RADIAL_POSITIONS.includes(name)) return false; // botón sin función acá: se ignora, el radial sigue abierto
  const id = get(radialSlots)[name];
  closeRadialMenu();
  if (id) runSystemAction(id);
  return true;
}

export const RADIAL_LABEL = Object.fromEntries(QUICK_MENU_ACTIONS.map((a) => [a.id, a.label]));
