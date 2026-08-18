/*
 * Español (Latinoamérica) — idioma CANÓNICO. Los valores son los textos que
 * estaban hardcodeados antes de la migración, salvo donde el original usaba
 * voseo rioplatense ("elegí", "podés"): eso NO es LATAM neutro, así que se
 * normaliza a tuteo neutro ("elige", "puedes"), que es lo que ya usaba el
 * resto de la app. Ver "Registro" en docs/i18n.md.
 *
 * Neutro también en vocabulario: nada de regionalismos (computadora, no
 * ordenador; celular, no móvil; video, no vídeo).
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
  "setup.language.title": "Elige tu idioma",
  "setup.language.desc":
    "Se usa en toda la interfaz. También define en qué idioma se piden los datos de Steam, aunque puedes cambiar eso por separado al vincular tu cuenta.",
  "setup.language.hint": "Puedes cambiarlo después desde Configuración → Idioma.",
  "setup.stores.title": "Bienvenido a VELUM",
  "setup.stores.desc":
    "Elige qué tiendas mostrar en tu biblioteca. Puedes cambiarlo después desde Configuración → Filtros de biblioteca.",
  "setup.stores.hint":
    "Puedes escanear tu biblioteca de Steam más adelante desde Configuración → Cuentas.",

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

  // --- Comunes reusados en varias pantallas ---
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

  // --- Nombres por defecto de lo que el usuario puede renombrar ---
  // Solo se muestran mientras no haya escrito el suyo (ver i18n/names.js).
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

  // Descriptores de botón: el token (A, B, LB, RT, Start…) es el que va
  // impreso en el mando y NO se traduce; esto es solo lo que lo acompaña.
  "input.buttons.triangle": "Triángulo",
  "input.buttons.square": "Cuadrado",
  "input.buttons.leftStick": "stick izq.",
  "input.buttons.rightStick": "stick der.",
  "input.buttons.guide": "Guía",

  // --- Campos del Detalle (qué datos se muestran) ---
  "detail.fields.title": "Título",
  "detail.fields.platform": "Plataforma",
  "detail.fields.lastPlayed": "Última vez jugado",
  "detail.fields.installDir": "Ruta de instalación",
  "detail.fields.playtime": "Horas jugadas (Steam)",
  "detail.fields.recentPlaytime": "Jugado recientemente, 2 semanas (Steam)",
  "detail.fields.steamLastPlayed": "Última vez jugado según Steam",
  "detail.fields.achievements": "Logros como badge (si no, sección)",
  "detail.fields.achievementsBadgeFixed": "Fijar el badge de logros en la esquina",
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

  // --- F2: cascarón (pestañas, footer) ---
  "nav.home": "Inicio",
  "nav.games": "Juegos",
  "nav.apps": "Aplicaciones",
  "nav.multimedia": "Multimedia",
  "footer.accept.open": "Abrir",
  "footer.accept.playTrack": "Reproducir pista",
  "footer.accept.view": "Ver",
  "footer.accept.playVideo": "Reproducir",
  "footer.secondary.detail": "Detalle",
  "footer.secondary.play": "Reproducir",
  "footer.secondary.addToPlaylist": "Agregar a lista",
  "footer.cardMenu": "Menú",
  "footer.search": "Buscar",
  "footer.tabs": "Pestañas",
  "footer.settings": "Configuración",
  "footer.system": "Sistema",
  "footer.systemMenu": "Menú de sistema",

  // --- F2: comunes nuevos ---
  "common.play": "Jugar",
  "common.cancel": "Cancelar",
  "common.back": "Volver",
  "common.delete": "Eliminar",

  // --- F2: modal de Filtros y orden ---
  "filters.title": "Filtros y orden",
  "filters.category": "Categoría",
  "filters.installation": "Instalación",
  "filters.sortBy": "Ordenar por",

  // --- F2: biblioteca (filtros, búsqueda, grilla vacía) ---
  "library.filter.all": "Todos",
  "library.filter.installed": "Instalados",
  "library.filter.notInstalled": "No instalados",
  "library.search.title": "Buscar juego",
  "library.empty": "No hay elementos.",

  // --- F2: orden de Juegos/Apps ---
  "sort.original": "Original",
  "sort.titleAsc": "Título A → Z",
  "sort.titleDesc": "Título Z → A",
  "sort.storeAsc": "Plataforma A → Z",
  "sort.storeDesc": "Plataforma Z → A",
  "sort.sizeAsc": "Tamaño (menor → mayor)",
  "sort.sizeDesc": "Tamaño (mayor → menor)",

  // --- F2: tarjeta de juego (GameCard) ---
  "card.toast.notInstalled": "Instala \"{title}\" desde {store} para poder jugarlo",
  "card.tooltip.notInstalled": "No instalado — instálalo desde {store}",
  "card.tooltip.complete": "Logros 100% completados",
  "card.badge.notInstalled": "{store} · no instalado",

  // --- F2: menú contextual de tarjeta ---
  "ctx.run": "Ejecutar",
  "ctx.details": "Detalles",
  "ctx.addToGroup": "Agregar a grupo ›",
  "ctx.removeFromGroup": "Retirar de grupo ›",
  "ctx.hide": "Ocultar",
  "ctx.newGroup": "+ Nuevo grupo…",
  "ctx.toast.hidden": "«{title}» oculto",
  "ctx.toast.addedTo": "Añadido a «{name}»",
  "ctx.toast.removedFrom": "Quitado de «{name}»",

  // --- F2: título del teclado virtual según el campo a completar ---
  "keyboard.title.groupName": "Nombre del grupo",

  // --- F2: confirmación de eliminar juego ---
  "confirmDelete.title": "Eliminar juego",
  "confirmDelete.body.pre": "¿Seguro que quieres eliminar ",
  "confirmDelete.body.post": "? Se ejecutará su desinstalador.",
  "confirmDelete.toast.uninstalling": "Ejecutando desinstalador de {title}…",

  // --- F2: teclado virtual ---
  "vk.write": "Escribir",
  "vk.shift": "Mayús",
  "vk.backspace": "Borrar",
  "vk.space": "Espacio",
  "vk.accept": "Aceptar",
  "vk.submit": "Enviar",

  // --- F2: Inicio (estado vacío, botón de biblioteca) ---
  "home.empty": "Aún no has jugado nada. Abre la biblioteca (botón Menú).",
  "home.viewLibrary": "Ver biblioteca completa ({count}) →",

  // --- F2: aviso de mando conectado/desconectado ---
  "gamepad.connected": "Mando conectado",
  "gamepad.disconnected": "Mando desconectado",

  // --- F2: banner de error ---
  "error.label": "Error",
  "error.close": "Cerrar (B)",
};
