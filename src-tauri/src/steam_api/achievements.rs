//! Logros incrementales — Fase 9c. Solo se llama con los `appid` que
//! `steam_sync_library` marcó como cambiados (playtime nuevo/distinto) o
//! nunca sincronizados; releer logros de TODA la biblioteca en cada
//! sincronización sería carísimo para cuentas con cientos de juegos.

use super::{cache, stored_key, API_BASE, DEFAULT_LANG, FALLBACK_LANG};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Deserialize)]
struct SchemaResponse {
    game: Option<SchemaGame>,
}
#[derive(Deserialize)]
struct SchemaGame {
    #[serde(rename = "availableGameStats")]
    available_game_stats: Option<AvailableStats>,
}
#[derive(Deserialize, Default)]
struct AvailableStats {
    #[serde(default)]
    achievements: Vec<SchemaAchievement>,
}
#[derive(Deserialize, Clone)]
struct SchemaAchievement {
    name: String,
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    icon: String,
    // Ícono del logro BLOQUEADO (gris) — antes se reusaba el mismo `icon` para
    // ambos estados. `hidden`: logro "spoiler" (Steam no revela nombre/
    // descripción antes de conseguirlo) — se guarda el texto real igual (ya
    // lo tenemos, viene en la misma respuesta), el frontend decide si lo
    // enmascara según `achieved`.
    #[serde(default)]
    icongray: String,
    #[serde(default)]
    hidden: i32,
}

#[derive(Deserialize)]
struct PlayerAchievementsResponse {
    playerstats: PlayerStats,
}
#[derive(Deserialize, Default)]
struct PlayerStats {
    #[serde(default)]
    success: bool,
    #[serde(default)]
    achievements: Vec<PlayerAchievement>,
}
#[derive(Deserialize)]
struct PlayerAchievement {
    apiname: String,
    achieved: i32,
    unlocktime: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementEntry {
    pub apiname: String,
    pub achieved: bool,
    pub unlock_time: Option<i64>,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub icon_gray_url: Option<String>,
    pub hidden: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncProgress {
    done: usize,
    total: usize,
    appid: i64,
}

/// Un error de un juego puntual durante la sincronización — se guarda para el
/// log detallado, pero NUNCA detiene el proceso del resto de la biblioteca
/// (ver `steam_sync_achievements`: un juego que falla (red, HTTP, lo que sea)
/// no debe tumbar la sincronización de los demás).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementSyncError {
    pub appid: i64,
    pub message: String,
}

/// Resumen simplificado de una corrida de `steam_sync_achievements`, pensado
/// para un badge flotante que se entienda de un vistazo (ver
/// `SteamSyncSummaryBadge.svelte`): cuántos juegos se procesaron en total,
/// cuántos eran nuevos (esquema nunca leído antes), cuántos tienen logros y a
/// cuántos de esos se les pudo sincronizar el estado, y el detalle de errores
/// (para el log al hacer click).
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AchievementsSyncSummary {
    pub total: usize,
    pub scanned: usize,
    pub new_schemas_total: usize,
    pub new_schemas_scanned: usize,
    pub with_achievements_total: usize,
    pub achievements_synced: usize,
    pub errors: Vec<AchievementSyncError>,
}

fn fetch_schema(api_key: &str, appid: i64, lang: &str) -> Result<Vec<SchemaAchievement>, String> {
    let resp: SchemaResponse = ureq::get(&format!("{API_BASE}/ISteamUserStats/GetSchemaForGame/v2/"))
        .query("key", api_key)
        .query("appid", &appid.to_string())
        .query("l", lang)
        .call()
        .map_err(|e| format!("GetSchemaForGame({appid}) falló: {}", super::describe_http_error(e)))?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp
        .game
        .and_then(|g| g.available_game_stats)
        .map(|s| s.achievements)
        .unwrap_or_default())
}

