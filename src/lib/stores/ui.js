import { writable } from "svelte/store";
import { playNotification } from "./sounds.js";

// Vista principal (pestañas superiores).
export const view = writable("home"); // home | games | apps | multimedia
export const VIEWS = ["home", "games", "apps", "multimedia"];

// Overlay activo por encima de la vista (menús tipo consola).
export const overlay = writable(null); // null | 'config' | 'qam'

// Detalle de juego (capa por encima de vista/overlay).
export const detailGame = writable(null);
// Tarjeta que abrió el detalle (para devolverle el foco al cerrar, en vez de
// caer siempre a la primera tarjeta de la vista).
export const detailAnchor = writable(null);
// ¿El menú inferior del detalle está desplegado?
export const detailExpanded = writable(false);
// Sección visible del menú del detalle (paginado): índice en DETAIL_SECTIONS.
export const DETAIL_SECTIONS = ["grupos", "imagenes", "vista"];
export const detailSection = writable(0);

// Menú contextual de tarjeta: { game, rect, anchor } (capa flotante).
export const contextMenu = writable(null);
// Confirmación de eliminar/desinstalar: { game } (capa modal).
export const confirmDelete = writable(null);

// Confirmación de apagar el sistema (capa modal), desde Configuración.
export const shutdownConfirm = writable(false);
// Desplegable de un <Select>: { options, value, anchor, onSelect } (capa flotante).
export const popover = writable(null);

// Modal de color (capa modal por encima de overlays): { value, title, onApply }.
export const colorPicker = writable(null);

// Modal de filtros/orden (Juegos/Apps): { scope: 'games' | 'apps' } | null.
export const filtersModal = writable(null);

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
  playNotification();
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
export function openDetail(g, anchor = null) {
  detailExpanded.set(false);
  detailSection.set(0);
  detailGame.set(g);
  detailAnchor.set(anchor);
}
export function closeDetail() {
  detailExpanded.set(false);
  detailSection.set(0);
  detailGame.set(null);
  detailAnchor.set(null);
}
export function setDetailExpanded(v) {
  detailExpanded.set(v);
  if (!v) detailSection.set(0);
}
export function setDetailSection(i) {
  detailSection.set(i);
}
export function openContext(game, rect, anchor = null) {
  contextMenu.set({ game, rect, sub: null, anchor });
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
export function openShutdownConfirm() {
  shutdownConfirm.set(true);
}
export function closeShutdownConfirm() {
  shutdownConfirm.set(false);
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
export function openFilters(scope) {
  filtersModal.set({ scope });
}
export function closeFilters() {
  filtersModal.set(null);
}
