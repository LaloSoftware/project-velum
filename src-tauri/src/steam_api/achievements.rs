//! Logros incrementales — Fase 9c. Solo se llama con los `appid` que
//! `steam_sync_library` marcó como cambiados (playtime nuevo/distinto) o
//! nunca sincronizados; releer logros de TODA la biblioteca en cada
//! sincronización sería carísimo para cuentas con cientos de juegos.

use super::{cache, stored_key, API_BASE, FALLBACK_LANG, PRIMARY_LANG};
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
/// cuando un juego no tiene traducción a `PRIMARY_LANG` — devuelve el campo
/// vacío) — señal de que conviene reintentar con `FALLBACK_LANG`.
fn schema_needs_fallback(schema: &[SchemaAchievement]) -> bool {
    schema.is_empty() || schema.iter().any(|a| a.display_name.trim().is_empty())
}

/// Pide el esquema de logros en `PRIMARY_LANG`; si el juego no tiene
/// traducción (`schema_needs_fallback`), reintenta UNA vez con `FALLBACK_LANG`.
/// Un fallo de red/HTTP en el primer intento se propaga tal cual — no es una
/// señal de "idioma incorrecto", así que no amerita reintento.
fn fetch_schema_with_fallback(api_key: &str, appid: i64) -> Result<Vec<SchemaAchievement>, String> {
    let schema = fetch_schema(api_key, appid, PRIMARY_LANG)?;
    if schema_needs_fallback(&schema) {
        println!(
            "[steam] appid {appid}: esquema sin traducción a '{PRIMARY_LANG}', reintentando con '{FALLBACK_LANG}'"
        );
        match fetch_schema(api_key, appid, FALLBACK_LANG) {
            Ok(fallback) if !fallback.is_empty() => return Ok(fallback),
            Ok(_) => {} // tampoco hay nada en inglés — se sirve lo que había (posiblemente vacío).
            Err(e) => println!("[steam] appid {appid}: fallback a '{FALLBACK_LANG}' también falló: {e}"),
        }
    }
    Ok(schema)
}

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
            .query("l", PRIMARY_LANG)
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

/// Trabajo real de un solo juego (esquema si hace falta + logros del jugador
/// si tiene). Aislado en su propia función para que un error de red/HTTP de
/// ESTE juego (el `?` de adentro) no aborte el `for` de
/// `steam_sync_achievements` — el llamador decide qué hacer con el `Err`
/// (registrarlo y seguir con el resto de la biblioteca).
fn sync_one_game(
    conn: &rusqlite::Connection,
    api_key: &str,
    steamid: &str,
    appid: i64,
) -> Result<bool, String> {
    let cached_flag: Option<i64> = conn
        .query_row(
            "SELECT has_achievements FROM schema_cache WHERE appid = ?1",
            params![appid],
            |r| r.get(0),
        )
        .ok();

    let has_achievements = match cached_flag {
        Some(flag) => flag != 0,
        None => {
            let schema = fetch_schema_with_fallback(api_key, appid)?;
            let has = !schema.is_empty();
            for a in &schema {
                conn.execute(
                    "INSERT INTO achievement_schema (appid, apiname, display_name, description, icon_url)
                     VALUES (?1, ?2, ?3, ?4, ?5)
                     ON CONFLICT(appid, apiname) DO UPDATE SET
                       display_name = excluded.display_name,
                       description = excluded.description,
                       icon_url = excluded.icon_url",
                    params![appid, a.name, a.display_name, a.description, a.icon],
                )
                .map_err(|e| e.to_string())?;
            }
            conn.execute(
                "INSERT INTO schema_cache (appid, fetched_at, has_achievements)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(appid) DO UPDATE SET
                   fetched_at = excluded.fetched_at, has_achievements = excluded.has_achievements",
                params![appid, cache::now(), has as i64],
            )
            .map_err(|e| e.to_string())?;
            println!("[steam] appid {appid}: esquema leído ({} logro(s) posibles)", schema.len());
            has
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
#[tauri::command]
pub fn steam_sync_achievements(
    app: AppHandle,
    steamid: String,
    appids: Vec<i64>,
) -> Result<AchievementsSyncSummary, String> {
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

        match sync_one_game(&conn, &api_key, &steamid, appid) {
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
            "SELECT a.apiname, a.achieved, a.unlock_time, s.display_name, s.description, s.icon_url
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
    fn schema_needs_fallback_when_display_name_blank() {
        let resp: SchemaResponse = serde_json::from_str(SCHEMA_SAMPLE).unwrap();
        let mut achievements = resp
            .game
            .and_then(|g| g.available_game_stats)
            .map(|s| s.achievements)
            .unwrap_or_default();
        achievements[0].display_name = "  ".to_string(); // juego sin traducción a PRIMARY_LANG
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
}
