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
export const hideFooter = writable(false);
export const gameView = writable(defaultGameView());

// Escala de interfaz: multiplicador continuo sobre el tamaño original de
// textos/menús/iconos (1 = original). Reemplaza las 3 opciones fijas de
// antes — en sofá/4K la escala grande (1.25x) se quedaba corta.
export const UI_SCALE_MIN = 0.7;
export const UI_SCALE_MAX = 2.5;
export const UI_SCALE_STEP = 0.05;
export const UI_SCALE_DEFAULT = 1;
export const uiScale = writable(UI_SCALE_DEFAULT);

// Migración de instalaciones previas ("small"/"original"/"large").
const LEGACY_UI_SCALE = { small: 0.85, original: 1, large: 1.25 };

// Cantidad de tarjetas en la tira "Reciente" de Inicio.
export const HOME_CARD_COUNT_DEFAULT = 12;
export const HOME_CARD_COUNT_MIN = 4;
export const HOME_CARD_COUNT_MAX = 24;
export const homeCardCount = writable(HOME_CARD_COUNT_DEFAULT);

// Textos de Inicio (título, subtítulo, encabezado "Reciente"): cada uno se puede
// ocultar y/o reemplazar por texto personalizado. Fuente única — un texto nuevo de
// Inicio se añade aquí y en su render condicional en Home.svelte.
export const HOME_TEXT_FIELDS = [
  { key: "title", label: "Título", default: "Bienvenido" },
  {
    key: "subtitle",
    label: "Subtítulo",
    default: "Reanuda donde lo dejaste o abre la biblioteca completa.",
  },
  { key: "recent", label: 'Encabezado "Reciente"', default: "Reciente" },
];

function defaultHomeTexts() {
  return Object.fromEntries(
    HOME_TEXT_FIELDS.map((f) => [f.key, { hidden: false, text: "", mode: "custom" }])
  );
}

export const homeTexts = writable(defaultHomeTexts());

// Modo de un texto de Inicio: "custom" (texto fijo editado por el usuario) o
// "focus" (muestra en vivo el título del juego actualmente en foco en la tira).
export const HOME_TEXT_MODES = [
  { value: "custom", label: "Personalizado" },
  { value: "focus", label: "Juego en foco" },
];

// Orientación de la tira "Reciente" de Inicio.
export const HOME_ORIENTATION_OPTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];
export const homeOrientation = writable("horizontal");

// Modo de recorrido: se detiene en los extremos, o da la vuelta (wrap).
export const HOME_SCROLL_MODE_OPTIONS = [
  { value: "scroll", label: "Scroll" },
  { value: "infinito", label: "Scroll infinito" },
];
export const homeScrollMode = writable("scroll");

// Comportamiento de lectura dentro del eje de la tira.
export const HOME_READING_OPTIONS = [
  { value: "natural", label: "Natural" },
  { value: "invertido", label: "Invertido" },
  { value: "centrado", label: "Principal al centro" },
];
export const homeReading = writable("natural");

// Posición de todo el bloque de Inicio (bienvenida + "Reciente" + tarjetas +
// botón de biblioteca), en el eje CONTRARIO al de la orientación de la tira.
// Valor abstracto (no top/bottom/left/right) para no migrar el dato al cambiar
// de orientación; las etiquetas se resuelven según la orientación activa.
export const HOME_POSITION_VALUES = ["start", "center", "end"];
export function homePositionOptions(orientation) {
  return orientation === "vertical"
    ? [
        { value: "start", label: "Izquierda" },
        { value: "center", label: "Centro" },
        { value: "end", label: "Derecha" },
      ]
    : [
        { value: "start", label: "Arriba" },
        { value: "center", label: "Centro" },
        { value: "end", label: "Abajo" },
      ];
}
export const homePosition = writable("start");

// Alineación de las tarjetas en el eje TRANSVERSAL de la lista (independiente de
// la posición del bloque en pantalla): evita que la tarjeta enfocada, al crecer,
// siempre parezca expandirse hacia un mismo lado. Mismos valores/etiquetas que
// homePosition — se reutiliza `homePositionOptions()` para ambos selectores.
export const homeCardAlign = writable("start");

// Alineación del grupo de pestañas (Inicio/Juegos/Aplicaciones) en la barra
// superior, y posición del reloj — ejes independientes entre sí.
export const TABS_ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
];
export const tabsAlign = writable("left");

export const CLOCK_POSITION_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
  { value: "hidden", label: "Oculto" },
];
export const clockPosition = writable("right");

