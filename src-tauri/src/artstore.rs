//! Almacén propio de imágenes personalizadas por juego (Fase 2 de
//! feature-imagenes.md). Antes, `stores/artoverrides.js` guardaba en
//! `config.json` la ruta absoluta al archivo ORIGINAL que el usuario elegía,
//! sin copiar nada — si esa imagen se borraba o se movía, el override seguía
//! "activo" apuntando a la nada (`read_image` fallaba, la UI caía al
//! degradado, y no había forma de notarlo salvo "Quitar" a mano). Ahora la
//! app se queda con su propia copia en `<app_config_dir>/art/`, y es esa
//! copia la que se persiste — borrar el original deja de tener efecto.
//!
//! Mismo directorio base que `config.json` (`config.rs`) y
//! `steam_cache.sqlite` (`steam_api/cache.rs`).
//!
//! Los comandos son envoltorios finos sobre funciones puras
//! (`import_into`/`remove_slot`/`prune`/`import_url_into`) parametrizadas por
//! `&Path` en vez de `&AppHandle` — así se pueden probar con una carpeta
//! temporal real sin necesitar una instancia de Tauri (ver el módulo `tests`
//! al final).
//!
//! `art_import_url` (Fase 3, `griddb::griddb_images` → este mismo camino) es
//! el ÚNICO comando de este módulo que sale a la red — por eso es **no-async**
//! a propósito, igual que los comandos de `griddb/`: un `async fn` con una
//! llamada bloqueante de `ureq` adentro estancaría el runtime de Tauri por
//! toda la duración de la descarga. `art_import`/`art_remove`/`art_prune`
//! solo hacen IO local (rápido), por eso esos sí siguen siendo async, mismo
//! criterio que `assets::read_image`.

use std::collections::HashSet;
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const MAX_IMPORT_BYTES: u64 = 32 * 1024 * 1024; // 32 MB — cota generosa contra un arrastre accidental.
const SLOTS: &[&str] = &["cover", "wide", "hero", "logo"];

fn art_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("config.dir_resolve_failed|{e}"))?
        .join("art");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Escapa un `game_id` (`steam:570`, `gog:1234`, o un `app:<ruta completa al
/// .lnk>` con espacios/acentos/`:` de unidad de disco) a un nombre de carpeta
/// válido en Windows, de forma que dos ids distintos NUNCA puedan colapsar en
/// el mismo nombre. Solo pasan sin tocar los bytes ASCII alfanuméricos, `.` y
/// `-`; todo lo demás —**incluido `_`**, que si pasara sin escapar
/// colisionaría con su propio prefijo de escape— se reemplaza por `_XX` (2
/// hex mayúsculas). Un `replace(":", "_")` ingenuo dejaría que `a:b` y `a_b`
/// compartan carpeta (y por lo tanto arte); esto no, porque `_` jamás aparece
/// suelto en la salida, solo como inicio de una secuencia de escape de 3
/// caracteres.
///
/// Los ids de `app:` (accesos del Menú Inicio) son la ruta de fichero
/// completa — con muchos espacios y separadores, el resultado escapado puede
/// alargarse bastante. Se acota a `MAX_LEN` con un hash corto del id
/// COMPLETO (no del texto ya truncado) para no acercarse al límite de ruta de
/// Windows, sin perder unicidad práctica.
fn safe_id(id: &str) -> String {
    let mut out = String::with_capacity(id.len());
    for b in id.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'.' | b'-' => out.push(b as char),
            _ => out.push_str(&format!("_{b:02X}")),
        }
    }
    const MAX_LEN: usize = 100;
    if out.len() <= MAX_LEN {
        return out;
    }
    // `out` es 100% ASCII (cada carácter viene del set alfanumérico o de un
    // escape "_XX" también ASCII), así que cortar por índice de byte nunca
    // parte un carácter multibyte a la mitad.
    let truncated = &out[..MAX_LEN - 9];
    format!("{truncated}_{:08x}", fnv1a(id.as_bytes()))
}

