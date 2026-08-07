import { writable, get } from "svelte/store";
import { loadAppConfig } from "./appConfig.js";
import { activeProfileId, getActive, updateActive, initProfiles } from "./profiles.js";
import { BUILTIN_THEMES } from "../theming/themes.js";

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
// `default`: si no está, el campo nace en `true` (ver defaultGameView) —
// se declara solo cuando hace falta arrancar en `false`.
export const GAME_VIEW_FIELDS = [
  { key: "title", label: "Título" },
  { key: "platform", label: "Plataforma" },
  { key: "lastPlayed", label: "Última vez jugado" },
  { key: "installDir", label: "Ruta de instalación" },
  { key: "playtime", label: "Horas jugadas (Steam)" },
  { key: "recentPlaytime", label: "Jugado recientemente, 2 semanas (Steam)" },
  { key: "steamLastPlayed", label: "Última vez jugado según Steam" },
  { key: "achievements", label: "Logros como badge (si no, sección)" },
  { key: "achievementsBadgeFixed", label: "Fijar el badge de logros en la esquina", default: false },
  { key: "showGlobalPct", label: "Mostrar % global de obtención (logros)", default: false },
  { key: "revealHiddenAchievements", label: "Mostrar logros ocultos (spoiler)", default: false },
];

function defaultGameView() {
  return Object.fromEntries(GAME_VIEW_FIELDS.map((f) => [f.key, f.default ?? true]));
}

export const hideCardText = writable(false);
export const hideLibraryButton = writable(false);
export const hideFooter = writable(false);
// Resaltado de "juego 100% completado" (tarjeta y badge de logros del
// Detalle, color compartido --gm-complete) — dos interruptores INDEPENDIENTES
// (antes uno solo controlaba las dos cosas a la vez): la insignia de texto
// "100%" y el brillo/glow alrededor. Cada uno apagable por separado si uno de
// los dos choca con el resto del tema del usuario mientras el otro no.
export const completedBadgeEnabled = writable(true);
export const completedGlowEnabled = writable(true);
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

// Fondo configurable detrás de la sección de metadatos del Detalle (título/
// plataforma/meta/acciones, hoy flota sobre el hero sin fondo propio). No es
// un GAME_VIEW_FIELDS (ese array es solo para toggles booleanos de la lista
// genérica; acá hace falta además un slider) — dos stores propios, mismo
// patrón que uiScale/hideCardText.
export const metaBgVisible = writable(true);
export const META_BG_OPACITY_MIN = 0;
export const META_BG_OPACITY_MAX = 100;
// Default distinto según el tema sea oscuro o claro (menos opacidad en
// oscuro: el degradado del hero ya oscurece bastante de por sí; más en claro,
// donde el texto es oscuro y necesita más respaldo contra la imagen).
const META_BG_OPACITY_DEFAULT = { dark: 30, light: 50 };
export const metaBgOpacity = writable(META_BG_OPACITY_DEFAULT.dark);

function themeKind(baseTheme) {
  return BUILTIN_THEMES[baseTheme]?.kind || "dark";
}

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

// Posición en pantalla de las notificaciones flotantes (por ahora: mando
// conectado/desconectado, GamepadNotice.svelte; ver Ajustes → Notificaciones).
// Preset de 8 posiciones (grid 3×3 sin el centro-centro, que taparía
// contenido) — mismo esquema de códigos que el preset 3×3 del logo en
// ArtEditor.svelte (LOGO_POSITIONS: tl/tc/tr/ml/mr/bl/bc/br), reutilizado acá
// para que el picker visual sea el mismo patrón.
export const NOTIFY_POSITIONS = [
  { code: "tl", label: "Arriba izquierda" },
  { code: "tc", label: "Arriba centro" },
  { code: "tr", label: "Arriba derecha" },
  { code: "ml", label: "Centro izquierda" },
  { code: "mr", label: "Centro derecha" },
  { code: "bl", label: "Abajo izquierda" },
  { code: "bc", label: "Abajo centro" },
  { code: "br", label: "Abajo derecha" },
];
// "br" (esquina inferior derecha): mismo lugar donde ya viven el indicador de
// sync de Steam y su resumen (SteamSyncIndicator/SteamSyncSummaryBadge), para
// no sorprender a instalaciones existentes con el default.
export const notifyPosition = writable("br");

