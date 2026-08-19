# Cuentas vinculadas (Steam)

Fase 9: trae la biblioteca **completa** de la cuenta de Steam de una persona
(instalados y no instalados) + horas jugadas y logros. Concepto distinto al de
"perfil" de `stores/profiles.js` (tema/apariencia) — **una sola cuenta de Steam
vinculada globalmente**, no por perfil de tema.

Este documento es el flujo general (vinculación, caché, sincronización, UI).
Para el detalle campo-por-campo de cada endpoint de la Steam Web API (qué se
captura, qué se deja fuera y por qué) ver `docs/steam-metadata.md`.

## Por qué cada persona usa su propia API key

La Steam Web API (`GetOwnedGames`/`GetPlayerAchievements`) **no devuelve datos
de un perfil privado salvo que la API key usada pertenezca a esa misma
cuenta**. No hay forma, vía la Web API pública, de que una sola key sirva para
traer la biblioteca completa de cualquier persona — por eso cada quien genera
su propia key en `steamcommunity.com/dev/apikey` y la pega en
Configuración → Cuentas, en vez de un login único compartido.

Se descartó a propósito un flujo "iniciar sesión con Steam" (OpenID): además de
requerir un servidor HTTP local para el redirect (una app de escritorio no
tiene una URL pública de retorno), el resultado para perfiles privados sería
el mismo — no traería datos completos igual. Pegar la key personal es más
simple de implementar y funciona siempre.

## Dónde vive la API key

**Nunca en `config.json` en texto plano.** Se guarda en el almacén de
credenciales del sistema operativo (Credential Manager en Windows, Keychain en
macOS para dev) vía el crate `keyring`
(`src-tauri/src/steam_api/mod.rs::stored_key`/`steam_link_account`). Lo único
que se persiste en `config.json` (vía `patchAppConfig`, igual que el resto de
la config) es la identidad pública ya resuelta: `{ steamid, personaName,
avatarUrl }`.

Como la identidad y la key viven en dos lugares distintos, es posible que la
key desaparezca del almacén del SO por fuera de la app (o que la escritura
original haya fallado) sin que `config.json` se entere — quedaría "vinculada"
en apariencia (nombre/avatar visibles) pero cualquier sync fallaría con un
error del keyring. `initSteamAccount()` (`stores/steamAccount.js`) verifica
esto al arrancar con `steam_has_key` y, si la key ya no está, limpia el estado
y pide vincular de nuevo en vez de dejar la UI en ese estado fantasma.

**Bug real encontrado en la primera prueba (ya corregido)**: `keyring = "3"` sin
features explícitas no trae NINGÚN backend real — cae en su store "mock"
interno (in-memory, pensado solo para tests de la propia crate), que acepta
`set_password` sin error pero cuya `get_password` en una `Entry` nueva siempre
da `NoEntry` (no hay persistencia entre instancias de `Entry`, ni dentro del
mismo proceso). Por eso "vincular" parecía funcionar (usa el resultado en
memoria de esa misma llamada) pero cualquier sync fallaba con "no matching
entry in secure storage" — sin excepción, sin importar reintentar. Arreglado
activando `features = ["apple-native", "windows-native"]` en
`src-tauri/Cargo.toml` (cada una solo compila su dependencia real en su propio
SO, así que declarar ambas es seguro en dev-macOS y producción-Windows).

## Caché local (SQLite)

`<app_config_dir>/steam_cache.sqlite` (mismo directorio que `config.json`,
`src-tauri/src/steam_api/cache.rs`). Esquema normalizado:

- `games(steamid, appid, name, playtime_forever, icon_url, last_synced_at,
  rtime_last_played, playtime_2weeks, has_community_visible_stats)` —
  biblioteca completa de `GetOwnedGames` (los últimos 3 campos, Fase 9l — ver
  `docs/steam-metadata.md` para el detalle campo-por-campo).
- `achievement_schema(appid, apiname, display_name, description, icon_url,
  icon_gray_url, hidden)` — datos ESTÁTICOS de cada logro posible de un juego
  (de `GetSchemaForGame`), por-juego, no por-cuenta: sirve para cualquier
  cuenta que se vincule después. `icon_gray_url`/`hidden` (Fase 9l): ícono
  bloqueado real y logros "spoiler" — ver `docs/steam-metadata.md`.
