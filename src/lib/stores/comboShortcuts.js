import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Atajos por combinación de botones (mantener varios a la vez).
 * Distinto de bindings.js (un botón -> una acción): aquí un combo dispara una
 * acción de sistema cuando TODOS sus botones crudos están presionados juntos.
 * Ver detección en input/index.js (heldButtons/checkCombos).
 */

const DEFAULT_COMBOS = [
  // Home (guide) + Start: abre el menú rápido de sistema (ver SystemQuickMenu).
  { id: "system-menu", label: "Menú de sistema", buttons: ["guide", "start"], action: "openSystemMenu", enabled: true },
];

export const comboShortcuts = writable(DEFAULT_COMBOS.map((c) => ({ ...c })));

let _loaded = false;

export async function initComboShortcuts() {
  if (_loaded) return;
  const cfg = await loadAppConfig();
  if (Array.isArray(cfg?.comboShortcuts) && cfg.comboShortcuts.length) {
    // Combina con los defaults por si se agrega un combo nuevo en una versión futura.
    comboShortcuts.set(
      DEFAULT_COMBOS.map((def) => {
        const saved = cfg.comboShortcuts.find((c) => c.id === def.id);
        return saved ? { ...def, ...saved } : { ...def };
      })
    );
  }
  _loaded = true;
}

async function persist() {
  await patchAppConfig({ comboShortcuts: get(comboShortcuts) });
}

export async function setComboButtons(id, buttons) {
  comboShortcuts.update((list) => list.map((c) => (c.id === id ? { ...c, buttons } : c)));
  await persist();
}

export async function setComboEnabled(id, enabled) {
  comboShortcuts.update((list) => list.map((c) => (c.id === id ? { ...c, enabled } : c)));
  await persist();
}

export async function resetCombos() {
  comboShortcuts.set(DEFAULT_COMBOS.map((c) => ({ ...c })));
  await persist();
}
