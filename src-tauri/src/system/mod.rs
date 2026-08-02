//! Controles de sistema (Wi-Fi / Bluetooth / audio) para el menú QAM.
//!
//! Igual que la biblioteca, se abstrae tras un trait para poder tener una
//! implementación real en Windows y un mock para desarrollar en macOS.
//! En Windows se implementaría `WindowsSystemControls` con el crate `windows`
//! (Core Audio/WASAPI, WLAN API, radios Bluetooth). Ver docs/system-controls.md.

pub mod mock;

use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputDevice {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemState {
    pub wifi_enabled: bool,
    pub current_network: Option<String>,
    pub networks: Vec<String>,
    pub bluetooth_enabled: bool,
    pub bt_devices: Vec<String>,
    pub volume: u8,
    pub muted: bool,
    pub output_devices: Vec<OutputDevice>,
    pub current_output: String,
}

pub trait SystemControls: Send + Sync {
    fn state(&self) -> SystemState;
    fn set_volume(&mut self, v: u8);
    fn set_muted(&mut self, muted: bool);
    fn set_output(&mut self, id: String);
    fn set_wifi(&mut self, enabled: bool);
    fn set_bluetooth(&mut self, enabled: bool);
}

/// Estado gestionado por Tauri (`.manage(...)`).
pub struct SystemHandle(pub Mutex<Box<dyn SystemControls>>);

#[tauri::command]
pub fn system_get_state(state: State<SystemHandle>) -> SystemState {
    state.0.lock().unwrap().state()
}

#[tauri::command]
pub fn system_set_volume(volume: u8, state: State<SystemHandle>) {
    state.0.lock().unwrap().set_volume(volume);
}

#[tauri::command]
pub fn system_set_muted(muted: bool, state: State<SystemHandle>) {
    state.0.lock().unwrap().set_muted(muted);
}

#[tauri::command]
pub fn system_set_output_device(id: String, state: State<SystemHandle>) {
    state.0.lock().unwrap().set_output(id);
}

#[tauri::command]
pub fn system_set_wifi(enabled: bool, state: State<SystemHandle>) {
    state.0.lock().unwrap().set_wifi(enabled);
}

#[tauri::command]
pub fn system_set_bluetooth(enabled: bool, state: State<SystemHandle>) {
    state.0.lock().unwrap().set_bluetooth(enabled);
}

/// Apaga el PC (botón "Apagar" de Configuración, tras confirmar en el modal).
/// Acción disparar-y-olvidar sin estado — no pasa por `SystemControls`/`SystemHandle`,
/// mismo criterio que `shortcuts::run_shortcut` o `launch::focus_window_under`.
#[tauri::command]
pub fn system_shutdown() -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("shutdown")
            .args(["/s", "/t", "0"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    println!("[mock] system_shutdown");
    Ok(())
}