- `achievements(steamid, appid, apiname, achieved, unlock_time)` — estado
  DINÁMICO por jugador (de `GetPlayerAchievements`).
- `schema_cache(appid, fetched_at, has_achievements)` — para no volver a pedir
  el esquema de un juego ya visto, ni sus logros si no tiene ninguno.
- `achievement_global_pct(appid, apiname, percent, fetched_at)` — % de
  jugadores que tienen cada logro (`GetGlobalAchievementPercentagesForApp`,
  público, no requiere `key`/`steamid`). A diferencia de `achievement_schema`,
  SÍ se refresca (con el intervalo configurable en Cuentas → Opciones de
  sincronización, ver más abajo) — solo se pide cuando el jugador abre "Ver %
  global" en el modal de logros, no en cada sync.

## Sincronización incremental

`steam_sync_library` (`IPlayerService/GetOwnedGames`) trae la biblioteca
completa y devuelve qué `appid` cambiaron de `playtime_forever` desde la
última sincronización (o son nuevos) — **solo esos** se pasan a
`steam_sync_achievements`. Las horas jugadas de un juego solo cambian si la
persona lo jugó, así que comparar el playtime cacheado contra el nuevo es una
señal barata y confiable de "¿hace falta releer logros de este juego?" — evita
releer logros de toda la biblioteca (podrían ser cientos de juegos) en cada
sincronización.

Dentro de `steam_sync_achievements`, por cada `appid`:
1. Si ya está en `schema_cache`, no se vuelve a pedir `GetSchemaForGame` (ni
   aunque tenga logros — el esquema ya está guardado en
   `achievement_schema`).
2. Si no tiene logros (`has_achievements = 0`), se omite por completo.
3. Si tiene logros, se pide `GetPlayerAchievements` y se actualiza el estado.

**Manual vs. automática**: `syncNow({ full })` (`stores/steamAccount.js`) tiene
dos modos. El botón "Sincronizar ahora" de Cuentas llama `syncNow({ full: true
})` — re-verifica logros de **toda** la biblioteca, ignorando el atajo de
playtime (una revisión completa, deliberada). Las sincronizaciones automáticas
(ver más abajo) llaman `syncNow({ silent: true })` — `full` queda en `false`,
así que se quedan con el atajo liviano de "solo lo que cambió".

## Sincronización automática (en segundo plano, silenciosa)

Dos disparadores, ambos vía `syncNow({ silent: true })` (sin toasts de resumen
— solo el indicador de progreso ya existente, si aplica; logs de consola
iguales siempre):
- **Al terminar de jugar** un juego de Steam (`stores/playsession.js::endPlay`,
  evento `gm://game-ended`) — por si se desbloqueó algún logro nuevo.
- **Al abrir la app**, si ya hay cuenta vinculada (`App.svelte` `onMount`,
  después de `mergeCachedSteamGhosts()`) — sin `await`, no demora el primer
  pintado.

## Opciones de sincronización

Configuración → Cuentas → "Opciones de sincronización"
(`stores/steamAccount.js::steamSyncOptions`, persistido en `config.json` igual
que el resto):
- **Incluir juegos gratuitos jugados** (`includePlayedFreeGames`, default
  `true`) — pasa a `GetOwnedGames?include_played_free_games=`. Al desmarcarla
  se avisa que hace falta volver a sincronizar para que la biblioteca refleje
  el cambio (no se dispara sola). `steam_sync_library` borra del caché los
  `appid` que ya no vienen en la respuesta (`prune_missing_games` en
  `steam_api/library.rs`) — cubre este caso y, en general, cualquier juego que
  deje de estar en la cuenta (reembolso, etc.).
- **Actualizar % global de logros** (`globalPctInterval`: diario/semanal/
  mensual, default mensual) — el umbral que usa `steam_global_achievement_percentages`
  para decidir si refresca o sirve lo cacheado.

