//! Controles de sistema reales de Windows.
//!
//! Se construye por fases, y cada una es independiente porque solo se puede
//! compilar y depurar en un PC Windows (no hay cross-compile en el repo):
//!
//! - **Fase 3**: audio nativo por Core Audio — volumen, silencio y dispositivo
//!   por defecto, de salida y de entrada.
//! - **Fase 4 (esta)**: Wi-Fi por `netsh` (escanear, conectar, olvidar) y el
//!   interruptor de radio por WinRT.
//! - Fases 5-7: Bluetooth por WinRT.
//!
//! Mientras Bluetooth no esté, se reporta como **ausente**
//! (`bluetooth_present: false`) y sus operaciones devuelven error. La UI
//! entonces muestra el aviso y no despliega la categoría. Es deliberado:
//! preferible eso a una lista vacía con botones que fallan al pulsarlos.
//!
//! # Locks
//!
//! Nunca uno global (ver `system/mod.rs`). El audio va por su hilo, el Wi-Fi
//! por un `RwLock` propio y las banderas de escaneo por `AtomicBool`, para que
//! un escaneo de varios segundos no bloquee subir el volumen.

mod audio;
mod policy_config;
mod proc;
mod radios;
mod wifi;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, RwLock};
use std::time::{Duration, Instant};

use super::{AudioChannel, BtDevice, Channel, SystemControls, SystemState, WifiNet};

/// Lo que se sabe del Wi-Fi ahora mismo. Se rellena desde `refresh_fast`
/// (barato: estado del enlace) y desde `wifi_scan` (caro: la lista de redes).
/// Cada cuánto puede el poll releer el estado del Wi-Fi.
///
/// El QAM sondea cada 2 s, pero leerlo cuesta dos procesos `netsh` más una
/// llamada WinRT (~300 ms de un hilo del pool). Lo que ese poll tiene que
/// detectar —cable enchufado, radio apagada desde Windows, red cambiada— no
/// necesita esa resolución. Las acciones del usuario (conectar, olvidar,
/// encender la radio) refrescan sin esperar.
const WIFI_TTL: Duration = Duration::from_secs(6);

#[derive(Default)]
struct WifiCache {
    present: bool,
    enabled: bool,
    current: Option<String>,
    networks: Vec<WifiNet>,
    ethernet: Option<String>,
}

pub struct WindowsSystemControls {
    audio: audio::AudioEngine,
    /// Último snapshot de audio. `state()` lo clona y suelta el lock: es lo que
    /// permite que el poll de 2 s del QAM sea gratis.
    cached: RwLock<audio::Snapshot>,
    wifi: RwLock<WifiCache>,
    wifi_scanning: AtomicBool,
    /// Cuándo se leyó el estado del Wi-Fi por última vez (para el TTL).
    wifi_read_at: Mutex<Option<Instant>>,
}

impl WindowsSystemControls {
    pub fn new() -> Result<Self, String> {
        // El audio es el único que puede impedir arrancar: si Core Audio no
        // responde, mejor degradar al mock entero. Un Wi-Fi que falle se ve
        // como "sin adaptador", que es recuperable.
        let audio = audio::AudioEngine::start()?;
        let cached = RwLock::new(audio.snapshot());
        let ctl = WindowsSystemControls {
            audio,
            cached,
            wifi: RwLock::new(WifiCache::default()),
            wifi_scanning: AtomicBool::new(false),
            wifi_read_at: Mutex::new(None),
        };
        ctl.refresh_wifi_status();
        Ok(ctl)
    }

    /// Como `refresh_wifi_status`, pero no hace nada si se leyó hace poco.
    /// Es la que usa el poll.
    fn refresh_wifi_status_throttled(&self) {
        if let Ok(mut at) = self.wifi_read_at.lock() {
            if let Some(last) = *at {
                if last.elapsed() < WIFI_TTL {
                    return;
                }
            }
            *at = Some(Instant::now());
        }
        self.refresh_wifi_status();
    }

