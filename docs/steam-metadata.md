# Metadata de la Steam Web API

Catálogo de qué trae cada endpoint de la Steam Web API que usa esta app, qué
campos se capturan (y dónde viven — caché SQLite, comando Tauri, UI) y cuáles
se dejan fuera a propósito. Ver `docs/accounts.md` para el flujo general de
vinculación/sincronización; este documento es solo el detalle de datos.

Todas las llamadas viven en `src-tauri/src/steam_api/` (`mod.rs`,
`library.rs`, `achievements.rs`, `global_achievements.rs`). Idioma fijo en
`PRIMARY_LANG` (`"latam"`, con fallback a `"english"` si el juego no tiene
traducción — ver `docs/accounts.md`).

## `ISteamUser/ResolveVanityURL/v1/`

Solo si el perfil pegado en Cuentas no es un SteamID64 puro (`resolve_vanity_url`,
`steam_api/mod.rs`). Requiere `key`.

| Campo Steam | Capturado | Uso |
|---|---|---|
| `success` | Sí | `1` = resuelto; si no, error "no se encontró ese perfil" |
| `steamid` | Sí | Se usa para las siguientes llamadas |

## `ISteamUser/GetPlayerSummaries/v2/`

Valida la key y trae la identidad (`fetch_player_summary`). Requiere `key`.

| Campo Steam | Capturado | Dónde vive | Uso |
|---|---|---|---|
| `steamid` | Sí | `config.json` (`steamAccount.steamid`) | Todas las demás llamadas |
| `personaname` | Sí (`personaName`) | `config.json` | Nombre en Cuentas |
| `avatarfull` | Sí (`avatarUrl`) | `config.json` | Avatar en Cuentas |
| resto (perfil, país, estado online, etc.) | No | — | Sin uso en un launcher de sala |

## `IPlayerService/GetOwnedGames/v1/`

Biblioteca completa (instalados y no). Requiere `key`. Params:
`include_appinfo=1`, `include_played_free_games` (configurable, Cuentas →
Opciones de sincronización), `l` = `PRIMARY_LANG`.

| Campo Steam | Capturado | Columna (`games`) | Expuesto (`SteamLibraryEntry`) | UI |
|---|---|---|---|---|
| `appid` | Sí | `appid` (PK) | `appid` | id `steam:{appid}` |
| `name` | Sí | `name` | `name` | Título del "fantasma" |
| `playtime_forever` | Sí | `playtime_forever` | `playtimeForever` | Campo `playtime` (horas jugadas) + heurística de qué re-sincronizar |
| `img_icon_url` | Sí (se arma la URL completa) | `icon_url` | `iconUrl` | — (reservado, hoy no se pinta en ningún lado; las carátulas grandes salen del CDN por appid, no de este ícono chico) |
| `playtime_2weeks` | Sí (Fase 9l) | `playtime_2weeks` | `playtime2weeks` | Campo `recentPlaytime` ("Jugado recientemente") |
| `rtime_last_played` | Sí (Fase 9l) | `rtime_last_played` | `rtimeLastPlayed` | Campo `steamLastPlayed` ("Última vez jugado según Steam") — **distinto** del `lastPlayed` de siempre, que para instalados es 100% local (fecha de archivo/registro) |
| `has_community_visible_stats` | Sí (Fase 9l) | `has_community_visible_stats` | No (interno) | Optimización: si es `false`, `steam_sync_achievements` se salta `GetSchemaForGame` por completo para ese juego (ver más abajo) |
| `img_logo_url` | **No** | — | — | Formato de logo antiguo/de baja resolución, deprecado en la práctica frente al logo del CDN por appid que ya se usa (`docs/accounts.md`) — capturarlo sería redundante |
| `playtime_windows_forever` / `_mac_forever` / `_linux_forever` | **No** | — | — | Desglose por plataforma; esta app apunta a Windows, sin uso claro |
| `content_descriptorids` | **No** | — | — | Clasificación de contenido (violencia, etc.), sin uso en un launcher de sala |

## `ISteamUserStats/GetSchemaForGame/v2/`

Esquema ESTÁTICO de logros de un juego (nombre/descripción/íconos) — se pide
UNA vez por juego (`schema_cache`), nunca se refresca (ver `docs/accounts.md`).
Requiere `key`, no requiere `steamid` (no es por-cuenta).

