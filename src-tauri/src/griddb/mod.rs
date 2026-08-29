//! Cliente de la SteamGridDB API v2 (Fase 3 de feature-imagenes.md) — busca y
//! trae carátulas/heroes/logos elegidos a mano desde `GridDbPickerModal.svelte`.
//! Spec verificado contra `https://www.steamgriddb.com/static/openapi.yml`
//! (v2.10.0) al escribir esto — la documentación web (`/api/v2`) está detrás
//! de Cloudflare y no se puede leer directo; volver a chequear el YAML si
//! algo no encaja.
//!
//! Mismo criterio que `steam_api/`: la key vive en el keyring del SO (nunca
//! en `config.json`), las llamadas van con `ureq` bloqueante y los comandos
//! son NO-async a propósito (un comando `async fn` con una llamada de red
//! bloqueante adentro estancaría el runtime de Tauri por toda la duración de
//! esa llamada; los comandos no-async ya corren en su propio hilo, ver
//! `assets::read_image` vs. este módulo para el contraste: ahí sí es async
//! porque solo hace IO local rápido, sin red). Los errores incluyen el CUERPO
//! de la respuesta HTTP (`describe_http_error`), no solo el status — la misma
//! decisión que ya se pagó una vez depurando Steam (ver `docs/accounts.md`).

use keyring::Entry;
use serde::{Deserialize, Serialize};

const KEYRING_SERVICE: &str = "gm-launcher-griddb";
// Una sola key global (no por-cuenta como Steam: SteamGridDB no tiene sesión
// de usuario en esta app, solo una key de API compartida por toda la sala).
const KEYRING_USER: &str = "default";
const API_BASE: &str = "https://www.steamgriddb.com/api/v2";

/// Plataformas externas soportadas por `GET /games/{platform}/{platformId}`
/// (`Platforms` enum del spec). GOG **no** está — no hay id externo de GOG en
/// SteamGridDB, así que un juego de GOG cae siempre a búsqueda por nombre
/// (`griddb_search`), no es un descuido de esta app.
const PLATFORMS: &[&str] = &["steam", "origin", "egs", "bnet", "uplay", "flashpoint", "eshop"];

const STYLES_GRIDS: &[&str] = &["alternate", "blurred", "white_logo", "material", "no_logo"];
const STYLES_HEROES: &[&str] = &["alternate", "blurred", "material"];
const STYLES_LOGOS: &[&str] = &["official", "white", "black", "custom"];
const DIMENSIONS_GRIDS: &[&str] =
    &["460x215", "920x430", "600x900", "342x482", "660x930", "512x512", "1024x1024"];
const DIMENSIONS_HEROES: &[&str] = &["1920x620", "3840x1240", "1600x650"];
const MIMES_GRIDS: &[&str] = &["image/png", "image/jpeg", "image/webp"];
const MIMES_LOGOS: &[&str] = &["image/png", "image/webp"];
const TYPES: &[&str] = &["static", "animated"];
const TAG_VALUES: &[&str] = &["false", "true", "any"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Kind {
    Grids,
    Heroes,
    Logos,
}

impl Kind {
    fn parse(s: &str) -> Result<Self, String> {
        match s {
            "grids" => Ok(Kind::Grids),
            "heroes" => Ok(Kind::Heroes),
            "logos" => Ok(Kind::Logos),
            other => Err(format!("griddb.invalid_kind|{other}")),
        }
    }
    fn path(self) -> &'static str {
        match self {
            Kind::Grids => "grids",
            Kind::Heroes => "heroes",
            Kind::Logos => "logos",
        }
    }
    fn styles(self) -> &'static [&'static str] {
        match self {
            Kind::Grids => STYLES_GRIDS,
            Kind::Heroes => STYLES_HEROES,
            Kind::Logos => STYLES_LOGOS,
        }
    }
    // `None` = el endpoint no acepta `dimensions` en absoluto (logos).
    fn dimensions(self) -> Option<&'static [&'static str]> {
        match self {
            Kind::Grids => Some(DIMENSIONS_GRIDS),
            Kind::Heroes => Some(DIMENSIONS_HEROES),
            Kind::Logos => None,
        }
    }
    fn mimes(self) -> &'static [&'static str] {
        match self {
            Kind::Grids | Kind::Heroes => MIMES_GRIDS,
            Kind::Logos => MIMES_LOGOS,
        }
    }
}