// FNV-1a de 32 bits — determinista, sin dependencias nuevas; solo hace falta
// para desambiguar el sufijo de un id truncado, no seguridad criptográfica.
fn fnv1a(bytes: &[u8]) -> u32 {
    let mut hash: u32 = 0x811c9dc5;
    for &b in bytes {
        hash ^= b as u32;
        hash = hash.wrapping_mul(0x01000193);
    }
    hash
}

fn game_root(root: &Path, game_id: &str) -> PathBuf {
    root.join(safe_id(game_id))
}

/// Borra las copias existentes de un slot (`{kind}-*`) dentro de la carpeta
/// del juego, si la hay. No es un error que no exista ninguna todavía.
fn remove_slot_files(dir: &Path, kind: &str) -> Result<(), String> {
    if !dir.is_dir() {
        return Ok(());
    }
    let prefix = format!("{kind}-");
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
        let name = entry.file_name();
        if name.to_string_lossy().starts_with(&prefix) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
    Ok(())
}

/// Copia `source` al almacén (bajo `root`) como el slot `kind` de `game_id` y
/// devuelve la ruta absoluta de la copia. Reemplaza cualquier copia anterior
/// de ese mismo slot (nunca deja dos a la vez). El nombre lleva el timestamp
/// de la importación, no solo el slot — así cada import produce una ruta
/// NUEVA y el repintado es inmediato sin depender del bust de la Fase 1
/// (reescribir el mismo nombre dejaría la entrada vieja viva en el `Map` de
/// `util/asset.js`).
fn import_into(root: &Path, game_id: &str, kind: &str, source: &str) -> Result<String, String> {
    if !SLOTS.contains(&kind) {
        return Err(format!("art.invalid_kind|{kind}"));
    }
    let src = Path::new(source);
    // Distinguir "el archivo ya no existe" de cualquier otro error es lo que
    // permite al barrido de arranque (stores/artoverrides.js::initArtOverrides)
    // decidir si adoptar la ruta o directamente descartar el override — sin
    // este código específico, tendría que adivinar a partir del texto de un
    // io::Error genérico.
    if !src.is_file() {
        return Err("art.source_missing".to_string());
    }
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if crate::assets::image_mime(&ext).is_none() {
        return Err(format!("art.unsupported_ext|{ext}"));
    }
    let size = std::fs::metadata(src).map_err(|e| e.to_string())?.len();
    if size > MAX_IMPORT_BYTES {
        return Err("art.too_large".to_string());
    }

    let dir = game_root(root, game_id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    // Si `source` YA vive en la carpeta de este juego —un import anterior, o
    // el barrido de arranque (stores/artoverrides.js::initArtOverrides)
    // reimportando algo que ya es nuestro tras reiniciar la app— no hay nada
    // que copiar. Sin este caso especial, `remove_slot_files` de abajo
    // borraría el propio archivo que se está por leer como origen (source y
    // el archivo del slot serían el mismo), y el `fs::copy` de después
    // fallaría con "no such file".
    if src.parent() == Some(dir.as_path()) {
        return Ok(source.to_string());
    }
    remove_slot_files(&dir, kind)?;

    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let dest = dir.join(format!("{kind}-{ts}.{ext}"));
    std::fs::copy(src, &dest).map_err(|e| format!("art.import_failed|{e}"))?;
    Ok(dest.to_string_lossy().into_owned())
}

/// Borra las copias de un slot de un juego. Si la carpeta del juego queda
/// vacía después, se borra también.
fn remove_slot(root: &Path, game_id: &str, kind: &str) -> Result<(), String> {
    let dir = game_root(root, game_id);
    remove_slot_files(&dir, kind)?;
    if dir.is_dir() && std::fs::read_dir(&dir).map(|mut r| r.next().is_none()).unwrap_or(false) {
        let _ = std::fs::remove_dir(&dir);
    }
    Ok(())
}

/// Borra las carpetas de juego cuyo id (ya escapado) no aparece en `keep` —
/// se le pasan las claves de `artOverrides`, NO la lista de juegos
/// instalados: desinstalar un juego temporalmente no debe llevarse por
/// delante el arte que el usuario eligió a mano. Devuelve cuántas carpetas se
/// borraron.
fn prune(root: &Path, keep: &[String]) -> Result<u32, String> {
    let keep_safe: HashSet<String> = keep.iter().map(|id| safe_id(id)).collect();
    let mut removed = 0u32;
    for entry in std::fs::read_dir(root).map_err(|e| e.to_string())?.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if !keep_safe.contains(&name) && std::fs::remove_dir_all(entry.path()).is_ok() {
            removed += 1;
        }
    }
    Ok(removed)
}

