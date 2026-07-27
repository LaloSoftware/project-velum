import { writable } from "svelte/store";

// Vista principal (pestañas superiores).
export const view = writable("home"); // home | games | apps
export const VIEWS = ["home", "games", "apps"];

// Overlay activo por encima de la vista (menús tipo consola).
export const overlay = writable(null); // null | 'config' | 'qam'

// Detalle de juego (capa por encima de vista/overlay).
export const detailGame = writable(null);

// Menú contextual de tarjeta: { game, rect } (capa flotante).
export const contextMenu = writable(null);
// Confirmación de eliminar/desinstalar: { game } (capa modal).
export const confirmDelete = writable(null);
// Desplegable de un <Select>: { options, value, anchor, onSelect } (capa flotante).
export const popover = writable(null);

// Modal de color (capa modal por encima de overlays): { value, title, onApply }.
export const colorPicker = writable(null);

// Mensajes efímeros (toasts).
export const toast = writable(null);
let toastTimer = null;
export function showToast(msg) {
  toast.set(msg);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.set(null), 2200);
}

// Errores capturados (instrumentación de diagnóstico): se muestran en pantalla
// para poder ver el fallo real en entornos donde no hay DevTools a mano.
export const appError = writable(null); // { msg, ctx, stack } | null
export function reportError(err, ctx = "") {
  const msg = (err && err.message) || String(err);
  const stack = err && err.stack ? String(err.stack) : null;
  console.error(`[gm:error]${ctx ? ` (${ctx})` : ""}`, err);
  appError.set({ msg, ctx, stack });
}
export function clearAppError() {
  appError.set(null);
}

export function goto(v) {
  overlay.set(null);
  detailGame.set(null);
  view.set(v);
}

export function openOverlay(name) {
  overlay.set(name);
}
export function closeOverlay() {
  overlay.set(null);
}
export function openDetail(g) {
  detailGame.set(g);
}
export function closeDetail() {
  detailGame.set(null);
}
export function openContext(game, rect) {
  contextMenu.set({ game, rect, sub: null });
}
export function setContextSub(sub) {
  contextMenu.update((c) => (c ? { ...c, sub } : c));
}
export function closeContext() {
  contextMenu.set(null);
}
export function openConfirm(game) {
  confirmDelete.set({ game });
}
export function closeConfirm() {
  confirmDelete.set(null);
}
export function openPopover(cfg) {
  popover.set(cfg);
}
export function closePopover() {
  popover.set(null);
}
export function openColorPicker(cfg) {
  colorPicker.set(cfg);
}
export function closeColorPicker() {
  colorPicker.set(null);
}
