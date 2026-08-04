//! Sincroniza la biblioteca completa de una cuenta (GetOwnedGames) al caché
//! local — Fase 9b. `GetOwnedGames` no tiene concepto de "instalado": ese cruce
//! lo hace el frontend comparando estos `appid` contra los que ya reporta
//! `list_games()` (mismo formato `steam:{appid}` que usa `library/steam.rs`).

use super::{cache, stored_key, API_BASE};
use rusqlite::params;
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

fn fetch_owned_games(api_key: &str, steamid: &str) -> Result<Vec<OwnedGame>, String> {
    let resp: OwnedGamesResponse =
        ureq::get(&format!("{API_BASE}/IPlayerService/GetOwnedGames/v1/"))
            .query("key", api_key)
            .query("steamid", steamid)
            .query("include_appinfo", "1")
            .query("include_played_free_games", "1")
            .query("l", "latam")
            .call()
            .map_err(|e| format!("GetOwnedGames falló: {e}"))?
            .into_json()
            .map_err(|e| e.to_string())?;
    println!(
        "[steam] GetOwnedGames({steamid}): {} juego(s) reportados",
        resp.response.game_count
    );
    Ok(resp.response.games)
}

/// Trae la biblioteca completa (`GetOwnedGames`) y actualiza el caché local.
/// Devuelve qué `appid` cambiaron de horas jugadas desde la última vez (o son
/// nuevos) — la heurística barata de "qué logros vale la pena releer".
#[tauri::command]
pub fn steam_sync_library(app: AppHandle, steamid: String) -> Result<SyncSummary, String> {
    let api_key = stored_key(&steamid)?;
    let games = fetch_owned_games(&api_key, &steamid)?;
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
            "INSERT INTO games (steamid, appid, name, playtime_forever, icon_url, last_synced_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(steamid, appid) DO UPDATE SET
               name = excluded.name,
               playtime_forever = excluded.playtime_forever,
               icon_url = excluded.icon_url,
               last_synced_at = excluded.last_synced_at",
            params![
                steamid,
                g.appid,
                g.name,
                g.playtime_forever,
                icon_url(g.appid, &g.img_icon_url),
                synced_at
            ],
        )
        .map_err(|e| e.to_string())?;
    }
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
        .prepare("SELECT appid, name, playtime_forever, icon_url FROM games WHERE steamid = ?1 ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![steamid], |r| {
            Ok(SteamLibraryEntry {
                appid: r.get(0)?,
                name: r.get(1)?,
                playtime_forever: r.get(2)?,
                icon_url: r.get(3)?,
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
