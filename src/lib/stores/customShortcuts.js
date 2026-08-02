import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Atajos de teclado del sistema operativo, definidos por el usuario (ej. Alt+R
 * para un overlay de FPS/CPU) y ejecutables desde el menú de sistema (QAM >
 * Atajos). Cada atajo: { id, label, modifiers: string[], code }.
 * `modifiers` ⊆ ["ctrl","alt","shift","meta"]; `code` es un KeyboardEvent.code
 * (ej. "KeyR") — se guarda estructurado, no como string, para no depender de
 * parseo ni en el frontend ni en el backend (ver ipc/index.js runShortcut).
 */

const MODIFIER_LABELS = { ctrl: "Ctrl", alt: "Alt", shift: "Shift", meta: "Win" };

// Mismo criterio que labelForToken en keyBindings.js, pero sobre un `code`
// crudo (sin prefijo "key:") en vez de un token de remapeo de acciones.
function codeLabel(code) {
  if (!code) return "—";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return code;
}

export function displayLabel(item) {
  if (!item) return "—";
  const mods = (item.modifiers || []).map((m) => MODIFIER_LABELS[m] || m);
  return [...mods, codeLabel(item.code)].join(" + ");
}

export const customShortcuts = writable([]);

export async function initCustomShortcuts() {
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.customShortcuts)) customShortcuts.set(cfg.customShortcuts);
}

async function persist() {
  await patchAppConfig({ customShortcuts: get(customShortcuts) });
}

export async function createCustomShortcut(label, modifiers, code) {
  const s = { id: `cs_${Date.now()}`, label: label || "Atajo", modifiers, code };
  customShortcuts.update((l) => [...l, s]);
  await persist();
  return s;
}

export async function deleteCustomShortcut(id) {
  customShortcuts.update((l) => l.filter((s) => s.id !== id));
  await persist();
}