## Instalado vs. no instalado

`GetOwnedGames` no tiene concepto de "instalado" — eso es 100% local. El
cruce lo hace el frontend (`stores/games.js::mergeSteamGhosts`, llamado desde
`stores/steamAccount.js`): por cada juego de la biblioteca remota cuyo
`steam:{appid}` (mismo formato que `library/steam.rs`, ver `docs/stores.md`)
no aparece ya en `list_games()`, se agrega una tarjeta "fantasma" (`installed:
false`) — mismo badge Steam. `GameCard.svelte` sigue avisando con el `title`
nativo del navegador al pasar el mouse (sin acción real al hacer clic, mismo
criterio que antes). En `GameDetail.svelte`, en cambio, el botón "Jugar" para
un fantasma **se oculta** (ya no se muestra deshabilitado) y en su lugar
aparece **"⬇ Descargar desde Steam"** — abre el cliente de Steam directo en la
página de instalación de ese juego (`steam://install/<appid>`, mismo mecanismo
`open_target`/`start`/`open`/`xdg-open` que ya usa `launch_game` para lanzar
juegos instalados — ver `launch.rs::steam_open_install`). Solo aplica a
fantasmas de **Steam** con la cuenta vinculada (`$steamAccount`); "Volver"
sigue siendo el foco por defecto salvo que aparezca este botón, que pasa a
serlo él. Si la persona instala el juego después, la siguiente carga real de
`list_games()` trae el mismo id y el "fantasma" queda descartado por
`dedupeById` (se queda con la primera aparición).

**Suspende GM igual que un juego real** (`stores/playsession.js::
startSteamDownload`, no `steam_open_install` directo desde el componente):
overlay + bloqueo de input, sin usar `launchGame`/vigía de proceso (no hay
`installDir` que vigilar, el juego no está instalado todavía) — el regreso es
manual (mantener el botón de volver), igual que cualquier juego sin vigía
resuelto. Necesario porque el poll de XInput suplementario (`fix/control-
input`, ver `docs/input.md`) sigue leyendo el mando sin importar qué ventana
tenga el foco: sin esta suspensión, confirmar la instalación con el control
mientras Steam tiene el foco le llegaba TAMBIÉN a GM en segundo plano y
disparaba el mismo botón de nuevo, reabriendo la misma página de Steam.
`PlayingOverlay.svelte` muestra "⬇ Descargando desde Steam" en vez de
"▶ Jugando a" para este caso (`$session.mode === "steam-download"`).

**Mismo mecanismo para los accesos directos de Steam del QAM** (Select →
Utilidades, `QamUtilitiesSection.svelte`: biblioteca, tienda, perfil…):
`stores/playsession.js::startSteamUtility(label, target)`, no `openUrl`
directo desde el componente — mismo motivo de arriba (el poll de XInput sigue
leyendo el mando aunque Steam tenga el foco). A diferencia de
`startSteamDownload`, no hay un juego puntual asociado, así que `session` no
lleva `game` — solo `{ mode: "steam-utility", label }`; `PlayingOverlay.svelte`
usa `session.label` (el nombre del acceso, ej. "Biblioteca") en vez de
`session.game.title` para este modo.

**Carátulas por CDN público** (`stores/games.js::steamCdnArt`): URLs
deterministas por `appid`
(`cdn.akamai.steamstatic.com/steam/apps/{appid}/{library_600x900.jpg |
header.jpg | library_hero.jpg | logo.png}`) — sin tocar Rust ni IPC,
`imageUrl()` ya pasa directo cualquier URL `http(s):`. Cover/wide/hero se
pintan como `background-image` (un 404 cae solo al degradado de color de
siempre); el logo es el único `<img>` real de la cadena, blindado con
`on:error` porque no todos los juegos tienen ese asset en el CDN. Dos usos:

1. **Fantasmas** (no instalados): las 4 rutas de arte se fijan de una vez al
   crear la tarjeta (`mergeSteamGhosts`).