/// Igual que `import_into`, pero DESCARGA `url` en vez de copiar un fichero
/// local — usado por `griddb::griddb_images` cuando el usuario elige una
/// imagen del modal de SteamGridDB (Fase 3). Comparte validación de
/// extensión, nombrado (`{kind}-{ts}.{ext}`) y reemplazo del slot anterior
/// con `import_into`, así el resultado es indistinguible de un import manual.
fn import_url_into(root: &Path, game_id: &str, kind: &str, url: &str) -> Result<String, String> {
    if !SLOTS.contains(&kind) {
        return Err(format!("art.invalid_kind|{kind}"));
    }
    let ext = ext_from_url(url);
    if crate::assets::image_mime(&ext).is_none() {
        return Err(format!("art.unsupported_ext|{ext}"));
    }

    let bytes = download(url)?;

    let dir = game_root(root, game_id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    remove_slot_files(&dir, kind)?;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let dest = dir.join(format!("{kind}-{ts}.{ext}"));
    std::fs::write(&dest, &bytes).map_err(|e| format!("art.import_failed|{e}"))?;
    Ok(dest.to_string_lossy().into_owned())
}

// La extensión sale de la URL sin query/fragmento (`abc.png?ver=2` →
// "abc.png") — las URLs del CDN de SteamGridDB no suelen llevar ninguno, pero
// cortarlos es gratis y evita que "png?ver=2" cuele como extensión.
fn ext_from_url(url: &str) -> String {
    let path_only = url.split(['?', '#']).next().unwrap_or(url);
    Path::new(path_only)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
}

/// Descarga con un límite duro de `MAX_IMPORT_BYTES` — corta la lectura ni
/// bien se pasa (`Read::take`), no espera a que termine toda la descarga para
/// recién ahí rechazarla.
fn download(url: &str) -> Result<Vec<u8>, String> {
    let resp = ureq::get(url).call().map_err(|e| format!("art.download_failed|{e}"))?;
    let mut bytes = Vec::new();
    resp.into_reader()
        .take(MAX_IMPORT_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| format!("art.download_failed|{e}"))?;
    if bytes.len() as u64 > MAX_IMPORT_BYTES {
        return Err("art.too_large".to_string());
    }
    Ok(bytes)
}

#[tauri::command]
pub async fn art_import(app: AppHandle, game_id: String, kind: String, source: String) -> Result<String, String> {
    let root = art_dir(&app)?;
    import_into(&root, &game_id, &kind, &source)
}

#[tauri::command]
pub async fn art_remove(app: AppHandle, game_id: String, kind: String) -> Result<(), String> {
    let root = art_dir(&app)?;
    remove_slot(&root, &game_id, &kind)
}

#[tauri::command]
pub async fn art_prune(app: AppHandle, keep: Vec<String>) -> Result<u32, String> {
    let root = art_dir(&app)?;
    prune(&root, &keep)
}

// NO-async: descarga por red con ureq bloqueante — ver la nota del `//!` de
// cabecera sobre por qué este comando en particular no lleva `async`.
#[tauri::command]
pub fn art_import_url(app: AppHandle, game_id: String, kind: String, url: String) -> Result<String, String> {
    let root = art_dir(&app)?;
    import_url_into(&root, &game_id, &kind, &url)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    // Mismo criterio que media.rs: sin crate `tempfile` para algo chico.
    struct TempDir(PathBuf);
    impl TempDir {
        fn new(name: &str) -> Self {
            let dir = std::env::temp_dir().join(format!(
                "gm_artstore_test_{name}_{}_{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            let _ = fs::remove_dir_all(&dir);
            fs::create_dir_all(&dir).unwrap();
            TempDir(dir)
        }
        fn path(&self) -> &Path {
            &self.0
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn safe_id_never_collides_colon_vs_underscore() {
        // El caso que un `replace(":", "_")` ingenuo rompería.
        assert_ne!(safe_id("a:b"), safe_id("a_b"));
    }

    #[test]
    fn safe_id_is_deterministic_and_ascii() {
        let a = safe_id("steam:570");
        let b = safe_id("steam:570");
        assert_eq!(a, b);
        assert!(a.is_ascii());
    }

    #[test]
    fn safe_id_truncates_long_app_paths_without_panicking() {
        let long = format!(
            "app:C:/ProgramData/Microsoft/Windows/Start Menu/Programs/{}/Juego con ñ y espacios.lnk",
            "Carpeta muy larga ".repeat(10)
        );
        let out = safe_id(&long);
        assert!(out.len() <= 100);
        // Dos ids largos que solo difieren al final no deben colapsar en el
        // mismo nombre truncado — el hash del id completo los desambigua.
        let out2 = safe_id(&format!("{long}x"));
        assert_ne!(out, out2);
    }

    fn write_image(dir: &Path, name: &str) -> String {
        let p = dir.join(name);
        fs::write(&p, b"fake-image-bytes").unwrap();
        p.to_string_lossy().into_owned()
    }

    #[test]
    fn import_copies_and_replaces_previous_slot() {
        let src_dir = TempDir::new("src_replace");
        let root = TempDir::new("root_replace");
        let a = write_image(src_dir.path(), "a.png");

        let stored1 = import_into(root.path(), "steam:1", "cover", &a).unwrap();
        assert!(Path::new(&stored1).is_file());

        // Segunda importación al mismo slot: la primera copia debe desaparecer.
        let b = write_image(src_dir.path(), "b.jpg");
        let stored2 = import_into(root.path(), "steam:1", "cover", &b).unwrap();
        assert_ne!(stored1, stored2);
        assert!(!Path::new(&stored1).is_file(), "la copia anterior debía borrarse");
        assert!(Path::new(&stored2).is_file());

        // Solo debe quedar UN archivo con prefijo "cover-" en la carpeta.
        let dir = game_root(root.path(), "steam:1");
        let count = fs::read_dir(&dir)
            .unwrap()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().starts_with("cover-"))
            .count();
        assert_eq!(count, 1);
    }

    #[test]
    fn import_is_idempotent_when_source_already_owned() {
        // Regresión del bug real encontrado al escribir esto: sin el caso
        // especial de "source ya está en la carpeta del juego",
        // remove_slot_files() borraba el propio archivo antes de copiarlo,
        // y el fs::copy() de después fallaba con "no such file".
        let src_dir = TempDir::new("src_idem");
        let root = TempDir::new("root_idem");
        let a = write_image(src_dir.path(), "a.png");

        let stored = import_into(root.path(), "steam:2", "hero", &a).unwrap();
        let stored_again = import_into(root.path(), "steam:2", "hero", &stored).unwrap();
        assert_eq!(stored, stored_again, "reimportar la propia copia no debe cambiar la ruta");
        assert!(Path::new(&stored).is_file(), "el archivo debe seguir existiendo");
    }

    #[test]
    fn import_rejects_missing_source() {
        let root = TempDir::new("root_missing");
        let err = import_into(root.path(), "steam:3", "cover", "/no/existe/nunca.png").unwrap_err();
        assert_eq!(err, "art.source_missing");
    }

    #[test]
    fn import_rejects_unsupported_extension() {
        let src_dir = TempDir::new("src_ext");
        let root = TempDir::new("root_ext");
        let txt = write_image(src_dir.path(), "notes.txt");
        let err = import_into(root.path(), "steam:4", "cover", &txt).unwrap_err();
        assert_eq!(err, "art.unsupported_ext|txt");
    }

    #[test]
    fn import_rejects_invalid_kind() {
        let src_dir = TempDir::new("src_kind");
        let root = TempDir::new("root_kind");
        let a = write_image(src_dir.path(), "a.png");
        let err = import_into(root.path(), "steam:5", "background", &a).unwrap_err();
        assert_eq!(err, "art.invalid_kind|background");
    }

    #[test]
    fn import_rejects_oversized_file() {
        let src_dir = TempDir::new("src_big");
        let root = TempDir::new("root_big");
        let p = src_dir.path().join("huge.png");
        // Archivo disperso (sparse): no ocupa 33 MB reales en disco, solo
        // declara ese tamaño — suficiente para probar el chequeo de tamaño.
        let f = fs::File::create(&p).unwrap();
        f.set_len(33 * 1024 * 1024).unwrap();
        let err = import_into(root.path(), "steam:6", "cover", &p.to_string_lossy()).unwrap_err();
        assert_eq!(err, "art.too_large");
    }

    #[test]
    fn remove_slot_deletes_files_and_empty_dir() {
        let src_dir = TempDir::new("src_remove");
        let root = TempDir::new("root_remove");
        let a = write_image(src_dir.path(), "a.png");
        import_into(root.path(), "steam:7", "cover", &a).unwrap();

        let dir = game_root(root.path(), "steam:7");
        assert!(dir.is_dir());
        remove_slot(root.path(), "steam:7", "cover").unwrap();
        assert!(!dir.exists(), "sin más slots, la carpeta del juego debía borrarse");
    }

    #[test]
    fn remove_slot_keeps_dir_if_other_slot_remains() {
        let src_dir = TempDir::new("src_remove2");
        let root = TempDir::new("root_remove2");
        let a = write_image(src_dir.path(), "a.png");
        let b = write_image(src_dir.path(), "b.png");
        import_into(root.path(), "steam:8", "cover", &a).unwrap();
        import_into(root.path(), "steam:8", "hero", &b).unwrap();

        remove_slot(root.path(), "steam:8", "cover").unwrap();
        let dir = game_root(root.path(), "steam:8");
        assert!(dir.is_dir(), "todavía queda el slot hero, la carpeta no debía borrarse");
    }

    #[test]
    fn prune_removes_only_folders_not_in_keep() {
        let src_dir = TempDir::new("src_prune");
        let root = TempDir::new("root_prune");
        let a = write_image(src_dir.path(), "a.png");
        let b = write_image(src_dir.path(), "b.png");
        import_into(root.path(), "steam:9", "cover", &a).unwrap();
        import_into(root.path(), "steam:10", "cover", &b).unwrap();

        let removed = prune(root.path(), &["steam:9".to_string()]).unwrap();
        assert_eq!(removed, 1);
        assert!(game_root(root.path(), "steam:9").is_dir());
        assert!(!game_root(root.path(), "steam:10").exists());
    }

    #[test]
    fn ext_from_url_strips_query_and_fragment() {
        assert_eq!(ext_from_url("https://cdn2.steamgriddb.com/grid/abc123.png"), "png");
        assert_eq!(ext_from_url("https://cdn2.steamgriddb.com/grid/abc123.png?ver=2"), "png");
        assert_eq!(ext_from_url("https://cdn2.steamgriddb.com/grid/abc123.JPG#x"), "jpg");
        assert_eq!(ext_from_url("https://cdn2.steamgriddb.com/grid/no-extension"), "");
    }
}