export async function initUiPrefs() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.ui) {
    if (typeof cfg.ui.hideCardText === "boolean") hideCardText.set(cfg.ui.hideCardText);
    if (typeof cfg.ui.hideLibraryButton === "boolean")
      hideLibraryButton.set(cfg.ui.hideLibraryButton);
    if (typeof cfg.ui.hideFooter === "boolean") hideFooter.set(cfg.ui.hideFooter);
  }
  if (cfg && cfg.gameView) gameView.set({ ...defaultGameView(), ...cfg.gameView });
  if (cfg && cfg.uiScale != null) {
    const raw = typeof cfg.uiScale === "string" ? LEGACY_UI_SCALE[cfg.uiScale] : cfg.uiScale;
    if (Number.isFinite(raw)) {
      uiScale.set(Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, raw)));
    }
  }
  if (cfg && Number.isFinite(cfg.homeCardCount)) {
    homeCardCount.set(
      Math.min(HOME_CARD_COUNT_MAX, Math.max(HOME_CARD_COUNT_MIN, cfg.homeCardCount))
    );
  }
  if (cfg && cfg.homeTexts) {
    homeTexts.set({ ...defaultHomeTexts(), ...cfg.homeTexts });
  }
  if (cfg && HOME_ORIENTATION_OPTIONS.some((o) => o.value === cfg.homeOrientation)) {
    homeOrientation.set(cfg.homeOrientation);
  }
  if (cfg && HOME_SCROLL_MODE_OPTIONS.some((o) => o.value === cfg.homeScrollMode)) {
    homeScrollMode.set(cfg.homeScrollMode);
  }
  if (cfg && HOME_READING_OPTIONS.some((o) => o.value === cfg.homeReading)) {
    homeReading.set(cfg.homeReading);
  }
  // homePosition: migra el formato legado (top/bottom) de instalaciones previas.
  if (cfg && "homePosition" in cfg) {
    const LEGACY_POSITION_MAP = { top: "start", bottom: "end", center: "center" };
    const migrated = LEGACY_POSITION_MAP[cfg.homePosition] ?? cfg.homePosition;
    if (HOME_POSITION_VALUES.includes(migrated)) {
      homePosition.set(migrated);
      if (migrated !== cfg.homePosition) await patchAppConfig({ homePosition: migrated });
    }
  }
  if (cfg && HOME_POSITION_VALUES.includes(cfg.homeCardAlign)) {
    homeCardAlign.set(cfg.homeCardAlign);
  }
  if (cfg && TABS_ALIGN_OPTIONS.some((o) => o.value === cfg.tabsAlign)) {
    tabsAlign.set(cfg.tabsAlign);
  }
  if (cfg && CLOCK_POSITION_OPTIONS.some((o) => o.value === cfg.clockPosition)) {
    clockPosition.set(cfg.clockPosition);
  }
}

async function persist() {
  await patchAppConfig({
    ui: {
      hideCardText: get(hideCardText),
      hideLibraryButton: get(hideLibraryButton),
      hideFooter: get(hideFooter),
    },
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
export async function setHideFooter(v) {
  hideFooter.set(!!v);
  await persist();
}

export async function setGameViewField(key, v) {
  gameView.update((g) => ({ ...g, [key]: !!v }));
  await patchAppConfig({ gameView: get(gameView) });
}

export async function setUiScale(v) {
  const n = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Number(v)));
  if (!Number.isFinite(n)) return;
  uiScale.set(n);
  await patchAppConfig({ uiScale: n });
}

export async function setHomeCardCount(n) {
  const v = Math.min(HOME_CARD_COUNT_MAX, Math.max(HOME_CARD_COUNT_MIN, Number(n) || HOME_CARD_COUNT_DEFAULT));
  homeCardCount.set(v);
  await patchAppConfig({ homeCardCount: v });
}

export async function setHomeTextHidden(key, v) {
  homeTexts.update((t) => ({ ...t, [key]: { ...t[key], hidden: !!v } }));
  await patchAppConfig({ homeTexts: get(homeTexts) });
}

export async function setHomeTextValue(key, v) {
  homeTexts.update((t) => ({ ...t, [key]: { ...t[key], text: v } }));
  await patchAppConfig({ homeTexts: get(homeTexts) });
}

export async function setHomeTextMode(key, mode) {
  if (!HOME_TEXT_MODES.some((m) => m.value === mode)) return;
  homeTexts.update((t) => ({ ...t, [key]: { ...t[key], mode } }));
  await patchAppConfig({ homeTexts: get(homeTexts) });
}

export async function setHomeOrientation(v) {
  if (!HOME_ORIENTATION_OPTIONS.some((o) => o.value === v)) return;
  homeOrientation.set(v);
  await patchAppConfig({ homeOrientation: v });
}

export async function setHomeScrollMode(v) {
  if (!HOME_SCROLL_MODE_OPTIONS.some((o) => o.value === v)) return;
  homeScrollMode.set(v);
  await patchAppConfig({ homeScrollMode: v });
}

export async function setHomeReading(v) {
  if (!HOME_READING_OPTIONS.some((o) => o.value === v)) return;
  homeReading.set(v);
  await patchAppConfig({ homeReading: v });
}

export async function setHomePosition(v) {
  if (!HOME_POSITION_VALUES.includes(v)) return;
  homePosition.set(v);
  await patchAppConfig({ homePosition: v });
}

export async function setHomeCardAlign(v) {
  if (!HOME_POSITION_VALUES.includes(v)) return;
  homeCardAlign.set(v);
  await patchAppConfig({ homeCardAlign: v });
}

export async function setTabsAlign(v) {
  if (!TABS_ALIGN_OPTIONS.some((o) => o.value === v)) return;
  tabsAlign.set(v);
  await patchAppConfig({ tabsAlign: v });
}

export async function setClockPosition(v) {
  if (!CLOCK_POSITION_OPTIONS.some((o) => o.value === v)) return;
  clockPosition.set(v);
  await patchAppConfig({ clockPosition: v });
}