/// `true` si el esquema no trae texto usable en el idioma pedido: vino vacío,
/// o algún logro llegó con `displayName` vacío (Steam no cae solo a inglés
/// cuando un juego no tiene traducción al idioma pedido — devuelve el campo
/// vacío) — señal de que conviene reintentar con `FALLBACK_LANG`.
fn schema_needs_fallback(schema: &[SchemaAchievement]) -> bool {
    schema.is_empty() || schema.iter().any(|a| a.display_name.trim().is_empty())
}

/// `true` si el texto cacheado de un juego quedó en un idioma distinto al que
/// se está pidiendo y hay que releerlo. Solo aplica a juegos CON logros: si el
/// juego no tiene, no hay texto que traducir y cambiar de idioma no debe
/// generar ni una llamada de red.
pub(crate) fn schema_text_is_stale(cached_lang: &str, has_achievements: bool, wanted: &str) -> bool {
    has_achievements && cached_lang != wanted
}

/// Pide el esquema de logros en `lang`; si el juego no tiene traducción
/// (`schema_needs_fallback`), reintenta UNA vez con `FALLBACK_LANG`. Un fallo
/// de red/HTTP en el primer intento se propaga tal cual — no es una señal de
/// "idioma incorrecto", así que no amerita reintento.
fn fetch_schema_with_fallback(
    api_key: &str,
    appid: i64,
    lang: &str,
) -> Result<Vec<SchemaAchievement>, String> {
    let schema = fetch_schema(api_key, appid, lang)?;
    if schema_needs_fallback(&schema) {
        println!(
            "[steam] appid {appid}: esquema sin traducción a '{lang}', reintentando con '{FALLBACK_LANG}'"
        );
        match fetch_schema(api_key, appid, FALLBACK_LANG) {
            Ok(fallback) if !fallback.is_empty() => return Ok(fallback),
            Ok(_) => {} // tampoco hay nada en inglés — se sirve lo que había (posiblemente vacío).
            Err(e) => println!("[steam] appid {appid}: fallback a '{FALLBACK_LANG}' también falló: {e}"),
        }
    }
    Ok(schema)
}

// Sin parámetro `l`: la app descarta a propósito el `name`/`description` de
// esta respuesta y usa los de GetSchemaForGame (ver docs/steam-metadata.md),
// así que pedir un idioma acá no cambiaba nada y solo confundía al leer el
// código.
fn fetch_player_achievements(
    api_key: &str,
    steamid: &str,
    appid: i64,
) -> Result<Vec<PlayerAchievement>, String> {
    let resp: PlayerAchievementsResponse =
        match ureq::get(&format!("{API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/"))
            .query("key", api_key)
            .query("steamid", steamid)
            .query("appid", &appid.to_string())
            .call()
        {
            Ok(r) => r.into_json().map_err(|e| e.to_string())?,
            // Steam responde 400 para juegos sin logros/estadísticas — no es un
            // error real de la sincronización, solo "este juego no aplica".
            Err(ureq::Error::Status(400, _)) => {
                println!("[steam] appid {appid}: GetPlayerAchievements 400 (sin stats), se omite");
                return Ok(Vec::new());
            }
            Err(e) => {
                return Err(format!(
                    "GetPlayerAchievements({appid}) falló: {}",
                    super::describe_http_error(e)
                ))
            }
        };
    if !resp.playerstats.success {
        println!("[steam] appid {appid}: perfil de logros no público, se omite");
        return Ok(Vec::new());
    }
    Ok(resp.playerstats.achievements)
}

/// `true` si `games.has_community_visible_stats = 0` para este appid — la
/// única señal barata (sin red) de que un juego no tiene logros. La usan
/// `resolve_schema_cache` (atajo al resolver por primera vez) y
/// `sync_one_game` (para decidir si un negativo cacheado sigue siendo válido)
/// — misma consulta, mismo significado en los dos casos.
fn no_visible_stats(conn: &rusqlite::Connection, appid: i64) -> bool {
    conn.query_row(
        "SELECT 1 FROM games WHERE appid = ?1 AND has_community_visible_stats = 0 LIMIT 1",
        params![appid],
        |_| Ok(()),
    )
    .is_ok()
}

