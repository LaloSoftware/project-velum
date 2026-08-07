import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Atajos por combinación de botones (mantener varios a la vez).
 * Distinto de bindings.js (un botón -> una acción): aquí un combo dispara una
 * acción de sistema cuando TODOS sus botones crudos están presionados juntos.
 * Ver detección en input/index.js (heldButtons/checkCombos).
 *
 * Sin combos por defecto: los dos que existían (Home+Start -> menú de sistema,
 * Home+L3 -> detalle de sync de Steam) se retiraron al reemplazar Home por el
 * menú radial (ver stores/radialMenu.js) — Home ya no es modificador de combo,
 * abre el radial directo al presionarse. La infraestructura de combos se deja
 * intacta por si se agrega uno nuevo a futuro (lista vacía = sin efecto).
 */

const DEFAULT_COMBOS = [];

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
