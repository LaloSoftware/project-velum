//! Capa de fuentes de biblioteca.
//!
//! El resto de la app depende solo del trait `LibrarySource` y del modelo `Game`.
//! En Windows se añadirán `SteamSource`/`GogSource`/`EpicSource` (leyendo sus
//! ficheros) detrás de este mismo trait; hoy solo existe `MockSource` para poder
//! desarrollar la UI en macOS. Ver docs/stores.md.

mod mock;
mod vdf;
mod steam;
mod gog;
#[cfg(windows)]
mod apps;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: String,
    pub title: String,
    /// steam | gog | epic | other
    pub store: String,
    /// game | app
    pub kind: String,
    /// Carátula vertical (capsule 600×900). Se muestra siempre en la tarjeta.
    pub cover_path: Option<String>,
    /// Carátula expandida / header apaisado (~920×430). Tarjeta enfocada en Inicio.
    pub wide_path: Option<String>,
    /// Hero: banner ancho atmosférico (~1920×620). Fondo de Inicio y de Detalle.
    pub hero_path: Option<String>,
    /// Logo/isotipo del juego (se superpone al hero).
    pub logo_path: Option<String>,
    pub install_dir: Option<String>,
    /// URI o ruta a lanzar (en mock es ficticio).
    pub launch_target: String,
    /// Última vez jugado, epoch en segundos (para "recientes").
    pub last_played: Option<i64>,
}

pub trait LibrarySource {
    /// Identificador de la fuente (steam/gog/apps/mock) para diagnóstico.
    fn id(&self) -> &'static str;
    fn list(&self) -> Vec<Game>;
}

/// Fuentes activas según la plataforma / configuración:
/// - `GM_FIXTURES_DIR` (test): Steam/GOG leen de esa carpeta (cualquier SO).
/// - Windows: fuentes reales (Steam, GOG, apps del Menú Inicio).
/// - Otro (Mac sin fixtures): `MockSource` para desarrollar la UI.
fn active_sources() -> Vec<Box<dyn LibrarySource>> {
    if let Ok(fx) = std::env::var("GM_FIXTURES_DIR") {
        let p = std::path::PathBuf::from(fx);
        return vec![
            Box::new(steam::SteamSource::new(p.join("steam"))),
            Box::new(gog::GogSource::from_roots(vec![p.join("gog")])),
        ];
    }

    #[cfg(windows)]
    {
        let mut v: Vec<Box<dyn LibrarySource>> = Vec::new();
        match steam::find_steam_base() {
            Some(base) => {
                println!("[library] Steam encontrado en: {}", base.display());
                v.push(Box::new(steam::SteamSource::new(base)));
            }
            None => println!("[library] Steam NO encontrado (registro ni rutas por defecto)"),
        }
        v.push(Box::new(gog::GogSource::windows()));
        v.push(Box::new(apps::AppsSource::new()));
        return v;
    }

    #[cfg(not(windows))]
    {
        vec![Box::new(mock::MockSource::new())]
    }
}

#[tauri::command]
pub fn list_games() -> Vec<Game> {
    let mut games = Vec::new();
    for src in active_sources() {
        let items = src.list();
        println!("[library] fuente '{}': {} elementos", src.id(), items.len());
        games.extend(items);
    }
    // Red de seguridad: un `id` repetido (p. ej. una biblioteca de Steam escaneada
    // dos veces por rutas con formato distinto) rompe el `{#each ... (g.id)}` del
    // frontend. Nos quedamos con la primera aparición y avisamos por consola.
    let mut seen = std::collections::HashSet::new();
    let before = games.len();
    games.retain(|g| seen.insert(g.id.clone()));
    if games.len() != before {
        println!(
            "[library] aviso: {} elemento(s) duplicado(s) por id descartado(s)",
            before - games.len()
        );
    }
    let with_cover = games.iter().filter(|g| g.cover_path.is_some()).count();
    println!(
        "[library] total: {} (juegos + apps); con carátula: {}",
        games.len(),
        with_cover
    );
    games
}
