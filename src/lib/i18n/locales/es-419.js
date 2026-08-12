/*
 * Español (Latinoamérica) — idioma CANÓNICO. Cada valor de acá es literalmente
 * el texto que estaba hardcodeado antes de la migración: eso hace que este
 * idioma sea un refactor sin cambio visible, y que revisar un diff de i18n sea
 * comparar cadenas movidas, no cadenas reescritas.
 *
 * Convención de claves: <namespace>.<sub>.<slug> — ver docs/i18n.md.
 * Regla de oro: las claves de enums usan el id PERSISTIDO tal cual
 * (`settings.sections.system-actions`), aunque el id esté en español. Los ids
 * son datos guardados; renombrarlos rompe configs existentes en silencio.
 */
export default {
  // --- Comunes (reusados en varias pantallas) ---
  "common.continue": "Continuar",

  // --- Configuración inicial (primer arranque) ---
  "setup.aria": "Configuración inicial",
  "setup.language.title": "Elegí tu idioma",
  "setup.language.desc":
    "Se usa en toda la interfaz. También define en qué idioma se piden los datos de Steam, aunque podés cambiar eso por separado al vincular tu cuenta.",
  "setup.language.hint": "Podés cambiarlo después desde Configuración → Idioma.",
  "setup.stores.title": "Bienvenido a VELUM",
  "setup.stores.desc":
    "Elegí qué tiendas mostrar en tu biblioteca. Podés cambiarlo después desde Configuración → Filtros de biblioteca.",
  "setup.stores.hint":
    "Podés escanear tu biblioteca de Steam más adelante desde Configuración → Cuentas.",

  // --- Configuración (sidebar) ---
  "settings.title": "Configuración",
  "settings.sections.appearance": "Apariencia",
  "settings.sections.language": "Idioma",
  "settings.sections.startup": "Configuración de inicio",
  "settings.sections.shortcuts": "Configuración de atajos",
  "settings.sections.sounds": "Sonidos",
  "settings.sections.buttonicons": "Iconos de botones",
  "settings.sections.filters": "Filtros de biblioteca",
  "settings.sections.hidden": "Ocultos",
  "settings.sections.system-actions": "Acciones del sistema",
  "settings.sections.accounts": "Cuentas",
  "settings.sections.notifications": "Notificaciones",

  // --- Configuración → Idioma ---
  "settings.language.title": "Idioma",
  "settings.language.desc":
    "Idioma de la interfaz de VELUM. El idioma en que se piden los datos de Steam (nombres y descripciones de logros) se configura por separado en Cuentas.",
  "settings.language.ui.label": "Idioma de la interfaz",
  "settings.language.steamHint":
    "Idioma de los datos de Steam: {value} — se cambia en Configuración → Cuentas.",

  // --- Steam: idioma de los datos ---
  "steam.lang.label": "Idioma de los datos de Steam",
  "steam.lang.desc":
    "En qué idioma se piden los nombres y descripciones de logros. Si un juego no está traducido, se cae a inglés automáticamente.",
  "steam.lang.auto": "Igual que la interfaz ({value})",
  "steam.lang.changed":
    "Idioma de Steam actualizado — vuelve a sincronizar para ver los textos en el idioma nuevo",
};
