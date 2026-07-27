//! Fuente de biblioteca de Steam (lectura local de archivos instalados).
//! Parsea `libraryfolders.vdf` + `appmanifest_*.acf`. Ver docs/stores.md.

use super::vdf;
use super::{Game, LibrarySource};
use std::path::{Path, PathBuf};

pub struct SteamSource {
    base: PathBuf, // carpeta de instalación de Steam
}

impl SteamSource {
    pub fn new(base: PathBuf) -> Self {
        SteamSource { base }
    }

    // Todas las carpetas `steamapps` (bibliotecas en varios discos).
    fn steamapps_dirs(&self) -> Vec<PathBuf> {
        let mut dirs = vec![self.base.join("steamapps")];
        for p in [
            self.base.join("steamapps/libraryfolders.vdf"),
            self.base.join("config/libraryfolders.vdf"),
        ] {
            if let Ok(txt) = std::fs::read_to_string(&p) {
                if let Some(lf) = vdf::parse(&txt)
                    .as_ref()
                    .and_then(|r| r.get("libraryfolders"))
                    .and_then(|v| v.obj())
                {
                    for entry in lf.values() {
                        if let Some(path) = entry.get("path").and_then(|v| v.as_str()) {
                            dirs.push(PathBuf::from(path).join("steamapps"));
                        }
                    }
                }
                break;
            }
        }
        // `libraryfolders.vdf` suele listar también la biblioteca principal
        // (la misma que `self.base`), a veces con formato de ruta distinto
        // (mayúsculas, barras). Normalizar con `canonicalize` antes de deduplicar
        // para no escanear la misma carpeta dos veces (→ juegos duplicados).
        for d in dirs.iter_mut() {
            if let Ok(canon) = d.canonicalize() {
                *d = canon;
            }
        }
        dirs.sort();
        dirs.dedup();
        dirs
    }

    // Steam cachea el arte OFICIAL de biblioteca (carátula/hero/logo) en la
    // instalación principal, no por carpeta de librería.
    fn art_dir(&self) -> PathBuf {
        self.base.join("appcache").join("librarycache")
    }

    // Carpetas de arte PERSONALIZADO del usuario: `userdata/<id>/config/grid`.
    // (Lo que el usuario cambia a mano; tiene prioridad sobre el oficial.)
    fn grid_dirs(&self) -> Vec<PathBuf> {
        let mut dirs = Vec::new();
        if let Ok(rd) = std::fs::read_dir(self.base.join("userdata")) {
            for e in rd.flatten() {
                let g = e.path().join("config").join("grid");
                if g.is_dir() {
                    dirs.push(g);
                }
            }
        }
        dirs
    }
}

// Devuelve la primera de `names` que exista en alguna de `dirs`.
fn first_in_dirs(dirs: &[PathBuf], names: &[String]) -> Option<String> {
    for d in dirs {
        for n in names {
            let p = d.join(n);
            if p.is_file() {
                return Some(p.to_string_lossy().into_owned());
            }
        }
    }
    None
}

// Arte oficial en `librarycache`: dos layouts, `<appid>/<name>` (reciente) o
// `<appid>_<name>` (plano). Se usa el primero que exista.
fn first_existing_art(dir: &Path, appid: &str, name: &str) -> Option<String> {
    let nested = dir.join(appid).join(name);
    if nested.is_file() {
        return Some(nested.to_string_lossy().into_owned());
    }
    let flat = dir.join(format!("{appid}_{name}"));
    if flat.is_file() {
        return Some(flat.to_string_lossy().into_owned());
    }
    None
}

// Redistribuibles / runtimes / Proton que no son juegos.
const IGNORE: &[&str] = &[
    "228980", "1070560", "1391110", "1493710", "1580130", "1826330", "2180100", "1887720",
];

