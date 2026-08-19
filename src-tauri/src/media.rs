//! Escaneo de bibliotecas de Multimedia (Música/Imágenes/Videos) — mismo
//! modelo de negocio en las 3: álbum = carpeta, con "carpeta raíz" opcional
//! (`list_subfolders`, cada subcarpeta directa se agrega sola como álbum).
//!
//! **Música**: los archivos de audio directos de un álbum son pistas
//! "sueltas"; cada subcarpeta se trata como un "Disco" (álbumes multi-disco
//! tipo OST de Steam, CD1/CD2/Disco 1/Disco 2 — mismo criterio que usa la
//! propia tienda de Steam, sin recursión más allá de ese único nivel).
//! Pistas repetidas en distinto formato dentro de la misma carpeta (p. ej.
//! `Song.mp3` + `Song.flac`) se agrupan en una sola `TrackInfo`. Mismas
//! extensiones que ya usa `SoundtrackEditor.svelte` (soundtrack por-juego).
//!
//! **Imágenes/Videos**: listado simple de un nivel (`list_image_files`/
//! `list_video_files`, sin discos ni dedup — no hace falta, ver el plan de
//! la sesión). Video usa el protocolo `asset` de Tauri para reproducirse
//! (streaming real, sin cargar el archivo a memoria como `read_image`/
//! `read_audio`) — `allow_video_folder` concede el scope en runtime sobre la
//! carpeta que el usuario agrega.

use serde::Serialize;
use std::collections::BTreeMap;
use std::path::Path;

const AUDIO_EXT: &[&str] = &["mp3", "ogg", "wav", "flac", "m4a", "aac"];

