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

  // --- F3: Detalle de juego ---
  "detail.playtime.none": "Sin horas registradas",
  "detail.playtime.hours": "{hours} h jugadas",
  "detail.playtime.minutes": "{minutes} min jugados",
  "detail.recentPlaytime.none": "Sin horas en las últimas 2 semanas",
  "detail.recentPlaytime.hours": "{hours} h jugadas (2 semanas)",
  "detail.recentPlaytime.minutes": "{minutes} min jugados (2 semanas)",
  "detail.steamLastPlayed.none": "Sin registro de Steam",
  "detail.steamLastPlayed.value": "Última vez (Steam): {date}",
  "detail.lastPlayed.never": "Nunca jugado",
  "detail.lastPlayed.value": "Última vez: {date}",
  "detail.downloadFromSteam": "Descargar desde Steam",
  "detail.downloadFromSteam.hint": "Se abre Steam en la página de este juego para instalarlo.",
  "detail.notInstalled.tooltip": "Instálalo desde {store} para poder jugarlo",
  "detail.notInstalled.hint": "Instálalo desde {store} para poder jugarlo.",
  "detail.achievements.title": "Logros de {store}",
  "detail.achievements.hidden": "Logro oculto",
  "detail.achievements.viewAll": "Ver todos los logros",
  "detail.sections.groups": "Grupos",
  "detail.groups.new": "+ Nuevo grupo",
  "detail.sections.images": "Imágenes",
  "detail.sections.soundtrack": "Soundtrack",
  "detail.sync.desc": "Fuerza una resincronización de los logros de este juego con Steam.",
  "detail.sync.syncing": "Sincronizando…",
  "detail.sync.action": "Sincronizar logros",
  "detail.sections.gameView": "Vista de juego",

  // --- F3: comunes nuevos ---
  "common.on": "ON",
  "common.off": "OFF",
  "common.filesOnlyInApp": "Selección de archivos solo en la app",
  "common.foldersOnlyInApp": "Selección de carpetas solo en la app",
  "common.pickerError": "No se pudo abrir el selector",
  "common.choose": "Elegir…",
  "common.remove": "Quitar",

  // --- F3: editor de imágenes del juego (ArtEditor) ---
  "art.slots.cover.label": "Carátula",
  "art.slots.cover.dims": "600 × 900",
  "art.slots.wide.label": "Carátula expandida",
  "art.slots.wide.dims": "920 × 430",
  "art.slots.hero.label": "Hero (fondo)",
  "art.slots.hero.dims": "3840 × 1240 (sugerida, según tu pantalla)",
  "art.slots.logo.label": "Logo",
  "art.slots.logo.dims": "PNG transparente",
  "art.noImage": "Sin imagen",
  "art.logoPosition": "Posición del logo",
  "art.dragHint": "Arrastra una imagen aquí o usa «{choose}».",
  "art.toast.updated": "Imagen actualizada",
  "art.toast.cleared": "Personalización quitada",

  // --- F3: editor de soundtrack del juego ---
  "soundtrack.head": "Audio del juego",
  "soundtrack.change": "Cambiar audio…",
  "soundtrack.choose": "Elegir audio…",
  "soundtrack.warn":
    "Se sugiere el uso de archivos comprimidos con tamaño moderado (MP3/OGG). El uso de archivos demasiado pesados puede afectar el rendimiento de la aplicación mientras se reproduce.",
  "soundtrack.hint": "Se reproduce en loop mientras el juego está enfocado en Inicio o se ve su Detalle.",
  "soundtrack.filterName": "Audio",
  "soundtrack.toast.updated": "Soundtrack actualizado",
  "soundtrack.toast.cleared": "Soundtrack quitado",

  // --- F3: comunes nuevos ---
  "common.close": "Cerrar",

  // --- F3: modal de logros completos ---
  "achievements.modal.aria": "Logros",
  "achievements.modal.heading": "Logros — {title}",
  "achievements.globalPct.hide": "Ocultar % global",
  "achievements.globalPct.show": "Ver % global",
  "achievements.sort.label": "Ordenar:",
  "achievements.sort.byDate": "Fecha de obtención",
  "achievements.sort.byGlobal": "% global",
  "achievements.unlockedAt": "Desbloqueado: {date}",
  "achievements.global.loading": "cargando %…",
  "achievements.global.pct": "{pct}% de los jugadores lo tienen",
  "achievements.global.error": "no se pudo obtener el % global",
  "achievements.empty": "Sin logros sincronizados todavía — sincroniza desde Configuración → Cuentas.",

  // --- F3: indicador y resumen de sincronización de Steam ---
  "steamSync.progress": "Steam: logros {done}/{total}",
  "steamSync.library": "Steam: sincronizando biblioteca…",
  "steamSync.summary.achievementsUpdated": "Logros actualizados: {done}/{total}",
  "steamSync.summary.scanned": "Escaneados: {scanned}/{total} · Nuevos: {newScanned}/{newTotal}",
  "steamSync.summary.errors": "Errores en el proceso: {count}",
  "steamSync.summary.detailTitle": "Detalle de la sincronización",
  "steamSync.summary.noErrors": "Sin errores en esta sincronización.",
  "steamSync.errorAppid": "appid {appid}",

  // --- F3: cuenta de Steam ---
  "steamAccount.unlink.title": "Desvincular cuenta de Steam",
  "steamAccount.unlink.body":
    "¿Seguro que quieres desvincular tu cuenta? Se borra la biblioteca y los logros sincronizados de este launcher (tu cuenta de Steam no se ve afectada).",
  "steamAccount.unlink.confirm": "Desvincular",
  "steamAccount.interval.daily": "Cada día",
  "steamAccount.interval.weekly": "Cada semana",
  "steamAccount.interval.monthly": "Cada mes",
  "steamAccount.syncOptions.reapplyHint": "Vuelve a sincronizar para aplicar el cambio",
  "steamAccount.toast.keyLost": "Se perdió la API key de Steam guardada — vincula tu cuenta de nuevo",
  "steamAccount.toast.linked": "Cuenta de Steam vinculada: {name}",
  "steamAccount.toast.unlinked": "Cuenta de Steam desvinculada",

  // --- F3: plurales de sincronización (prohibido "juego(s)", ver docs/i18n.md) ---
  "steam.toast.librarySynced": {
    one: "Biblioteca sincronizada: {count} juego",
    other: "Biblioteca sincronizada: {count} juegos",
  },
  "steam.toast.achievementsSynced": {
    one: "Logros actualizados en {count} juego",
    other: "Logros actualizados en {count} juegos",
  },

  // --- F3: overlay "jugando" y sesión de juego ---
  "playing.downloading": "⬇ Descargando desde Steam",
  "playing.openingSteam": "🎮 Abriendo Steam",
  "playing.playing": "▶ Jugando a",
  "playing.hint.hold": "Mantén",
  "playing.hint.press": "Pulsa",
  "playing.hint.suffix": "para volver al launcher",
  "common.preferenceSaved": "Preferencia guardada",

  // --- F3: comunes de multimedia ---
  "common.rename": "Renombrar",
  "common.refresh": "Actualizar",
  "common.shuffle": "Aleatorio",
  "common.loading": "Cargando…",
  "media.play": "Reproducir",

  // --- F3: Multimedia (cascarón de secciones) ---
  "multimedia.section.music": "Música",
  "multimedia.section.videos": "Videos",

  // --- F3: teclado virtual — títulos por campo (multimedia) ---
  "keyboard.title.playlistName": "Nombre de la lista",
  "keyboard.title.albumName": "Nombre del álbum",

  // --- F3: Música — vista principal ---
  "music.tab.albums": "Álbumes",
  "music.tab.playlists": "Listas",
  "music.tab.nowPlaying": "Reproducción",
  "music.addAlbum": "Agregar álbum",
  "music.addRootFolder": "Agregar carpeta raíz",
  "music.emptyAlbums":
    "Agrega una carpeta con música — cada carpeta se convierte en un álbum. O agrega una carpeta raíz y cada subcarpeta se convierte en un álbum automáticamente.",
  "music.newPlaylist": "Nueva lista",
  "music.trackCount": {
    one: "{count} pista",
    other: "{count} pistas",
  },
  "music.emptyPlaylists": "Crea una lista para combinar pistas de distintos álbumes.",
  "music.toast.albumAdded": "Álbum agregado",
  "music.toast.rootFolderAdded": "Carpeta raíz agregada",
  "music.toast.playlistCreated": "Lista \"{name}\" creada",

  // --- F3: Música — detalle de álbum ---
  "music.toast.addedToPlaylist": "Agregado a \"{name}\"",
  "music.newPlaylistOption": "Crear lista nueva…",
  "music.removeFromLibrary": "Quitar de la biblioteca",
  "music.playAlbum": "Reproducir álbum",
  "music.noAudioFiles": "No se encontraron archivos de audio en esta carpeta.",

  // --- F3: Música — detalle de lista ---
  "music.toast.playlistDeleted": "Lista \"{name}\" eliminada",
  "music.deletePlaylist": "Eliminar lista",
  "music.playlistEmpty":
    "Sin pistas todavía — agrégalas desde el detalle de un álbum (\"Agregar a lista\").",
  "music.moveUp": "Mover arriba",
  "music.moveDown": "Mover abajo",
  "music.removeFromPlaylist": "Quitar de la lista",

  // --- F3: Música — reproducción actual ---
  "music.nothingPlaying": "Nada reproduciéndose — elige un álbum o una lista.",
  "music.previous": "Anterior",
  "music.playPause": "Reproducir/pausar",
  "music.next": "Siguiente",

  // --- F3: Imágenes ---
  "images.emptyAlbums":
    "Agrega una carpeta con imágenes — cada carpeta se convierte en un álbum. O agrega una carpeta raíz y cada subcarpeta se convierte en un álbum automáticamente.",
  "images.noImagesFound": "No se encontraron imágenes en esta carpeta.",

  // --- F3: Video ---
  "videos.emptyAlbums":
    "Agrega una carpeta con videos (MP4/WebM) — cada carpeta se convierte en un álbum. O agrega una carpeta raíz y cada subcarpeta se convierte en un álbum automáticamente.",
  "videos.noVideosFound": "No se encontraron videos (MP4/WebM) en esta carpeta.",
  "videos.exit": "Salir",
};
