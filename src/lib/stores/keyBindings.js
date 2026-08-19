import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { tr } from "../i18n/index.js";

/*
 * Atajos de teclado/mouse configurables: mapa `input físico -> acción`, en
 * paralelo e independiente del mapa de mando (`stores/bindings.js`). Un input
 * físico es `key:<KeyboardEvent.code>` (código físico, insensible a Shift) o
 * `mouse:<MouseEvent.button>` (0=izq., 1=medio, 2=der., 3=atrás, 4=adelante).
 */

// "Enter"/"Esc"/"Tab" son la leyenda física impresa en la tecla y no se
// traducen (mismo criterio que A/B/LB en bindings.js); el resto son
// descriptores construidos ("Clic izq.", "Botón atrás (mouse)"...), así que
// sí. `tr()` (imperativa) en vez de un objeto plano: quien llama a
// labelForToken() desde un bloque reactivo debe sumar `$t` como dependencia
// explícita para que se recalcule al cambiar de idioma (ver ButtonPrompt.svelte
// y ShortcutsSection.svelte).
function keymouseLabel(token) {
  switch (token) {
    case "key:Enter":
      return "Enter";
    case "key:Space":
      return tr("vk.space"); // mismo texto ("Espacio") que la tecla de espacio del teclado virtual
    case "key:Escape":
      return "Esc";
    case "key:Backspace":
      return tr("keyBindings.backspace");
    case "key:Tab":
      return "Tab";
    case "mouse:0":
      return tr("keyBindings.clickLeft");
    case "mouse:1":
      return tr("keyBindings.clickMiddle");
    case "mouse:2":
      return tr("keyBindings.clickRight");
    case "mouse:3":
      return tr("keyBindings.mouseBack");
    case "mouse:4":
      return tr("keyBindings.mouseForward");
    default:
      return null;
  }
}

// Etiqueta legible de un token no listado arriba (KeyQ -> "Q", Digit3 -> "3", F1 -> "F1"...).
export function labelForToken(token) {
  if (!token) return "—";
  const known = keymouseLabel(token);
  if (known) return known;
  if (token.startsWith("mouse:")) return tr("keyBindings.mouseButton", { n: token.slice(6) });
  const code = token.slice(4); // quita "key:"
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return code;
}

// Semilla = valores del antiguo KEY_MAP hardcoded de input/index.js (sin las
// flechas, que son navegación fija igual que el d-pad en bindings.js). Sin
// default para filterPrev/filterNext (tampoco lo tenían antes).
const KEY_DEFAULTS = {
  "key:Enter": "accept",
  "key:Space": "accept",
  "key:Escape": "back",
  "key:Backspace": "back",
  "key:Tab": "menu",
  "key:KeyQ": "quick",
  "key:KeyE": "tabLeft",
  "key:KeyR": "tabRight",
  "key:KeyI": "north",
  "key:KeyX": "west",
  "key:KeyC": "context",
  "key:KeyS": "search",
  "key:KeyF": "filters",
};

// Mapa reactivo input físico -> acción.
export const keyBindings = writable({ ...KEY_DEFAULTS });

export async function initKeyBindings() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.keyBindings) keyBindings.set({ ...KEY_DEFAULTS, ...cfg.keyBindings });
}

// Acción asignada a un input físico (o null).
export function resolveKeyBinding(token) {
  return get(keyBindings)[token] || null;
}

// Input físico asignado actualmente a una acción (el primero que la tenga).
export function tokenForAction(action) {
  const m = get(keyBindings);
  return Object.keys(m).find((t) => m[t] === action) || null;
}

// Asigna `token` a `action` intercambiando (swap) con lo que hubiera, para no
// dejar acciones huérfanas ni inputs duplicados. Mismo patrón que
// bindings.js:assignAction, replicado aquí para no acoplar ambos stores.
export async function assignKeyAction(action, token) {
  keyBindings.update((m) => {
    const next = { ...m };
    const prevTokenOfAction = Object.keys(next).find((t) => next[t] === action);
    const prevActionOfToken = next[token] || null;
    next[token] = action;
    if (prevTokenOfAction && prevTokenOfAction !== token) {
      next[prevTokenOfAction] = prevActionOfToken;
    }
    return next;
  });
  await persistKeyBindings();
}

export async function resetKeyBindings() {
  keyBindings.set({ ...KEY_DEFAULTS });
  await persistKeyBindings();
}

async function persistKeyBindings() {
  await patchAppConfig({ keyBindings: get(keyBindings) });
}
