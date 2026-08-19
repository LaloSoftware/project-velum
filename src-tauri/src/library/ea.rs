//! Fuente de biblioteca de EA App / Origin. Parsea los manifiestos `.mfst`
//! (formato query-string, legado de Origin que la EA App sigue escribiendo por
//! compatibilidad hacia atrás). Ver docs/stores.md.

use super::{Game, LibrarySource};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

pub struct EaSource {
    roots: Vec<PathBuf>,
}

impl EaSource {
    pub fn from_roots(roots: Vec<PathBuf>) -> Self {
        EaSource { roots }
    }

    /// En Windows: `%ProgramData%\Origin\LocalContent` (ruta legado que la EA
    /// App sigue usando para sus manifiestos de compatibilidad).
    #[cfg(windows)]
    pub fn windows() -> Self {
        let mut roots = Vec::new();
        if let Ok(pd) = std::env::var("ProgramData") {
            roots.push(PathBuf::from(pd).join("Origin/LocalContent"));
        }
        EaSource { roots }
    }
}

// Decodifica percent-encoding (`%XX`) de un valor de query string.
fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(byte) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

// Último segmento de una ruta con separador `\` o `/`, tal cual la escribe un
// manifiesto de EA (siempre con formato de Windows, aunque se lea en otro SO —
// por eso no se usa `Path::file_name()`, cuya idea de "separador" depende del
// SO donde corre la app, no del SO al que pertenece la ruta).
fn windows_basename(path: &str) -> String {
    path.trim_end_matches(['\\', '/'])
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or(path)
        .to_string()
}

// Parsea el contenido de un `.mfst` (query string) a un mapa clave→valor en
// minúsculas: algunos manifiestos repiten `dipInstallPath`/`dipinstallpath`
// con distinta capitalización.
fn parse_query(txt: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for pair in txt.trim().trim_start_matches('?').split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            map.entry(k.to_lowercase()).or_insert_with(|| percent_decode(v));
        }
    }
    map
}

fn parse_mfst(path: &Path) -> Option<Game> {
    let txt = std::fs::read_to_string(path).ok()?;
    let fields = parse_query(&txt);
    let id = fields.get("id")?.clone();
    // Los manifiestos de DLC/add-ons no traen ruta de instalación propia:
    // se descartan (no son juegos lanzables por sí solos).
    let install_path = fields.get("dipinstallpath")?.clone();
    let title = windows_basename(&install_path);

    Some(Game {
        id: format!("ea:{id}"),
        title,
        store: "ea".into(),
        kind: "game".into(),
        cover_path: None,
        wide_path: None,
        hero_path: None,
        logo_path: None,
        install_dir: Some(install_path),
        launch_target: format!("origin2://game/launch?offerIds={id}"),
        last_played: None,
        size_bytes: None,
    })
}

// Busca `*.mfst` bajo `root` (recursivo, profundidad limitada) — mismo
// espíritu que `gog::scan_dir`.
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
        } else if p.extension().and_then(|x| x.to_str()) == Some("mfst") {
            if let Some(g) = parse_mfst(&p) {
                out.push(g);
            }
        }
    }
}

impl LibrarySource for EaSource {
    fn id(&self) -> &'static str {
        "ea"
    }

    fn list(&self) -> Vec<Game> {
        let mut out = Vec::new();
        for r in &self.roots {
            scan_dir(r, 0, &mut out);
        }
        out.sort_by(|a, b| a.id.cmp(&b.id));
        out.dedup_by(|a, b| a.id == b.id);
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixtures_ea() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/ea")
    }

    #[test]
    fn lists_ea_games_from_mfst_and_skips_dlc() {
        let games = EaSource::from_roots(vec![fixtures_ea()]).list();
        let titles: Vec<_> = games.iter().map(|g| g.title.as_str()).collect();
        assert!(titles.contains(&"Titanfall2"), "obtuve {titles:?}");
        assert!(titles.contains(&"Celeste"), "obtuve {titles:?}");
        assert!(games.iter().all(|g| g.store == "ea"));
        // El manifiesto de DLC (sin dipInstallPath) se descarta: solo 2 juegos,
        // no 3 manifiestos.
        assert_eq!(games.len(), 2, "obtuve {titles:?}");
    }

    #[test]
    fn launch_target_uses_offer_id() {
        let games = EaSource::from_roots(vec![fixtures_ea()]).list();
        let titanfall = games.iter().find(|g| g.title == "Titanfall2").unwrap();
        assert_eq!(
            titanfall.launch_target,
            "origin2://game/launch?offerIds=Origin.OFR.50.0001456"
        );
    }

    #[test]
    fn percent_decode_handles_encoded_windows_path() {
        assert_eq!(
            percent_decode("C%3a%5cGames%5cTitanfall2"),
            "C:\\Games\\Titanfall2"
        );
    }

    #[test]
    fn windows_basename_ignores_host_path_separator() {
        assert_eq!(windows_basename("C:\\Games\\Titanfall2"), "Titanfall2");
        assert_eq!(windows_basename("C:\\Games\\Titanfall2\\"), "Titanfall2");
    }
}
