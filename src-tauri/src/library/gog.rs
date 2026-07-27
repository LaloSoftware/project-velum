//! Fuente de biblioteca de GOG. Multiplataforma: parsea los `goggame-*.info`
//! (JSON por juego). En Windows, además usa la BD de Galaxy para saber dónde
//! están instalados. Ver docs/stores.md.

use super::{Game, LibrarySource};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Metadatos de un juego sacados de la BD de GOG Galaxy (carátula/hero/última vez).
#[derive(Default, Clone)]
struct GogArt {
    cover: Option<String>,
    hero: Option<String>,
    last_played: Option<i64>,
}

pub struct GogSource {
    roots: Vec<PathBuf>,
    // productId (gameId) → arte. Vacío fuera de Windows / sin Galaxy.
    art: HashMap<String, GogArt>,
}

impl GogSource {
    pub fn from_roots(roots: Vec<PathBuf>) -> Self {
        GogSource { roots, art: HashMap::new() }
    }

    /// En Windows: rutas de la BD de Galaxy + la carpeta por defecto `C:\GOG Games`.
    #[cfg(windows)]
    pub fn windows() -> Self {
        let mut roots = galaxy_install_paths();
        roots.push(PathBuf::from("C:/GOG Games"));
        roots.sort();
        roots.dedup();
        GogSource { roots, art: galaxy_art() }
    }
}

fn parse_info(path: &Path) -> Option<Game> {
    let txt = std::fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&txt).ok()?;
    let title = v.get("name")?.as_str()?.to_string();
    let game_id = v.get("gameId").and_then(|x| x.as_str()).unwrap_or("");
    let dir = path.parent()?;

    // playTask primario (o el primero) → ejecutable relativo a la carpeta.
    let exe = v.get("playTasks").and_then(|t| t.as_array()).and_then(|arr| {
        arr.iter()
            .find(|t| t.get("isPrimary").and_then(|b| b.as_bool()).unwrap_or(false))
            .or_else(|| arr.first())
            .and_then(|t| t.get("path"))
            .and_then(|p| p.as_str())
    });
    let launch_target = match exe {
        Some(rel) => dir.join(rel).to_string_lossy().into_owned(),
        None => dir.to_string_lossy().into_owned(),
    };

    Some(Game {
        id: format!("gog:{}", if game_id.is_empty() { &title } else { game_id }),
        title,
        store: "gog".into(),
        kind: "game".into(),
        cover_path: None,
        wide_path: None,
        hero_path: None,
        logo_path: None,
        install_dir: Some(dir.to_string_lossy().into_owned()),
        launch_target,
        last_played: None,
        size_bytes: None,
    })
}

// Busca `goggame-*.info` bajo `root` (recursivo, profundidad limitada).
fn scan_dir(root: &Path, depth: u32, out: &mut Vec<Game>) {
    if depth > 4 {
        return;
    }
    let rd = match std::fs::read_dir(root) {
        Ok(r) => r,
        Err(_) => return,
    };
    for e in rd.flatten() {
        let p = e.path();
        if p.is_dir() {
            scan_dir(&p, depth + 1, out);
        } else if let Some(n) = p.file_name().and_then(|n| n.to_str()) {
            if n.starts_with("goggame-") && n.ends_with(".info") {
                if let Some(g) = parse_info(&p) {
                    out.push(g);
                }
            }
        }
    }
}

impl LibrarySource for GogSource {
    fn id(&self) -> &'static str {
        "gog"
    }

    fn list(&self) -> Vec<Game> {
        let mut out = Vec::new();
        for r in &self.roots {
            scan_dir(r, 0, &mut out);
        }
        out.sort_by(|a, b| a.id.cmp(&b.id));
        out.dedup_by(|a, b| a.id == b.id);
        // Adjuntar carátula/hero/última-vez (de Galaxy) por productId, si las hay.
        for g in out.iter_mut() {
            let pid = g.id.strip_prefix("gog:").unwrap_or(&g.id);
            if let Some(a) = self.art.get(pid) {
                g.cover_path = a.cover.clone();
                g.hero_path = a.hero.clone();
                g.last_played = a.last_played;
            }
        }
        out
    }
}