// Difuminado del fondo (hero) de Inicio — intensidad de opacidad de la foto
// antes de desvanecerse al wallpaper del tema (Home.svelte .bg); más alto =
// fondo más visible/nítido, más bajo = más difuminado/tenue. Mismo patrón que
// metaBgOpacity (slider 0-100 persistido por perfil), aplicado a Inicio en
// vez de al fondo de metadatos del Detalle.
export const HOME_BG_FADE_MIN = 0;
export const HOME_BG_FADE_MAX = 100;
const HOME_BG_FADE_DEFAULT = 55; // valor que ya traía Home.svelte hardcodeado
export const homeBgFade = writable(HOME_BG_FADE_DEFAULT);

// Cada campo de "Apariencia" se guarda en el perfil activo (ver profiles.js).
// syncFromActiveProfile() aplica los campos del perfil activo a estos stores
// (con sus defaults si el perfil todavía no los tiene) y se reejecuta sola
// cada vez que cambia el perfil activo (setActive/createProfile/deleteProfile).
let _syncedProfileId = null;

function syncFromActiveProfile() {
  const p = getActive();
  if (!p) return;
  _syncedProfileId = p.id;
  hideCardText.set(p.hideCardText ?? false);
  hideLibraryButton.set(p.hideLibraryButton ?? false);
  hideFooter.set(p.hideFooter ?? false);
  completedBadgeEnabled.set(p.completedBadgeEnabled ?? true);
  completedGlowEnabled.set(p.completedGlowEnabled ?? true);
  gameView.set(p.gameView ? { ...defaultGameView(), ...p.gameView } : defaultGameView());
  uiScale.set(
    Number.isFinite(p.uiScale)
      ? Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, p.uiScale))
      : UI_SCALE_DEFAULT
  );
  homeCardCount.set(
    Number.isFinite(p.homeCardCount)
      ? Math.min(HOME_CARD_COUNT_MAX, Math.max(HOME_CARD_COUNT_MIN, p.homeCardCount))
      : HOME_CARD_COUNT_DEFAULT
  );
  homeTexts.set(p.homeTexts ? { ...defaultHomeTexts(), ...p.homeTexts } : defaultHomeTexts());
  homeOrientation.set(
    HOME_ORIENTATION_OPTIONS.some((o) => o.value === p.homeOrientation)
      ? p.homeOrientation
      : "horizontal"
  );
  homeScrollMode.set(
    HOME_SCROLL_MODE_OPTIONS.some((o) => o.value === p.homeScrollMode) ? p.homeScrollMode : "scroll"
  );
  homeReading.set(
    HOME_READING_OPTIONS.some((o) => o.value === p.homeReading) ? p.homeReading : "natural"
  );
  homePosition.set(HOME_POSITION_VALUES.includes(p.homePosition) ? p.homePosition : "start");
  homeCardAlign.set(HOME_POSITION_VALUES.includes(p.homeCardAlign) ? p.homeCardAlign : "start");
  tabsAlign.set(TABS_ALIGN_OPTIONS.some((o) => o.value === p.tabsAlign) ? p.tabsAlign : "left");
  clockPosition.set(
    CLOCK_POSITION_OPTIONS.some((o) => o.value === p.clockPosition) ? p.clockPosition : "right"
  );
  metaBgVisible.set(p.metaBgVisible ?? true);
  metaBgOpacity.set(
    Number.isFinite(p.metaBgOpacity)
      ? Math.min(META_BG_OPACITY_MAX, Math.max(META_BG_OPACITY_MIN, p.metaBgOpacity))
      : META_BG_OPACITY_DEFAULT[themeKind(p.baseTheme)]
  );
  notifyPosition.set(NOTIFY_POSITIONS.some((o) => o.code === p.notifyPosition) ? p.notifyPosition : "br");
  homeBgFade.set(
    Number.isFinite(p.homeBgFade)
      ? Math.min(HOME_BG_FADE_MAX, Math.max(HOME_BG_FADE_MIN, p.homeBgFade))
      : HOME_BG_FADE_DEFAULT
  );
}