// Formatos comprimidos primero — mismo criterio que el trade-off ya
// documentado de `assets::read_audio` (carga el archivo completo a memoria,
// sin streaming): menos peso por pista es mejor por defecto.
const FORMAT_PRIORITY: &[&str] = &["mp3", "ogg", "m4a", "aac", "flac", "wav"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackInfo {
    /// Ruta del archivo "preferido" según `FORMAT_PRIORITY`.
    pub path: String,
    /// Nombre de archivo sin extensión — el título de la pista en v1 (sin
    /// parseo de tags ID3/metadata, cero dependencias nuevas de audio).
    pub name: String,
    /// Todas las rutas encontradas para esta pista (mismo nombre base, distinto
    /// formato) — no se expone selector en la UI todavía, se guarda por si
    /// hace falta a futuro.
    pub formats: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscInfo {
    /// Nombre literal de la subcarpeta (sin normalizar "CD1" → "Disco 1").
    pub name: String,
    pub tracks: Vec<TrackInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlbumScan {
    /// Pistas sueltas en la raíz del álbum (sin disco).
    pub tracks: Vec<TrackInfo>,
    /// Subcarpetas con audio adentro, tratadas como discos.
    pub discs: Vec<DiscInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderInfo {
    pub path: String,
    pub name: String,
}

fn folder_priority(name: &str) -> usize {
    let ext = name.rsplit('.').next().unwrap_or("");
    FORMAT_PRIORITY
        .iter()
        .position(|p| p.eq_ignore_ascii_case(ext))
        .unwrap_or(FORMAT_PRIORITY.len())
}

/// Lista y agrupa los archivos de audio de `dir` (un solo nivel, sin
/// recursión), deduplicando por nombre base (sin extensión, case-insensitive)
/// y ordenando el resultado alfabéticamente. Carpeta inexistente/sin permisos
/// → lista vacía en vez de error.
fn scan_folder_tracks(dir: &Path) -> Vec<TrackInfo> {
    let rd = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    // Agrupa por nombre base en minúsculas → (nombre "real" de la primera
    // variante vista, rutas encontradas). BTreeMap para no depender del
    // orden de iteración del sistema de archivos.
    let mut groups: BTreeMap<String, (String, Vec<String>)> = BTreeMap::new();
    for entry in rd.flatten() {
        let p = entry.path();
        if !p.is_file() {
            continue;
        }
        let is_audio = p
            .extension()
            .and_then(|x| x.to_str())
            .map(|x| AUDIO_EXT.iter().any(|ext| x.eq_ignore_ascii_case(ext)))
            .unwrap_or(false);
        if !is_audio {
            continue;
        }
        let Some(stem) = p.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let key = stem.to_lowercase();
        let entry = groups
            .entry(key)
            .or_insert_with(|| (stem.to_string(), Vec::new()));
        entry.1.push(p.to_string_lossy().to_string());
    }

    let mut out: Vec<TrackInfo> = groups
        .into_values()
        .map(|(name, mut formats)| {
            formats.sort_by_key(|f| folder_priority(f));
            let path = formats[0].clone();
            TrackInfo { path, name, formats }
        })
        .collect();

    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    out
}

/// Escanea un álbum: pistas sueltas en la raíz + un "Disco" por cada
/// subcarpeta que contenga audio (subcarpetas vacías de audio, p. ej. solo
/// portadas, se ignoran). Carpeta inexistente/sin permisos → álbum vacío en
/// vez de error (se muestra "sin pistas" en vez de romper toda la biblioteca).
#[tauri::command]
pub fn scan_album(path: String) -> Result<AlbumScan, String> {
    let dir = Path::new(&path);
    let tracks = scan_folder_tracks(dir);

    let mut discs: Vec<DiscInfo> = Vec::new();
    if let Ok(rd) = std::fs::read_dir(dir) {
        let mut subdirs: Vec<std::path::PathBuf> = rd
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_dir())
            .collect();
        subdirs.sort_by_key(|p| p.file_name().map(|n| n.to_string_lossy().to_lowercase()));
        for sub in subdirs {
            let sub_tracks = scan_folder_tracks(&sub);
            if sub_tracks.is_empty() {
                continue;
            }
            let name = sub
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Disco")
                .to_string();
            discs.push(DiscInfo { name, tracks: sub_tracks });
        }
    }

    Ok(AlbumScan { tracks, discs })
}

/// Lista las subcarpetas directas de `path` (un solo nivel, alfabético) —
/// para "carpeta raíz" (`musicLibraryRoots`): cada subcarpeta se agrega como
/// álbum automáticamente. Carpeta inexistente/sin permisos → lista vacía.
#[tauri::command]
pub fn list_subfolders(path: String) -> Result<Vec<FolderInfo>, String> {
    let dir = Path::new(&path);
    let rd = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return Ok(Vec::new()),
    };

    let mut out: Vec<FolderInfo> = rd
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if !p.is_dir() {
                return None;
            }
            let name = p.file_name()?.to_str()?.to_string();
            Some(FolderInfo {
                path: p.to_string_lossy().to_string(),
                name,
            })
        })
        .collect();

    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

// ---------------------------------------------------------------------
// Imágenes/Videos: listado simple de un nivel (sin discos ni dedup).
// ---------------------------------------------------------------------

// Mismas extensiones que ya acepta `assets::read_image` — listar algo que
// después no se puede mostrar sería peor que no listarlo.
const IMAGE_EXT: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "ico", "bmp"];
// Lo único que <video> reproduce nativamente sin dependencias nuevas
// (decoder de MKV/AVI/etc. quedaría fuera de alcance) — cubre capturas de
// Steam/NVIDIA, que graban en MP4 por default.
const VIDEO_EXT: &[&str] = &["mp4", "webm"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaFileInfo {
    pub path: String,
    /// Nombre de archivo sin extensión — mismo criterio que `TrackInfo::name`.
    pub name: String,
}

/// Lista los archivos de `dir` cuya extensión esté en `exts` (un solo nivel,
/// sin recursión), ordenados alfabéticamente. Carpeta inexistente/sin
/// permisos → lista vacía en vez de error.
fn list_files_by_ext(dir: &Path, exts: &[&str]) -> Vec<MediaFileInfo> {
    let rd = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    let mut out: Vec<MediaFileInfo> = rd
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if !p.is_file() {
                return None;
            }
            let matches = p
                .extension()
                .and_then(|x| x.to_str())
                .map(|x| exts.iter().any(|ext| x.eq_ignore_ascii_case(ext)))
                .unwrap_or(false);
            if !matches {
                return None;
            }
            let name = p.file_stem()?.to_str()?.to_string();
            Some(MediaFileInfo {
                path: p.to_string_lossy().to_string(),
                name,
            })
        })
        .collect();

    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    out
}

#[tauri::command]
pub fn list_image_files(path: String) -> Result<Vec<MediaFileInfo>, String> {
    Ok(list_files_by_ext(Path::new(&path), IMAGE_EXT))
}

#[tauri::command]
pub fn list_video_files(path: String) -> Result<Vec<MediaFileInfo>, String> {
    Ok(list_files_by_ext(Path::new(&path), VIDEO_EXT))
}

