//! Sincroniza la biblioteca completa de una cuenta (GetOwnedGames) al caché
//! local — Fase 9b. `GetOwnedGames` no tiene concepto de "instalado": ese cruce
//! lo hace el frontend comparando estos `appid` contra los que ya reporta
//! `list_games()` (mismo formato `steam:{appid}` que usa `library/steam.rs`).

use super::{cache, stored_key, API_BASE, DEFAULT_LANG};
use rusqlite::{params, ToSql};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Deserialize)]
struct OwnedGamesResponse {
    response: OwnedGamesInner,
}
#[derive(Deserialize, Default)]
struct OwnedGamesInner {
    #[serde(default)]
    game_count: i64,
    #[serde(default)]
    games: Vec<OwnedGame>,
}
#[derive(Deserialize)]
struct OwnedGame {
    appid: i64,
    name: String,
    playtime_forever: i64,
    #[serde(default)]
    img_icon_url: String,
    // Horas jugadas en las últimas 2 semanas — Steam solo incluye este campo
    // si el juego se jugó en ese período, ausente en el resto (de ahí el
    // default 0, no "no jugado nunca").
    #[serde(default)]
    playtime_2weeks: i64,
    // Epoch de la última vez que se jugó, SEGÚN STEAM (0 si nunca) — a
    // diferencia de `Game.lastPlayed` en el resto de la app, que para
    // instalados es 100% local (fecha del ACF/registro local).
    #[serde(default)]
    rtime_last_played: i64,
    // Si el juego tiene stats/logros visibles públicamente. Se usa para
    // saltarse GetSchemaForGame por completo en juegos que definitivamente no
    // tienen logros, en vez de pedirlo igual y descubrirlo por una respuesta
    // vacía (ver `achievements::sync_one_game`).
    #[serde(default)]
    has_community_visible_stats: bool,
}

/// Resumen de una sincronización: cuántos juegos hay en total y cuáles
/// `appid` cambiaron de horas jugadas (o son nuevos) — esos son los únicos
/// que vale la pena re-sincronizar logros (Fase 9c, `steam_sync_achievements`).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSummary {
    pub total_games: usize,
    pub changed_appids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SteamLibraryEntry {
    pub appid: i64,
    pub name: String,
    pub playtime_forever: i64,
    pub icon_url: Option<String>,
    pub playtime_2weeks: i64,
    pub rtime_last_played: Option<i64>,
}

fn icon_url(appid: i64, img_icon_url: &str) -> Option<String> {
    if img_icon_url.is_empty() {
        None
    } else {
        Some(format!(
            "https://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{img_icon_url}.jpg"
        ))
    }
}

fn fetch_owned_games(
    api_key: &str,
    steamid: &str,
    include_played_free_games: bool,
    lang: &str,
) -> Result<Vec<OwnedGame>, String> {
    let resp: OwnedGamesResponse =
        ureq::get(&format!("{API_BASE}/IPlayerService/GetOwnedGames/v1/"))
            .query("key", api_key)
            .query("steamid", steamid)
            .query("include_appinfo", "1")
            .query("include_played_free_games", if include_played_free_games { "1" } else { "0" })
            .query("l", lang)
            .call()
            .map_err(|e| format!("GetOwnedGames falló: {}", super::describe_http_error(e)))?
            .into_json()
            .map_err(|e| e.to_string())?;
    println!(
        "[steam] GetOwnedGames({steamid}): {} juego(s) reportados",
        resp.response.game_count
    );
    Ok(resp.response.games)
}

