//! Aplicaciones de Windows: listadas desde los accesos directos `.lnk` del
//! Menú Inicio. Solo Windows. El launch usa el propio `.lnk` (lo resuelve el SO).

#![cfg(windows)]

use super::{Game, LibrarySource};
use std::path::{Path, PathBuf};

pub struct AppsSource;

impl AppsSource {
    pub fn new() -> Self {
        AppsSource
    }
}

fn start_menu_dirs() -> Vec<PathBuf> {
    let mut v = Vec::new();
    if let Ok(pd) = std::env::var("ProgramData") {
        v.push(PathBuf::from(pd).join("Microsoft/Windows/Start Menu/Programs"));
    }
    if let Ok(ad) = std::env::var("APPDATA") {
        v.push(PathBuf::from(ad).join("Microsoft/Windows/Start Menu/Programs"));
    }
    v
}

// Palabras que indican accesos que no son "apps" para jugar/ejecutar.
const SKIP: &[&str] = &[
    "uninstall", "desinstalar", "readme", "help", "ayuda", "website", "web site",
    "documentation", "manual", "report", "changelog",
];

fn scan(dir: &Path, depth: u32, out: &mut Vec<Game>) {
    if depth > 4 {
        return;
    }
    let rd = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    for e in rd.flatten() {
        let p = e.path();
        if p.is_dir() {
            scan(&p, depth + 1, out);
            continue;
        }
        let is_lnk = p
            .extension()
            .and_then(|x| x.to_str())
            .map(|x| x.eq_ignore_ascii_case("lnk"))
            .unwrap_or(false);
        if !is_lnk {
            continue;
        }
        let stem = match p.file_stem().and_then(|s| s.to_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };
        let low = stem.to_lowercase();
        if SKIP.iter().any(|k| low.contains(k)) {
            continue;
        }
        out.push(Game {
            id: format!("app:{}", p.to_string_lossy()),
            title: stem,
            store: "other".into(),
            kind: "app".into(),
            cover_path: None,
            wide_path: None,
            hero_path: None,
            logo_path: None,
            install_dir: None,
            launch_target: p.to_string_lossy().into_owned(),
            last_played: None,
            size_bytes: None,
        });
    }
}

impl LibrarySource for AppsSource {
    fn id(&self) -> &'static str {
        "apps"
    }

    fn list(&self) -> Vec<Game> {
        let mut out = Vec::new();
        for d in start_menu_dirs() {
            scan(&d, 0, &mut out);
        }
        out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
        out.dedup_by(|a, b| a.title.eq_ignore_ascii_case(&b.title));
        out
    }
}
