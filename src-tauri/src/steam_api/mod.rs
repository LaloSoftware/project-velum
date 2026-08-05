//! Cliente de la Steam Web API — vinculación de cuenta (Fase 9a). Guarda la
//! API key personal de cada persona en el almacén de credenciales del SO
//! (nunca en config.json en texto plano) y resuelve su identidad (SteamID64,
//! nombre, avatar) para que la UI confirme a quién se vinculó. Ver
//! docs/accounts.md.
//!
//! Restricción de la Web API (no de esta app): GetOwnedGames/GetPlayerAchievements
//! (fases 9b/9c) solo devuelven datos completos si la API key usada pertenece a
//! la misma cuenta consultada — por eso cada persona pega su propia key, no hay
//! una sola key "del launcher" que sirva para todos. Ver GetOwnedGames en la
//! documentación de Valve.

pub mod achievements;
mod cache;
pub mod library;

use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

const KEYRING_SERVICE: &str = "gm-launcher-steam";
const API_BASE: &str = "https://api.steampowered.com";

/// La API key guardada de una cuenta ya vinculada, o un error legible si no
/// hay ninguna (p. ej. si se llama a sincronizar sin haber vinculado antes).
/// Se incluye el error crudo del almacén de credenciales del SO (en vez de
/// tragárselo con un mensaje genérico): "no encuentra el API key" justo
/// después de vincular con éxito (que sí escribe la key) apunta a un problema
/// de acceso al almacén (p. ej. ACL de Keychain en macOS que cambia entre
/// builds sin firmar), no a que falte vincular — sin el texto real del error
/// no hay forma de distinguir un caso del otro.
pub(crate) fn stored_key(steamid: &str) -> Result<String, String> {
    Entry::new(KEYRING_SERVICE, steamid)
        .and_then(|e| e.get_password())
        .map_err(|e| {
            format!(
                "No se pudo leer la API key guardada para esta cuenta ({e}) — \
                 vincúlala de nuevo si el problema persiste"
            )
        })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SteamAccountInfo {
    pub steamid: String,
    pub persona_name: String,
    pub avatar_url: String,
}

#[derive(Deserialize)]
struct ResolveVanityResponse {
    response: ResolveVanityInner,
}
#[derive(Deserialize)]
struct ResolveVanityInner {
    success: i32,
    steamid: Option<String>,
}

#[derive(Deserialize)]
struct PlayerSummariesResponse {
    response: PlayerSummariesInner,
}
#[derive(Deserialize)]
struct PlayerSummariesInner {
    players: Vec<PlayerSummary>,
}
#[derive(Deserialize)]
struct PlayerSummary {
    steamid: String,
    personaname: String,
    avatarfull: String,
}

// SteamID64 son puramente numéricos (17 dígitos); cualquier otra cosa se trata
// como vanity URL/nombre de perfil a resolver.
fn looks_like_steamid64(s: &str) -> bool {
    !s.is_empty() && s.chars().all(|c| c.is_ascii_digit())
}

fn resolve_vanity_url(api_key: &str, vanity: &str) -> Result<String, String> {
    let resp: ResolveVanityResponse =
        ureq::get(&format!("{API_BASE}/ISteamUser/ResolveVanityURL/v1/"))
            .query("key", api_key)
            .query("vanityurl", vanity)
            .call()
            .map_err(|e| format!("no se pudo resolver el perfil de Steam: {e}"))?
            .into_json()
            .map_err(|e| e.to_string())?;
    if resp.response.success == 1 {
        resp.response
            .steamid
            .ok_or_else(|| "Steam no devolvió un SteamID".to_string())
    } else {
        Err("No se encontró ese perfil de Steam (revisa el nombre o usa tu SteamID64)".to_string())
    }
}

fn fetch_player_summary(api_key: &str, steamid: &str) -> Result<SteamAccountInfo, String> {
    let resp: PlayerSummariesResponse =
        ureq::get(&format!("{API_BASE}/ISteamUser/GetPlayerSummaries/v2/"))
            .query("key", api_key)
            .query("steamids", steamid)
            .call()
            .map_err(|e| format!("no se pudo validar la API key: {e}"))?
            .into_json()
            .map_err(|e| e.to_string())?;
    let player = resp
        .response
        .players
        .into_iter()
        .next()
        .ok_or_else(|| "API key o SteamID inválidos".to_string())?;
    Ok(SteamAccountInfo {
        steamid: player.steamid,
        persona_name: player.personaname,
        avatar_url: player.avatarfull,
    })
}

/// Vincula una cuenta: resuelve el perfil (SteamID64 o vanity URL), valida la
/// key contra esa cuenta y, si todo encaja, la guarda en el keyring del SO.
#[tauri::command]
pub fn steam_link_account(
    profile_input: String,
    api_key: String,
) -> Result<SteamAccountInfo, String> {
    let profile_input = profile_input.trim();
    let api_key = api_key.trim();
    if profile_input.is_empty() || api_key.is_empty() {
        return Err("Falta el perfil de Steam o la API key".to_string());
    }
    let steamid = if looks_like_steamid64(profile_input) {
        profile_input.to_string()
    } else {
        resolve_vanity_url(api_key, profile_input)?
    };
    let info = fetch_player_summary(api_key, &steamid)?;
    Entry::new(KEYRING_SERVICE, &info.steamid)
        .and_then(|e| e.set_password(api_key))
        .map_err(|e| format!("no se pudo guardar la API key de forma segura: {e}"))?;
    println!(
        "[steam] cuenta vinculada: steamid={} persona=\"{}\"",
        info.steamid, info.persona_name
    );
    Ok(info)
}

/// Quita la API key guardada de esa cuenta del keyring del SO y limpia su
/// caché local de biblioteca/logros (no toca `achievement_schema`/`schema_cache`,
/// que son por-juego y sirven para cualquier otra cuenta que se vincule después).
#[tauri::command]
pub fn steam_unlink_account(app: AppHandle, steamid: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &steamid).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => {}
        Err(keyring::Error::NoEntry) => {} // ya no está: el objetivo se cumple igual.
        Err(e) => return Err(e.to_string()),
    }
    cache::clear_account(&app, &steamid)?;
    println!("[steam] cuenta desvinculada: steamid={steamid}");
    Ok(())
}

/// Para que la UI sepa, sin exponer la key en sí, si una cuenta sigue teniendo
/// su key guardada (p. ej. si el usuario limpió el keyring del SO por fuera).
#[tauri::command]
pub fn steam_has_key(steamid: String) -> bool {
    Entry::new(KEYRING_SERVICE, &steamid)
        .and_then(|e| e.get_password())
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_steamid64_vs_vanity_url() {
        assert!(looks_like_steamid64("76561197960287930"));
        assert!(!looks_like_steamid64("mi_perfil_bonito"));
        assert!(!looks_like_steamid64(""));
        assert!(!looks_like_steamid64("765611979602879a0"));
    }
}