/// Pide `GetSchemaForGame` a Steam y actualiza `achievement_schema` +
/// `schema_cache` con el resultado. Sin atajos: siempre hace la llamada de
/// red — la usan tanto `resolve_schema_cache` (cuando no hay nada útil en
/// caché) como el sync forzado de un solo juego (`force` en `sync_one_game`),
/// que la necesita justamente para saltarse cualquier atajo.
///
/// Se guarda el idioma PEDIDO, no el efectivamente servido: si
/// `fetch_schema_with_fallback` terminó cayendo a inglés porque el juego no
/// tiene traducción, la fila igual queda marcada con `lang`. Si se guardara
/// "english", cada sync siguiente vería "idioma distinto al pedido" y volvería
/// a pedir el esquema para siempre en todos los juegos sin traducir.
fn fetch_schema_and_cache(
    conn: &rusqlite::Connection,
    api_key: &str,
    appid: i64,
    lang: &str,
) -> Result<bool, String> {
    let schema = fetch_schema_with_fallback(api_key, appid, lang)?;
    let has = !schema.is_empty();
    for a in &schema {
        conn.execute(
            "INSERT INTO achievement_schema
               (appid, apiname, display_name, description, icon_url, icon_gray_url, hidden, lang)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(appid, apiname) DO UPDATE SET
               display_name = excluded.display_name,
               description = excluded.description,
               icon_url = excluded.icon_url,
               icon_gray_url = excluded.icon_gray_url,
               hidden = excluded.hidden,
               lang = excluded.lang",
            params![
                appid,
                a.name,
                a.display_name,
                a.description,
                a.icon,
                a.icongray,
                a.hidden,
                lang,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    conn.execute(
        "INSERT INTO schema_cache (appid, fetched_at, has_achievements, lang)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(appid) DO UPDATE SET
           fetched_at = excluded.fetched_at,
           has_achievements = excluded.has_achievements,
           lang = excluded.lang",
        params![appid, cache::now(), has as i64, lang],
    )
    .map_err(|e| e.to_string())?;
    println!("[steam] appid {appid}: esquema leído en '{lang}' ({} logro(s) posibles)", schema.len());
    Ok(has)
}

/// Resuelve si un `appid` tiene logros cuando `schema_cache` no tiene nada
/// útil todavía (primera vez, o un negativo que dejó de ser válido — ver
/// `sync_one_game`).
fn resolve_schema_cache(
    conn: &rusqlite::Connection,
    api_key: &str,
    appid: i64,
    lang: &str,
) -> Result<bool, String> {
    // Optimización: si `GetOwnedGames` ya dijo que este juego no tiene
    // stats/logros visibles, no hace falta pedir GetSchemaForGame en
    // absoluto para descubrir lo mismo por una respuesta vacía — ahorra una
    // llamada de red por cada juego sin logros (son muchos: la mayoría de
    // apps/herramientas en cualquier biblioteca).
    if no_visible_stats(conn, appid) {
        // `lang` se registra igual aunque no haya texto: mantiene la fila
        // coherente si el juego gana logros más adelante.
        conn.execute(
            "INSERT INTO schema_cache (appid, fetched_at, has_achievements, lang)
             VALUES (?1, ?2, 0, ?3)
             ON CONFLICT(appid) DO UPDATE SET
               fetched_at = excluded.fetched_at,
               has_achievements = excluded.has_achievements,
               lang = excluded.lang",
            params![appid, cache::now(), lang],
        )
        .map_err(|e| e.to_string())?;
        println!("[steam] appid {appid}: sin stats visibles (GetOwnedGames), se omite GetSchemaForGame");
        Ok(false)
    } else {
        fetch_schema_and_cache(conn, api_key, appid, lang)
    }
}

/// Trabajo real de un solo juego (esquema si hace falta + logros del jugador
/// si tiene). Aislado en su propia función para que un error de red/HTTP de
/// ESTE juego (el `?` de adentro) no aborte el `for` de
/// `steam_sync_achievements` — el llamador decide qué hacer con el `Err`
/// (registrarlo y seguir con el resto de la biblioteca).
///
/// `force`: ignora `schema_cache` por completo y siempre pide el esquema a
/// Steam (`fetch_schema_and_cache`, sin el atajo `known_no_stats`). Lo usa el
/// botón "Sincronizar logros" del Detalle (un solo juego a la vez, así que no
/// hay problema de costo en red) — es la vía manual para un juego cuyo
/// `schema_cache` quedó con un negativo estancado (ver el recheck automático
/// más abajo, que cubre el resto de casos sin intervención del jugador).
fn sync_one_game(
    conn: &rusqlite::Connection,
    api_key: &str,
    steamid: &str,
    appid: i64,
    force: bool,
    lang: &str,
) -> Result<bool, String> {
    let has_achievements = if force {
        fetch_schema_and_cache(conn, api_key, appid, lang)?
    } else {
        let cached: Option<(i64, String)> = conn
            .query_row(
                "SELECT has_achievements, lang FROM schema_cache WHERE appid = ?1",
                params![appid],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();
        match cached {
            // Positivo cacheado pero en otro idioma: se relee el esquema para
            // traducir el texto. Es la ÚNICA vía de refetch por idioma —
            // cambiar el selector no dispara nada por sí solo, los textos se
            // van actualizando a medida que cada juego entra en una sync.
            // `fetch_schema_and_cache` hace UPDATE (no DELETE+INSERT), así que
            // el rowid de cada logro se conserva y el orden del Detalle no
            // cambia (ver el ORDER BY s.rowid de steam_achievements).
            Some((flag, cached_lang)) if schema_text_is_stale(&cached_lang, flag != 0, lang) => {
                fetch_schema_and_cache(conn, api_key, appid, lang)?
            }
            Some((flag, _)) if flag != 0 => true,
            Some(_) => {
                // Negativo cacheado: no hay texto que traducir, así que el
                // idioma es irrelevante acá. Solo confiar si la biblioteca
                // sigue sin ver stats visibles para este appid. Si cambió
                // (p. ej. el juego se lanzó tras estar predescargado), se
                // re-resuelve el esquema en vez de arrastrar el negativo para
                // siempre.
                if no_visible_stats(conn, appid) {
                    false
                } else {
                    resolve_schema_cache(conn, api_key, appid, lang)?
                }
            }
            None => resolve_schema_cache(conn, api_key, appid, lang)?,
        }
    };

    if !has_achievements {
        println!("[steam] appid {appid}: sin logros, se omite");
        return Ok(false);
    }

    let player_achievements = fetch_player_achievements(api_key, steamid, appid)?;
    println!(
        "[steam] appid {appid}: {} logro(s) del jugador recibido(s)",
        player_achievements.len()
    );
    for a in &player_achievements {
        conn.execute(
            "INSERT INTO achievements (steamid, appid, apiname, achieved, unlock_time)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(steamid, appid, apiname) DO UPDATE SET
               achieved = excluded.achieved, unlock_time = excluded.unlock_time",
            params![
                steamid,
                appid,
                a.apiname,
                a.achieved,
                if a.unlocktime > 0 { Some(a.unlocktime) } else { None },
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(true)
}

/// Sincroniza logros solo para los `appid` recibidos (ver `steam_sync_library`).
/// Emite `gm://steam-sync-progress` tras cada juego para el indicador de
/// progreso del frontend. Un error en UN juego (red, HTTP, lo que sea) se
/// registra en `errors` y el proceso SIGUE con el resto — antes, cualquier
/// error abortaba la sincronización completa de la biblioteca a mitad de
/// camino, dejando sin procesar los juegos restantes sin ningún aviso claro.
///
/// `force`: pasa directo a `sync_one_game` — ignora `schema_cache` para cada
/// appid de la lista. Lo usa el sync manual de un solo juego desde el
/// Detalle; la sync de biblioteca (automática o "Sincronizar ahora" completa)
/// va con `force = false`, respetando el caché para no repetir de más
/// llamadas de red en bibliotecas grandes.
///
/// `lang`: idioma en que se piden los textos del esquema de logros
/// (Configuración → Cuentas). Si no viene, `DEFAULT_LANG` — el mismo valor que
/// era fijo antes de que hubiera selector.
#[tauri::command]
pub fn steam_sync_achievements(
    app: AppHandle,
    steamid: String,
    appids: Vec<i64>,
    force: bool,
    lang: Option<String>,
) -> Result<AchievementsSyncSummary, String> {
    let lang = lang.unwrap_or_else(|| DEFAULT_LANG.to_string());
    let api_key = stored_key(&steamid)?;
    let conn = cache::open(&app)?;
    let total = appids.len();
    let mut summary = AchievementsSyncSummary {
        total,
        ..Default::default()
    };

    for (i, appid) in appids.iter().enumerate() {
        let appid = *appid;
        let was_new = conn
            .query_row(
                "SELECT 1 FROM schema_cache WHERE appid = ?1",
                params![appid],
                |r| r.get::<_, i64>(0),
            )
            .is_err();
        if was_new {
            summary.new_schemas_total += 1;
        }

        match sync_one_game(&conn, &api_key, &steamid, appid, force, &lang) {
            Ok(has_achievements) => {
                summary.scanned += 1;
                if was_new {
                    summary.new_schemas_scanned += 1;
                }
                if has_achievements {
                    summary.with_achievements_total += 1;
                    summary.achievements_synced += 1;
                }
            }
            Err(e) => {
                println!("[steam] appid {appid}: error de sync, se continúa con el resto: {e}");
                summary.errors.push(AchievementSyncError { appid, message: e });
            }
        }

        let _ = app.emit(
            "gm://steam-sync-progress",
            SyncProgress { done: i + 1, total, appid },
        );
    }
    println!(
        "[steam] logros: {}/{} con logros sincronizados, {}/{} esquemas nuevos, {} error(es)",
        summary.achievements_synced,
        summary.with_achievements_total,
        summary.new_schemas_scanned,
        summary.new_schemas_total,
        summary.errors.len()
    );
    Ok(summary)
}

/// Lee los logros cacheados de un juego (con nombre/descripción/ícono ya
/// resueltos desde `achievement_schema`) para mostrarlos en el Detalle.
#[tauri::command]
pub fn steam_achievements(
    app: AppHandle,
    steamid: String,
    appid: i64,
) -> Result<Vec<AchievementEntry>, String> {
    let conn = cache::open(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT a.apiname, a.achieved, a.unlock_time, s.display_name, s.description,
                    s.icon_url, s.icon_gray_url, s.hidden
             FROM achievements a
             LEFT JOIN achievement_schema s ON s.appid = a.appid AND s.apiname = a.apiname
             WHERE a.steamid = ?1 AND a.appid = ?2
             -- Desempate s.rowid ASC: entre los NO desbloqueados (sin unlock_time
             -- que los ordene), el rowid de achievement_schema refleja el orden en
             -- que GetSchemaForGame devolvió los logros la primera vez que se
             -- cacheó el juego (orden de progresión del propio juego) — los syncs
             -- posteriores solo hacen UPDATE, no reinsertan, así que es estable.
             -- Esto es lo que hace determinista \"el próximo logro a desbloquear\"
             -- en vez de un orden arbitrario de SQLite.
             ORDER BY a.achieved DESC, a.unlock_time DESC, s.rowid ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![steamid, appid], |r| {
            Ok(AchievementEntry {
                apiname: r.get(0)?,
                achieved: r.get::<_, i64>(1)? != 0,
                unlock_time: r.get(2)?,
                display_name: r.get(3)?,
                description: r.get(4)?,
                icon_url: r.get(5)?,
                icon_gray_url: r.get(6)?,
                hidden: r.get::<_, Option<i64>>(7)?.unwrap_or(0) != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

/// Resumen `unlocked/total` de logros por juego — pensado para marcar en la
/// biblioteca (tarjetas) los juegos con logros 100% completados sin tener
/// que abrir el Detalle de cada uno (eso solo lee logros de UN appid a la
/// vez, ver `steam_achievements` arriba). Un solo `GROUP BY` sobre la tabla
/// ya cacheada `achievements`: cada fila ahí es un logro del juego que
/// `GetPlayerAchievements` ya devolvió (achieved o no), así que `COUNT(*)`
/// por appid ya es el total real de logros del juego, sin falta unir con
/// `achievement_schema`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementSummary {
    pub appid: i64,
    pub unlocked: i64,
    pub total: i64,
}

#[tauri::command]
pub fn steam_achievements_summary(
    app: AppHandle,
    steamid: String,
) -> Result<Vec<AchievementSummary>, String> {
    let conn = cache::open(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT appid, SUM(achieved), COUNT(*)
             FROM achievements
             WHERE steamid = ?1
             GROUP BY appid",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![steamid], |r| {
            Ok(AchievementSummary {
                appid: r.get(0)?,
                unlocked: r.get(1)?,
                total: r.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCHEMA_SAMPLE: &str = r#"{
        "game": {
            "availableGameStats": {
                "achievements": [
                    { "name": "ACH_WIN_ONE_GAME", "displayName": "Ganaste una partida", "description": "Gana tu primera partida", "icon": "https://example.com/a.jpg" },
                    { "name": "ACH_WIN_100_GAMES", "displayName": "Veterano", "description": "Gana 100 partidas", "icon": "https://example.com/b.jpg" }
                ]
            }
        }
    }"#;

    const SCHEMA_NO_ACHIEVEMENTS: &str = r#"{ "game": { "availableGameStats": {} } }"#;

    const PLAYER_ACHIEVEMENTS_SAMPLE: &str = r#"{
        "playerstats": {
            "success": true,
            "achievements": [
                { "apiname": "ACH_WIN_ONE_GAME", "achieved": 1, "unlocktime": 1700000000 },
                { "apiname": "ACH_WIN_100_GAMES", "achieved": 0, "unlocktime": 0 }
            ]
        }
    }"#;

    const PLAYER_ACHIEVEMENTS_PRIVATE: &str = r#"{ "playerstats": { "success": false } }"#;

    #[test]
    fn parses_schema_with_achievements() {
        let resp: SchemaResponse = serde_json::from_str(SCHEMA_SAMPLE).unwrap();
        let achievements = resp
            .game
            .and_then(|g| g.available_game_stats)
            .map(|s| s.achievements)
            .unwrap_or_default();
        assert_eq!(achievements.len(), 2);
        assert_eq!(achievements[0].name, "ACH_WIN_ONE_GAME");
        assert_eq!(achievements[0].display_name, "Ganaste una partida");
    }

    #[test]
    fn parses_schema_without_achievements() {
        let resp: SchemaResponse = serde_json::from_str(SCHEMA_NO_ACHIEVEMENTS).unwrap();
        let achievements = resp
            .game
            .and_then(|g| g.available_game_stats)
            .map(|s| s.achievements)
            .unwrap_or_default();
        assert!(achievements.is_empty());
    }

    #[test]
    fn parses_player_achievements() {
        let resp: PlayerAchievementsResponse =
            serde_json::from_str(PLAYER_ACHIEVEMENTS_SAMPLE).unwrap();
        assert!(resp.playerstats.success);
        assert_eq!(resp.playerstats.achievements.len(), 2);
        assert_eq!(resp.playerstats.achievements[0].achieved, 1);
        assert_eq!(resp.playerstats.achievements[1].unlocktime, 0);
    }

    #[test]
    fn parses_private_profile_response() {
        let resp: PlayerAchievementsResponse =
            serde_json::from_str(PLAYER_ACHIEVEMENTS_PRIVATE).unwrap();
        assert!(!resp.playerstats.success);
        assert!(resp.playerstats.achievements.is_empty());
    }

    #[test]
    fn schema_needs_fallback_when_empty() {
        assert!(schema_needs_fallback(&[]));
    }

    #[test]
    fn schema_text_is_stale_solo_si_hay_texto_y_el_idioma_cambio() {
        // Cambió el idioma y el juego tiene logros: hay texto que traducir.
        assert!(schema_text_is_stale("latam", true, "english"));
        // Mismo idioma: nada que hacer.
        assert!(!schema_text_is_stale("latam", true, "latam"));
        // Sin logros no hay texto, así que cambiar de idioma NO debe generar
        // una llamada de red — son la mayoría de las entradas de una
        // biblioteca (herramientas, demos, apps).
        assert!(!schema_text_is_stale("latam", false, "english"));
    }

    #[test]
    fn schema_needs_fallback_when_display_name_blank() {
        let resp: SchemaResponse = serde_json::from_str(SCHEMA_SAMPLE).unwrap();
        let mut achievements = resp
            .game
            .and_then(|g| g.available_game_stats)
            .map(|s| s.achievements)
            .unwrap_or_default();
        achievements[0].display_name = "  ".to_string(); // juego sin traducción al idioma pedido
        assert!(schema_needs_fallback(&achievements));
    }

    #[test]
    fn schema_does_not_need_fallback_when_fully_translated() {
        let resp: SchemaResponse = serde_json::from_str(SCHEMA_SAMPLE).unwrap();
        let achievements = resp
            .game
            .and_then(|g| g.available_game_stats)
            .map(|s| s.achievements)
            .unwrap_or_default();
        assert!(!schema_needs_fallback(&achievements));
    }

    // --- no_visible_stats / recheck del negativo en schema_cache ---
    // Bug real: un juego predescargado reporta has_community_visible_stats=0
    // mientras no se puede jugar; al lanzarse, steam_sync_library actualiza esa
    // columna a 1, pero antes del fix `sync_one_game` seguía confiando para
    // siempre en el `schema_cache.has_achievements=0` cacheado durante la
    // predescarga. `no_visible_stats` es la consulta que decide si ese negativo
    // sigue siendo válido — se testea aislada de la red (sync_one_game/
    // resolve_schema_cache sí llaman a la Steam Web API real).
    fn memory_conn() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        cache::create_schema(&conn).unwrap();
        conn
    }

    #[test]
    fn no_visible_stats_true_while_predescargado() {
        let conn = memory_conn();
        conn.execute(
            "INSERT INTO games (steamid, appid, name, last_synced_at, has_community_visible_stats)
             VALUES ('1', 999, 'Juego nuevo', 0, 0)",
            [],
        )
        .unwrap();
        assert!(no_visible_stats(&conn, 999));
    }

    #[test]
    fn no_visible_stats_false_tras_el_lanzamiento() {
        let conn = memory_conn();
        // Mismo appid que arriba, pero ya con el juego lanzado: la sync de
        // biblioteca más reciente actualizó has_community_visible_stats a 1
        // (ver steam_sync_library, library.rs) aunque schema_cache todavía
        // conserve el negativo de cuando estaba predescargado.
        conn.execute(
            "INSERT INTO games (steamid, appid, name, last_synced_at, has_community_visible_stats)
             VALUES ('1', 999, 'Juego nuevo', 100, 1)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO schema_cache (appid, fetched_at, has_achievements) VALUES (999, 0, 0)",
            [],
        )
        .unwrap();
        assert!(!no_visible_stats(&conn, 999));
    }

    #[test]
    fn no_visible_stats_false_sin_fila_en_games() {
        // appid desconocido en `games` (nunca sincronizado, o se limpió con
        // prune_missing_games): no hay señal de "sin stats", así que no debe
        // tratarse como negativo confiable.
        let conn = memory_conn();
        assert!(!no_visible_stats(&conn, 12345));
    }
}
