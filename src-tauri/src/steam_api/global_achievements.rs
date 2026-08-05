//! Porcentaje global de jugadores que tienen cada logro
//! (`ISteamUserStats/GetGlobalAchievementPercentagesForGame`) — dato público,
//! por-appid, no requiere `key` ni `steamid`. Se muestra solo si el jugador lo
//! pide (botón "Ver % global" en el modal de logros), no en cada sync — por
//! eso se cachea con refresco configurable (ver `steam_sync_options` en el
//! frontend) en vez de "una sola vez para siempre" como `achievement_schema`.

use super::API_BASE;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::cache;

#[derive(Deserialize)]
struct GlobalPctResponse {
    achievementpercentages: GlobalPctInner,
}
#[derive(Deserialize, Default)]
struct GlobalPctInner {
    #[serde(default)]
    achievements: Vec<GlobalPctAchievement>,
}
#[derive(Deserialize)]
struct GlobalPctAchievement {
    name: String,
    percent: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalAchievementPercentage {
    pub apiname: String,
    pub percent: f64,
}

fn fetch_global_percentages(appid: i64) -> Result<Vec<GlobalPctAchievement>, String> {
    // Endpoint público: SIN `key` ni `steamid`. El parámetro del juego se
    // llama `gameid` (no `appid`, a diferencia del resto de la API) y la
    // versión de ruta es "v0002" — verificado contra la documentación de
    // Valve para este endpoint en particular (no sigue el patrón v1/v2 del
    // resto de ISteamUserStats).
    let resp: GlobalPctResponse = ureq::get(&format!(
        "{API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForGame/v0002/"
    ))
    .query("gameid", &appid.to_string())
    .call()
    .map_err(|e| format!("GetGlobalAchievementPercentagesForGame({appid}) falló: {e}"))?
    .into_json()
    .map_err(|e| e.to_string())?;
    Ok(resp.achievementpercentages.achievements)
}

/// Lee (y si está vieja/ausente según `max_age_secs`, refresca) el % global de
/// cada logro de un juego. `max_age_secs` lo decide el frontend según el
/// intervalo que el usuario configuró (diario/semanal/mensual) — Rust no
/// conoce ese concepto, solo recibe segundos.
#[tauri::command]
pub fn steam_global_achievement_percentages(
    app: AppHandle,
    appid: i64,
    max_age_secs: i64,
) -> Result<Vec<GlobalAchievementPercentage>, String> {
    let conn = cache::open(&app)?;
    let fetched_at: Option<i64> = conn
        .query_row(
            "SELECT MIN(fetched_at) FROM achievement_global_pct WHERE appid = ?1",
            params![appid],
            |r| r.get(0),
        )
        .ok()
        .flatten();
    let fresh = fetched_at.is_some_and(|t| cache::now() - t < max_age_secs);

    if !fresh {
        match fetch_global_percentages(appid) {
            Ok(list) => {
                let now = cache::now();
                for a in &list {
                    conn.execute(
                        "INSERT INTO achievement_global_pct (appid, apiname, percent, fetched_at)
                         VALUES (?1, ?2, ?3, ?4)
                         ON CONFLICT(appid, apiname) DO UPDATE SET
                           percent = excluded.percent, fetched_at = excluded.fetched_at",
                        params![appid, a.name, a.percent, now],
                    )
                    .map_err(|e| e.to_string())?;
                }
                println!("[steam] % globales de appid {appid}: {} logro(s) actualizados", list.len());
            }
            // Si falla la red pero hay algo cacheado (aunque viejo), se sirve
            // igual — mejor un % desactualizado que ninguno.
            Err(e) => println!("[steam] % globales de appid {appid} no se pudieron refrescar: {e}"),
        }
    }

    let mut stmt = conn
        .prepare("SELECT apiname, percent FROM achievement_global_pct WHERE appid = ?1 ORDER BY percent DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![appid], |r| {
            Ok(GlobalAchievementPercentage {
                apiname: r.get(0)?,
                percent: r.get(1)?,
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
        "achievementpercentages": {
            "achievements": [
                { "name": "ACH_WIN_ONE_GAME", "percent": 66.5999984741210938 },
                { "name": "ACH_WIN_100_GAMES", "percent": 3.099999904632568 }
            ]
        }
    }"#;

    #[test]
    fn parses_global_percentages() {
        let resp: GlobalPctResponse = serde_json::from_str(SAMPLE).unwrap();
        assert_eq!(resp.achievementpercentages.achievements.len(), 2);
        assert_eq!(resp.achievementpercentages.achievements[0].name, "ACH_WIN_ONE_GAME");
        assert!((resp.achievementpercentages.achievements[0].percent - 66.6).abs() < 0.01);
    }

    #[test]
    fn parses_empty_percentages() {
        let resp: GlobalPctResponse =
            serde_json::from_str(r#"{"achievementpercentages":{}}"#).unwrap();
        assert!(resp.achievementpercentages.achievements.is_empty());
    }
}