/// Borra del caché los `appid` que ya no vienen en la respuesta actual de
/// `GetOwnedGames` — cubre tanto "se desmarcó incluir juegos gratuitos" como
/// el caso general de un juego que deja de estar en la cuenta (reembolso,
/// etc.). No toca `achievements` (queda huérfano pero inofensivo; si el juego
/// vuelve a aparecer, se re-sincroniza solo).
fn prune_missing_games(
    conn: &rusqlite::Connection,
    steamid: &str,
    current_appids: &[i64],
) -> Result<(), String> {
    if current_appids.is_empty() {
        conn.execute("DELETE FROM games WHERE steamid = ?1", params![steamid])
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    let placeholders = vec!["?"; current_appids.len()].join(",");
    let sql = format!("DELETE FROM games WHERE steamid = ? AND appid NOT IN ({placeholders})");
    let mut bound: Vec<&dyn ToSql> = Vec::with_capacity(1 + current_appids.len());
    bound.push(&steamid);
    for id in current_appids {
        bound.push(id);
    }
    conn.execute(&sql, bound.as_slice()).map_err(|e| e.to_string())?;
    Ok(())
}

/// Trae la biblioteca completa (`GetOwnedGames`) y actualiza el caché local.
/// Devuelve qué `appid` cambiaron de horas jugadas desde la última vez (o son
/// nuevos) — la heurística barata de "qué logros vale la pena releer".
/// `include_played_free_games` y `lang` los decide el usuario desde
/// Configuración → Cuentas (por defecto `true` y `DEFAULT_LANG`, mismo
/// comportamiento que antes de ser configurables).
///
/// El nombre localizado que devuelve `GetOwnedGames` se reescribe entero en
/// cada sync (`ON CONFLICT DO UPDATE`), así que cambiar de idioma corrige la
/// biblioteca sin necesidad de marcar el idioma en la tabla `games` — a
/// diferencia de `achievement_schema`, que sí lleva columna `lang`.
#[tauri::command]
pub fn steam_sync_library(
    app: AppHandle,
    steamid: String,
    include_played_free_games: bool,
    lang: Option<String>,
) -> Result<SyncSummary, String> {
    let lang = lang.unwrap_or_else(|| DEFAULT_LANG.to_string());
    let api_key = stored_key(&steamid)?;
    let games = fetch_owned_games(&api_key, &steamid, include_played_free_games, &lang)?;
    println!("[steam] sync biblioteca de {steamid}: {} juego(s) recibidos", games.len());

    let conn = cache::open(&app)?;
    let mut changed = Vec::new();
    let synced_at = cache::now();
    for g in &games {
        let prev_playtime: Option<i64> = conn
            .query_row(
                "SELECT playtime_forever FROM games WHERE steamid = ?1 AND appid = ?2",
                params![steamid, g.appid],
                |r| r.get(0),
            )
            .ok();
        if prev_playtime != Some(g.playtime_forever) {
            changed.push(g.appid);
        }
        conn.execute(
            "INSERT INTO games (
               steamid, appid, name, playtime_forever, icon_url, last_synced_at,
               rtime_last_played, playtime_2weeks, has_community_visible_stats
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(steamid, appid) DO UPDATE SET
               name = excluded.name,
               playtime_forever = excluded.playtime_forever,
               icon_url = excluded.icon_url,
               last_synced_at = excluded.last_synced_at,
               rtime_last_played = excluded.rtime_last_played,
               playtime_2weeks = excluded.playtime_2weeks,
               has_community_visible_stats = excluded.has_community_visible_stats",
            params![
                steamid,
                g.appid,
                g.name,
                g.playtime_forever,
                icon_url(g.appid, &g.img_icon_url),
                synced_at,
                if g.rtime_last_played > 0 { Some(g.rtime_last_played) } else { None },
                g.playtime_2weeks,
                g.has_community_visible_stats as i64,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    let current_appids: Vec<i64> = games.iter().map(|g| g.appid).collect();
    prune_missing_games(&conn, &steamid, &current_appids)?;
    println!(
        "[steam] {} juego(s) con playtime nuevo/distinto desde la última sync (se re-sincronizarán logros): {:?}",
        changed.len(),
        changed
    );
    Ok(SyncSummary {
        total_games: games.len(),
        changed_appids: changed,
    })
}

/// Lee la biblioteca cacheada (sin llamar a la red) — la usa el frontend para
/// cruzar con `list_games()` y mostrar instalados/no-instalados.
#[tauri::command]
pub fn steam_library(app: AppHandle, steamid: String) -> Result<Vec<SteamLibraryEntry>, String> {
    let conn = cache::open(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT appid, name, playtime_forever, icon_url, playtime_2weeks, rtime_last_played
             FROM games WHERE steamid = ?1 ORDER BY name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![steamid], |r| {
            Ok(SteamLibraryEntry {
                appid: r.get(0)?,
                name: r.get(1)?,
                playtime_forever: r.get(2)?,
                icon_url: r.get(3)?,
                playtime_2weeks: r.get(4)?,
                rtime_last_played: r.get(5)?,
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

    const SAMPLE: &str = r#"{
        "response": {
            "game_count": 2,
            "games": [
                { "appid": 620, "name": "Portal 2", "playtime_forever": 943, "img_icon_url": "abc123" },
                { "appid": 730, "name": "Counter-Strike 2", "playtime_forever": 0, "img_icon_url": "" }
            ]
        }
    }"#;

    const SAMPLE_WITH_EXTRA_FIELDS: &str = r#"{
        "response": {
            "game_count": 1,
            "games": [
                {
                    "appid": 620, "name": "Portal 2", "playtime_forever": 943,
                    "img_icon_url": "abc123", "playtime_2weeks": 120,
                    "rtime_last_played": 1700000000, "has_community_visible_stats": true
                }
            ]
        }
    }"#;

    #[test]
    fn parses_get_owned_games_response() {
        let resp: OwnedGamesResponse = serde_json::from_str(SAMPLE).unwrap();
        assert_eq!(resp.response.game_count, 2);
        assert_eq!(resp.response.games.len(), 2);
        assert_eq!(resp.response.games[0].name, "Portal 2");
        assert_eq!(resp.response.games[0].playtime_forever, 943);
    }

    #[test]
    fn parses_empty_library() {
        let resp: OwnedGamesResponse =
            serde_json::from_str(r#"{"response":{}}"#).unwrap();
        assert_eq!(resp.response.game_count, 0);
        assert!(resp.response.games.is_empty());
    }

    #[test]
    fn parses_extra_fields_when_present() {
        let resp: OwnedGamesResponse = serde_json::from_str(SAMPLE_WITH_EXTRA_FIELDS).unwrap();
        let g = &resp.response.games[0];
        assert_eq!(g.playtime_2weeks, 120);
        assert_eq!(g.rtime_last_played, 1700000000);
        assert!(g.has_community_visible_stats);
    }

    #[test]
    fn extra_fields_default_when_absent() {
        let resp: OwnedGamesResponse = serde_json::from_str(SAMPLE).unwrap();
        let g = &resp.response.games[0];
        assert_eq!(g.playtime_2weeks, 0);
        assert_eq!(g.rtime_last_played, 0);
        assert!(!g.has_community_visible_stats);
    }

    #[test]
    fn icon_url_none_when_empty() {
        assert_eq!(icon_url(620, ""), None);
        assert_eq!(
            icon_url(620, "abc123"),
            Some(
                "https://media.steampowered.com/steamcommunity/public/images/apps/620/abc123.jpg"
                    .to_string()
            )
        );
    }
}