/// URL http(s) "limpia" (sin plantillas `{...}`) o None. Evita meter valores
/// que la WebView no podría cargar y dejarían la tarjeta en blanco.
#[cfg(windows)]
fn clean_url(v: Option<&str>) -> Option<String> {
    let s = v?.trim();
    if s.starts_with("http") && !s.contains('{') {
        Some(s.to_string())
    } else {
        None
    }
}

/// Lee carátula vertical y fondo (hero) de la BD de GOG Galaxy (solo lectura).
/// Best-effort: si el esquema/URLs no encajan, devuelve un mapa vacío y se usa
/// el placeholder por degradado.
#[cfg(windows)]
fn galaxy_art() -> HashMap<String, GogArt> {
    let mut map: HashMap<String, GogArt> = HashMap::new();
    let db = PathBuf::from("C:/ProgramData/GOG.com/Galaxy/storage/galaxy-2.0.db");
    let conn = match rusqlite::Connection::open_with_flags(
        &db,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    ) {
        Ok(c) => c,
        Err(_) => return map,
    };
    let sql = "SELECT gpt.type, gp.releaseKey, gp.value \
               FROM GamePieces gp JOIN GamePieceTypes gpt ON gp.gamePieceTypeId = gpt.id \
               WHERE gpt.type IN ('verticalCover', 'originalImages')";
    let mut stmt = match conn.prepare(sql) {
        Ok(s) => s,
        Err(_) => return map,
    };
    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    });
    let rows = match rows {
        Ok(r) => r,
        Err(_) => return map,
    };
    for (kind, release_key, value) in rows.flatten() {
        // releaseKey: "gog_<productId>" → nos quedamos con el productId.
        let pid = match release_key.strip_prefix("gog_") {
            Some(p) => p.to_string(),
            None => continue,
        };
        let json: serde_json::Value = match serde_json::from_str(&value) {
            Ok(j) => j,
            Err(_) => continue,
        };
        let entry = map.entry(pid).or_default();
        if kind == "verticalCover" {
            entry.cover = clean_url(json.get("verticalCover").and_then(|v| v.as_str()));
        } else if kind == "originalImages" {
            // El fondo suele venir como "background".
            entry.hero = clean_url(json.get("background").and_then(|v| v.as_str()));
        }
    }

    // Última vez jugado (para "Reciente" en Inicio) desde LastPlayedDates.
    if let Ok(mut stmt) =
        conn.prepare("SELECT gameReleaseKey, lastPlayedDate FROM LastPlayedDates")
    {
        if let Ok(rows) = stmt.query_map([], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        }) {
            for (release_key, ts) in rows.flatten() {
                if let Some(pid) = release_key.strip_prefix("gog_") {
                    if ts > 0 {
                        map.entry(pid.to_string()).or_default().last_played = Some(ts);
                    }
                }
            }
        }
    }
    map
}

/// Rutas de instalación desde la BD SQLite de GOG Galaxy (solo lectura).
#[cfg(windows)]
fn galaxy_install_paths() -> Vec<PathBuf> {
    let db = PathBuf::from("C:/ProgramData/GOG.com/Galaxy/storage/galaxy-2.0.db");
    let mut paths = Vec::new();
    let conn = match rusqlite::Connection::open_with_flags(
        &db,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    ) {
        Ok(c) => c,
        Err(_) => return paths,
    };
    if let Ok(mut stmt) = conn.prepare("SELECT installationPath FROM InstalledBaseProducts") {
        if let Ok(rows) = stmt.query_map([], |r| r.get::<_, String>(0)) {
            for p in rows.flatten() {
                paths.push(PathBuf::from(p));
            }
        }
    }
    paths
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixtures_gog() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/gog")
    }

    #[test]
    fn lists_gog_games_from_info() {
        let games = GogSource::from_roots(vec![fixtures_gog()]).list();
        let titles: Vec<_> = games.iter().map(|g| g.title.as_str()).collect();
        assert!(titles.contains(&"The Witcher 3: Wild Hunt"), "obtuve {titles:?}");
        assert!(titles.contains(&"Celeste"));
        assert!(games.iter().all(|g| g.store == "gog"));
    }
}
