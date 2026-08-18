//! Persistencia de configuración (perfiles/temas) como JSON en el directorio de
//! datos de la app. El frontend decide la forma del JSON; aquí solo se guarda/lee.

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("config.dir_resolve_failed|{e}"))?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<Option<serde_json::Value>, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(Some(value))
}

#[tauri::command]
pub fn save_config(app: AppHandle, data: serde_json::Value) -> Result<(), String> {
    let path = config_path(&app)?;
    let pretty = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, pretty).map_err(|e| e.to_string())?;
    Ok(())
}
