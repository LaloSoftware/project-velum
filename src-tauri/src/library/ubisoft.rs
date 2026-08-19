//! Fuente de biblioteca de Ubisoft Connect. Descubrimiento por registro
//! (`HKLM\SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs`), solo Windows.
//! Ver docs/stores.md.

use super::{Game, LibrarySource};

pub struct UbisoftSource;

impl UbisoftSource {
    pub fn new() -> Self {
        UbisoftSource
    }
}

// Último segmento de una ruta con separador `\` o `/` — mismo criterio que
// `ea::windows_basename` (no depende del separador del SO donde corre el
// binario, para poder testear con rutas de Windows en cualquier SO).
fn windows_basename(path: &str) -> String {
    path.trim_end_matches(['\\', '/'])
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or(path)
        .to_string()
}

// Construye un `Game` a partir del id (subclave del registro) y su ruta de
// instalación (valor `InstallDir` de esa subclave). Función pura, testeable
// sin tocar el registro real. No hay nombre "bonito" en el registro de
// Ubisoft (solo id + ruta), así que el título sale del nombre de carpeta —
// mismo criterio que `library/apps.rs` con los accesos del Menú Inicio.
fn game_from_install(id: &str, install_dir: &str) -> Game {
    Game {
        id: format!("ubisoft:{id}"),
        title: windows_basename(install_dir),
        store: "ubisoft".into(),
        kind: "game".into(),
        cover_path: None,
        wide_path: None,
        hero_path: None,
        logo_path: None,
        install_dir: Some(install_dir.to_string()),
        launch_target: format!("uplay://launch/{id}/0"),
        last_played: None,
        size_bytes: None,
    }
}

// El nombre del valor de instalación (`InstallDir`) sale de documentación
// comunitaria, no de una fuente oficial de Ubisoft — no se pudo verificar en
// un PC Windows real. Si en la práctica el valor tuviera otro nombre, esta
// fuente devolvería una lista vacía (fallo silencioso, no rompe la app) hasta
// ajustar la clave aquí. Ver docs/stores.md.
#[cfg(windows)]
fn installs_from_registry() -> Vec<Game> {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let mut out = Vec::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = match hklm.open_subkey("SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs") {
        Ok(k) => k,
        Err(_) => return out,
    };
    for id in key.enum_keys().flatten() {
        if let Ok(sub) = key.open_subkey(&id) {
            if let Ok(dir) = sub.get_value::<String, _>("InstallDir") {
                if !dir.trim().is_empty() {
                    out.push(game_from_install(&id, &dir));
                }
            }
        }
    }
    out
}

impl LibrarySource for UbisoftSource {
    fn id(&self) -> &'static str {
        "ubisoft"
    }

    #[cfg(windows)]
    fn list(&self) -> Vec<Game> {
        installs_from_registry()
    }

    #[cfg(not(windows))]
    fn list(&self) -> Vec<Game> {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_game_from_registry_values() {
        let g = game_from_install(
            "12345",
            "C:\\Program Files (x86)\\Ubisoft\\Rainbow Six Siege",
        );
        assert_eq!(g.id, "ubisoft:12345");
        assert_eq!(g.title, "Rainbow Six Siege");
        assert_eq!(g.store, "ubisoft");
        assert_eq!(g.kind, "game");
        assert_eq!(g.launch_target, "uplay://launch/12345/0");
        assert_eq!(
            g.install_dir.as_deref(),
            Some("C:\\Program Files (x86)\\Ubisoft\\Rainbow Six Siege")
        );
    }

    #[test]
    fn windows_basename_ignores_host_path_separator() {
        assert_eq!(windows_basename("C:\\Games\\Anno 1800"), "Anno 1800");
        assert_eq!(windows_basename("C:\\Games\\Anno 1800\\"), "Anno 1800");
    }
}