activeProfileId.subscribe((id) => {
  if (id && id !== _syncedProfileId) syncFromActiveProfile();
});

export async function initUiPrefs() {
  await initProfiles();
  const active = getActive();
  const cfg = await loadAppConfig();

  // Migración única: adopta claves legado top-level de appConfig (de antes de
  // que "Apariencia" viviera en el perfil) al perfil activo, solo para los
  // campos que el perfil todavía no tiene.
  if (active && cfg) {
    const migrate = {};
    if (cfg.ui) {
      if (active.hideCardText === undefined && typeof cfg.ui.hideCardText === "boolean")
        migrate.hideCardText = cfg.ui.hideCardText;
      if (active.hideLibraryButton === undefined && typeof cfg.ui.hideLibraryButton === "boolean")
        migrate.hideLibraryButton = cfg.ui.hideLibraryButton;
      if (active.hideFooter === undefined && typeof cfg.ui.hideFooter === "boolean")
        migrate.hideFooter = cfg.ui.hideFooter;
    }
    if (active.gameView === undefined && cfg.gameView) migrate.gameView = cfg.gameView;
    if (active.uiScale === undefined && cfg.uiScale != null) {
      const raw = typeof cfg.uiScale === "string" ? LEGACY_UI_SCALE[cfg.uiScale] : cfg.uiScale;
      if (Number.isFinite(raw)) migrate.uiScale = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, raw));
    }
    if (active.homeCardCount === undefined && Number.isFinite(cfg.homeCardCount)) {
      migrate.homeCardCount = Math.min(
        HOME_CARD_COUNT_MAX,
        Math.max(HOME_CARD_COUNT_MIN, cfg.homeCardCount)
      );
    }
    if (active.homeTexts === undefined && cfg.homeTexts) migrate.homeTexts = cfg.homeTexts;
    if (
      active.homeOrientation === undefined &&
      HOME_ORIENTATION_OPTIONS.some((o) => o.value === cfg.homeOrientation)
    ) {
      migrate.homeOrientation = cfg.homeOrientation;
    }
    if (
      active.homeScrollMode === undefined &&
      HOME_SCROLL_MODE_OPTIONS.some((o) => o.value === cfg.homeScrollMode)
    ) {
      migrate.homeScrollMode = cfg.homeScrollMode;
    }
    if (
      active.homeReading === undefined &&
      HOME_READING_OPTIONS.some((o) => o.value === cfg.homeReading)
    ) {
      migrate.homeReading = cfg.homeReading;
    }
    // homePosition: migra también el formato legado (top/bottom) de instalaciones previas.
    if (active.homePosition === undefined && "homePosition" in cfg) {
      const LEGACY_POSITION_MAP = { top: "start", bottom: "end", center: "center" };
      const migrated = LEGACY_POSITION_MAP[cfg.homePosition] ?? cfg.homePosition;
      if (HOME_POSITION_VALUES.includes(migrated)) migrate.homePosition = migrated;
    }
    if (active.homeCardAlign === undefined && HOME_POSITION_VALUES.includes(cfg.homeCardAlign)) {
      migrate.homeCardAlign = cfg.homeCardAlign;
    }
    if (active.tabsAlign === undefined && TABS_ALIGN_OPTIONS.some((o) => o.value === cfg.tabsAlign)) {
      migrate.tabsAlign = cfg.tabsAlign;
    }
    if (
      active.clockPosition === undefined &&
      CLOCK_POSITION_OPTIONS.some((o) => o.value === cfg.clockPosition)
    ) {
      migrate.clockPosition = cfg.clockPosition;
    }
    if (Object.keys(migrate).length) await updateActive(migrate);
  }

  syncFromActiveProfile();
}

export async function setHideCardText(v) {
  const val = !!v;
  hideCardText.set(val);
  await updateActive({ hideCardText: val });
}
export async function setHideLibraryButton(v) {
  const val = !!v;
  hideLibraryButton.set(val);
  await updateActive({ hideLibraryButton: val });
}
export async function setHideFooter(v) {
  const val = !!v;
  hideFooter.set(val);
  await updateActive({ hideFooter: val });
}
export async function setCompletedBadgeEnabled(v) {
  const val = !!v;
  completedBadgeEnabled.set(val);
  await updateActive({ completedBadgeEnabled: val });
}
export async function setCompletedGlowEnabled(v) {
  const val = !!v;
  completedGlowEnabled.set(val);
  await updateActive({ completedGlowEnabled: val });
}

