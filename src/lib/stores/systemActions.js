import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { openShutdownConfirm } from "./ui.js";
import { minimizeWindow, maximizeWindow, enterFullscreen, exitFullscreen, closeApp } from "../util/window.js";

/*
 * Preferencias de la sección "Acciones del sistema" (menú de Configuración).
 * Globales (no por perfil): son sobre comportamiento del launcher, no aspecto.
 *   - showPowerFooter: fila de botones de ventana/energía al final del menú
 *     de Configuración. Oculta por defecto; el acceso rápido equivalente es
 *     el menú radial de mando (mantener Home, ver stores/radialMenu.js) o el
 *     atajo de teclado/mouse, que abre esta misma lista (SystemQuickMenu).
 *   - quickMenuOrder: orden de las opciones de ese menú rápido (lista,
 *     teclado/mouse), editable aquí con mover arriba/abajo.
 */

export const showPowerFooter = writable(false);

// Los `id` se persisten en `quickMenuOrder`/`radialSlots`: no se renombran.
// La etiqueta sale del diccionario (ver docs/i18n.md).
export const QUICK_MENU_ACTIONS = [
  { id: "minimize", labelKey: "system.actions.minimize" },
  { id: "maximize", labelKey: "system.actions.maximize" },
  { id: "exitFullscreen", labelKey: "system.actions.exitFullscreen" },
  { id: "enterFullscreen", labelKey: "system.actions.enterFullscreen" },
  { id: "closeApp", labelKey: "system.actions.closeApp" },
  { id: "shutdown", labelKey: "system.actions.shutdown" },
];

// Orden por defecto: invertido respecto al orden en que se pidieron las
// opciones (Minimizar...Apagar) — Apagar queda arriba, Minimizar abajo.
const DEFAULT_ORDER = [
  "shutdown",
  "closeApp",
  "enterFullscreen",
  "exitFullscreen",
  "maximize",
  "minimize",
];

export const quickMenuOrder = writable([...DEFAULT_ORDER]);

let _loaded = false;

export async function initSystemActions() {
  if (_loaded) return;
  const cfg = await loadAppConfig();
  showPowerFooter.set(cfg?.showPowerFooter ?? false);

  const saved = Array.isArray(cfg?.quickMenuOrder) ? cfg.quickMenuOrder : null;
  const validSaved =
    saved && saved.length === DEFAULT_ORDER.length && DEFAULT_ORDER.every((id) => saved.includes(id));
  quickMenuOrder.set(validSaved ? saved : [...DEFAULT_ORDER]);

  _loaded = true;
}

export async function setShowPowerFooter(v) {
  showPowerFooter.set(v);
  await patchAppConfig({ showPowerFooter: v });
}

// Mueve una acción un puesto (dir: -1 arriba, +1 abajo); no-op en los extremos.
export async function moveQuickMenuAction(id, dir) {
  quickMenuOrder.update((list) => {
    const i = list.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  await patchAppConfig({ quickMenuOrder: get(quickMenuOrder) });
}

export async function resetQuickMenuOrder() {
  quickMenuOrder.set([...DEFAULT_ORDER]);
  await patchAppConfig({ quickMenuOrder: get(quickMenuOrder) });
}

// Ejecuta una acción de QUICK_MENU_ACTIONS por id — compartida entre
// SystemQuickMenu.svelte (lista, teclado/mouse) y el menú radial de mando
// (stores/radialMenu.js), para no duplicar este mapa en dos sitios.
const HANDLERS = {
  minimize: minimizeWindow,
  maximize: maximizeWindow,
  exitFullscreen,
  enterFullscreen,
  closeApp,
};

export async function runSystemAction(id) {
  if (id === "shutdown") {
    // Se queda abierto detrás de la confirmación (mismo patrón que el pie
    // de Configuración: "Apagar" no oculta lo demás por sí solo).
    return openShutdownConfirm();
  }
  await HANDLERS[id]?.();
}
