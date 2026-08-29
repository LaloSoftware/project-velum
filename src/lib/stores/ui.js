import { writable } from "svelte/store";
import { playNotification } from "./sounds.js";
import { patchAppConfig } from "./appConfig.js";
import { errorMessage } from "../i18n/errors.js";

// Vista principal (pestañas superiores).
export const view = writable("home"); // home | games | apps | multimedia
export const VIEWS = ["home", "games", "apps", "multimedia"];

// Juego actualmente enfocado en la tira de Inicio (o null si Inicio no está
// montado). Ver Home.svelte::onCardFocus y stores/soundtrackPlayer.js.
export const homeFeaturedGame = writable(null);

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
// Store (no array fijo) porque GameDetail.svelte antepone "logros" cuando
// corresponde mostrarlo como sección en vez de badge (ver GAME_VIEW_FIELDS
// `achievements` en uiprefs.js) — el conteo de secciones varía según el juego.
export const DETAIL_SECTIONS = writable(["grupos", "imagenes", "soundtrack", "vista"]);
export function setDetailSections(list) {
  DETAIL_SECTIONS.set(list);
}
export const detailSection = writable(0);

// Menú contextual de tarjeta: { game, rect, anchor } (capa flotante).
export const contextMenu = writable(null);
// Confirmación de eliminar/desinstalar: { game } (capa modal).
export const confirmDelete = writable(null);

// Confirmación de apagar el sistema (capa modal), desde Configuración.
export const shutdownConfirm = writable(false);

// Modo del footer de atajos dentro de Multimedia → Música (ver App.svelte):
// null | "grid" | "album" | "playlist". Lo mantiene MusicView.svelte,
// reseteado a null en su onDestroy — cubre solo los 3 casos al salir de
// Música/Multimedia. Imágenes/Videos tienen su propio par de stores
// análogos más abajo (imagesFooterMode/videoFooterMode) — a lo sumo uno de
// los 3 es no-nulo a la vez, porque solo un sub-panel de Multimedia está
// montado.
export const musicFooterMode = writable(null);
// null | "grid" | "album" (grilla de álbumes vs. grilla de miniaturas dentro
// de uno) — el visor no necesita modo propio: sus 3 acciones son botones
// propios en pantalla, no atajos A/Y genéricos. Lo mantienen
// ImagesView.svelte/ImageAlbumDetail.svelte.
export const imagesFooterMode = writable(null);
// null | "grid" | "album" — mismo criterio que arriba (el reproductor no usa
// A/Y). Lo mantienen VideosView.svelte/VideoAlbumDetail.svelte.
export const videoFooterMode = writable(null);

// Álbum/lista abierto dentro de Música (Multimedia): { type: "album"|"playlist",
// item } | null. Global (no estado local de MusicView.svelte) para que
// handleBack() en App.svelte lo reconozca igual que $detailGame — si no,
// "atrás" no encuentra nada que cerrar y cae al fallback de ir a Inicio en
// vez de solo salir del álbum/disco. Reseteado en el onDestroy de
// MusicView.svelte.
export const musicDetail = writable(null);
export function openMusicDetail(type, item) {
  musicDetail.set({ type, item });
}
export function closeMusicDetail() {
  musicDetail.set(null);
}

// Imágenes/Videos tienen UN NIVEL MÁS que Música (álbum abierto Y, dentro,
// visor/reproductor abierto) — hacen falta 2 stores por sección, no 1, para
// que "atrás" cierre de a un nivel por vez (visor primero, álbum después),
// mismo motivo que musicDetail en cada caso.

// Álbum de imágenes abierto (grilla de miniaturas): álbum | null.
export const imageAlbumOpen = writable(null);
export function openImageAlbum(album) {
  imageAlbumOpen.set(album);
}
export function closeImageAlbum() {
  imageAlbumOpen.set(null);
}

// Visor de imágenes abierto (Multimedia → Imágenes): { album, index } | null
// — mismo motivo que musicDetail (handleBack() en App.svelte necesita verlo
// para que "atrás" cierre el visor en vez de ir a Inicio). Reseteado en el
// onDestroy de ImageAlbumDetail.svelte.
export const imageViewer = writable(null);
export function openImageViewer(album, index) {
  imageViewer.set({ album, index });
}
export function closeImageViewer() {
  imageViewer.set(null);
}