export async function setGameViewField(key, v) {
  gameView.update((g) => ({ ...g, [key]: !!v }));
  await updateActive({ gameView: get(gameView) });
}

export async function setUiScale(v) {
  const n = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Number(v)));
  if (!Number.isFinite(n)) return;
  uiScale.set(n);
  await updateActive({ uiScale: n });
}

export async function setMetaBgVisible(v) {
  const val = !!v;
  metaBgVisible.set(val);
  await updateActive({ metaBgVisible: val });
}

export async function setMetaBgOpacity(v) {
  const n = Math.min(META_BG_OPACITY_MAX, Math.max(META_BG_OPACITY_MIN, Number(v)));
  if (!Number.isFinite(n)) return;
  metaBgOpacity.set(n);
  await updateActive({ metaBgOpacity: n });
}

export async function setHomeCardCount(n) {
  const v = Math.min(HOME_CARD_COUNT_MAX, Math.max(HOME_CARD_COUNT_MIN, Number(n) || HOME_CARD_COUNT_DEFAULT));
  homeCardCount.set(v);
  await updateActive({ homeCardCount: v });
}

export async function setHomeTextHidden(key, v) {
  homeTexts.update((t) => ({ ...t, [key]: { ...t[key], hidden: !!v } }));
  await updateActive({ homeTexts: get(homeTexts) });
}

export async function setHomeTextValue(key, v) {
  homeTexts.update((t) => ({ ...t, [key]: { ...t[key], text: v } }));
  await updateActive({ homeTexts: get(homeTexts) });
}

export async function setHomeTextMode(key, mode) {
  if (!HOME_TEXT_MODES.some((m) => m.value === mode)) return;
  homeTexts.update((t) => ({ ...t, [key]: { ...t[key], mode } }));
  await updateActive({ homeTexts: get(homeTexts) });
}

export async function setHomeOrientation(v) {
  if (!HOME_ORIENTATION_OPTIONS.some((o) => o.value === v)) return;
  homeOrientation.set(v);
  await updateActive({ homeOrientation: v });
}

export async function setHomeScrollMode(v) {
  if (!HOME_SCROLL_MODE_OPTIONS.some((o) => o.value === v)) return;
  homeScrollMode.set(v);
  await updateActive({ homeScrollMode: v });
}

export async function setHomeReading(v) {
  if (!HOME_READING_OPTIONS.some((o) => o.value === v)) return;
  homeReading.set(v);
  await updateActive({ homeReading: v });
}

export async function setHomePosition(v) {
  if (!HOME_POSITION_VALUES.includes(v)) return;
  homePosition.set(v);
  await updateActive({ homePosition: v });
}

export async function setHomeCardAlign(v) {
  if (!HOME_POSITION_VALUES.includes(v)) return;
  homeCardAlign.set(v);
  await updateActive({ homeCardAlign: v });
}

export async function setTabsAlign(v) {
  if (!TABS_ALIGN_OPTIONS.some((o) => o.value === v)) return;
  tabsAlign.set(v);
  await updateActive({ tabsAlign: v });
}

export async function setClockPosition(v) {
  if (!CLOCK_POSITION_OPTIONS.some((o) => o.value === v)) return;
  clockPosition.set(v);
  await updateActive({ clockPosition: v });
}

export async function setNotifyPosition(code) {
  if (!NOTIFY_POSITIONS.some((o) => o.code === code)) return;
  notifyPosition.set(code);
  await updateActive({ notifyPosition: code });
}

export async function setHomeBgFade(v) {
  const n = Math.min(HOME_BG_FADE_MAX, Math.max(HOME_BG_FADE_MIN, Number(v)));
  if (!Number.isFinite(n)) return;
  homeBgFade.set(n);
  await updateActive({ homeBgFade: n });
}
