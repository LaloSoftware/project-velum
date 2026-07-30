import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Preferencias visuales de interfaz (persistentes):
 *   - hideCardText: oculta el título inferior de las tarjetas.
 *   - hideLibraryButton: oculta el botón "Ver biblioteca completa" de Inicio.
 *   - gameView: qué datos del juego se muestran en el Detalle (global, no por
 *     juego). Ver GAME_VIEW_FIELDS: fuente única — un dato nuevo que se
 *     muestre en el Detalle debe añadir su entrada aquí y su render
 *     condicional en GameDetail.svelte.
 *   - uiScale: escala de toda la interfaz (textos y menús).
 */

// Fuente única de los datos del juego que el Detalle puede mostrar/ocultar.
export const GAME_VIEW_FIELDS = [
  { key: "title", label: "Título" },
  { key: "platform", label: "Plataforma" },
  { key: "lastPlayed", label: "Última vez jugado" },
  { key: "installDir", label: "Ruta de instalación" },
];

function defaultGameView() {
  return Object.fromEntries(GAME_VIEW_FIELDS.map((f) => [f.key, true]));
}

export const hideCardText = writable(false);
export const hideLibraryButton = writable(false);
export const gameView = writable(defaultGameView());

// Escala de interfaz: "small" | "original" | "large".
export const UI_SCALE_OPTIONS = [
  { value: "small", label: "Pequeña (720p)" },
  { value: "original", label: "Original" },
  { value: "large", label: "Grande (4K)" },
];
export const UI_SCALE_FACTORS = { small: 0.85, original: 1, large: 1.25 };
export const uiScale = writable("original");

// Cantidad de tarjetas en la tira "Reciente" de Inicio.
export const HOME_CARD_COUNT_DEFAULT = 12;
export const HOME_CARD_COUNT_MIN = 4;
export const HOME_CARD_COUNT_MAX = 24;
export const homeCardCount = writable(HOME_CARD_COUNT_DEFAULT);

export async function initUiPrefs() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.ui) {
    if (typeof cfg.ui.hideCardText === "boolean") hideCardText.set(cfg.ui.hideCardText);
    if (typeof cfg.ui.hideLibraryButton === "boolean")
      hideLibraryButton.set(cfg.ui.hideLibraryButton);
  }
  if (cfg && cfg.gameView) gameView.set({ ...defaultGameView(), ...cfg.gameView });
  if (cfg && typeof cfg.uiScale === "string" && UI_SCALE_FACTORS[cfg.uiScale]) {
    uiScale.set(cfg.uiScale);
  }
  if (cfg && Number.isFinite(cfg.homeCardCount)) {
    homeCardCount.set(
      Math.min(HOME_CARD_COUNT_MAX, Math.max(HOME_CARD_COUNT_MIN, cfg.homeCardCount))
    );
  }
}

async function persist() {
  await patchAppConfig({
    ui: { hideCardText: get(hideCardText), hideLibraryButton: get(hideLibraryButton) },
  });
}

export async function setHideCardText(v) {
  hideCardText.set(!!v);
  await persist();
}
export async function setHideLibraryButton(v) {
  hideLibraryButton.set(!!v);
  await persist();
}

export async function setGameViewField(key, v) {
  gameView.update((g) => ({ ...g, [key]: !!v }));
  await patchAppConfig({ gameView: get(gameView) });
}

export async function setUiScale(v) {
  if (!UI_SCALE_FACTORS[v]) return;
  uiScale.set(v);
  await patchAppConfig({ uiScale: v });
}

export async function setHomeCardCount(n) {
  const v = Math.min(HOME_CARD_COUNT_MAX, Math.max(HOME_CARD_COUNT_MIN, Number(n) || HOME_CARD_COUNT_DEFAULT));
  homeCardCount.set(v);
  await patchAppConfig({ homeCardCount: v });
}