/// Igual que `steam_api::describe_http_error` — incluye el cuerpo de la
/// respuesta cuando hay un status HTTP, no solo el código.
fn describe_http_error(e: ureq::Error) -> String {
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

fn stored_key() -> Result<String, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .and_then(|e| e.get_password())
        .map_err(|e| format!("griddb.key_read_failed|{e}"))
}

fn auth(req: ureq::Request, key: &str) -> ureq::Request {
    req.set("Authorization", &format!("Bearer {key}"))
}

/// Percent-encoding mínimo para el término de búsqueda, que va en la RUTA
/// (no en la query) de `/search/autocomplete/{term}` — `ureq` solo encodea
/// automáticamente lo que se pasa por `.query()`, no los segmentos de ruta
/// que arma uno mismo con `format!`. Sin sumar una dependencia nueva para
/// esto (mismo criterio que el escape a mano de `artstore::safe_id`): solo el
/// set "unreserved" de RFC 3986 pasa sin tocar, todo lo demás —incluidos
/// espacios, acentos, `/`— se escapa byte a byte.
fn percent_encode_path_segment(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

// ---- Estructuras de request/response ----

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GriddbFilters {
    #[serde(default)]
    pub styles: Vec<String>,
    #[serde(default)]
    pub dimensions: Vec<String>,
    #[serde(default)]
    pub mimes: Vec<String>,
    // Vacío = default de la API ("static"). Explícito solo si el usuario
    // activó "Imágenes animadas" (ver stores/griddbPrefs.js).
    #[serde(default)]
    pub types: Vec<String>,
    #[serde(default)]
    pub nsfw: Option<String>,
    #[serde(default)]
    pub humor: Option<String>,
    #[serde(default)]
    pub epilepsy: Option<String>,
}

fn validate_filters(kind: Kind, f: &GriddbFilters) -> Result<(), String> {
    for s in &f.styles {
        if !kind.styles().contains(&s.as_str()) {
            return Err(format!("griddb.invalid_style|{s}"));
        }
    }
    if !f.dimensions.is_empty() {
        match kind.dimensions() {
            Some(valid) => {
                for d in &f.dimensions {
                    if !valid.contains(&d.as_str()) {
                        return Err(format!("griddb.invalid_dimension|{d}"));
                    }
                }
            }
            None => return Err("griddb.dimensions_not_supported".to_string()),
        }
    }
    for m in &f.mimes {
        if !kind.mimes().contains(&m.as_str()) {
            return Err(format!("griddb.invalid_mime|{m}"));
        }
    }
    for t in &f.types {
        if !TYPES.contains(&t.as_str()) {
            return Err(format!("griddb.invalid_type|{t}"));
        }
    }
    for tag in [&f.nsfw, &f.humor, &f.epilepsy].into_iter().flatten() {
        if !TAG_VALUES.contains(&tag.as_str()) {
            return Err(format!("griddb.invalid_tag_value|{tag}"));
        }
    }
    Ok(())
}

fn apply_filters(mut req: ureq::Request, f: &GriddbFilters) -> ureq::Request {
    if !f.styles.is_empty() {
        req = req.query("styles", &f.styles.join(","));
    }
    if !f.dimensions.is_empty() {
        req = req.query("dimensions", &f.dimensions.join(","));
    }
    if !f.mimes.is_empty() {
        req = req.query("mimes", &f.mimes.join(","));
    }
    if !f.types.is_empty() {
        req = req.query("types", &f.types.join(","));
    }
    if let Some(v) = &f.nsfw {
        req = req.query("nsfw", v);
    }
    if let Some(v) = &f.humor {
        req = req.query("humor", v);
    }
    if let Some(v) = &f.epilepsy {
        req = req.query("epilepsy", v);
    }
    req
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GriddbGame {
    pub id: i64,
    pub name: String,
    #[serde(default)]
    pub verified: bool,
}

#[derive(Deserialize)]
struct GameEnvelope {
    data: GriddbGame,
}
#[derive(Deserialize)]
struct SearchEnvelope {
    data: Vec<GriddbGame>,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct GriddbAuthor {
    #[serde(default)]
    pub name: String,
}

// El `style` de una imagen viene documentado como string simple en el spec
// oficial, pero al menos un wrapper de referencia lo observa como array en la
// práctica — se acepta cualquiera de las dos formas y se normaliza a
// `Vec<String>`, más robusto que confiar ciegamente en un solo formato.
fn de_string_or_vec<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrVec {
        One(String),
        Many(Vec<String>),
    }
    Ok(match Option::<StringOrVec>::deserialize(deserializer)? {
        None => vec![],
        Some(StringOrVec::One(s)) => vec![s],
        Some(StringOrVec::Many(v)) => v,
    })
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GriddbImage {
    pub id: i64,
    #[serde(default)]
    pub score: i64,
    #[serde(default, deserialize_with = "de_string_or_vec")]
    pub style: Vec<String>,
    pub url: String,
    pub thumb: String,
    #[serde(default)]
    pub width: i64,
    #[serde(default)]
    pub height: i64,
    #[serde(default)]
    pub author: Option<GriddbAuthor>,
}

#[derive(Deserialize)]
struct ImagesEnvelope {
    #[serde(default)]
    page: i64,
    #[serde(default)]
    total: i64,
    #[serde(default)]
    limit: i64,
    #[serde(default)]
    data: Vec<GriddbImage>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GriddbImagePage {
    pub page: i64,
    pub total: i64,
    pub limit: i64,
    pub items: Vec<GriddbImage>,
}

fn validate_key(key: &str) -> Result<(), String> {
    // Autocomplete con un término trivial: la llamada más barata del API que
    // igual exige la key, y un 401/403 confirma "key inválida" sin ambigüedad
    // — mismo motivo que Steam valida contra GetPlayerSummaries antes de
    // guardar (docs/accounts.md): "guardar sin validar" dejaría creer que
    // quedó vinculado aunque la key esté mal, y el primer síntoma real
    // aparecería recién en la primera búsqueda real.
    let req = auth(ureq::get(&format!("{API_BASE}/search/autocomplete/a")), key);
    req.call().map_err(|e| {
        if let ureq::Error::Status(401, _) | ureq::Error::Status(403, _) = &e {
            "griddb.invalid_key".to_string()
        } else {
            format!("griddb.key_validation_failed|{}", describe_http_error(e))
        }
    })?;
    Ok(())
}

#[tauri::command]
pub fn griddb_set_key(key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("griddb.missing_key".to_string());
    }
    validate_key(key)?;
    Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .and_then(|e| e.set_password(key))
        .map_err(|e| format!("griddb.key_save_failed|{e}"))?;
    println!("[griddb] API key guardada y validada");
    Ok(())
}

#[tauri::command]
pub fn griddb_has_key() -> bool {
    stored_key().is_ok()
}

#[tauri::command]
pub fn griddb_clear_key() -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => {}
        Err(keyring::Error::NoEntry) => {} // ya no está: el objetivo se cumple igual.
        Err(e) => return Err(e.to_string()),
    }
    println!("[griddb] API key borrada");
    Ok(())
}

/// `GET /games/{platform}/{platformId}` — `Ok(None)` en un 404 real (no hay
/// juego de SteamGridDB para ese id externo), no un error: el llamador
/// (`stores/griddb.js`) cae a `griddb_search` en ese caso.
#[tauri::command]
pub fn griddb_game_by_platform(platform: String, platform_id: String) -> Result<Option<GriddbGame>, String> {
    if !PLATFORMS.contains(&platform.as_str()) {
        return Err(format!("griddb.invalid_platform|{platform}"));
    }
    let key = stored_key()?;
    let url = format!("{API_BASE}/games/{platform}/{platform_id}");
    match auth(ureq::get(&url), &key).call() {
        Ok(resp) => {
            let env: GameEnvelope = resp.into_json().map_err(|e| e.to_string())?;
            Ok(Some(env.data))
        }
        Err(ureq::Error::Status(404, _)) => Ok(None),
        Err(e) => Err(format!("griddb.http|{}", describe_http_error(e))),
    }
}

/// Búsqueda por nombre — la salida para GOG (sin id externo soportado) y
/// cualquier plataforma sin mapeo, o cuando `griddb_game_by_platform` no
/// encontró nada.
#[tauri::command]
pub fn griddb_search(term: String) -> Result<Vec<GriddbGame>, String> {
    let key = stored_key()?;
    let url = format!("{API_BASE}/search/autocomplete/{}", percent_encode_path_segment(&term));
    let resp = auth(ureq::get(&url), &key)
        .call()
        .map_err(|e| format!("griddb.http|{}", describe_http_error(e)))?;
    let env: SearchEnvelope = resp.into_json().map_err(|e| e.to_string())?;
    Ok(env.data)
}

/// `GET /{grids|heroes|logos}/game/{gameId}` con filtros — un solo comando
/// para los 3 endpoints en vez de tres casi idénticos. `kind` y los valores
/// de `filters` se validan contra las tablas reales de la API ANTES de salir
/// a la red, para que un filtro inválido dé un error claro en vez de un 400
/// opaco de SteamGridDB.
#[tauri::command]
pub fn griddb_images(
    kind: String,
    game_id: i64,
    filters: GriddbFilters,
    page: Option<i64>,
) -> Result<GriddbImagePage, String> {
    let k = Kind::parse(&kind)?;
    validate_filters(k, &filters)?;
    let key = stored_key()?;
    let url = format!("{API_BASE}/{}/game/{game_id}", k.path());
    let mut req = auth(ureq::get(&url), &key);
    req = apply_filters(req, &filters);
    if let Some(p) = page {
        req = req.query("page", &p.to_string());
    }
    let resp = req.call().map_err(|e| format!("griddb.http|{}", describe_http_error(e)))?;
    let env: ImagesEnvelope = resp.into_json().map_err(|e| e.to_string())?;
    Ok(GriddbImagePage {
        page: env.page,
        total: env.total,
        limit: env.limit,
        items: env.data,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_styles_per_endpoint() {
        let f = GriddbFilters { styles: vec!["no_logo".into()], ..Default::default() };
        assert!(validate_filters(Kind::Grids, &f).is_ok());
        // "no_logo" es válido para grids, no para heroes.
        assert!(validate_filters(Kind::Heroes, &f).is_err());
    }

    #[test]
    fn rejects_dimensions_on_logos() {
        let f = GriddbFilters { dimensions: vec!["600x900".into()], ..Default::default() };
        assert_eq!(validate_filters(Kind::Logos, &f), Err("griddb.dimensions_not_supported".to_string()));
    }

    #[test]
    fn rejects_dimension_not_valid_for_kind() {
        let f = GriddbFilters { dimensions: vec!["1920x620".into()], ..Default::default() };
        // 1920x620 es una dimensión de hero, no de grid.
        assert!(validate_filters(Kind::Grids, &f).is_err());
        assert!(validate_filters(Kind::Heroes, &f).is_ok());
    }

    #[test]
    fn rejects_jpeg_mime_on_logos() {
        let f = GriddbFilters { mimes: vec!["image/jpeg".into()], ..Default::default() };
        assert!(validate_filters(Kind::Logos, &f).is_err());
        assert!(validate_filters(Kind::Grids, &f).is_ok());
    }

    #[test]
    fn accepts_empty_filters() {
        assert!(validate_filters(Kind::Grids, &GriddbFilters::default()).is_ok());
        assert!(validate_filters(Kind::Heroes, &GriddbFilters::default()).is_ok());
        assert!(validate_filters(Kind::Logos, &GriddbFilters::default()).is_ok());
    }

    #[test]
    fn rejects_invalid_tag_value() {
        let f = GriddbFilters { nsfw: Some("only".into()), ..Default::default() };
        assert!(validate_filters(Kind::Grids, &f).is_err());
    }

    #[test]
    fn percent_encodes_spaces_and_accents() {
        assert_eq!(percent_encode_path_segment("half life"), "half%20life");
        assert_eq!(percent_encode_path_segment("años"), "a%C3%B1os");
        assert_eq!(percent_encode_path_segment("abc-123.png_~"), "abc-123.png_~");
    }

    #[test]
    fn kind_parse_rejects_unknown() {
        assert!(Kind::parse("icons").is_err());
        assert!(Kind::parse("grids").is_ok());
    }

    #[test]
    fn image_style_accepts_string_or_array() {
        #[derive(Deserialize)]
        struct Wrap {
            #[serde(deserialize_with = "de_string_or_vec")]
            style: Vec<String>,
        }
        let a: Wrap = serde_json::from_str(r#"{"style":"material"}"#).unwrap();
        assert_eq!(a.style, vec!["material".to_string()]);
        let b: Wrap = serde_json::from_str(r#"{"style":["material","alternate"]}"#).unwrap();
        assert_eq!(b.style, vec!["material".to_string(), "alternate".to_string()]);
        let c: Wrap = serde_json::from_str(r#"{"style":null}"#).unwrap();
        assert_eq!(c.style, Vec::<String>::new());
    }
}
