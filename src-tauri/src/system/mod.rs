//! Controles de sistema (Wi-Fi / Bluetooth / audio) para el menú QAM.
//!
//! Igual que la biblioteca, se abstrae tras un trait para tener una
//! implementación real en Windows (`system::windows`, Core Audio + netsh +
//! WinRT) y un mock para desarrollar en macOS. Ver docs/system-controls.md.
//!
//! Dos decisiones de forma que conviene no deshacer:
//!
//! 1. El trait toma `&self`, no `&mut self`, y el handle es `Arc<dyn …>` en vez
//!    de `Mutex<Box<dyn …>>`. Con un mutex global, un escaneo Wi-Fi de 5 s
//!    bloquearía subir el volumen. La mutabilidad va DENTRO de cada
//!    implementación, con locks finos.
//! 2. Las operaciones lentas (escanear, conectar, emparejar) devuelven `()`, no
//!    la lista resultante: el resultado se publica siempre por la caché interna
//!    + el evento `gm://system-state`. Una sola vía de verdad para el frontend.

pub mod mock;
/// Parseo de la salida de netsh. Multiplataforma a propósito: sus tests corren
/// en el Mac de desarrollo, y es la parte más frágil del Wi-Fi de Windows.
pub mod netsh_parse;
#[cfg(windows)]
pub mod windows;

use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

