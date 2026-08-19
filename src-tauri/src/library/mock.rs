//! Fuente de biblioteca simulada para desarrollar en macOS sin las tiendas reales.
//! Espejo aproximado de los datos mock del frontend (src/lib/ipc/index.js).
//! (Solo se usa como fallback fuera de Windows; en Windows queda sin usar.)
#![allow(dead_code)]

use super::{Game, LibrarySource};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct MockSource;

impl MockSource {
    pub fn new() -> Self {
        MockSource
    }
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn game(id: &str, title: &str, store: &str, kind: &str, last: Option<i64>) -> Game {
    // Tamaño simulado determinista (solo juegos; las apps no reportan tamaño),
    // para poder demostrar el orden por tamaño en dev.
    let size_bytes = if kind == "game" {
        let h = id.bytes().fold(0u64, |a, b| a.wrapping_mul(31).wrapping_add(b as u64));
        Some((1 + h % 80) * 1024 * 1024 * 1024)
    } else {
        None
    };
    Game {
        id: id.to_string(),
        title: title.to_string(),
        store: store.to_string(),
        kind: kind.to_string(),
        cover_path: None,
        wide_path: None,
        hero_path: None,
        logo_path: None,
        install_dir: Some(format!("C:/Games/{}", id)),
        launch_target: format!("mock://launch/{}", id),
        last_played: last,
        size_bytes,
    }
}

impl LibrarySource for MockSource {
    fn id(&self) -> &'static str {
        "mock"
    }

    fn list(&self) -> Vec<Game> {
        let n = now();
        let h = 3600;
        vec![
            game("hades2", "Hades II", "steam", "game", Some(n - h)),
            game("eldenring", "Elden Ring", "steam", "game", Some(n - 5 * h)),
            game("cyberpunk", "Cyberpunk 2077", "gog", "game", Some(n - 30 * h)),
            game("balatro", "Balatro", "steam", "game", Some(n - 2 * h)),
            game("hollowknight", "Hollow Knight", "gog", "game", Some(n - 80 * h)),
            game("stardew", "Stardew Valley", "steam", "game", Some(n - 200 * h)),
            game("aloy", "Horizon Zero Dawn", "epic", "game", Some(n - 12 * h)),
            game("rocketleague", "Rocket League", "epic", "game", None),
            game("hades1", "Hades", "steam", "game", Some(n - 500 * h)),
            game("celeste", "Celeste", "gog", "game", None),
            game("deadcells", "Dead Cells", "gog", "game", Some(n - 48 * h)),
            game("witcher3", "The Witcher 3", "gog", "game", Some(n - 300 * h)),
            game("hitman", "HITMAN World of Assassination", "epic", "game", None),
            game("factorio", "Factorio", "steam", "game", Some(n - 90 * h)),
            game("terraria", "Terraria", "steam", "game", None),
            game("doometernal", "DOOM Eternal", "steam", "game", Some(n - 400 * h)),
            // Aplicaciones (kind: app)
            game("discord", "Discord", "other", "app", None),
            game("spotify", "Spotify", "other", "app", None),
            game("chrome", "Navegador", "other", "app", None),
        ]
    }
}