2. **Instalados sin arte local** (`fillMissingSteamArt`, se corre en cada
   `loadGames()`): `library/steam.rs` a veces no encuentra nada en
   `librarycache`/`grid` para un `appid` (juego nuevo, sin arte oficial
   cacheado por el cliente de Steam, etc.) — antes esos quedaban sin carátula
   para siempre. Ahora se rellena SOLO el campo que vino `null`, sin pisar
   nada que sí se haya detectado localmente. No depende de tener cuenta
   vinculada (la URL es puramente por `appid`). Como `effectiveArt()`
   (`stores/artoverrides.js`) resuelve `override manual || game.coverPath`,
   esto de paso se vuelve el valor al que "Quitar" (`ArtEditor.svelte`)
   restaura un override personalizado, en vez de caer a un placeholder vacío.

## Detalle de un juego: horas, logros

Las horas jugadas de Steam aparecen en línea con el resto de la metadata del
hero (título, plataforma, ruta de instalación) — campo togglable `playtime` en
`GAME_VIEW_FIELDS` (`stores/uiprefs.js`). Dos campos más de `GetOwnedGames`
(Fase 9l, ver `docs/steam-metadata.md`), también en línea y togglables:
`recentPlaytime` (horas en las últimas 2 semanas) y `steamLastPlayed` (última
vez jugado **según Steam** — distinto del `lastPlayed` de siempre, que para
instalados es 100% local).

Los logros se muestran de dos formas posibles, dos campos independientes en
`GAME_VIEW_FIELDS`/"Vista de juego":

- **`achievements`** ("Logros como badge (si no, sección)", default `true`):
  con `true`, badge flotante — encabezado "Logros de {plataforma}", progreso
  `X/Y` y % debajo, y hasta abajo ícono+nombre del último logro obtenido (o,
  si aún no hay ninguno, el próximo por desbloquear — desempate determinista
  por `s.rowid` de `achievement_schema`, ver `steam_api/achievements.rs`). Con
  `false`, en vez del badge aparece una sección "Logros" más en el menú
  paginado del Detalle, **antepuesta** a "Grupos" — con más espacio disponible
  ahí que en el badge flotante, se muestran hasta **3 logros desbloqueados**
  recientes (no solo el último) más un botón "Ver todos los logros" que abre
  el mismo modal; si todavía no hay ninguno desbloqueado, cae al próximo por
  desbloquear (mismo criterio que el badge). Nunca badge y sección a la vez.
- **`achievementsBadgeFixed`** ("Fijar el badge de logros en la esquina",
  default **`false`**): con `true`, el badge queda `position:absolute` dentro
  de `.detail` — fijo en la esquina inferior derecha sin importar si el menú
  inferior está desplegado. Con `false` (default), el badge se renderiza
  DENTRO de `.stage` (el contenedor del hero) en vez de `.detail` — la misma
  CSS de posición (`right`/`bottom`) queda relativa al hero, así que
  literalmente se mueve/encoge junto con él cuando el menú se despliega
  (`.stage` pasa a `flex-basis: 50%`), en vez de quedar fijo a la pantalla
  completa. Ambos modos comparten el mismo markup — `{#snippet
  achievementBadge()}` en `GameDetail.svelte`, renderizado en uno de los dos
  sitios según el toggle.