/// Dispositivo de audio (entrada o salida).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiNet {
    pub ssid: String,
    /// Protegida con clave. Ante la duda se asume `true` (el peor caso es pedir
    /// una clave de más, no fallar la conexión).
    pub secured: bool,
    /// Señal 0-100.
    pub signal: u8,
    /// Ya hay un perfil guardado: conectar no pide clave.
    pub known: bool,
    /// Es la red conectada ahora mismo.
    pub active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BtDevice {
    pub id: String,
    pub name: String,
    pub paired: bool,
    pub connected: bool,
    /// `false` cuando no hay una vía fiable de conectar/desconectar ese perfil
    /// (ver Fase 6 del plan): la UI oculta esos botones en vez de ofrecer algo
    /// que va a fallar.
    pub can_connect: bool,
    /// Categoría para el icono: "gamepad" | "audio" | "input" | "phone" | "other".
    pub kind: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioChannel {
    pub volume: u8,
    pub muted: bool,
    pub devices: Vec<Device>,
    pub current: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemState {
    /// Hay adaptador Wi-Fi. Si es `false` la UI muestra el aviso y no despliega.
    pub wifi_present: bool,
    pub wifi_enabled: bool,
    /// Viaja en el estado (y no solo en el frontend) para que cerrar y reabrir
    /// el QAM a mitad de escaneo reconstruya la UI correcta.
    pub wifi_scanning: bool,
    pub current_network: Option<String>,
    pub networks: Vec<WifiNet>,
    pub ethernet_connected: bool,
    pub ethernet_name: Option<String>,
    pub bluetooth_present: bool,
    pub bluetooth_enabled: bool,
    pub bt_scanning: bool,
    pub bt_devices: Vec<BtDevice>,
    pub output: AudioChannel,
    pub input: AudioChannel,
}

/// Canal de audio. Es un id del protocolo Rust↔JS: "output"/"input" no se
/// traducen ni se renombran (ver la regla de oro de docs/i18n.md).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Channel {
    Output,
    Input,
}

pub trait SystemControls: Send + Sync {
    /// Barato: lee de caché + lecturas baratas del hilo de audio. Lo llama el
    /// poll de 2 s del QAM, así que NO puede escanear ni hablar con la red.
    fn state(&self) -> SystemState;

    // --- rápidas (síncronas, se llaman desde el hilo del comando) ---
    fn set_volume(&self, ch: Channel, v: u8) -> Result<(), String>;
    fn set_muted(&self, ch: Channel, muted: bool) -> Result<(), String>;
    fn set_device(&self, ch: Channel, id: &str) -> Result<(), String>;
    fn set_wifi(&self, enabled: bool) -> Result<(), String>;
    fn set_bluetooth(&self, enabled: bool) -> Result<(), String>;

    // --- lentas: SIEMPRE desde spawn_blocking; publican en la caché interna ---
    fn wifi_scan(&self) -> Result<(), String>;
    fn wifi_connect(&self, ssid: &str, password: Option<&str>) -> Result<(), String>;
    fn wifi_forget(&self, ssid: &str) -> Result<(), String>;
    fn bt_scan(&self, seconds: u8) -> Result<(), String>;
    fn bt_pair(&self, id: &str) -> Result<(), String>;
    fn bt_unpair(&self, id: &str) -> Result<(), String>;
    fn bt_set_connected(&self, id: &str, connected: bool) -> Result<(), String>;

    /// Refresca lo barato (volumen/mute/dispositivos, estado del enlace) sin
    /// tocar nada lento. Lo invoca el poll antes de `state()`.
    fn refresh_fast(&self);
}

/// Estado gestionado por Tauri (`.manage(...)`).
///
/// `Arc`, no `Mutex`: los comandos rápidos y los lentos corren en paralelo.
pub struct SystemHandle(pub Arc<dyn SystemControls>);

/// Nombre del evento con el `SystemState` completo tras cada cambio.
/// Mismo patrón que `gm://update-progress` (update.rs).
const EVT_STATE: &str = "gm://system-state";

fn emit_state(app: &AppHandle, ctl: &Arc<dyn SystemControls>) {
    let _ = app.emit(EVT_STATE, ctl.state());
}

#[tauri::command]
pub fn system_get_state(state: State<SystemHandle>) -> SystemState {
    state.0.refresh_fast();
    state.0.state()
}

// ------------------------- rápidos (síncronos) -------------------------
//
// Devuelven `Result`: con backend real, un `set_wifi` que falla por permisos
// tiene que llegar al ErrorBanner, no quedarse en un "ON" mentiroso.

#[tauri::command]
pub fn system_set_volume(
    app: AppHandle,
    channel: Channel,
    volume: u8,
    state: State<SystemHandle>,
) -> Result<(), String> {
    state.0.set_volume(channel, volume)?;
    emit_state(&app, &state.0);
    Ok(())
}

#[tauri::command]
pub fn system_set_muted(
    app: AppHandle,
    channel: Channel,
    muted: bool,
    state: State<SystemHandle>,
) -> Result<(), String> {
    state.0.set_muted(channel, muted)?;
    emit_state(&app, &state.0);
    Ok(())
}

#[tauri::command]
pub fn system_set_device(
    app: AppHandle,
    channel: Channel,
    id: String,
    state: State<SystemHandle>,
) -> Result<(), String> {
    state.0.set_device(channel, &id)?;
    emit_state(&app, &state.0);
    Ok(())
}

#[tauri::command]
pub fn system_set_wifi(
    app: AppHandle,
    enabled: bool,
    state: State<SystemHandle>,
) -> Result<(), String> {
    state.0.set_wifi(enabled)?;
    emit_state(&app, &state.0);
    Ok(())
}

#[tauri::command]
pub fn system_set_bluetooth(
    app: AppHandle,
    enabled: bool,
    state: State<SystemHandle>,
) -> Result<(), String> {
    state.0.set_bluetooth(enabled)?;
    emit_state(&app, &state.0);
    Ok(())
}

// --------------------------- lentos (async) ---------------------------
//
// Patrón fijo: sacar el `Arc` del `State` ANTES del `await` (`State` no es
// `Send`), correr la operación en `spawn_blocking` y emitir el estado al
// terminar — también si falla, para que la UI no se quede con el "conectando…"
// puesto.

/// Corre `f` fuera del hilo del comando y emite el estado al terminar (haya
/// salido bien o mal).
async fn slow<F>(app: AppHandle, ctl: Arc<dyn SystemControls>, f: F) -> Result<(), String>
where
    F: FnOnce(&Arc<dyn SystemControls>) -> Result<(), String> + Send + 'static,
{
    let c = ctl.clone();
    let res = tauri::async_runtime::spawn_blocking(move || f(&c))
        .await
        .map_err(|e| format!("system.task_failed|{e}"))?;
    emit_state(&app, &ctl);
    res
}

#[tauri::command]
pub async fn system_wifi_scan(app: AppHandle, state: State<'_, SystemHandle>) -> Result<(), String> {
    let ctl = state.0.clone();
    slow(app, ctl, |c| c.wifi_scan()).await
}

#[tauri::command]
pub async fn system_wifi_connect(
    app: AppHandle,
    ssid: String,
    password: Option<String>,
    state: State<'_, SystemHandle>,
) -> Result<(), String> {
    let ctl = state.0.clone();
    slow(app, ctl, move |c| c.wifi_connect(&ssid, password.as_deref())).await
}

#[tauri::command]
pub async fn system_wifi_forget(
    app: AppHandle,
    ssid: String,
    state: State<'_, SystemHandle>,
) -> Result<(), String> {
    let ctl = state.0.clone();
    slow(app, ctl, move |c| c.wifi_forget(&ssid)).await
}

#[tauri::command]
pub async fn system_bt_scan(
    app: AppHandle,
    seconds: Option<u8>,
    state: State<'_, SystemHandle>,
) -> Result<(), String> {
    let ctl = state.0.clone();
    let secs = seconds.unwrap_or(6);
    slow(app, ctl, move |c| c.bt_scan(secs)).await
}

#[tauri::command]
pub async fn system_bt_pair(
    app: AppHandle,
    id: String,
    state: State<'_, SystemHandle>,
) -> Result<(), String> {
    let ctl = state.0.clone();
    slow(app, ctl, move |c| c.bt_pair(&id)).await
}

#[tauri::command]
pub async fn system_bt_unpair(
    app: AppHandle,
    id: String,
    state: State<'_, SystemHandle>,
) -> Result<(), String> {
    let ctl = state.0.clone();
    slow(app, ctl, move |c| c.bt_unpair(&id)).await
}

#[tauri::command]
pub async fn system_bt_set_connected(
    app: AppHandle,
    id: String,
    connected: bool,
    state: State<'_, SystemHandle>,
) -> Result<(), String> {
    let ctl = state.0.clone();
    slow(app, ctl, move |c| c.bt_set_connected(&id, connected)).await
}

/// Apaga el PC (botón "Apagar" de Configuración, tras confirmar en el modal).
/// Acción disparar-y-olvidar sin estado — no pasa por `SystemControls`/`SystemHandle`,
/// mismo criterio que `shortcuts::run_shortcut` o `launch::focus_window_under`.
#[tauri::command]
pub fn system_shutdown() -> Result<(), String> {
    #[cfg(windows)]
    {
        // Sin CREATE_NO_WINDOW parpadea una consola encima del juego/launcher.
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("shutdown")
            .args(["/s", "/t", "0"])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("system.shutdown_failed|{e}"))?;
    }
    #[cfg(not(windows))]
    println!("[mock] system_shutdown");
    Ok(())
}

/// Construye los controles reales si la plataforma los tiene; si no (o si el
/// motor real no arranca), degrada al mock. Mismo criterio best-effort que
/// `library::active_sources`.
pub fn build_system_controls() -> Arc<dyn SystemControls> {
    #[cfg(windows)]
    {
        match windows::WindowsSystemControls::new() {
            Ok(c) => return Arc::new(c),
            // Best-effort: si Core Audio no arranca (COM caído, sesión sin
            // audio), el QAM sigue abriendo con datos simulados en vez de
            // reventar el arranque de la app.
            Err(e) => eprintln!("[system] controles reales no disponibles ({e}); usando mock"),
        }
    }
    Arc::new(mock::MockSystemControls::new())
}
