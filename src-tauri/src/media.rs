//! Listado de archivos de audio dentro de una carpeta (biblioteca de Música
//! del módulo Multimedia, ver `stores/musicLibrary.js`). Un solo nivel — cada
//! carpeta que el usuario agrega es un álbum, sin recursión en subcarpetas
//! (regla de negocio: carpeta = álbum). Mismas extensiones que ya usa
//! `SoundtrackEditor.svelte` (soundtrack por-juego).

use serde::Serialize;
use std::path::Path;

const AUDIO_EXT: &[&str] = &["mp3", "ogg", "wav", "flac", "m4a", "aac"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileInfo {
    pub path: String,
    /// Nombre de archivo sin extensión — el título de la pista en v1 (sin
    /// parseo de tags ID3/metadata, cero dependencias nuevas de audio).
    pub name: String,
}

/// Lista los archivos de audio de `path` (un solo nivel, sin recursión),
/// ordenados alfabéticamente (case-insensitive). Carpeta inexistente/sin
/// permisos → lista vacía en vez de error (el álbum se muestra "sin pistas"
/// en vez de romper toda la carga de la biblioteca).
#[tauri::command]
pub fn list_audio_files(path: String) -> Result<Vec<AudioFileInfo>, String> {
    let dir = Path::new(&path);
    let rd = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return Ok(Vec::new()),
    };

    let mut out: Vec<AudioFileInfo> = rd
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if !p.is_file() {
                return None;
            }
            let is_audio = p
                .extension()
                .and_then(|x| x.to_str())
                .map(|x| AUDIO_EXT.iter().any(|ext| x.eq_ignore_ascii_case(ext)))
                .unwrap_or(false);
            if !is_audio {
                return None;
            }
            let name = p.file_stem()?.to_str()?.to_string();
            Some(AudioFileInfo {
                path: p.to_string_lossy().to_string(),
                name,
            })
        })
        .collect();

    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    // Carpeta temporal única por test (sin crate `tempfile` — mismo criterio
    // de evitar dependencias nuevas para algo chico ya usado en este módulo).
    struct TempDir(std::path::PathBuf);
    impl TempDir {
        fn new(name: &str) -> Self {
            let dir = std::env::temp_dir().join(format!("gm_media_test_{name}_{}", std::process::id()));
            let _ = fs::remove_dir_all(&dir);
            fs::create_dir_all(&dir).unwrap();
            TempDir(dir)
        }
        fn path(&self) -> &std::path::Path {
            &self.0
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn lists_only_audio_files_sorted_case_insensitive() {
        let dir = TempDir::new("basic");
        for name in ["banana.mp3", "Apple.OGG", "cherry.txt", "readme.md"] {
            fs::write(dir.path().join(name), b"x").unwrap();
        }
        let result = list_audio_files(dir.path().to_string_lossy().to_string()).unwrap();
        let names: Vec<_> = result.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["Apple", "banana"]);
    }

    #[test]
    fn ignores_subdirectories_no_recursion() {
        let dir = TempDir::new("norecurse");
        fs::create_dir_all(dir.path().join("subfolder")).unwrap();
        fs::write(dir.path().join("subfolder").join("hidden.mp3"), b"x").unwrap();
        fs::write(dir.path().join("track.mp3"), b"x").unwrap();
        let result = list_audio_files(dir.path().to_string_lossy().to_string()).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "track");
    }

    #[test]
    fn missing_folder_returns_empty_not_error() {
        let missing = std::env::temp_dir().join("gm_media_test_does_not_exist_xyz");
        let result = list_audio_files(missing.to_string_lossy().to_string()).unwrap();
        assert!(result.is_empty());
    }
}
