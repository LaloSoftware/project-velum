//! Capa de fuentes de biblioteca.
//!
//! El resto de la app depende solo del trait `LibrarySource` y del modelo `Game`.
//! En Windows se añadirán `SteamSource`/`GogSource`/`EpicSource` (leyendo sus
//! ficheros) detrás de este mismo trait; hoy solo existe `MockSource` para poder
//! desarrollar la UI en macOS. Ver docs/stores.md.

mod mock;

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
    pub cover_path: Option<String>,
    pub install_dir: Option<String>,
    /// URI o ruta a lanzar (en mock es ficticio).
    pub launch_target: String,
    /// Última vez jugado, epoch en segundos (para "recientes").
    pub last_played: Option<i64>,
}

pub trait LibrarySource {
    /// Identificador de la fuente (se usará al combinar varias tiendas reales).
    #[allow(dead_code)]
    fn id(&self) -> &'static str;
    fn list(&self) -> Vec<Game>;
}

/// Fuentes activas según la plataforma. En Windows se añadirían las reales.
fn active_sources() -> Vec<Box<dyn LibrarySource>> {
    vec![Box::new(mock::MockSource::new())]
}

#[tauri::command]
pub fn list_games() -> Vec<Game> {
    active_sources()
        .into_iter()
        .flat_map(|s| s.list())
        .collect()
}
