import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Preferencias de la sección "Acciones del sistema" (menú de Configuración).
 * Globales (no por perfil): son sobre comportamiento del launcher, no aspecto.
 *   - showPowerFooter: fila de botones de ventana/energía al final del menú
 *     de Configuración. Oculta por defecto; el acceso rápido equivalente es
 *     el combo de botones (ver stores/comboShortcuts.js) o el atajo de
 *     teclado/mouse, que abren el menú rápido de sistema (SystemQuickMenu).
 *   - quickMenuOrder: orden de las opciones de ese menú rápido, editable
 *     aquí con mover arriba/abajo.
 */

export const showPowerFooter = writable(false);

export const QUICK_MENU_ACTIONS = [
  { id: "minimize", label: "Minimizar" },
  { id: "maximize", label: "Maximizar" },
  { id: "exitFullscreen", label: "Salir de pantalla completa" },
  { id: "enterFullscreen", label: "Entrar en pantalla completa" },
  { id: "closeApp", label: "Cerrar la aplicación" },
  { id: "shutdown", label: "Apagar el sistema" },
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