| Campo Steam | Capturado | Columna (`achievement_schema`) | Expuesto (`AchievementEntry`) | UI |
|---|---|---|---|---|
| `name` (apiname) | Sí | `apiname` (parte de la PK) | `apiname` | Clave interna, no se muestra |
| `displayName` | Sí | `display_name` | `displayName` | Nombre del logro |
| `description` | Sí | `description` | `description` | Descripción del logro |
| `icon` | Sí | `icon_url` | `iconUrl` | Ícono del logro DESBLOQUEADO |
| `icongray` | Sí (Fase 9l) | `icon_gray_url` | `iconGrayUrl` | Ícono del logro BLOQUEADO — antes se reusaba `icon` con `opacity` para simular el bloqueo |
| `hidden` | Sí (Fase 9l) | `hidden` | `hidden` | Logro "spoiler": si `hidden && !achieved`, la UI muestra "Logro oculto" en vez del nombre/descripción real (que sí se guarda cacheado, la UI decide si lo enmascara) |
| `defaultvalue` | **No** | — | — | Valor por defecto de la stat asociada al logro (uso interno de Valve), sin relevancia para mostrarlo |

**Optimización (Fase 9l)**: si `games.has_community_visible_stats = 0` para un
`appid`, `sync_one_game` (`achievements.rs`) marca `schema_cache.has_achievements
= 0` directamente y **no llama** `GetSchemaForGame` — ahorra una llamada de red
por cada juego sin logros (suele ser una fracción grande de cualquier
biblioteca: herramientas, DLC, apps).

## `ISteamUserStats/GetPlayerAchievements/v1/`

Estado DINÁMICO por jugador (desbloqueado sí/no + fecha) — se pide en cada
sync incremental, solo para los `appid` con playtime cambiado (o forzado con
"Sincronizar ahora"). Requiere `key` + `steamid`.

| Campo Steam | Capturado | Columna (`achievements`) | Expuesto (`AchievementEntry`) | UI |
|---|---|---|---|---|
| `apiname` | Sí | `apiname` (parte de la PK) | `apiname` | — |
| `achieved` | Sí | `achieved` | `achieved` | Ícono/nombre a color vs. atenuado |
| `unlocktime` | Sí | `unlock_time` | `unlockTime` | **Fecha de obtención** ("Desbloqueado: dd/mm/aaaa hh:mm") — se capturaba desde la Fase 9c pero nunca se mostraba en ningún lado hasta la Fase 9l |
| `name`/`description` (si Steam los repite acá) | No, se usan los de `GetSchemaForGame` | — | — | Evita una segunda fuente de verdad para el mismo texto |

Casos especiales ya manejados: HTTP 400 → "sin stats" (se omite, no es
error); `playerstats.success = false` → perfil de logros no público (se
omite).

## `ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/`

**Nota del nombre**: el método real es `GetGlobalAchievementPercentagesForApp`
— "...ForApp", no "...ForGame" (typo real que hubo en el código hasta la Fase
9i, causaba 404 siempre; corregido y verificado con `curl` contra la API
real). Público — sin `key` ni `steamid`. Param del juego: `gameid` (no
`appid`, inconsistente con el resto de la API).

| Campo Steam | Capturado | Columna (`achievement_global_pct`) | Expuesto (`GlobalAchievementPercentage`) | UI |
|---|---|---|---|---|
| `name` (apiname) | Sí | `apiname` (parte de la PK) | `apiname` | — |
| `percent` | Sí — **viene como STRING** (`"49.9"`, no `49.9`), `parse_percent` lo acepta como string o número | `percent` (REAL) | `percent` (f64) | "Ver % global" en `AchievementsModal.svelte` |

Bajo demanda (botón "Ver % global"), no en cada sync — se cachea con
refresco configurable (Cuentas → Opciones de sincronización: diario/semanal/
mensual, default mensual).

## Resumen: togglable en "Vista de juego" (`stores/uiprefs.js::GAME_VIEW_FIELDS`)

| Campo | Fuente Steam | Default |
|---|---|---|
| `playtime` | `GetOwnedGames.playtime_forever` | `true` |
| `recentPlaytime` | `GetOwnedGames.playtime_2weeks` | `true` |
| `steamLastPlayed` | `GetOwnedGames.rtime_last_played` | `true` |
| `achievements` | Logros (badge o sección, ver `docs/accounts.md`) | `true` |
| `achievementsBadgeFixed` | — (solo posición del badge) | `false` |

## Migraciones de esquema (SQLite)

`steam_api/cache.rs::ensure_column` — instalaciones previas a la Fase 9l no
tienen las columnas nuevas (`games.rtime_last_played`/`playtime_2weeks`/
`has_community_visible_stats`, `achievement_schema.icon_gray_url`/`hidden`).
`CREATE TABLE IF NOT EXISTS` no las agrega a una tabla ya existente — se
verifican con `PRAGMA table_info` y se agregan con `ALTER TABLE ... ADD COLUMN`
si faltan, de forma idempotente (primera migración de columnas de este
caché — antes todo lo nuevo era tablas nuevas, nunca columnas nuevas en una
tabla vieja).
