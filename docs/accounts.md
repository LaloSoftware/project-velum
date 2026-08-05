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

## Idioma

Fijo en `l=latam` (español Latinoamérica — Steam distingue este código del
`spanish` de España) para nombres/descripciones de logros. No hay selector de
idioma real todavía; cuando exista, este valor pasa a ser configurable.

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

## Pendiente

- **GOG**: mismo patrón, fase separada — no empezado.
- **Rate limits**: la Steam Web API permite ~100 000 llamadas/día por key, muy
  por encima de lo que necesita una sola cuenta de una sala.
- Sin probar con red/API key real todavía — la vinculación, sincronización y
  logros reales quedan pendientes de verificar en una sesión con una cuenta de
  Steam de verdad.
