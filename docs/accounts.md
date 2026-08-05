# Cuentas vinculadas (Steam)

Fase 9: trae la biblioteca **completa** de la cuenta de Steam de una persona
(instalados y no instalados) + horas jugadas y logros. Concepto distinto al de
"perfil" de `stores/profiles.js` (tema/apariencia) — **una sola cuenta de Steam
vinculada globalmente**, no por perfil de tema.

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

- `games(steamid, appid, name, playtime_forever, icon_url, last_synced_at)` —
  biblioteca completa de `GetOwnedGames`.
- `achievement_schema(appid, apiname, display_name, description, icon_url)` —
  datos ESTÁTICOS de cada logro posible de un juego (de `GetSchemaForGame`),
  por-juego, no por-cuenta: sirve para cualquier cuenta que se vincule después.
- `achievements(steamid, appid, apiname, achieved, unlock_time)` — estado
  DINÁMICO por jugador (de `GetPlayerAchievements`).
- `schema_cache(appid, fetched_at, has_achievements)` — para no volver a pedir
  el esquema de un juego ya visto, ni sus logros si no tiene ninguno.
- `achievement_global_pct(appid, apiname, percent, fetched_at)` — % de
  jugadores que tienen cada logro (`GetGlobalAchievementPercentagesForGame`,
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
false`) — mismo badge Steam, pero el botón "Jugar" avisa que hay que instalar
el juego en vez de intentar lanzarlo (`GameCard.svelte`). Si la persona lo
instala después, la siguiente carga real de `list_games()` trae el mismo id y
el "fantasma" queda descartado por `dedupeById` (se queda con la primera
aparición).

**Carátulas de los fantasmas**: se resuelven en el frontend con URLs
deterministas del CDN público de Steam por `appid`
(`cdn.akamai.steamstatic.com/steam/apps/{appid}/{library_600x900.jpg |
header.jpg | library_hero.jpg | logo.png}`, ver `stores/games.js::steamGhostArt`)
— sin tocar Rust ni IPC, `imageUrl()` ya pasa directo cualquier URL `http(s):`.
Cover/wide/hero se pintan como `background-image` (un 404 cae solo al
degradado de color de siempre); el logo es el único `<img>` real de la cadena,
blindado con `on:error` porque no todos los juegos tienen ese asset en el CDN.

## Detalle de un juego: horas, logros

Las horas jugadas de Steam aparecen en línea con el resto de la metadata del
hero (título, plataforma, ruta de instalación) — campo togglable `playtime` en
`GAME_VIEW_FIELDS` (`stores/uiprefs.js`). Los logros se condensan en un badge
fijo en la esquina inferior derecha del Detalle (campo togglable
`achievements`): ícono + nombre del último logro obtenido (o, si aún no hay
ninguno, el próximo por desbloquear — desempate determinista por
`s.rowid` de `achievement_schema`, ver `steam_api/achievements.rs`) + progreso
`X/Y` y %. Al activarlo (click/Aceptar) abre `AchievementsModal.svelte`, un
modal centrado con el listado completo — solo la lista scrollea, título y
botones quedan fijos. Ahí mismo, "Ver % global" pide (bajo demanda, no en cada
sync) el % de jugadores que tiene cada logro.

## Idioma

Fijo en `l=latam` (español Latinoamérica — Steam distingue este código del
`spanish` de España) para nombres/descripciones de logros y biblioteca (
`steam_api::PRIMARY_LANG`). No hay selector de idioma real todavía; cuando
exista, `PRIMARY_LANG` pasa a resolverse desde config en vez de ser constante.

**Fallback a inglés por juego sin traducción**: `GetSchemaForGame` no cae solo
a inglés cuando un juego no tiene traducción a `latam` — devuelve
`displayName`/`description` vacíos. `fetch_schema_with_fallback`
(`steam_api/achievements.rs`) detecta esto (`schema_needs_fallback`: esquema
vacío, o algún logro con `displayName` vacío) y reintenta UNA vez con
`PRIMARY_LANG` → `FALLBACK_LANG` (`"english"`). Un fallo de red no cuenta como
"idioma incorrecto" — no dispara el reintento. Acotado a logros (única fuente
de texto localizado que lee esta app); `GetOwnedGames` no tiene una señal
equivalente para detectar "idioma incorrecto" en el nombre del juego.

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

## Desvincular

Botón "Desvincular" en Cuentas pide confirmación (`ConfirmUnlinkSteam.svelte`,
mismo patrón que `ConfirmDelete.svelte`) antes de borrar la key del keyring y
el caché local (`steam_unlink_account`/`cache::clear_account`, sin cambios ahí
— ya limpiaba los datos, solo faltaba la confirmación en la UI).

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
  funcionan. **Sin verificar todavía con cuenta/red real**: porcentajes
  globales de logros (firma exacta de `GetGlobalAchievementPercentagesForGame`
  — ver nota en `steam_api/global_achievements.rs`), el fallback de idioma en
  un juego sin traducción a `latam`, y las carátulas del CDN para no
  instalados.
