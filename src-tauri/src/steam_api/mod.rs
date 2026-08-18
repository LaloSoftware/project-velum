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
pub mod global_achievements;
pub mod library;

use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

const KEYRING_SERVICE: &str = "gm-launcher-steam";
const API_BASE: &str = "https://api.steampowered.com";

// Idioma de las llamadas a la Web API (nombres/descripciones de logros). Lo
// elige el usuario en Configuración → Cuentas y llega como parámetro de los
// comandos; DEFAULT_LANG solo cubre el caso de que no venga ninguno (config
// vieja, o una llamada que no lo pase) y coincide con el valor que era fijo
// antes de que hubiera selector.
//
// FALLBACK_LANG se usa cuando un juego no tiene traducción al idioma pedido
// (Steam devuelve texto vacío, no cae solo a inglés) — ver
// `achievements::fetch_schema_with_fallback`. No es configurable a propósito:
// el inglés es el fallback razonable para cualquier idioma elegido.
pub(crate) const DEFAULT_LANG: &str = "latam";
pub(crate) const FALLBACK_LANG: &str = "english";

/// Describe un error de `ureq` incluyendo el CUERPO de la respuesta cuando hay
/// un status HTTP (p. ej. Steam responde 403 con un texto legible tipo
/// "Forbidden... Please verify your key= parameter" — el `Display` por
/// defecto de `ureq::Error` solo muestra "status code 403", sin ese texto,
/// que es justo lo que hace falta para distinguir "key inválida" de un
/// problema real de la app). Usado en todas las llamadas a la Web API para
/// que los errores que ve el usuario sean accionables.
pub(crate) fn describe_http_error(e: ureq::Error) -> String {
    match e {
        ureq::Error::Status(code, response) => {
            let body = response.into_string().unwrap_or_default();
            let body = body.trim();
            if body.is_empty() {
                format!("status {code}")
            } else {
                format!("status {code}: {body}")
            }
        }
        ureq::Error::Transport(t) => t.to_string(),
    }
}

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
        .map_err(|e| format!("steam.key_read_failed|{e}"))
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
            .map_err(|e| format!("steam.profile_resolve_failed|{}", describe_http_error(e)))?
            .into_json()
            .map_err(|e| e.to_string())?;
    if resp.response.success == 1 {
        resp.response
            .steamid
            .ok_or_else(|| "steam.no_steamid_returned".to_string())
    } else {
        Err("steam.profile_not_found".to_string())
    }
}

fn fetch_player_summary(api_key: &str, steamid: &str) -> Result<SteamAccountInfo, String> {
    let resp: PlayerSummariesResponse =
        ureq::get(&format!("{API_BASE}/ISteamUser/GetPlayerSummaries/v2/"))
            .query("key", api_key)
            .query("steamids", steamid)
            .call()
            .map_err(|e| format!("steam.key_validation_failed|{}", describe_http_error(e)))?
            .into_json()
            .map_err(|e| e.to_string())?;
    let player = resp
        .response
        .players
        .into_iter()
        .next()
        .ok_or_else(|| "steam.invalid_key".to_string())?;
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
        return Err("steam.missing_fields".to_string());
    }
    let steamid = if looks_like_steamid64(profile_input) {
        profile_input.to_string()
    } else {
        resolve_vanity_url(api_key, profile_input)?
    };
    let info = fetch_player_summary(api_key, &steamid)?;
    Entry::new(KEYRING_SERVICE, &info.steamid)
        .and_then(|e| e.set_password(api_key))
        .map_err(|e| format!("steam.key_save_failed|{e}"))?;
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