// Álbum de video abierto (grilla de tarjetas de video): álbum | null.
export const videoAlbumOpen = writable(null);
export function openVideoAlbum(album) {
  videoAlbumOpen.set(album);
}
export function closeVideoAlbum() {
  videoAlbumOpen.set(null);
}

// Reproductor de video abierto (Multimedia → Videos): { album, item } | null
// — mismo motivo que musicDetail/imageViewer. Reseteado en el onDestroy de
// VideoAlbumDetail.svelte.
export const videoPlayer = writable(null);
export function openVideoPlayer(album, item) {
  videoPlayer.set({ album, item });
}
export function closeVideoPlayer() {
  videoPlayer.set(null);
}

// Menú rápido de sistema: minimizar/maximizar/pantalla completa/cerrar/
// apagar, accesible por combo de botones o atajo de teclado/mouse
// configurable (ver stores/comboShortcuts.js).
export const systemQuickMenu = writable(false);
// Desplegable de un <Select>: { options, value, anchor, onSelect } (capa flotante).
export const popover = writable(null);

// Modal de color (capa modal por encima de overlays): { value, title, onApply }.
export const colorPicker = writable(null);

// Modal de filtros/orden (Juegos/Apps): { scope: 'games' | 'apps' } | null.
export const filtersModal = writable(null);

// Configuración inicial (primer arranque, sin config previa) — mismo patrón
// de capa modal que el resto. App.svelte lo abre en onMount si
// `!getAppConfig().setupCompleted`; no hay "cancelar" (no hay estado previo
// al que volver) — cualquier vía de cierre pasa por completeSetup(), que
// persiste el flag para no volver a mostrarlo.
export const setupModal = writable(false);
// Paso actual del modal: 0 = idioma, 1 = tiendas. Cada paso persiste lo suyo
// al elegirlo (no hay "guardar al final"), así que salir a mitad conserva lo
// ya seleccionado.
export const SETUP_STEPS = 2;
export const setupStep = writable(0);
export function setupNext() {
  setupStep.update((s) => Math.min(s + 1, SETUP_STEPS - 1));
}
export function setupBack() {
  setupStep.update((s) => Math.max(s - 1, 0));
}
export function completeSetup() {
  setupModal.set(false);
  setupStep.set(0);
  patchAppConfig({ setupCompleted: true });
}

// Modal de logros completos de un juego de Steam (capa modal, se abre desde
// el badge fijo del Detalle): { appid, title } | null.
export const achievementsModal = writable(null);

// Selector de arte de SteamGridDB (Fase 3, feature-imagenes.md; capa modal,
// se abre desde el tercer botón de cada slot en ArtEditor):
// { gameId, slot } | null. `gameId` es el id LOCAL del juego (game.id, p. ej.
// "steam:570"), no el id de SteamGridDB — la resolución a un juego de
// SteamGridDB vive en stores/griddb.js.
export const griddbModal = writable(null);

// Confirmación de desvincular la cuenta de Steam (capa modal, desde Cuentas).
export const confirmUnlinkSteam = writable(false);

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
  // El backend Rust devuelve códigos estables ("steam.invalid_key") que se
  // traducen acá; lo que no tenga forma de código se muestra crudo. El `err`
  // original se conserva en el console.error y en `stack`.
  const msg = errorMessage(err);
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

export function openSystemQuickMenu() {
  systemQuickMenu.set(true);
}
export function closeSystemQuickMenu() {
  systemQuickMenu.set(false);
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
export function openAchievements(appid, title) {
  achievementsModal.set({ appid, title });
}
export function closeAchievements() {
  achievementsModal.set(null);
}
export function openGriddbModal(gameId, slot) {
  griddbModal.set({ gameId, slot });
}
export function closeGriddbModal() {
  griddbModal.set(null);
}
export function openConfirmUnlinkSteam() {
  confirmUnlinkSteam.set(true);
}
export function closeConfirmUnlinkSteam() {
  confirmUnlinkSteam.set(false);
}