/// Concede al protocolo `asset` acceso a `path` (una carpeta de video que el
/// usuario agregó a su biblioteca) para que `convertFileSrc()` pueda
/// streamearla directo del disco — sin esto, el `<video>` del frontend
/// recibe un 403 del protocolo asset. No persiste entre reinicios de la app
/// por sí solo: se vuelve a conceder en cada sesión para cada álbum/raíz de
/// video conocido (ver `stores/videoLibrary.js::initVideoLibrary`).
#[tauri::command]
pub fn allow_video_folder(path: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    app.asset_protocol_scope()
        .allow_directory(&path, false)
        .map_err(|e| e.to_string())
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
        let result = scan_album(dir.path().to_string_lossy().to_string()).unwrap();
        let names: Vec<_> = result.tracks.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["Apple", "banana"]);
        assert!(result.discs.is_empty());
    }

    #[test]
    fn missing_folder_returns_empty_not_error() {
        let missing = std::env::temp_dir().join("gm_media_test_does_not_exist_xyz");
        let result = scan_album(missing.to_string_lossy().to_string()).unwrap();
        assert!(result.tracks.is_empty());
        assert!(result.discs.is_empty());
    }

    #[test]
    fn subfolders_become_discs_with_their_own_tracks() {
        let dir = TempDir::new("discs");
        fs::write(dir.path().join("Intro.mp3"), b"x").unwrap();
        fs::create_dir_all(dir.path().join("Disco 1")).unwrap();
        fs::write(dir.path().join("Disco 1").join("01 Track.mp3"), b"x").unwrap();
        fs::create_dir_all(dir.path().join("Disco 2")).unwrap();
        fs::write(dir.path().join("Disco 2").join("01 Other.mp3"), b"x").unwrap();

        let result = scan_album(dir.path().to_string_lossy().to_string()).unwrap();
        assert_eq!(result.tracks.len(), 1);
        assert_eq!(result.tracks[0].name, "Intro");
        assert_eq!(result.discs.len(), 2);
        assert_eq!(result.discs[0].name, "Disco 1");
        assert_eq!(result.discs[0].tracks[0].name, "01 Track");
        assert_eq!(result.discs[1].name, "Disco 2");
    }

    #[test]
    fn subfolders_without_audio_are_ignored() {
        let dir = TempDir::new("nocoveronly");
        fs::write(dir.path().join("Track.mp3"), b"x").unwrap();
        fs::create_dir_all(dir.path().join("Covers")).unwrap();
        fs::write(dir.path().join("Covers").join("front.png"), b"x").unwrap();

        let result = scan_album(dir.path().to_string_lossy().to_string()).unwrap();
        assert_eq!(result.tracks.len(), 1);
        assert!(result.discs.is_empty());
    }

    #[test]
    fn duplicate_formats_collapse_into_one_track_preferring_compressed() {
        let dir = TempDir::new("dupformats");
        fs::write(dir.path().join("Song.flac"), b"x").unwrap();
        fs::write(dir.path().join("Song.mp3"), b"x").unwrap();
        fs::write(dir.path().join("song.WAV"), b"x").unwrap();

        let result = scan_album(dir.path().to_string_lossy().to_string()).unwrap();
        assert_eq!(result.tracks.len(), 1);
        let t = &result.tracks[0];
        assert!(t.path.ends_with("Song.mp3"));
        assert_eq!(t.formats.len(), 3);
    }

    #[test]
    fn list_subfolders_lists_only_directories_sorted() {
        let dir = TempDir::new("roots");
        fs::create_dir_all(dir.path().join("Zelda OST")).unwrap();
        fs::create_dir_all(dir.path().join("Celeste OST")).unwrap();
        fs::write(dir.path().join("notes.txt"), b"x").unwrap();

        let result = list_subfolders(dir.path().to_string_lossy().to_string()).unwrap();
        let names: Vec<_> = result.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["Celeste OST", "Zelda OST"]);
    }

    #[test]
    fn list_image_files_filters_by_extension_and_sorts() {
        let dir = TempDir::new("images");
        for name in ["b.png", "A.JPG", "notes.txt", "c.webp"] {
            fs::write(dir.path().join(name), b"x").unwrap();
        }
        let result = list_image_files(dir.path().to_string_lossy().to_string()).unwrap();
        let names: Vec<_> = result.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["A", "b", "c"]);
    }

    #[test]
    fn list_video_files_only_mp4_webm_no_recursion() {
        let dir = TempDir::new("videos");
        fs::create_dir_all(dir.path().join("subfolder")).unwrap();
        fs::write(dir.path().join("subfolder").join("hidden.mp4"), b"x").unwrap();
        for name in ["clip.mp4", "other.webm", "raw.mkv"] {
            fs::write(dir.path().join(name), b"x").unwrap();
        }
        let result = list_video_files(dir.path().to_string_lossy().to_string()).unwrap();
        let names: Vec<_> = result.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["clip", "other"]);
    }
}
