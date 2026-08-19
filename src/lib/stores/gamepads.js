import { writable } from "svelte/store";

/*
 * Notificación flotante de "mando conectado/desconectado" (GamepadNotice.svelte).
 * Alimentada por el evento Tauri `gm://gamepad-connection` (ver
 * src-tauri/src/input.rs::emit_gamepad_connection), suscrito desde
 * input/index.js. Un solo mensaje a la vez (no cola) que se autodescarta a
 * los pocos segundos — mismo patrón que showToast() en stores/ui.js.
 */

export const gamepadNotice = writable(null); // { name, connected } | null

let timer = null;
const AUTOCLOSE_MS = 3000;

export function showGamepadNotice(name, connected) {
  gamepadNotice.set({ name, connected });
  clearTimeout(timer);
  timer = setTimeout(() => gamepadNotice.set(null), AUTOCLOSE_MS);
}
