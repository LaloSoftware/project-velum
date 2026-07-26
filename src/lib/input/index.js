/*
 * Fuentes de input → acciones normalizadas.
 *
 * Todas las fuentes emiten las MISMAS acciones, que el App interpreta según el
 * contexto (ver App.svelte -> dispatch):
 *   up | down | left | right | accept | back | menu | quick | tabLeft | tabRight
 *
 * Fuentes:
 *  1. Teclado físico (siempre) — comodidad/accesibilidad, nunca única vía.
 *  2. Eventos de mando desde Rust/gilrs (evento Tauri 'gm://input') — en la app real.
 *  3. Gamepad API del navegador (fallback) — solo fuera de Tauri (p. ej. `npm run dev`).
 */

import { isTauri } from "../ipc/index.js";

const KEY_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "accept",
  " ": "accept",
  Escape: "back",
  Backspace: "back",
  Tab: "menu", // abrir menú global/biblioteca
  q: "quick", // abrir QAM de sistema
  Q: "quick",
  e: "tabLeft",
  r: "tabRight",
};

// Botones estándar de la Gamepad API (mapeo estándar de navegador).
const PAD_BUTTON_MAP = {
  0: "accept", // A / Cross
  1: "back", // B / Circle
  2: "west", // X / Square   (teclado: borrar)
  3: "north", // Y / Triangle (teclado: espacio)
  4: "tabLeft", // LB
  5: "tabRight", // RB
  8: "quick", // Select/View  -> QAM
  9: "menu", // Start/Menu   -> menú global
  12: "up",
  13: "down",
  14: "left",
  15: "right",
};

let dispatchFn = () => {};

export async function initInput(dispatch) {
  dispatchFn = dispatch;
  initKeyboard();
  if (isTauri) {
    await initTauriGamepad();
  } else {
    initBrowserGamepad();
  }
}

// -------- 1. Teclado --------
function initKeyboard() {
  window.addEventListener("keydown", (e) => {
    // No interceptar cuando se escribe en un input real (no lo usamos, pero por si acaso).
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const action = KEY_MAP[e.key];
    if (action) {
      e.preventDefault();
      dispatchFn(action);
    }
  });
}

// -------- 2. Mando vía Rust (gilrs) --------
async function initTauriGamepad() {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("gm://input", (event) => {
      const p = event.payload;
      if (p && p.pressed && p.action) dispatchFn(p.action);
    });
  } catch (err) {
    console.warn("No se pudo suscribir a eventos de mando de Tauri:", err);
  }
}

// -------- 3. Gamepad API del navegador (fallback) --------
function initBrowserGamepad() {
  const pressed = {}; // "padIndex:button" -> bool
  const repeat = {}; // acción direccional -> {next}
  const INITIAL = 350;
  const RATE = 130;

  function poll(now) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activeDirs = new Set();

    for (const pad of pads) {
      if (!pad) continue;

      // Botones (varios mandos controlan el mismo foco: cualquiera dispara).
      pad.buttons.forEach((b, i) => {
        const action = PAD_BUTTON_MAP[i];
        if (!action) return;
        const key = `${pad.index}:${i}`;
        const down = b.pressed || b.value > 0.5;
        if (down && !pressed[key]) {
          pressed[key] = true;
          if (["up", "down", "left", "right"].includes(action)) {
            activeDirs.add(action);
            repeat[action] = now + INITIAL;
          } else {
            dispatchFn(action);
          }
        } else if (!down && pressed[key]) {
          pressed[key] = false;
        }
        if (down && ["up", "down", "left", "right"].includes(action))
          activeDirs.add(action);
      });

      // Stick izquierdo → direcciones.
      const [ax, ay] = [pad.axes[0] || 0, pad.axes[1] || 0];
      const TH = 0.55;
      if (ax < -TH) activeDirs.add("left");
      if (ax > TH) activeDirs.add("right");
      if (ay < -TH) activeDirs.add("up");
      if (ay > TH) activeDirs.add("down");
    }

    // Auto-repetición para direcciones sostenidas.
    for (const dir of ["up", "down", "left", "right"]) {
      if (activeDirs.has(dir)) {
        if (repeat[dir] == null) {
          dispatchFn(dir);
          repeat[dir] = now + INITIAL;
        } else if (now >= repeat[dir]) {
          dispatchFn(dir);
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
