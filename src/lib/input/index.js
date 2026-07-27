/*
 * Fuentes de input → acciones normalizadas.
 *
 * Las fuentes de MANDO emiten eventos "crudos" con la forma:
 *     { type: "dir" | "button", name, pressed }
 *   - "dir"    -> name: up|down|left|right  (navegación FIJA, no remapeable)
 *   - "button" -> name: south|east|north|west|l1|r1|start|select|guide (remapeable)
 *
 * El mapeo botón→acción vive en `stores/bindings.js` (configurable/persistente).
 * El teclado físico mapea directo a acciones (ayuda de dev + red de seguridad).
 * `App.svelte -> dispatch` interpreta la acción según el contexto.
 */

import { get } from "svelte/store";
import { isTauri } from "../ipc/index.js";
import { resolve } from "../stores/bindings.js";
import { vk, vkType, vkBackspace, vkDone } from "../stores/keyboard.js";

// Teclado físico → acción directa (no pasa por bindings; red de seguridad).
const KEY_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "accept",
  " ": "accept",
  Escape: "back",
  Backspace: "back",
  Tab: "menu", // menú Configuración
  q: "quick", // QAM de sistema
  Q: "quick",
  e: "tabLeft",
  r: "tabRight",
  i: "north", // detalle / espacio-en-teclado (para probar sin mando)
  x: "west", // borrar-en-teclado (para probar sin mando)
  c: "context", // menú contextual de tarjeta (para probar sin mando)
  s: "search", // buscar (L3) — para probar sin mando
  f: "filters", // filtros y orden (R3) — para probar sin mando
};

// Botón crudo por índice de la Gamepad API estándar del navegador.
const PAD_BUTTON_RAW = {
  0: "south",
  1: "east",
  2: "west",
  3: "north",
  4: "l1",
  5: "r1",
  6: "lt", // gatillo L2
  7: "rt", // gatillo R2
  8: "select",
  9: "start",
  10: "l3", // clic stick izq.
  11: "r3", // clic stick der.
  16: "guide",
};

let dispatchFn = () => {};
let captureFn = null; // modo "pulsa un botón" para remapear

export function setCapture(fn) {
  captureFn = fn;
}
export function clearCapture() {
  captureFn = null;
}

// Listeners de eventos CRUDOS de botón (press y release), independientes del
// dispatch. Los usa la sesión de juego para el botón de "volver" (pulsar/mantener).
const rawListeners = new Set();
export function onRawButton(cb) {
  rawListeners.add(cb);
  return () => rawListeners.delete(cb);
}

export async function initInput(dispatch) {
  dispatchFn = dispatch;
  initKeyboard();
  if (isTauri) {
    await initTauriGamepad();
  } else {
    initBrowserGamepad();
  }
}

// Procesa un evento crudo de mando (de gilrs o del navegador).
function handleRaw(ev) {
  if (!ev) return;
  // Los listeners crudos reciben press Y release (para detectar "mantener").
  if (ev.type === "button") {
    for (const cb of rawListeners) cb(ev.name, ev.pressed);
  }
  // El resto de la lógica actúa solo en press.
  if (!ev.pressed) return;
  if (ev.type === "dir") {
    dispatchFn(ev.name);
  } else if (ev.type === "button") {
    if (captureFn) {
      captureFn(ev.name); // remapeo: capturar el botón crudo
      return;
    }
    const action = resolve(ev.name);
    if (action) dispatchFn(action);
  }
}

// -------- 1. Teclado --------
function initKeyboard() {
  window.addEventListener("keydown", (e) => {
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    // Con el teclado virtual abierto, permitir escribir con el teclado físico.
    if (get(vk).open && handlePhysicalTyping(e)) {
      e.preventDefault();
      return;
    }
    const action = KEY_MAP[e.key];
    if (action) {
      e.preventDefault();
      dispatchFn(action);
    }
  });
}

// Escritura directa en el teclado virtual con teclado físico.
// (Las flechas caen a KEY_MAP para seguir navegando las teclas en pantalla.)
function handlePhysicalTyping(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key === "Enter") return vkDone(false), true;
  if (e.key === "Escape") return vkDone(true), true;
  if (e.key === "Backspace") return vkBackspace(), true;
  if (e.key.length === 1) return vkType(e.key), true;
  return false;
}

// -------- 2. Mando vía Rust (gilrs) --------
async function initTauriGamepad() {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("gm://input", (event) => handleRaw(event.payload));
  } catch (err) {
    console.warn("No se pudo suscribir a eventos de mando de Tauri:", err);
  }
}

// -------- 3. Gamepad API del navegador (fallback) --------
function initBrowserGamepad() {
  const pressed = {}; // "padIndex:button" -> bool
  const repeat = {}; // dir -> próximo instante
  const INITIAL = 350;
  const RATE = 130;
  const DPAD = { 12: "up", 13: "down", 14: "left", 15: "right" };

  function poll(now) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activeDirs = new Set();

    for (const pad of pads) {
      if (!pad) continue;

      pad.buttons.forEach((b, i) => {
        const down = b.pressed || b.value > 0.5;
        // D-pad → direcciones.
        if (DPAD[i]) {
          if (down) activeDirs.add(DPAD[i]);
          return;
        }
        // Botones de acción → eventos crudos con detección de flanco.
        const raw = PAD_BUTTON_RAW[i];
        if (!raw) return;
        const key = `${pad.index}:${i}`;
        if (down && !pressed[key]) {
          pressed[key] = true;
          handleRaw({ type: "button", name: raw, pressed: true });
        } else if (!down && pressed[key]) {
          pressed[key] = false;
        }
      });

      // Stick izquierdo → direcciones.
      const [ax, ay] = [pad.axes[0] || 0, pad.axes[1] || 0];
      const TH = 0.55;
      if (ax < -TH) activeDirs.add("left");
      if (ax > TH) activeDirs.add("right");
      if (ay < -TH) activeDirs.add("up");
      if (ay > TH) activeDirs.add("down");
    }

    // Auto-repetición de direcciones sostenidas.
    for (const dir of ["up", "down", "left", "right"]) {
      if (activeDirs.has(dir)) {
        if (repeat[dir] == null) {
          handleRaw({ type: "dir", name: dir, pressed: true });
          repeat[dir] = now + INITIAL;
        } else if (now >= repeat[dir]) {
          handleRaw({ type: "dir", name: dir, pressed: true });
          repeat[dir] = now + RATE;
        }
      } else {
        repeat[dir] = null;
      }
    }

    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
}