    /// Relee el estado del enlace (no la lista de redes: eso es el escaneo).
    /// Dos procesos `netsh` más una llamada WinRT: no va en bucles.
    fn refresh_wifi_status(&self) {
        if let Ok(mut at) = self.wifi_read_at.lock() {
            *at = Some(Instant::now());
        }
        let snap = wifi::status();
        // La radio la sabe WinRT con más precisión que netsh; si no contesta,
        // vale lo que diga netsh.
        let enabled = radios::state(radios::Kind::Wifi).unwrap_or(snap.enabled);
        if let Ok(mut w) = self.wifi.write() {
            w.present = snap.present;
            w.enabled = enabled;
            w.current = snap.current.clone();
            w.ethernet = snap.ethernet;
            // Mantener `active` al día sin volver a escanear.
            for n in w.networks.iter_mut() {
                n.active = snap.current.as_deref() == Some(n.ssid.as_str());
            }
            if !enabled {
                w.networks.clear();
            }
        }
    }

    /// Relee el audio entero y publica en la caché. Enumera dispositivos, así
    /// que NO va en el camino del slider (ver `set_volume`).
    fn republish(&self) {
        let snap = self.audio.snapshot();
        if let Ok(mut c) = self.cached.write() {
            *c = snap;
        }
    }

    /// Reetiqueta qué redes de la lista están guardadas, releyendo los
    /// perfiles. Es barato (no escanea) y hace falta tras conectar u olvidar:
    /// si no, la fila seguiría diciendo "Guardada" para una red que se acaba
    /// de olvidar.
    fn refresh_known_flags(&self) {
        let known = wifi::known_profiles();
        if let Ok(mut w) = self.wifi.write() {
            for n in w.networks.iter_mut() {
                n.known = known.iter().any(|k| k == &n.ssid);
            }
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
        let w = self.wifi.read();
        let (present, enabled, current, networks, ethernet) = match w {
            Ok(w) => (
                w.present,
                w.enabled,
                w.current.clone(),
                w.networks.clone(),
                w.ethernet.clone(),
            ),
            Err(_) => (false, false, None, Vec::new(), None),
        };
        SystemState {
            wifi_present: present,
            wifi_enabled: enabled,
            wifi_scanning: self.wifi_scanning.load(Ordering::Acquire),
            current_network: current,
            networks,
            ethernet_connected: ethernet.is_some(),
            ethernet_name: ethernet,
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

    fn set_wifi(&self, enabled: bool) -> Result<(), String> {
        radios::set_state(radios::Kind::Wifi, enabled)?;
        self.refresh_wifi_status();
        Ok(())
    }

    fn set_bluetooth(&self, _enabled: bool) -> Result<(), String> {
        Err("system.unsupported".to_string())
    }

    fn wifi_scan(&self) -> Result<(), String> {
        // `compare_exchange` contra la reentrada: dos escaneos a la vez dejan
        // el driver peleando consigo mismo y la bandera descuadrada.
        if self
            .wifi_scanning
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return Ok(()); // ya hay uno en curso
        }
        let result = wifi::scan();
        // La bandera se baja pase lo que pase: si se queda puesta, el botón
        // "Buscar redes" se queda girando para siempre.
        self.wifi_scanning.store(false, Ordering::Release);

        let nets = result?;
        if let Ok(mut w) = self.wifi.write() {
            w.networks = nets;
        }
        Ok(())
    }

    fn wifi_connect(&self, ssid: &str, password: Option<&str>) -> Result<(), String> {
        // Si la red no está en la última lista, se asume protegida (mismo
        // criterio conservador que el parseo).
        let secured = self
            .wifi
            .read()
            .ok()
            .and_then(|w| w.networks.iter().find(|n| n.ssid == ssid).map(|n| n.secured))
            .unwrap_or(true);

        let r = wifi::connect(ssid, password, secured);
        self.refresh_wifi_status();
        // Conectar cambia qué red está activa y cuáles quedan guardadas.
        self.refresh_known_flags();
        r
    }

    fn wifi_forget(&self, ssid: &str) -> Result<(), String> {
        let r = wifi::forget(ssid);
        self.refresh_wifi_status();
        self.refresh_known_flags();
        r
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
        self.refresh_wifi_status_throttled();
    }
}
