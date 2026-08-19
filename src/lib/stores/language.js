import { get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { locale, UI_LOCALES, DEFAULT_LOCALE, localeMeta } from "../i18n/index.js";

/*
 * Idioma de la INTERFAZ. Global (no por perfil): es una preferencia de la
 * persona, no del "look" de un tema — mismo criterio que steamAccount y
 * showPowerFooter. Se persiste en config.json como `uiLanguage`.
 *
 * El idioma que se le pide a STEAM es un ajuste SEPARADO, en
 * stores/steamAccount.js (`steamLangPref`): por defecto vale "auto" = seguir a
 * este, y elegir un código concreto lo desacopla. Ver docs/i18n.md.
 *
 * `locale` (del runtime de i18n) ES el store: acá solo se le agrega carga,
 * validación y persistencia — así ningún componente tiene que saber cuál de
 * los dos módulos importar.
 */

export const uiLanguage = locale;
export { UI_LOCALES };

/**
 * Idioma de Steam asociado a un idioma de interfaz (la preselección que pide
 * la configuración inicial: elegir idioma preselecciona la región de Steam).
 */
export function steamLangFor(localeId) {
  return localeMeta(localeId).steamLang;
}

/**
 * Idioma del sistema operativo, mapeado al más cercano de los soportados.
 *
 * `navigator.languages` funciona en el WebView de Tauri: WebView2 refleja el
 * idioma de la interfaz de Windows y WKWebView el locale de macOS. Se evita a
 * propósito `@tauri-apps/plugin-os` — sería una dependencia y una capability
 * nuevas solo para esto.
 */
export function detectOsLocale() {
  const nav = typeof navigator === "undefined" ? null : navigator;
  const cands = nav ? (nav.languages?.length ? nav.languages : [nav.language]) : [];
  for (const raw of cands) {
    const tag = String(raw || "").toLowerCase();
    if (!tag) continue;
    if (tag.startsWith("es-es")) return "es-ES";
    // Cualquier otro español (es, es-MX, es-AR, es-419…) cae al canónico
    // LATAM; solo España tiene su propia variante.
    if (tag.startsWith("es")) return "es-419";
    if (tag.startsWith("en")) return "en-US";
  }
  return "en-US";
}

export async function initLanguage() {
  const cfg = await loadAppConfig();
  const saved = cfg?.uiLanguage;
  if (saved && UI_LOCALES.some((l) => l.id === saved)) locale.set(saved);
  // Primer arranque (o valor inválido): se preselecciona el del SO. La
  // configuración inicial igual pregunta — esto solo decide qué opción llega
  // marcada.
  else locale.set(detectOsLocale() || DEFAULT_LOCALE);
}

export async function setLanguage(id) {
  if (!UI_LOCALES.some((l) => l.id === id)) return;
  locale.set(id);
  await patchAppConfig({ uiLanguage: get(locale) });
}
