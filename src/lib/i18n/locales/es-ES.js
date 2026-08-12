/*
 * Español (España). Mismas claves que es-419 (ver scripts/i18n-check.mjs).
 *
 * Muchas cadenas son IDÉNTICAS al canónico y está bien: los dos usan tuteo, así
 * que la conjugación no los separa. Lo que sí diverge es el vocabulario
 * (ordenador/computadora, móvil/celular, vídeo/video, "pulsar"/"presionar") y
 * el código de idioma que se le pide a Steam. Cuando una cadena no tenga
 * ninguna de esas diferencias, se repite tal cual — duplicar es más barato que
 * inventar un mecanismo de herencia entre idiomas.
 */
export default {
  // --- Comunes ---
  "common.continue": "Continuar",

  // --- Configuración inicial ---
  "setup.aria": "Configuración inicial",
  "setup.language.title": "Elige tu idioma",
  "setup.language.desc":
    "Se usa en toda la interfaz. También define en qué idioma se piden los datos de Steam, aunque puedes cambiar eso por separado al vincular tu cuenta.",
  "setup.language.hint": "Puedes cambiarlo después desde Configuración → Idioma.",
  "setup.stores.title": "Bienvenido a VELUM",
  "setup.stores.desc":
    "Elige qué tiendas mostrar en tu biblioteca. Puedes cambiarlo después desde Configuración → Filtros de biblioteca.",
  "setup.stores.hint":
    "Puedes escanear tu biblioteca de Steam más adelante desde Configuración → Cuentas.",

  // --- Configuración (barra lateral) ---
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
    "En qué idioma se piden los nombres y descripciones de los logros. Si un juego no está traducido, se recurre al inglés automáticamente.",
  "steam.lang.auto": "Igual que la interfaz ({value})",
  "steam.lang.changed":
    "Idioma de Steam actualizado — vuelve a sincronizar para ver los textos en el idioma nuevo",

  // --- Comunes ---
  "common.none": "Ninguna",
  "common.done": "Listo",
  "common.hidden": "Oculto",
  "common.align.left": "Izquierda",
  "common.align.center": "Centro",
  "common.align.right": "Derecha",
  "common.align.top": "Arriba",
  "common.align.bottom": "Abajo",
  "common.pos.tl": "Arriba izquierda",
  "common.pos.tc": "Arriba centro",
  "common.pos.tr": "Arriba derecha",
  "common.pos.ml": "Centro izquierda",
  "common.pos.mr": "Centro derecha",
  "common.pos.bl": "Abajo izquierda",
  "common.pos.bc": "Abajo centro",
  "common.pos.br": "Abajo derecha",

  // --- Nombres por defecto ---
  "profiles.defaultName": "Por defecto",
  "groups.defaultName": "Grupo",
  "playlists.defaultName": "Lista",

  // --- Textos por defecto de Inicio ---
  "home.title": "Bienvenido",
  "home.subtitle": "Reanuda donde lo dejaste o abre la biblioteca completa.",
  "home.recent": "Reciente",

  // --- Acciones del menú de sistema y del radial ---
  "system.actions.minimize": "Minimizar",
  "system.actions.maximize": "Maximizar",
  "system.actions.exitFullscreen": "Salir de pantalla completa",
  "system.actions.enterFullscreen": "Entrar en pantalla completa",
  "system.actions.closeApp": "Cerrar la aplicación",
  "system.actions.shutdown": "Apagar el sistema",
  "system.actions.musicToggle": "Reproducir/pausar música",
  "system.actions.musicStop": "Detener música",

  // --- Acciones asignables a botones del mando ---
  "input.actions.accept": "Aceptar / Jugar",
  "input.actions.north": "Detalle",
  "input.actions.back": "Volver / Cancelar",
  "input.actions.west": "Menú de tarjeta (alterno)",
  "input.actions.menu": "Menú Configuración",
  "input.actions.quick": "Menú Sistema (QAM)",
  "input.actions.tabLeft": "Pestaña anterior",
  "input.actions.tabRight": "Pestaña siguiente",
  "input.actions.search": "Buscar (en Juegos)",
  "input.actions.filterPrev": "Filtro tienda ◀ (Juegos)",
  "input.actions.filterNext": "Filtro tienda ▶ (Juegos)",
  "input.actions.filters": "Filtros y orden (Juegos/Apps)",
  "input.actions.context": "Menú de tarjeta",

  "input.buttons.triangle": "Triángulo",
  "input.buttons.square": "Cuadrado",
  "input.buttons.leftStick": "stick izq.",
  "input.buttons.rightStick": "stick der.",
  "input.buttons.guide": "Guía",

  // --- Campos del Detalle ---
  "detail.fields.title": "Título",
  "detail.fields.platform": "Plataforma",
  "detail.fields.lastPlayed": "Última vez jugado",
  "detail.fields.installDir": "Ruta de instalación",
  "detail.fields.playtime": "Horas jugadas (Steam)",
  "detail.fields.recentPlaytime": "Jugado recientemente, 2 semanas (Steam)",
  "detail.fields.steamLastPlayed": "Última vez jugado según Steam",
  "detail.fields.achievements": "Logros como distintivo (si no, sección)",
  "detail.fields.achievementsBadgeFixed": "Fijar el distintivo de logros en la esquina",
  "detail.fields.showGlobalPct": "Mostrar % global de obtención (logros)",
  "detail.fields.revealHiddenAchievements": "Mostrar logros ocultos (spoiler)",

  // --- Configuración → Apariencia: bloque de Inicio ---
  "settings.home.text.title": "Título",
  "settings.home.text.subtitle": "Subtítulo",
  "settings.home.text.recent": "Encabezado \"Reciente\"",
  "settings.home.mode.custom": "Personalizado",
  "settings.home.mode.focus": "Juego en foco",
  "settings.home.orientation.horizontal": "Horizontal",
  "settings.home.orientation.vertical": "Vertical",
  "settings.home.scroll.scroll": "Scroll",
  "settings.home.scroll.infinito": "Scroll infinito",
  "settings.home.reading.natural": "Natural",
  "settings.home.reading.invertido": "Invertido",
  "settings.home.reading.centrado": "Principal al centro",
};