impl LibrarySource for SteamSource {
    fn id(&self) -> &'static str {
        "steam"
    }

    fn list(&self) -> Vec<Game> {
        let mut games = Vec::new();
        let art_dir = self.art_dir();
        let grid_dirs = self.grid_dirs();
        for dir in self.steamapps_dirs() {
            let rd = match std::fs::read_dir(&dir) {
                Ok(r) => r,
                Err(_) => continue,
            };
            for e in rd.flatten() {
                let fname = e.file_name();
                let fname = fname.to_string_lossy();
                if !(fname.starts_with("appmanifest_") && fname.ends_with(".acf")) {
                    continue;
                }
                let txt = match std::fs::read_to_string(e.path()) {
                    Ok(t) => t,
                    Err(_) => continue,
                };
                let root = match vdf::parse(&txt) {
                    Some(r) => r,
                    None => continue,
                };
                let app = match root.get("AppState") {
                    Some(a) => a,
                    None => continue,
                };
                let appid = app.get("appid").and_then(|v| v.as_str()).unwrap_or("");
                let title = app.get("name").and_then(|v| v.as_str()).unwrap_or("");
                if appid.is_empty() || title.is_empty() || IGNORE.contains(&appid) {
                    continue;
                }
                let install_dir = app
                    .get("installdir")
                    .and_then(|v| v.as_str())
                    .map(|d| dir.join("common").join(d).to_string_lossy().into_owned());
                let last_played = app
                    .get("LastPlayed")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse::<i64>().ok())
                    .filter(|&t| t > 0);
                games.push(Game {
                    id: format!("steam:{appid}"),
                    title: title.to_string(),
                    store: "steam".into(),
                    kind: "game".into(),
                    // Personalizado (grid) con prioridad; si no, oficial (librarycache).
                    cover_path: first_in_dirs(
                        &grid_dirs,
                        &[format!("{appid}p.png"), format!("{appid}p.jpg")],
                    )
                    .or_else(|| first_existing_art(&art_dir, appid, "library_600x900.jpg")),
                    // Carátula expandida (apaisada): grid `<appid>.jpg` o header oficial.
                    wide_path: first_in_dirs(
                        &grid_dirs,
                        &[format!("{appid}.png"), format!("{appid}.jpg")],
                    )
                    .or_else(|| first_existing_art(&art_dir, appid, "header.jpg")),
                    hero_path: first_in_dirs(
                        &grid_dirs,
                        &[format!("{appid}_hero.png"), format!("{appid}_hero.jpg")],
                    )
                    .or_else(|| first_existing_art(&art_dir, appid, "library_hero.jpg")),
                    logo_path: first_in_dirs(&grid_dirs, &[format!("{appid}_logo.png")])
                        .or_else(|| first_existing_art(&art_dir, appid, "logo.png")),
                    install_dir,
                    launch_target: format!("steam://rungameid/{appid}"),
                    last_played,
                });
            }
        }
        games
    }
}

/// Localiza la carpeta de Steam en Windows: registro (HKCU `SteamPath`,
/// HKLM `InstallPath`) y rutas por defecto. Devuelve la que tenga `steamapps`.
#[cfg(windows)]
pub fn find_steam_base() -> Option<PathBuf> {
    use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
    use winreg::RegKey;

    let ok = |pb: PathBuf| pb.join("steamapps").is_dir().then_some(pb);

    if let Ok(k) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Valve\\Steam") {
        if let Ok(p) = k.get_value::<String, _>("SteamPath") {
            if let Some(pb) = ok(PathBuf::from(p)) {
                return Some(pb);
            }
        }
    }
    for sub in ["SOFTWARE\\WOW6432Node\\Valve\\Steam", "SOFTWARE\\Valve\\Steam"] {
        if let Ok(k) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(sub) {
            if let Ok(p) = k.get_value::<String, _>("InstallPath") {
                if let Some(pb) = ok(PathBuf::from(p)) {
                    return Some(pb);
                }
            }
        }
    }
    for def in ["C:/Program Files (x86)/Steam", "C:/Program Files/Steam"] {
        if let Some(pb) = ok(PathBuf::from(def)) {
            return Some(pb);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixtures_steam() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/steam")
    }

    #[test]
    fn lists_installed_games_and_skips_redistributables() {
        let games = SteamSource::new(fixtures_steam()).list();
        let titles: Vec<_> = games.iter().map(|g| g.title.as_str()).collect();
        assert!(titles.contains(&"Half-Life 2"), "esperaba HL2, obtuve {titles:?}");
        assert!(titles.contains(&"Dota 2"));
        // El appid 228980 (redistribuibles) debe ignorarse.
        assert!(!titles.iter().any(|t| t.contains("Redistributables")));
        assert!(games.iter().all(|g| g.launch_target.starts_with("steam://rungameid/")));
    }

    #[test]
    fn resolves_art_from_librarycache_both_layouts() {
        let games = SteamSource::new(fixtures_steam()).list();
        let hl2 = games.iter().find(|g| g.title == "Half-Life 2").unwrap();
        // Layout anidado (<appid>/<name>).
        assert!(hl2.cover_path.as_ref().unwrap().ends_with("library_600x900.jpg"));
        assert!(hl2.wide_path.as_ref().unwrap().ends_with("header.jpg"));
        assert!(hl2.hero_path.as_ref().unwrap().ends_with("library_hero.jpg"));
        // Layout plano (<appid>_<name>).
        assert!(hl2.logo_path.as_ref().unwrap().ends_with("220_logo.png"));

        let dota = games.iter().find(|g| g.title == "Dota 2").unwrap();
        assert!(dota.cover_path.is_none());
        assert!(dota.wide_path.is_none());
        assert!(dota.hero_path.is_none());
        assert!(dota.logo_path.is_none());
    }
}
