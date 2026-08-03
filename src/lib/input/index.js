/*
 * Fuentes de input → acciones normalizadas.
 *
 * Las fuentes de MANDO emiten eventos "crudos" con la forma:
 *     { type: "dir" | "button", name, pressed }
 *   - "dir"    -> name: up|down|left|right  (navegación FIJA, no remapeable)
 *   - "button" -> name: south|east|north|west|l1|r1|start|select|guide (remapeable)
 *
 * El mapeo botón→acción vive en `stores/bindings.js` (configurable/persistente).
 * El teclado y el mouse tienen su propio mapeo configurable, independiente y
 * simultáneo, en `stores/keyBindings.js` (tecla/botón de mouse → acción).
 * `App.svelte -> dispatch` interpreta la acción según el contexto.
 */

import { get } from "svelte/store";
import { isTauri } from "../ipc/index.js";
import { resolve } from "../stores/bindings.js";
import { resolveKeyBinding } from "../stores/keyBindings.js";
import { inputSource } from "../stores/inputSource.js";
import { vk, vkType, vkBackspace, vkDone } from "../stores/keyboard.js";
import { comboShortcuts } from "../stores/comboShortcuts.js";
import { openSystemQuickMenu } from "../stores/ui.js";

// Direcciones: navegación FIJA por teclado, no remapeable (igual que el d-pad).
// El resto de teclado/mouse vive en `stores/keyBindings.js` (configurable).
const NAV_KEY_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
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
let captureFn = null; // modo "pulsa un botón de mando" para remapear
let keyCaptureFn = null; // modo "pulsa tecla o botón de mouse" para remapear teclado/mouse

// -------- Combos de botones (mantener varios a la vez) --------
// Botones crudos actualmente sostenidos y combos ya disparados mientras se
// mantienen (para no repetir el disparo en cada evento, solo al soltar y
// volver a sostener). Ver stores/comboShortcuts.js.
const heldButtons = new Set();
const firedCombos = new Set();

const COMBO_ACTIONS = {
  openSystemMenu: openSystemQuickMenu,
};

function trackComboButton(name, pressed) {
  if (pressed) {
    heldButtons.add(name);
    for (const combo of get(comboShortcuts)) {
      if (!combo.enabled || firedCombos.has(combo.id) || !combo.buttons.length) continue;
      if (combo.buttons.every((b) => heldButtons.has(b))) {
        firedCombos.add(combo.id);
        COMBO_ACTIONS[combo.action]?.();
      }
    }
  } else {
    heldButtons.delete(name);
    // Libera los combos que incluían este botón para que puedan volver a
    // dispararse la próxima vez que se sostengan de nuevo.
    for (const combo of get(comboShortcuts)) {
      if (combo.buttons.includes(name)) firedCombos.delete(combo.id);
    }
  }
}

export function setCapture(fn) {
  captureFn = fn;
}
export function clearCapture() {
  captureFn = null;
}
export function setKeyCapture(fn) {
  keyCaptureFn = fn;
}
export function clearKeyCapture() {
  keyCaptureFn = null;
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
  initMouse();
  if (isTauri) {
    await initTauriGamepad();
  } else {
    initBrowserGamepad();
  }
}

// Procesa un evento crudo de mando (de gilrs o del navegador).
function handleRaw(ev) {
  if (!ev) return;
  inputSource.set("gamepad");
  // Los listeners crudos reciben press Y release (para detectar "mantener").
  if (ev.type === "button") {
    for (const cb of rawListeners) cb(ev.name, ev.pressed);
    // El tracking de combos también corre en modo captura (remapeo): así se
    // libera bien el estado si el usuario suelta un botón a medio capturar.
    // No dispara acciones ahí porque checkear combos no depende de captureFn.
    trackComboButton(ev.name, ev.pressed);
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
    inputSource.set("keymouse");
    const tag = e.target?.tagName;
    // Los <input type="range"> son focosables de la navegación (ver
    // navigation.js) y no aceptan texto — deben seguir el dispatch normal
    // como cualquier otro control, no el bypass de "se está escribiendo".
    const isRange = tag === "INPUT" && e.target.type === "range";
    if ((tag === "INPUT" && !isRange) || tag === "TEXTAREA") return;

    // Modo remapeo de teclado/mouse: captura la tecla y no dispatch normal.
    if (keyCaptureFn) {
      e.preventDefault();
      keyCaptureFn(`key:${e.code}`);
      return;
    }
    // Con el teclado virtual abierto, permitir escribir con el teclado físico.
    if (get(vk).open && handlePhysicalTyping(e)) {
      e.preventDefault();
      return;
    }
    const navAction = NAV_KEY_MAP[e.key];
    if (navAction) {
      e.preventDefault();
      dispatchFn(navAction);
      return;
    }
    const action = resolveKeyBinding(`key:${e.code}`);
    if (action) {
      e.preventDefault();
      dispatchFn(action);
    }
  });
}

// -------- 1b. Mouse (botones ligados a acciones vía keyBindings.js) --------
function initMouse() {
  window.addEventListener("mousedown", (e) => {
    inputSource.set("keymouse");
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const token = `mouse:${e.button}`;

    if (keyCaptureFn) {
      if (e.button === 2) e.preventDefault(); // que no abra el menú nativo del SO
      keyCaptureFn(token);
      return;
    }
    const action = resolveKeyBinding(token);
    if (action) {
      // Evita autoscroll (medio) y navegación atrás/adelante del navegador (3/4).
      if (e.button === 1 || e.button === 3 || e.button === 4) e.preventDefault();
      dispatchFn(action);
    }
  });

  // Si el clic derecho tiene una acción ligada (o hay una captura en curso), se
  // suprime el menú contextual nativo del SO/navegador para que no interfiera.
  window.addEventListener("contextmenu", (e) => {
    if (keyCaptureFn) {
      e.preventDefault();
      return;
    }
    if (resolveKeyBinding("mouse:2")) e.preventDefault();
  });
}

// Escritura directa en el teclado virtual con teclado físico.
// (Las flechas caen a NAV_KEY_MAP para seguir navegando las teclas en pantalla.)
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
