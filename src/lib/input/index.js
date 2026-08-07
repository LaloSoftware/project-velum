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
import { showGamepadNotice } from "../stores/gamepads.js";
import { vk, vkType, vkBackspace, vkDone } from "../stores/keyboard.js";
import { comboShortcuts } from "../stores/comboShortcuts.js";
import { resolveVk } from "../stores/vkBindings.js";
import { radialMenu, closeRadialMenu, runRadialInput } from "../stores/radialMenu.js";

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

function trackComboButton(name, pressed) {
  if (pressed) {
    heldButtons.add(name);
    for (const combo of get(comboShortcuts)) {
      if (!combo.enabled || firedCombos.has(combo.id) || !combo.buttons.length) continue;
      if (combo.buttons.every((b) => heldButtons.has(b))) {
        firedCombos.add(combo.id);
        // combo.action es un id de acción normal (ver App.svelte -> dispatch),
        // así que pasa por los mismos guards que cualquier otro atajo (no
        // abre el menú si ya hay otro modal encima, etc.).
        dispatchFn(combo.action);
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

// ¿Este botón es miembro de algún combo habilitado que ya está "en curso"
// (algún OTRO de sus botones también sostenido)? Si es así, su acción
// INDIVIDUAL (bindings.js) no debe dispararse de pasada — solo cuenta como
// parte del combo. Sin este chequeo, reasignar p. ej. el combo de sistema a
// "guide + north" abría a la vez el combo Y la acción individual de `north`
// (Detalle), porque `trackComboButton()` y la resolución individual corren
// sin coordinarse para el mismo evento de botón (ver docs/input.md).
function isComboEngaged(name) {
  for (const combo of get(comboShortcuts)) {
    if (!combo.enabled || !combo.buttons.length || !combo.buttons.includes(name)) continue;
    if (combo.buttons.some((b) => b !== name && heldButtons.has(b))) return true;
  }
  return false;
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
    // "Home/Guide" abre el menú radial de sistema directo al presionarse (ya
    // no tiene acción individual ni es modificador de combo, ver
    // comboShortcuts.js) y lo cierra al soltarse — mirado ANTES de
    // `if (!ev.pressed) return` de abajo para no perderse el flanco de
    // soltar. closeRadialMenu() es un no-op seguro si ya estaba cerrado.
    if (ev.name === "guide") {
      if (ev.pressed) dispatchFn("openRadialMenu"); // pasa por App.svelte::dispatch (guards + $session)
      else closeRadialMenu();
      return;
    }
  }
  // Mientras el radial está abierto, congela TODO lo demás (navegación y
  // botones por igual) salvo las 8 posiciones fijas o el botón de cancelar
  // configurado — runRadialInput (stores/radialMenu.js) decide qué hacer con
  // cada botón; cualquier otro evento se descarta sin llegar a resolve().
  if (get(radialMenu)) {
    if (ev.pressed && ev.type === "button") runRadialInput(ev.name);
    return;
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
    // Con el teclado virtual abierto, un botón puede tener una acción propia
    // de teclado virtual (espacio/borrar/mayús/cancelar/confirmar, ver
    // stores/vkBindings.js) independiente de su acción normal. Si no tiene
    // (ej. Aceptar, que ya escribe la tecla enfocada genéricamente al
    // activarla), cae al mapeo normal sin cambios.
    if (get(vk).open) {
      const vkAction = resolveVk(ev.name);
      if (vkAction) return dispatchFn(vkAction);
    }
    // Si este botón es parte de un combo habilitado que ya está en curso
    // (otro de sus botones sostenido — típicamente "guide"), no dispara
    // también su acción individual: solo cuenta para el combo.
    if (isComboEngaged(ev.name)) return;
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
  // Ctrl+V/Cmd+V: pega el portapapeles completo de una vez (antes de la
  // exclusión genérica de ctrl/meta/alt de más abajo, que si no lo capturaría
  // como "sin acción" y no pasaría nada).
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    pasteFromClipboard();
    return true;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key === "Enter") return vkDone(false), true;
  if (e.key === "Escape") return vkDone(true), true;
  if (e.key === "Backspace") return vkBackspace(), true;
  if (e.key.length === 1) return vkType(e.key), true;
  return false;
}

// Lee el portapapeles del SO (plugin nativo en Tauri; Clipboard API del
// navegador en modo web) y lo agrega de un golpe al valor del teclado virtual.
async function pasteFromClipboard() {
  try {
    let text = null;
    if (isTauri) {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      text = await readText();
    } else if (navigator.clipboard?.readText) {
      text = await navigator.clipboard.readText();
    }
    if (text) vkType(text);
  } catch (err) {
    console.warn("No se pudo pegar desde el portapapeles:", err);
  }
}

// -------- 2. Mando vía Rust (gilrs) --------
async function initTauriGamepad() {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("gm://input", (event) => handleRaw(event.payload));
    // Notificación flotante de conectado/desconectado (GamepadNotice.svelte) —
    // evento aparte de "gm://input" (ese es solo navegación/botones crudos).
    await listen("gm://gamepad-connection", (event) => {
      const { name, connected } = event.payload;
      showGamepadNotice(name, connected);
    });
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
          // Flanco de soltar: antes no se emitía (nada lo necesitaba). El
          // menú radial (guide) y los rawListeners de "mantener" (sesión de
          // juego) sí dependen de este evento para cerrar/detectar el release.
          handleRaw({ type: "button", name: raw, pressed: false });
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
