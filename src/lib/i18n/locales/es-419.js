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
  "settings.sections.updates": "Actualizaciones",

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
  "vk.showPassword": "Mostrar",
  "vk.hidePassword": "Ocultar",

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

  // --- F4: comunes nuevos ---
  "common.customize": "Personalizar",
  "common.visible": "Visible",
  "common.opacity": "Opacidad",
  "common.image": "Imagen",
  "common.glow": "Brillo",

  // --- F4: teclado virtual — títulos por campo (Configuración) ---
  "keyboard.title.profileName": "Nombre del perfil",

  // --- F4: Configuración → Apariencia ---
  "settings.appearance.profile.title": "Perfil activo",
  "settings.appearance.profile.new": "+ Nuevo perfil",
  "settings.appearance.profile.delete": "Borrar perfil",
  "settings.appearance.profile.baseTheme": "Tema base del perfil «{name}»",
  "settings.appearance.theme.lightSuffix": " (claro)",
  "settings.appearance.accentColor.title": "Color de acento",
  "settings.appearance.textColor.title": "Color de texto",
  "settings.appearance.textColor.desc":
    "Al cambiar a un tema de fondo claro, el texto se reinicia automáticamente a un tono oscuro legible; puedes volver a personalizarlo aquí.",
  "settings.appearance.font.title": "Tipografía",
  "settings.appearance.uiScale.title": "Escala de interfaz",
  "settings.appearance.cardSize.title": "Tamaño de tarjeta (biblioteca)",
  "settings.appearance.cardSizeHome.title": "Tamaño de tarjeta (Inicio)",
  "settings.appearance.interface.title": "Interfaz",
  "settings.appearance.interface.hideCardText": "Ocultar textos de las tarjetas",
  "settings.appearance.interface.hideLibraryButton": "Ocultar botón «Ver biblioteca» (Inicio)",
  "settings.appearance.interface.hideFooter": "Ocultar pie con guías de botones",
  "settings.appearance.gameView.title": "Vista de juego",
  "settings.appearance.gameView.desc": "Datos del juego que se muestran en el detalle (Jugar/Volver siempre visibles).",
  "settings.appearance.metaBg.title": "Fondo de metadatos (Detalle)",
  "settings.appearance.metaBg.desc":
    "Fondo detrás del título/plataforma/meta del Detalle, para que se lea mejor sobre el hero — se adapta al tema/perfil activo (no es un negro fijo).",
  "settings.appearance.homeBgFade.title": "Difuminado de fondo (Inicio)",
  "settings.appearance.homeBgFade.desc":
    "Qué tan visible se ve la foto de fondo de Inicio antes de desvanecerse hacia el wallpaper del tema — más bajo, más difuminado/tenue.",
  "settings.appearance.homeBgFade.label": "Difuminado",
  "settings.appearance.wallpaper.title": "Wallpaper de Inicio",
  "settings.appearance.wallpaper.desc":
    "Reemplaza el fondo de Inicio (la foto que cambia según el juego enfocado en la tira) por una imagen fija para todos los juegos. No afecta las carátulas de las tarjetas ni el Detalle de cada juego.",
  "settings.appearance.wallpaper.change": "Cambiar imagen…",
  "settings.appearance.wallpaper.choose": "Elegir imagen…",
  "settings.appearance.complete.title": "Resaltado de 100% completado (logros)",
  "settings.appearance.complete.desc":
    "Marca los juegos con todos los logros desbloqueados (tarjeta y badge de logros del Detalle) con este color — cámbialo si choca con el color de acento de tu perfil. Aplica a la insignia de texto y al brillo de abajo, cada uno con su propio interruptor.",
  "settings.appearance.complete.badgeLabel": "Insignia \"100%\"",
  "settings.appearance.home.title": "Inicio · Bienvenida",
  "settings.appearance.home.desc":
    "Título, subtítulo y encabezado \"Reciente\" de la pantalla de Inicio: cada uno se puede ocultar o reemplazar por texto personalizado (texto vacío = por defecto).",
  "settings.appearance.home.editText": "Editar texto",
  "settings.appearance.home.cardCount": "Cantidad de tarjetas (Inicio)",
  "settings.appearance.home.orientation": "Orientación de la tira (Inicio)",
  "settings.appearance.home.scrollMode": "Modo de recorrido (Inicio)",
  "settings.appearance.home.reading": "Comportamiento de lectura (Inicio)",
  "settings.appearance.home.position": "Posición del bloque (Inicio)",
  "settings.appearance.home.cardAlign": "Alineación de tarjetas (lista de Inicio)",
  "settings.appearance.tabsAlign": "Alineación de pestañas (barra superior)",
  "settings.appearance.clockPosition": "Posición del reloj (barra superior)",
  "settings.appearance.advanced.title": "Avanzado",
  "settings.appearance.advanced.desc":
    "Prueba de carga de CSS en runtime. En la app real cargarías un archivo .css; aquí se aplica un ejemplo que redefine tokens --gm-*.",
  "settings.appearance.advanced.applyExample": "Aplicar CSS de ejemplo",
  "settings.appearance.advanced.clear": "Limpiar personalización",
  "settings.appearance.advanced.exportCss": "Exportar perfil CSS",

  // --- F4: toasts de Configuración → Apariencia ---
  "settings.toast.profileCreated": "Perfil \"{name}\" creado y activado",
  "settings.toast.cssExampleApplied": "CSS externo de ejemplo aplicado",
  "settings.toast.cssCleared": "Personalización CSS limpiada",
  "settings.toast.wallpaperUpdated": "Wallpaper de Inicio actualizado",
  "settings.toast.wallpaperRemoved": "Wallpaper de Inicio quitado",
  "settings.toast.cannotDeleteOnlyProfile": "No puedes borrar el único perfil",
  "settings.toast.profileDeleted": "Perfil \"{name}\" eliminado",
  "settings.toast.exportComingSoon": "Exportar perfil CSS: próximamente",

  // --- F4: selector de color ---
  "colorPicker.default.title": "Color",
  "colorPicker.default.heading": "Elegir color",
  "colorPicker.palette.blues": "Azules",
  "colorPicker.palette.greensTeal": "Verdes / Teal",
  "colorPicker.palette.warm": "Cálidos",
  "colorPicker.palette.pinksPurples": "Rosas / Morados",
  "colorPicker.palette.neutrals": "Neutros",
  "keyboard.title.colorHex": "Color hex (RRGGBB)",
  "colorPicker.wheel.hide": "Ocultar rueda",
  "colorPicker.wheel.show": "Mostrar rueda de colores",
  "colorPicker.wheel.ariaLabel": "Rueda de color",
  "colorPicker.wheel.hint": "Arrastra en la rueda con el puntero, o usa los sliders con el mando.",
  "colorPicker.apply": "Aplicar",

  // --- F4: comunes nuevos ---
  "common.edit": "Editar",

  // --- F4: teclado virtual — títulos por campo (Cuentas) ---
  "keyboard.title.steamId": "Steam ID (SteamID64 o nombre de perfil)",
  "keyboard.title.steamApiKey": "API key de steamcommunity.com/dev/apikey",

  // --- F4: Configuración → Cuentas ---
  "accounts.toast.missingFields": "Falta el perfil de Steam o la API key",
  "accounts.steam.desc":
    "Trae tu biblioteca completa (instalados y no instalados) y tus logros. Cada persona usa su propia API key personal — se guarda cifrada en el almacén de credenciales del sistema, nunca en texto plano. Generarla en steamcommunity.com/dev/apikey.",
  "accounts.showSteamId": "Mostrar Steam ID",
  "accounts.syncProgress": "logros {done}/{total} (appid {appid})",
  "accounts.syncOptions.title": "Opciones de sincronización",
  "accounts.syncOptions.includeFreeGames": "Incluir juegos gratuitos jugados",
  "accounts.syncOptions.globalPctLabel": "Actualizar % global de logros",
  "accounts.syncNow": "Sincronizar ahora",
  "accounts.steamIdLabel": "Steam ID",
  "accounts.apiKeyLabel": "API key",
  "accounts.linking": "Vinculando…",
  "accounts.linkAccount": "Vincular cuenta",

  // --- F4: Configuración → Iconos de botones ---
  "buttonIcons.desc":
    "Estilo de los indicadores de botón de mando en la interfaz: texto plano o un set de iconos por plataforma. Los atajos de teclado/mouse siempre se muestran como texto.",
  "buttonIcons.preview": "Vista previa",
  "prompts.style.auto": "Automático (texto)",
  "prompts.style.lineXbox": "Línea · Xbox",
  "prompts.style.linePlaystation": "Línea · PlayStation",
  "prompts.style.lineUniversal": "Línea · Universal",
  "prompts.style.duotonoXbox": "Duotono · Xbox",
  "prompts.style.duotonoPlaystation": "Duotono · PlayStation",
  "prompts.style.duotonoUniversal": "Duotono · Universal",
  "prompts.style.badgeXbox": "Badge · Xbox",
  "prompts.style.badgePlaystation": "Badge · PlayStation",
  "prompts.style.badgeUniversal": "Badge · Universal",

  // --- F4: Configuración → Filtros de biblioteca ---
  "filters.toast.groupDeleted": "Grupo «{name}» eliminado",
  "filters.stores.descPre": "Activa o desactiva los filtros de tienda en la pestaña ",
  "filters.stores.descPost": ". Al desactivar uno, se oculta su chip de filtro y sus juegos dejan de aparecer allí.",
  "filters.stores.title": "Tiendas mostradas",
  "filters.storeBarAlign": "Alineación de la barra de filtros",
  "filters.cardAlign.title": "Alineación de las tarjetas",
  "filters.cardAlign.desc": "Hacia qué lado se agrupan las tarjetas en Juegos y Aplicaciones. El espaciado entre ellas no cambia.",
  "filters.groups.title": "Grupos personalizados",
  "filters.groups.emptyPre": "Aún no tienes grupos. Créalos desde el ",
  "filters.groups.emptyBold": "detalle de un juego",
  "filters.groups.emptyPost": " (botón «Nuevo grupo»); aparecerán como filtro en la pestaña Juegos.",
  "filters.groupGameCount": {
    one: "{count} juego",
    other: "{count} juegos",
  },

  // --- F4: comunes nuevos ---
  "common.show": "Mostrar",

  // --- F4: Configuración → Ocultos ---
  "hidden.desc": "Juegos y apps ocultos de la interfaz. Este es el único sitio para volver a mostrarlos.",
  "hidden.empty": "No hay elementos ocultos.",
  "hidden.emptyFiltered": "No hay elementos ocultos en esta categoría.",
  "hidden.kind.apps": "Apps",
  "hidden.toast.shown": "«{title}» visible de nuevo",

  // --- F4: Configuración → Notificaciones ---
  "notifications.desc":
    "Dónde aparecen en pantalla los avisos flotantes (por ahora: mando conectado/desconectado). Se ven afectados por la escala de interfaz y por el tema/perfil activo, igual que el resto de la app.",
  "notifications.position.title": "Posición",

  // --- F4: comunes nuevos ---
  "common.resetDefault": "Restaurar por defecto",
  "common.reassign": "Reasignar",
  "common.mode": "Modo",
  "common.duration": "Duración",

  // --- F4: teclado virtual — acciones asignables (Configuración → Atajos) ---
  "shortcuts.vk.toggleShift": "Alternar mayúsculas",
  "shortcuts.vk.cancelNoSave": "Cancelar (sin guardar)",
  "shortcuts.vk.confirmClose": "Confirmar y cerrar",

  // --- F4: teclado virtual — título por campo (Atajos) ---
  "keyboard.title.shortcutName": "Nombre del atajo",

  // --- F4: Configuración → Configuración de atajos ---
  "shortcuts.toast.padAssigned": "Atajo de mando asignado",
  "shortcuts.toast.kmAssigned": "Atajo de teclado/mouse asignado",
  "shortcuts.toast.vkAssigned": "Atajo de teclado virtual asignado",
  "shortcuts.toast.vkReset": "Atajos de teclado virtual restaurados por defecto",
  "shortcuts.toast.reset": "Atajos restaurados por defecto",
  "shortcuts.toast.customCreated": "Atajo personalizado creado",
  "shortcuts.desc":
    "Asigna qué tecla/botón de mouse y qué botón de mando ejecutan cada acción — ambos atajos conviven a la vez. Las direcciones (d-pad/stick/flechas) son fijas.",
  "shortcuts.colKeyboardMouse": "Teclado / Mouse",
  "shortcuts.colController": "Control",
  "shortcuts.vk.title": "Teclado virtual (mando)",
  "shortcuts.vk.desc":
    "Botones de mando para escribir en el teclado en pantalla — independientes del resto: el mismo botón físico puede servir para otra cosa fuera del teclado virtual. Con teclado físico ya se escribe directo (Enter confirma, Esc cancela).",
  "shortcuts.functions.title": "Funciones",
  "shortcuts.returnToLauncher.title": "Volver al launcher (en juego)",
  "shortcuts.returnToLauncher.shortLabel": "Volver al launcher",
  "shortcuts.returnToLauncher.desc":
    "Mientras un juego está en marcha, este botón restaura el launcher. Elige si actúa al pulsarlo o al mantenerlo pulsado.",
  "shortcuts.buttonLabel": "Botón",
  "shortcuts.mode.press": "Pulsar",
  "shortcuts.mode.hold": "Mantener",
  "shortcuts.radialMenu.title": "Menú radial de sistema (mando)",
  "shortcuts.radialMenu.desc":
    "Mantén presionado \"Home/Guide\" para abrir un menú a pantalla completa con 8 posiciones fijas — 4 sobre los botones de cara, 4 sobre hombros/gatillos. Congela el resto de la navegación mientras está abierto. Suelta Home sin elegir ninguna (o presiona el botón de cancelar configurado abajo) para cerrarlo sin hacer nada.",
  "shortcuts.radialMenu.cancelWith": "Cancelar con",
  "shortcuts.radialMenu.releaseHome": "Soltar Home",
  "shortcuts.systemMenuKm.title": "Menú de sistema (teclado/mouse)",
  "shortcuts.systemMenuKm.desc":
    "Atajo alterno para abrir la misma lista de acciones sin mando — no hay botón \"Home/Guide\" en teclado, así que se asigna aparte del menú radial de arriba (que sí es solo de mando).",
  "shortcuts.systemMenuKm.openLabel": "Abrir menú de sistema",
  "shortcuts.custom.title": "Atajos personalizados",
  "shortcuts.custom.desc":
    "Combinaciones de teclas del sistema operativo (ej. Alt+R para un overlay de FPS/CPU) que podrás disparar desde el menú de sistema, en su sección \"Atajos\". Algunas combinaciones (ej. Alt+Tab, Alt+F4) pueden estar reservadas por Windows.",
  "shortcuts.custom.delete": "Borrar",
  "shortcuts.custom.add": "Agregar atajo",
  "shortcuts.capture.pressButton": "Pulsa un botón del mando…",
  "shortcuts.capture.pressKey": "Pulsa una tecla o botón del mouse…",
  "shortcuts.capture.for": "para «{label}»",
  "shortcuts.custom.editorTitle": "Nuevo atajo: «{name}»",
  "shortcuts.custom.editorDesc": "Elige los modificadores y la tecla (no hace falta pulsarlos).",
  "shortcuts.custom.save": "Guardar atajo",

  // --- F4: Configuración → Sonidos ---
  "sounds.startupHint": "El sonido de inicio se configura en Configuración > Configuración de inicio.",
  "sounds.nav.title": "Navegación",
  "sounds.nav.desc": "Moverse entre tarjetas/menús, aceptar, cambiar de pestaña, y cancelar/retroceder.",
  "sounds.nav.volume": "Volumen de navegación",
  "sounds.notifications.desc": "Mensajes de error, y abrir/cerrar los menús de Configuración y Sistema.",
  "sounds.notifications.volume": "Volumen de notificaciones",
  "sounds.musicPlayer.title": "Reproductor de música",
  "sounds.musicPlayer.desc":
    "Preferencias del reproductor de música (Multimedia → Música) frente al resto de la app. Las 3 vienen habilitadas por defecto.",
  "sounds.musicPlayer.stopOnGame": "Detener la música al iniciar un juego",
  "sounds.musicPlayer.stopOnApp": "Detener la música al iniciar una aplicación",
  "sounds.musicPlayer.muteNavDuringMusic": "Silenciar sonidos de navegación al usar el reproductor de música",

  // --- F4: Configuración → Configuración de inicio ---
  "startup.initialView.title": "Vista al arrancar",
  "startup.fullscreen.title": "Pantalla completa al arrancar",
  "startup.sound.title": "Sonido de inicio",
  "startup.soundToPlay.title": "Sonido a reproducir",
  "startup.testSound": "Probar sonido de inicio",
  "startup.soundVolume.title": "Volumen del sonido de inicio",
  "startup.autostart.title": "Autoarranque con Windows",
  "startup.autostart.desc":
    "Arranca la app sola al iniciar sesión en Windows — pensada para dejar el PC listo como consola sin tocar nada. Solo funciona en la app instalada.",
  "startup.toast.autostartOnlyInApp": "Autoarranque solo en la app instalada",

  // --- F4: Configuración → Acciones del sistema ---
  "systemActions.powerFooter.title": "Mostrar pie con botones de ventana/energía",
  "systemActions.powerFooter.desc":
    "Minimizar, maximizar, pantalla completa, cerrar y apagar al final del menú de Configuración. Oculto por defecto — accede a lo mismo más rápido con el combo de botones (ver \"Configuración de atajos\" → Funciones).",
  "systemActions.order.title": "Orden del menú de sistema",
  "systemActions.order.desc":
    "Orden de las opciones del menú rápido (combo de botones o atajo de teclado/mouse — ver \"Configuración de atajos\" → Funciones).",

  // --- F4: comunes nuevos ---
  "common.disabled": "Desactivado",
  "common.network": "Red",
  "common.volume": "Volumen",
  "common.muted": "Silenciado",
  "common.output": "Salida",
  "common.input": "Entrada",
  "common.connect": "Conectar",
  "common.disconnect": "Desconectar",

  // --- F4: menú rápido de sistema (QAM) ---
  "qam.section.system": "Sistema",
  "qam.section.shortcuts": "Atajos",
  "qam.section.utilities": "Utilidades",
  "qam.shortcuts.empty":
    "No tienes atajos configurados. Créalos en Configuración > Configuración de atajos, en \"Atajos personalizados\".",
  "qam.system.noConnection": "Sin conexión",
  "qam.system.deviceCount": {
    one: "{count} dispositivo",
    other: "{count} dispositivos",
  },
  "qam.system.audioOutput": "Salida de audio",
  "qam.system.audioInput": "Entrada de audio",
  "qam.system.ethernet": "Cable de red",
  "qam.system.connected": "Conectado",
  "qam.system.connecting": "Conectando…",
  "qam.system.disconnecting": "Desconectando…",
  "qam.system.unpairing": "Olvidando…",
  "qam.system.pairing": "Emparejando…",
  "qam.system.scanning": "Buscando…",
  "qam.system.wifiScan": "Buscar redes",
  "qam.system.secured": "Red protegida",
  "qam.system.saved": "Guardada",
  "qam.system.forget": "Olvidar",
  "qam.system.passwordTitle": "Contraseña de {ssid}",
  "qam.system.wrongPasswordRetry": "Contraseña incorrecta. Vuelve a escribirla para {ssid}",
  "qam.system.noNetworks": "No se encontraron redes",
  "qam.system.noWifiAdapter": "Sin adaptador Wi-Fi",
  "qam.system.noBtAdapter": "Sin adaptador Bluetooth",
  "qam.system.btScan": "Buscar dispositivos",
  "qam.system.btPaired": "Emparejados",
  "qam.system.btAvailable": "Disponibles",
  "qam.system.btPair": "Emparejar",
  "qam.system.btUnpair": "Olvidar",
  "qam.system.noBtDevices": "No hay dispositivos emparejados",
  "qam.utilities.steam.library": "Biblioteca",
  "qam.utilities.steam.store": "Tienda",
  "qam.utilities.steam.myProfile": "Mi perfil",
  "qam.utilities.steam.friends": "Amigos",
  "qam.utilities.steam.downloads": "Descargas",
  "qam.utilities.steam.screenshots": "Capturas de pantalla",
  "qam.utilities.steam.activateProduct": "Activar un producto",
  "qam.utilities.steam.steamSettings": "Configuración de Steam",
  "qam.utilities.steam.shortcuts": "Accesos directos",
  "qam.utilities.gog.comingSoon": "Próximamente",
  "qam.utilities.gog.emptyHint": "Todavía no hay accesos directos de GOG.",
  "qam.music.nothingPlaying": "Nada reproduciéndose — abre Multimedia → Música para elegir un álbum o una lista.",

  // --- F4: menú radial de sistema ---
  "radial.music.hint": "▲▼ Volumen · ◀▶ Pista",
  "radial.hint.withCancel": "Suelta Home o presiona el botón de cancelar",
  "radial.hint.releaseOnly": "Suelta Home para cancelar",

  // --- F4: confirmación de apagado ---
  "shutdown.confirmMsg": "¿Seguro que quieres apagar el PC?",
  "shutdown.confirmButton": "Apagar",

  // --- F4: etiquetas de teclado/mouse (atajos) ---
  "keyBindings.backspace": "Retroceso",
  "keyBindings.clickLeft": "Clic izq.",
  "keyBindings.clickMiddle": "Clic medio",
  "keyBindings.clickRight": "Clic der.",
  "keyBindings.mouseBack": "Botón atrás (mouse)",
  "keyBindings.mouseForward": "Botón adelante (mouse)",
  "keyBindings.mouseButton": "Botón {n} (mouse)",

  // --- F4: atajo personalizado sin nombre (fallback defensivo) ---
  "shortcuts.custom.defaultName": "Atajo",

  // --- Actualizaciones de la app (Configuración → Actualizaciones) ---
  "updates.current": "Versión instalada: v{version}",
  "updates.channel.title": "Canal",
  "updates.channel.desc":
    "El canal beta trae lo nuevo antes, con más riesgo de fallas. Al cambiar de canal, la actualización aparece recién cuando ese canal publique una versión mayor a la instalada.",
  "updates.channel.options.stable": "Estable",
  "updates.channel.options.beta": "Beta",
  "updates.channel.stableEmpty":
    "Todavía no hay versiones estables publicadas: por ahora las novedades salen solo en el canal beta.",
  "updates.checkOnStart.title": "Buscar al iniciar",
  "updates.checkOnStart.desc":
    "Revisa si hay una versión nueva cada vez que abres VELUM. La instalación siempre la confirmas tú.",
  "updates.status.title": "Estado",
  "updates.status.idle": "Sin buscar todavía.",
  "updates.status.checking": "Buscando actualizaciones…",
  "updates.status.uptodate": "Estás al día.",
  "updates.status.ready": "Actualización lista para instalar.",
  "updates.status.installing": "Instalando…",
  "updates.available.title": "Hay una versión nueva: v{version}",
  "updates.published": "Publicada el {date}",
  "updates.notes.title": "Novedades",
  "updates.progress": "Descargando… {pct}%",
  "updates.progress.unknown": "Descargando…",
  "updates.aria.progress": "Progreso de la descarga",
  "updates.restartHint": "VELUM se cerrará y volverá a abrirse para terminar.",
  "updates.installHint": "La app se cerrará sola: no apagues el equipo.",
  "updates.check.action": "Buscar actualizaciones",
  "updates.check.checking": "Buscando…",
  "updates.download.action": "Descargar",
  "updates.install.action": "Instalar y reiniciar",
  "updates.later.action": "Después",
  "updates.retry.action": "Reintentar",
  "updates.webOnly":
    "En el navegador esto es una simulación: las actualizaciones reales solo funcionan en la app instalada.",
  "updates.toast.found": "Hay una versión nueva: v{version}",

  // --- F4: errores de Rust (códigos "codigo" o "codigo|detalle", ver i18n/errors.js) ---
  "errors.steam.key_read_failed":
    "No se pudo leer la API key guardada: {detail} — vincúlala de nuevo si el problema persiste",
  "errors.steam.profile_resolve_failed": "No se pudo resolver el perfil de Steam: {detail}",
  "errors.steam.no_steamid_returned": "Steam no devolvió un SteamID",
  "errors.steam.profile_not_found": "No se encontró ese perfil de Steam (revisa el nombre o usa tu SteamID64)",
  "errors.steam.key_validation_failed": "No se pudo validar la API key: {detail}",
  "errors.steam.invalid_key": "API key o SteamID inválidos",
  "errors.steam.missing_fields": "Falta el perfil de Steam o la API key",
  "errors.steam.key_save_failed": "No se pudo guardar la API key de forma segura: {detail}",
  "errors.assets.unsupported_image_ext": "Extensión de imagen no soportada: {detail}",
  "errors.assets.unsupported_audio_ext": "Extensión de audio no soportada: {detail}",
  "errors.shortcuts.unsupported_key": "Tecla no soportada: {detail}",
  "errors.shortcuts.send_input_failed": "SendInput no pudo enviar todos los eventos",
  "errors.config.dir_resolve_failed": "No se pudo resolver el directorio de configuración: {detail}",
  "errors.update.unknown_channel": "Canal de actualizaciones desconocido: {detail}",
  "errors.update.endpoint_invalid": "La dirección del canal de actualizaciones no es válida: {detail}",
  "errors.update.builder_failed":
    "No se pudo preparar la búsqueda de actualizaciones: {detail} — puede faltar la clave pública de firma",
  "errors.update.check_failed": "No se pudo buscar actualizaciones: {detail}",
  "errors.update.no_pending": "No hay ninguna actualización pendiente: busca de nuevo",
  "errors.update.download_failed": "Falló la descarga de la actualización: {detail}",
  "errors.update.install_failed": "Falló la instalación de la actualización: {detail}",
  "errors.update.relaunch_failed": "No se pudo reiniciar la app: {detail}",
  "errors.system.task_failed": "No se pudo completar la operación del sistema: {detail}",
  "errors.system.unsupported": "Esta acción no está disponible en este sistema",
  "errors.system.shutdown_failed": "No se pudo apagar el equipo: {detail}",
  "errors.system.audio.com_failed": "No se pudo acceder al audio del sistema: {detail}",
  "errors.system.audio.device_not_found": "Ese dispositivo de audio ya no está disponible",
  "errors.system.audio.set_default_failed": "No se pudo cambiar el dispositivo predeterminado",
  "errors.system.wifi.access_denied":
    "Windows no permitió buscar redes. Suele pasar si los permisos de ubicación están desactivados (Configuración → Privacidad → Ubicación) o si el servicio de Wi-Fi está deshabilitado.",
  "errors.system.wifi.service_stopped":
    "El servicio de Wi-Fi de Windows (WlanSvc) no está en marcha. Actívalo en Servicios (services.msc), donde aparece como «Configuración automática de WLAN».",
  "errors.system.wifi.unavailable": "El Wi-Fi no está disponible o está apagado",
  "errors.system.wifi.scan_failed": "No se pudieron buscar redes: {detail}",
  "errors.system.wifi.profile_failed": "No se pudo guardar el perfil de la red: {detail}",
  "errors.system.wifi.connect_failed": "No se pudo conectar a la red: {detail}",
  "errors.system.wifi.wrong_password": "Contraseña incorrecta",
  "errors.system.wifi.timeout": "La red no respondió a tiempo",
  "errors.system.radio.unavailable": "No se encontró la radio de ese adaptador",
  "errors.system.radio.access_denied": "Windows no dio permiso para controlar la radio",
  "errors.system.radio.set_failed": "No se pudo encender o apagar la radio: {detail}",
  "errors.system.bt.unavailable": "El Bluetooth no está disponible o está apagado",
  "errors.system.bt.scan_failed": "No se pudieron buscar dispositivos: {detail}",
  "errors.system.bt.device_not_found": "Ese dispositivo ya no está disponible",
  "errors.system.bt.pair_failed": "No se pudo emparejar el dispositivo: {detail}",
  "errors.system.bt.pair_rejected": "El dispositivo rechazó el emparejamiento",
  "errors.system.bt.pin_required": "Ese dispositivo pide un PIN: empareja esta vez desde Windows",
  "errors.system.bt.unpair_failed": "No se pudo olvidar el dispositivo: {detail}",
  "errors.system.bt.connect_failed": "No se pudo conectar el dispositivo: {detail}",
  "errors.system.bt.connect_unsupported":
    "Windows no permite conectar este dispositivo desde aquí: enciéndelo y se conectará solo",
};
