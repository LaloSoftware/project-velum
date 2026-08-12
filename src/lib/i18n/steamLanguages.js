/*
 * Catálogo de idiomas de la Steam Web API (parámetro `l`).
 *
 * Es una lista ESTÁTICA a propósito: Steam no expone ningún endpoint que liste
 * sus idiomas soportados (no hay GetSupportedLanguages ni equivalente). Los
 * códigos salen de la documentación de Steamworks:
 *   partner.steamgames.com/doc/store/localization/languages
 *
 * Cada idioma se muestra en su PROPIO nombre (autónimo), igual que hace el
 * cliente de Steam. Así el catálogo no hay que traducirlo a cada idioma de
 * interfaz que se agregue (serían 29 nombres × N idiomas de puro
 * mantenimiento), y quien busca "Deutsch" lo encuentra escrito como espera.
 */
export const STEAM_LANGUAGES = [
  { code: "latam", label: "Español (Latinoamérica)" },
  { code: "spanish", label: "Español (España)" },
  { code: "english", label: "English" },
  { code: "arabic", label: "العربية" },
  { code: "brazilian", label: "Português-Brasil" },
  { code: "bulgarian", label: "Български" },
  { code: "czech", label: "Čeština" },
  { code: "danish", label: "Dansk" },
  { code: "dutch", label: "Nederlands" },
  { code: "finnish", label: "Suomi" },
  { code: "french", label: "Français" },
  { code: "german", label: "Deutsch" },
  { code: "greek", label: "Ελληνικά" },
  { code: "hungarian", label: "Magyar" },
  { code: "italian", label: "Italiano" },
  { code: "japanese", label: "日本語" },
  { code: "koreana", label: "한국어" },
  { code: "norwegian", label: "Norsk" },
  { code: "polish", label: "Polski" },
  { code: "portuguese", label: "Português" },
  { code: "romanian", label: "Română" },
  { code: "russian", label: "Русский" },
  { code: "schinese", label: "简体中文" },
  { code: "swedish", label: "Svenska" },
  { code: "tchinese", label: "繁體中文" },
  { code: "thai", label: "ไทย" },
  { code: "turkish", label: "Türkçe" },
  { code: "ukrainian", label: "Українська" },
  { code: "vietnamese", label: "Tiếng Việt" },
];

export function steamLanguageLabel(code) {
  return STEAM_LANGUAGES.find((l) => l.code === code)?.label || code;
}
