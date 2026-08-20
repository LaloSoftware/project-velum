//! Controles de sistema reales de Windows.
//!
//! Se construye por fases, y cada una es independiente porque solo se puede
//! compilar y depurar en un PC Windows (no hay cross-compile en el repo):
//!
//! - **Fase 3 (esta)**: audio nativo por Core Audio — volumen, silencio y
//!   dispositivo por defecto, de salida y de entrada.
//! - Fase 4: Wi-Fi por `netsh`.
//! - Fases 5-7: Bluetooth por WinRT.
//!
//! Mientras Wi-Fi y Bluetooth no estén, se reportan como **ausentes**
//! (`wifi_present: false`) y sus operaciones devuelven `system.unsupported`. La
//! UI entonces muestra el aviso y no despliega la categoría. Es deliberado:
//! preferible eso a una lista vacía con botones que fallan al pulsarlos.

mod audio;
mod policy_config;

use std::sync::RwLock;

use super::{AudioChannel, BtDevice, Channel, SystemControls, SystemState, WifiNet};

pub struct WindowsSystemControls {
    audio: audio::AudioEngine,
    /// Último snapshot de audio. `state()` lo clona y suelta el lock: es lo que
    /// permite que el poll de 2 s del QAM sea gratis.
    cached: RwLock<audio::Snapshot>,
}

impl WindowsSystemControls {
    pub fn new() -> Result<Self, String> {
        let audio = audio::AudioEngine::start()?;
        let cached = RwLock::new(audio.snapshot());
        Ok(WindowsSystemControls { audio, cached })
    }

    /// Relee el audio entero y publica en la caché. Enumera dispositivos, así
    /// que NO va en el camino del slider (ver `set_volume`).
    fn republish(&self) {
        let snap = self.audio.snapshot();
        if let Ok(mut c) = self.cached.write() {
            *c = snap;
        }
    }

    /// Retoca un campo del canal en la caché sin hablar con Windows.
    fn patch_cache(&self, ch: Channel, f: impl FnOnce(&mut audio::ChannelState)) {
        if let Ok(mut c) = self.cached.write() {
            f(match ch {
                Channel::Output => &mut c.output,
                Channel::Input => &mut c.input,
            });
        }
    }
}

impl SystemControls for WindowsSystemControls {
    fn state(&self) -> SystemState {
        let snap = self
            .cached
            .read()
            .map(|c| c.clone())
            .unwrap_or_default();
        SystemState {
            // --- pendiente de la fase 4 ---
            wifi_present: false,
            wifi_enabled: false,
            wifi_scanning: false,
            current_network: None,
            networks: Vec::<WifiNet>::new(),
            ethernet_connected: false,
            ethernet_name: None,
            // --- pendiente de las fases 5-7 ---
            bluetooth_present: false,
            bluetooth_enabled: false,
            bt_scanning: false,
            bt_devices: Vec::<BtDevice>::new(),
            // --- fase 3: real ---
            output: AudioChannel::from(snap.output),
            input: AudioChannel::from(snap.input),
        }
    }

    // Volumen y silencio NO republican a propósito: `republish()` enumera todos
    // los dispositivos, y mover el slider dispara una ráfaga de llamadas. El
    // frontend ya pinta el cambio de forma optimista y el poll de 2 s trae la
    // verdad; en cambio, actualizamos el número cacheado, que es gratis y evita
    // que ese poll "tire" del slider hacia atrás.
    fn set_volume(&self, ch: Channel, v: u8) -> Result<(), String> {
        self.audio.set_volume(ch, v)?;
        self.patch_cache(ch, |c| c.volume = v.min(100));
        Ok(())
    }

    fn set_muted(&self, ch: Channel, muted: bool) -> Result<(), String> {
        self.audio.set_muted(ch, muted)?;
        self.patch_cache(ch, |c| c.muted = muted);
        Ok(())
    }

    /// Sí republica: cambiar el dispositivo por defecto altera el snapshot
    /// entero (cuál está activo, y el volumen pasa a ser el del nuevo).
    fn set_device(&self, ch: Channel, id: &str) -> Result<(), String> {
        let r = self.audio.set_device(ch, id);
        self.republish();
        r
    }

    fn set_wifi(&self, _enabled: bool) -> Result<(), String> {
        Err("system.unsupported".to_string())
    }

    fn set_bluetooth(&self, _enabled: bool) -> Result<(), String> {
        Err("system.unsupported".to_string())
    }

    fn wifi_scan(&self) -> Result<(), String> {
        Err("system.wifi.unavailable".to_string())
    }

    fn wifi_connect(&self, _ssid: &str, _password: Option<&str>) -> Result<(), String> {
        Err("system.wifi.unavailable".to_string())
    }

    fn wifi_forget(&self, _ssid: &str) -> Result<(), String> {
        Err("system.wifi.unavailable".to_string())
    }

    fn bt_scan(&self, _seconds: u8) -> Result<(), String> {
        Err("system.bt.unavailable".to_string())
    }

    fn bt_pair(&self, _id: &str) -> Result<(), String> {
        Err("system.bt.unavailable".to_string())
    }

    fn bt_unpair(&self, _id: &str) -> Result<(), String> {
        Err("system.bt.unavailable".to_string())
    }

    fn bt_set_connected(&self, _id: &str, _connected: bool) -> Result<(), String> {
        Err("system.bt.unavailable".to_string())
    }

    fn refresh_fast(&self) {
        self.republish();
    }
}
