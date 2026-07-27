//! Sirve imágenes locales (carátulas/hero/logo) a la WebView como `data:` URI.
//!
//! Es más fiable que el protocolo asset + scope (que en Windows dependía de que
//! el glob de rutas encajara y dejaba fuera el arte personalizado de Steam en
//! `userdata/.../grid`). Aquí el frontend pide la imagen por su ruta y recibe el
//! contenido embebido; el resultado se cachea en el frontend.

use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
pub async fn read_image(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "bmp" => "image/bmp",
        _ => return Err(format!("extensión de imagen no soportada: {ext}")),
    };
    let bytes = std::fs::read(p).map_err(|e| e.to_string())?;
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}