- **`showGlobalPct`** ("Mostrar % global de obtención (logros)", default
  `false`): también reasignable desde el propio modal (botón "Ver/Ocultar %
  global"), persistente entre aperturas.
- **`revealHiddenAchievements`** ("Mostrar logros ocultos (spoiler)", default
  `false`): **no** revela nada por sí solo — solo decide si el botón "Mostrar/
  Ocultar logros ocultos" existe dentro del modal. El estado de revelado en sí
  es de la **sesión del modal**, nunca persistente: arranca siempre apagado
  cada vez que se abre (incluso reabriendo el mismo juego), y se apaga de
  nuevo al cerrarlo. Pensado así porque revelar spoilers es una decisión de
  "ahora sí quiero verlo", no una preferencia permanente.

**Juego 100% completado**: cuando `unlocked === total` (y `total > 0`) para un
juego de Steam, se marca con un color configurable (`--gm-complete`,
Ajustes → Apariencia → "Resaltado de 100% completado" — ver `docs/theming.md`
para el detalle de los dos interruptores independientes, insignia y brillo)
en la **tarjeta** (`GameCard.svelte`) y el **badge de logros** del Detalle
(`GameDetail.svelte`, agrandado también en este ajuste), y recolorea la
**barra de progreso** del modal cuando llega al 100% (`.progress-fill.complete`).
El dato viene de un comando nuevo,
`steam_achievements_summary(steamid)` (`steam_api/achievements.rs`): un
`GROUP BY appid` sobre la tabla ya cacheada `achievements` (cada fila ahí ya
es un logro que `GetPlayerAchievements` devolvió, así que `COUNT(*)` por
appid es el total real sin unir con `achievement_schema`). Se carga una vez
al arrancar (junto con `mergeCachedSteamGhosts`) y se refresca tras cada
sync — no por tarjeta, para no hacer una consulta por juego visible.

Click/Aceptar en el badge (o el botón de la sección) abre
`AchievementsModal.svelte` — tamaño **fijo en px pensado para 1080p** (no
proporcional a la resolución real: en una pantalla 4K se ve
proporcionalmente más chico en vez de crecer con la pantalla), con un botón
**✕** en la esquina superior derecha del header para cerrar (además del clic
en el scrim). El header también muestra el conteo `unlocked/total` y una
barra de progreso con el color de acento (`--gm-accent`, o `--gm-complete` si
ya está al 100%). Solo la lista de logros scrollea, header queda fijo; margen
propio entre logros y contra los bordes del contenedor (no solo el padding
del modal) para que no se sientan amontonados; cada logro es `data-focusable`
(se navega con arriba/abajo). Cada fila muestra, además de nombre/
descripción: la **fecha de obtención** si está desbloqueado (`unlockTime`);
el **ícono bloqueado real** (`iconGrayUrl`) en vez de reusar el desbloqueado
con opacidad — si no hay variante gris, cae al mismo de siempre atenuado; y
los logros **spoiler** (`hidden`, ver `docs/steam-metadata.md`) se muestran
como "Logro oculto" hasta desbloquearse, sin revelar nombre/descripción antes
de tiempo (mismo criterio que el cliente de Steam) — **salvo** que el botón
"Mostrar logros ocultos" de la sesión actual del modal esté activo (ver
arriba). El badge/sección de logros aplican el mismo enmascarado (con
`revealHiddenAchievements` directo, no hay botón de sesión ahí) si el
"próximo a desbloquear" resulta ser un spoiler. "Ver/Ocultar % global" pide
bajo demanda el % de jugadores que tiene cada logro — si no se pudo obtener
nada, se avisa explícitamente en vez de no mostrar nada (antes quedaba en
blanco, indistinguible de "cargando").

**Secciones dinámicas del Detalle**: `stores/ui.js::DETAIL_SECTIONS` pasó de
ser un array fijo a un store (`GameDetail.svelte` llama `setDetailSections()`
reactivamente) porque la sección "Logros" puede aparecer o no según el juego y
el toggle de arriba — `App.svelte::detailDown()` usa `$DETAIL_SECTIONS.length`
para saber cuándo "abajo" debe pasar de sección. El interruptor entre
secciones en `GameDetail.svelte` compara por NOMBRE (`sections[$detailSection]
=== "grupos"`, etc.), no por índice fijo, para que insertar/quitar "logros" no
cambie de golpe qué sección se está viendo bajo el mismo índice (hay un ajuste
explícito que seguía la sección por nombre si su posición se corre).

## Idioma

**Configurable** desde Configuración → Cuentas ("Idioma de los datos de
Steam"), aparte del idioma de la interfaz. Por defecto vale `"auto"` = el
idioma de Steam asociado al de la interfaz (`latam`, `spanish` o `english`);
elegir un código concreto lo desacopla. El valor viaja como parámetro `lang`
de `steam_sync_library`/`steam_sync_achievements`; `steam_api::DEFAULT_LANG`
(`"latam"`) solo cubre que no venga ninguno. Detalle completo en
`docs/i18n.md`.

**Fallback a inglés por juego sin traducción**: `GetSchemaForGame` no cae solo
a inglés cuando un juego no tiene traducción al idioma pedido — devuelve
`displayName`/`description` vacíos. `fetch_schema_with_fallback`
(`steam_api/achievements.rs`) detecta esto (`schema_needs_fallback`: esquema
vacío, o algún logro con `displayName` vacío) y reintenta UNA vez con
`FALLBACK_LANG` (`"english"`, no configurable — es el fallback razonable para
cualquier idioma elegido). Un fallo de red no cuenta como "idioma incorrecto"
— no dispara el reintento. Acotado a logros (única fuente de texto localizado
que lee esta app); `GetOwnedGames` no tiene una señal equivalente para
detectar "idioma incorrecto" en el nombre del juego.

**Cambiar de idioma con caché existente**: `achievement_schema`/`schema_cache`
llevan columna `lang` (fuera de la PK) y el esquema se relee por juego a
medida que entra en una sincronización — cambiar el selector no dispara
ninguna llamada de red. Ver "Caché de Steam y cambios de idioma" en
`docs/i18n.md`.

## Progreso de sincronización

`steam_sync_achievements` emite el evento Tauri `gm://steam-sync-progress`
(`{ done, total, appid }`) tras cada juego — lo escucha
`stores/steamAccount.js` y lo muestra `SteamSyncIndicator.svelte`, un
indicador pequeño en una esquina que no bloquea el uso normal de la app
mientras sincroniza.

## Logs para depurar

Tanto el backend (`println!`, visible en la terminal con `npm run go` — en un
build de release el `windows_subsystem = "windows"` de `main.rs` **oculta la
consola**, así que ahí no se ven) como el frontend
(`console.log("[gm:steam] ...")`, siempre visible en las DevTools de la
WebView, incluso en un build empaquetado) registran cada paso: cuenta
vinculada/desvinculada, resumen de cada sincronización, qué `appid` se
re-sincronizaron y por qué, logros recibidos por juego.

## Resiliencia a errores + resumen de sincronización

Antes, un error de red/HTTP en UN juego (`steam_sync_achievements`) abortaba
la sincronización completa de logros a mitad de biblioteca, dejando el resto
sin procesar sin ningún aviso claro más que un error genérico. Ahora
`sync_one_game` (`steam_api/achievements.rs`) aísla el trabajo de un solo
juego; si falla, se registra en `AchievementsSyncSummary.errors` (`{ appid,
message }`) y el `for` **sigue** con el resto — un juego problemático ya no
tumba la sincronización de los demás.

`steam_sync_achievements` devuelve ese resumen (`total`, `scanned`,
`newSchemasTotal`/`newSchemasScanned`, `withAchievementsTotal`/
`achievementsSynced`, `errors`) en vez de solo un número. El frontend lo
muestra en `SteamSyncSummaryBadge.svelte` — un badge flotante (misma esquina
que `SteamSyncIndicator`, se turnan porque uno es mientras sincroniza y el
otro después) con las 4 métricas de un vistazo y un temporizador de auto-cierre
(20s, `stores/steamAccount.js::showSyncSummary`); al hacer **click** se
expande/colapsa el detalle con el log de errores (appid + mensaje), pausando
el auto-cierre mientras se lee (`syncSummaryExpanded`/
`toggleSyncSummaryExpanded()` en `stores/steamAccount.js`). No es un modal
que bloquee el resto de la app, así que no participa del sistema de
navegación por mando.

Hasta la Fase 9n había también un atajo de mando (combo **Guide + L3**) para lo
mismo — se retiró al reemplazar Home por el menú radial de sistema (ver
`docs/input.md`); la acción `steamSyncSummary` sigue existiendo en
`App.svelte -> dispatch` (por si se le asigna un atajo nuevo más adelante) pero
hoy no tiene ningún botón/tecla que la dispare — solo el click en el badge.

### Errores confirmados y corregidos (segunda ronda de prueba real)

El badge de resumen mostró dos errores reales al probar. Ambos se verificaron
directamente contra la API real de Steam (`curl`, sin necesidad de una API key
para confirmar la causa) antes de tocar el código:

- **404 en el % global de logros**: el método real se llama
  `GetGlobalAchievementPercentagesForApp` — **"...ForApp", no "...ForGame"**
  (el nombre que tenía el código, un error de tipeo desde el principio, nunca
  iba a existir esa ruta). De paso, la API devuelve `percent` como **string**
  (`"49.9"`), no como número JSON — el struct esperaba `f64` directo y habría
  fallado al parsear incluso con la URL corregida. `parse_percent`
  (`steam_api/global_achievements.rs`) acepta string o número.
- **403 en `GetSchemaForGame`**: **no era un problema de URL/versión** — se
  probó `v2` y `v0002` sin key contra la API real y ambos dan el mismo `400`
  (petición reconocida, falta la key), y con una key inválida ambos dan `403`
  con el cuerpo `"Forbidden... Please verify your key= parameter"` — el mismo
  403 que reportó el usuario. Es decir, `GetSchemaForGame/v2/` es la ruta
  correcta; el 403 apunta a un problema con la API key en sí en ese momento
  puntual (no reproducible desde este entorno sin una key real). Lo que sí se
  corrigió: **todas** las llamadas a la Web API ahora usan
  `describe_http_error()` (`steam_api/mod.rs`), que incluye el CUERPO de la
  respuesta de Steam en el mensaje de error (antes solo se veía "status code
  403", sin el texto explicativo) — la próxima vez que pase, el mensaje debería
  decir directamente si es la key o algo más.

## Desvincular

Botón "Desvincular" en Cuentas pide confirmación (`ConfirmUnlinkSteam.svelte`,
mismo patrón que `ConfirmDelete.svelte`) antes de borrar la key del keyring y
el caché local (`steam_unlink_account`/`cache::clear_account`, sin cambios ahí
— ya limpiaba los datos, solo faltaba la confirmación en la UI).

## Visibilidad del Steam ID

Solo frontend, sin tocar backend. El SteamID64 se muestra oculto por defecto
bajo el nombre/avatar (`stores/steamAccount.js::showSteamId`, default
`false`, persistido en `config.json` como el resto de preferencias) — se
enmascara con `"•".repeat(steamid.length)`, mismo criterio ya usado para la
API key al editarla. Un toggle "Mostrar Steam ID" justo debajo lo revela.

## Pendiente

- **GOG**: mismo patrón, fase separada — no empezado.
- **Biblioteca familiar de Steam ("Family Sharing")**: pedido por el usuario,
  diferido — no hay un endpoint público/documentado de la Steam Web API para
  esto (el mecanismo que usa el cliente/sitio de Steam requiere sesión de
  navegador, no la API key que usa esta app). Mismo criterio que Xbox/MS Store
  en `docs/stores.md`: se documenta como pendiente en vez de adivinar una
  implementación no verificada.
- **Rate limits**: la Steam Web API permite ~100 000 llamadas/día por key, muy
  por encima de lo que necesita una sola cuenta de una sala.
- Validado con cuenta real: vinculación, sincronización de biblioteca y logros
  funcionan; badge/modal de logros, carátulas de fantasmas, y resiliencia a
  errores probados en una segunda ronda. Los dos errores de esa ronda (403 en
  `GetSchemaForGame`, 404 en el % global) tenían causas distintas — ver
  "Errores confirmados y corregidos" arriba/abajo. **Sin verificar todavía con
  cuenta/red real**: % globales con el nombre de método correcto, el fallback
  de idioma en un juego sin traducción a `latam`. La Fase 9l (fecha de
  obtención, ícono bloqueado real, logros spoiler, `recentPlaytime`/
  `steamLastPlayed`, migración de columnas nuevas del caché SQLite en una
  instalación con datos previos) **ya se verificó con cuenta real** — los
  únicos ajustes encontrados fueron estéticos.
- **Campos de la Web API deliberadamente no capturados** (`img_logo_url`,
  desglose de playtime por plataforma, `content_descriptorids`,
  `defaultvalue`): ver tabla completa con el porqué de cada uno en
  `docs/steam-metadata.md`.
