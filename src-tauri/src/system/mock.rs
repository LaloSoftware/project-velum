//! Implementación simulada de `SystemControls` (para dev en macOS).
//!
//! No es un stub: imita la CONCURRENCIA y la LATENCIA del backend real, porque
//! son justo lo que hay que poder diseñar sin un PC Windows delante.
//!
//! - Locks finos (`RwLock` por área + `AtomicBool` para banderas), nunca uno
//!   global: subir el volumen mientras escanea el Wi-Fi tiene que funcionar.
//! - Latencias: escaneo Wi-Fi 1,5 s · conectar 2 s · escaneo BT 3 s ·
//!   emparejar 2,5 s. Sin ellas no se puede ver la UX de los estados
//!   intermedios (spinners, "Conectando…", cancelaciones).
//! - `wifi_connect` a una red protegida nueva falla con
//!   `system.wifi.wrong_password` si la clave no es `1234` — es el camino de
//!   error que la UI tiene que saber recuperar (volver a pedir la clave).
//!
//! Ninguna operación duerme con un lock tomado.

use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::RwLock;
use std::thread::sleep;
use std::time::Duration;

use super::{AudioChannel, BtDevice, Channel, Device, SystemControls, SystemState, WifiNet};

/// Clave "correcta" de las redes protegidas simuladas.
const MOCK_PASSWORD: &str = "1234";

/// Lo lento: redes y dispositivos BT, que en el backend real vienen de un
/// escaneo. Se publica entero de una vez.
struct Slow {
    current_network: Option<String>,
    networks: Vec<WifiNet>,
    /// Redes "en el aire" que todavía no se han descubierto: cada escaneo
    /// destapa una más, para que el botón "Buscar redes" haga algo visible.
    hidden: Vec<WifiNet>,
    bt_devices: Vec<BtDevice>,
    /// Ídem para Bluetooth: el escaneo mueve estos a la lista visible.
    bt_undiscovered: Vec<BtDevice>,
}

struct Audio {
    output: AudioChannel,
    input: AudioChannel,
}

pub struct MockSystemControls {
    slow: RwLock<Slow>,
    audio: RwLock<Audio>,
    wifi_enabled: AtomicBool,
    bt_enabled: AtomicBool,
    wifi_scanning: AtomicBool,
    bt_scanning: AtomicBool,
    /// Cuenta de escaneos, solo para variar la señal simulada y que la lista
    /// no parezca congelada.
    scans: AtomicU8,
}

fn net(ssid: &str, secured: bool, signal: u8, known: bool, active: bool) -> WifiNet {
    WifiNet {
        ssid: ssid.to_string(),
        secured,
        signal,
        known,
        active,
    }
}

fn bt(id: &str, name: &str, paired: bool, connected: bool, kind: &str) -> BtDevice {
    BtDevice {
        id: id.to_string(),
        name: name.to_string(),
        paired,
        connected,
        can_connect: kind != "other",
        kind: kind.to_string(),
    }
}

impl MockSystemControls {
    pub fn new() -> Self {
        MockSystemControls {
            slow: RwLock::new(Slow {
                current_network: Some("SalaWiFi_5G".to_string()),
                networks: vec![
                    net("SalaWiFi_5G", true, 92, true, true),
                    net("SalaWiFi_2G", true, 74, true, false),
                    net("Vecino_303", true, 41, false, false),
                    net("Cafe_Invitados", false, 33, false, false),
                ],
                hidden: vec![
                    net("AndroidAP", true, 58, false, false),
                    net("TP-LINK_9F2C", true, 22, false, false),
                ],
                bt_devices: vec![
                    bt("bt:xbox", "Mando Xbox", true, true, "gamepad"),
                    bt("bt:dualsense", "DualSense", true, false, "gamepad"),
                    bt("bt:soundcore", "Auriculares BT", true, false, "audio"),
                ],
                bt_undiscovered: vec![
                    bt("bt:teclado", "Teclado K380", false, false, "input"),
                    bt("bt:pixel", "Pixel 8", false, false, "phone"),
                ],
            }),
            audio: RwLock::new(Audio {
                output: AudioChannel {
                    volume: 45,
                    muted: false,
                    devices: vec![
                        Device { id: "tv".into(), name: "TV (HDMI)".into() },
                        Device { id: "speakers".into(), name: "Altavoces 5.1".into() },
                        Device { id: "headset".into(), name: "Auriculares USB".into() },
                    ],
                    current: "tv".to_string(),
                },
                input: AudioChannel {
                    volume: 70,
                    muted: false,
                    devices: vec![
                        Device { id: "mic-usb".into(), name: "Micrófono USB".into() },
                        Device { id: "mic-headset".into(), name: "Micrófono de auriculares".into() },
                        Device { id: "mic-cam".into(), name: "Webcam".into() },
                    ],
                    current: "mic-usb".to_string(),
                },
            }),
            wifi_enabled: AtomicBool::new(true),
            bt_enabled: AtomicBool::new(false),
            wifi_scanning: AtomicBool::new(false),
            bt_scanning: AtomicBool::new(false),
            scans: AtomicU8::new(0),
        }
    }

    fn channel_mut<'a>(audio: &'a mut Audio, ch: Channel) -> &'a mut AudioChannel {
        match ch {
            Channel::Output => &mut audio.output,
            Channel::Input => &mut audio.input,
        }
    }

    /// Toma la bandera de escaneo; `false` si ya había uno en curso (reentrada).
    fn begin_scan(flag: &AtomicBool) -> bool {
        flag.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    }
}

impl SystemControls for MockSystemControls {
    fn state(&self) -> SystemState {
        let slow = self.slow.read().unwrap();
        let audio = self.audio.read().unwrap();
        let wifi_enabled = self.wifi_enabled.load(Ordering::Acquire);
        SystemState {
            wifi_present: true,
            wifi_enabled,
            wifi_scanning: self.wifi_scanning.load(Ordering::Acquire),
            current_network: if wifi_enabled { slow.current_network.clone() } else { None },
            networks: if wifi_enabled { slow.networks.clone() } else { Vec::new() },
            ethernet_connected: false,
            ethernet_name: None,
            bluetooth_present: true,
            bluetooth_enabled: self.bt_enabled.load(Ordering::Acquire),
            bt_scanning: self.bt_scanning.load(Ordering::Acquire),
            bt_devices: slow.bt_devices.clone(),
            output: audio.output.clone(),
            input: audio.input.clone(),
        }
    }

    fn set_volume(&self, ch: Channel, v: u8) -> Result<(), String> {
        let mut audio = self.audio.write().unwrap();
        Self::channel_mut(&mut audio, ch).volume = v.min(100);
        Ok(())
    }

    fn set_muted(&self, ch: Channel, muted: bool) -> Result<(), String> {
        let mut audio = self.audio.write().unwrap();
        Self::channel_mut(&mut audio, ch).muted = muted;
        Ok(())
    }

    fn set_device(&self, ch: Channel, id: &str) -> Result<(), String> {
        let mut audio = self.audio.write().unwrap();
        let c = Self::channel_mut(&mut audio, ch);
        if !c.devices.iter().any(|d| d.id == id) {
            return Err("system.audio.device_not_found".to_string());
        }
        c.current = id.to_string();
        Ok(())
    }

    fn set_wifi(&self, enabled: bool) -> Result<(), String> {
        self.wifi_enabled.store(enabled, Ordering::Release);
        Ok(())
    }

    fn set_bluetooth(&self, enabled: bool) -> Result<(), String> {
        self.bt_enabled.store(enabled, Ordering::Release);
        if !enabled {
            let mut slow = self.slow.write().unwrap();
            // Apagar la radio desconecta todo y descarta lo no emparejado,
            // como hace Windows.
            for d in slow.bt_devices.iter_mut() {
                d.connected = false;
            }
            slow.bt_devices.retain(|d| d.paired);
        }
        Ok(())
    }

    fn wifi_scan(&self) -> Result<(), String> {
        if !self.wifi_enabled.load(Ordering::Acquire) {
            return Err("system.wifi.unavailable".to_string());
        }
        if !Self::begin_scan(&self.wifi_scanning) {
            return Ok(()); // ya hay uno en curso
        }
        sleep(Duration::from_millis(1500));
        {
            let mut slow = self.slow.write().unwrap();
            if let Some(found) = slow.hidden.pop() {
                slow.networks.push(found);
            }
            // La señal fluctúa un poco en cada escaneo (determinista).
            let n = self.scans.fetch_add(1, Ordering::AcqRel);
            for (i, w) in slow.networks.iter_mut().enumerate() {
                let jitter = ((n as usize + i) % 3) as i16 * 4 - 4;
                w.signal = (w.signal as i16 + jitter).clamp(5, 100) as u8;
            }
        }
        self.wifi_scanning.store(false, Ordering::Release);
        Ok(())
    }

    fn wifi_connect(&self, ssid: &str, password: Option<&str>) -> Result<(), String> {
        if !self.wifi_enabled.load(Ordering::Acquire) {
            return Err("system.wifi.unavailable".to_string());
        }
        // Se lee lo que hace falta y se suelta el lock ANTES de dormir.
        let target = {
            let slow = self.slow.read().unwrap();
            slow.networks.iter().find(|n| n.ssid == ssid).cloned()
        };
        let Some(target) = target else {
            return Err(format!("system.wifi.connect_failed|{ssid}"));
        };

        sleep(Duration::from_millis(2000));

        if target.secured && !target.known && password.unwrap_or("") != MOCK_PASSWORD {
            return Err("system.wifi.wrong_password".to_string());
        }

        let mut slow = self.slow.write().unwrap();
        for n in slow.networks.iter_mut() {
            n.active = n.ssid == ssid;
            if n.active {
                n.known = true;
            }
        }
        slow.current_network = Some(ssid.to_string());
        Ok(())
    }

    fn wifi_forget(&self, ssid: &str) -> Result<(), String> {
        let mut slow = self.slow.write().unwrap();
        let Some(n) = slow.networks.iter_mut().find(|n| n.ssid == ssid) else {
            return Err(format!("system.wifi.profile_failed|{ssid}"));
        };
        n.known = false;
        let was_active = n.active;
        n.active = false;
        if was_active {
            slow.current_network = None;
        }
        Ok(())
    }

    fn bt_scan(&self, seconds: u8) -> Result<(), String> {
        if !self.bt_enabled.load(Ordering::Acquire) {
            return Err("system.bt.unavailable".to_string());
        }
        if !Self::begin_scan(&self.bt_scanning) {
            return Ok(());
        }
        sleep(Duration::from_secs(seconds.clamp(1, 10) as u64));
        {
            let mut slow = self.slow.write().unwrap();
            let found: Vec<BtDevice> = slow.bt_undiscovered.drain(..).collect();
            for d in found {
                if !slow.bt_devices.iter().any(|x| x.id == d.id) {
                    slow.bt_devices.push(d);
                }
            }
        }
        self.bt_scanning.store(false, Ordering::Release);
        Ok(())
    }

    fn bt_pair(&self, id: &str) -> Result<(), String> {
        if !self.bt_enabled.load(Ordering::Acquire) {
            return Err("system.bt.unavailable".to_string());
        }
        {
            let slow = self.slow.read().unwrap();
            if !slow.bt_devices.iter().any(|d| d.id == id) {
                return Err("system.bt.device_not_found".to_string());
            }
        }
        sleep(Duration::from_millis(2500));
        let mut slow = self.slow.write().unwrap();
        if let Some(d) = slow.bt_devices.iter_mut().find(|d| d.id == id) {
            d.paired = true;
            d.connected = d.can_connect;
        }
        Ok(())
    }

    fn bt_unpair(&self, id: &str) -> Result<(), String> {
        let mut slow = self.slow.write().unwrap();
        if !slow.bt_devices.iter().any(|d| d.id == id) {
            return Err("system.bt.device_not_found".to_string());
        }
        slow.bt_devices.retain(|d| d.id != id);
        Ok(())
    }

    fn bt_set_connected(&self, id: &str, connected: bool) -> Result<(), String> {
        {
            let slow = self.slow.read().unwrap();
            match slow.bt_devices.iter().find(|d| d.id == id) {
                None => return Err("system.bt.device_not_found".to_string()),
                Some(d) if !d.can_connect => {
                    return Err("system.bt.connect_unsupported".to_string())
                }
                Some(_) => {}
            }
        }
        sleep(Duration::from_millis(1200));
        let mut slow = self.slow.write().unwrap();
        if let Some(d) = slow.bt_devices.iter_mut().find(|d| d.id == id) {
            d.connected = connected;
        }
        Ok(())
    }

    fn refresh_fast(&self) {
        // El mock no tiene nada externo que releer.
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conectar_red_nueva_protegida_exige_la_clave() {
        let m = MockSystemControls::new();
        assert_eq!(
            m.wifi_connect("Vecino_303", Some("mala")),
            Err("system.wifi.wrong_password".to_string())
        );
        assert!(m.wifi_connect("Vecino_303", Some(MOCK_PASSWORD)).is_ok());
        let s = m.state();
        assert_eq!(s.current_network.as_deref(), Some("Vecino_303"));
        let n = s.networks.iter().find(|n| n.ssid == "Vecino_303").unwrap();
        assert!(n.active && n.known);
    }

    #[test]
    fn red_guardada_conecta_sin_clave() {
        let m = MockSystemControls::new();
        assert!(m.wifi_connect("SalaWiFi_2G", None).is_ok());
        assert_eq!(m.state().current_network.as_deref(), Some("SalaWiFi_2G"));
    }

    #[test]
    fn red_abierta_conecta_sin_clave() {
        let m = MockSystemControls::new();
        assert!(m.wifi_connect("Cafe_Invitados", None).is_ok());
    }

    #[test]
    fn olvidar_la_red_activa_deja_sin_conexion() {
        let m = MockSystemControls::new();
        assert!(m.wifi_forget("SalaWiFi_5G").is_ok());
        let s = m.state();
        assert!(s.current_network.is_none());
        assert!(!s.networks.iter().any(|n| n.active));
    }

    #[test]
    fn el_escaneo_descubre_redes_nuevas() {
        let m = MockSystemControls::new();
        let antes = m.state().networks.len();
        assert!(m.wifi_scan().is_ok());
        assert_eq!(m.state().networks.len(), antes + 1);
        assert!(!m.state().wifi_scanning);
    }

    #[test]
    fn los_canales_de_audio_son_independientes() {
        let m = MockSystemControls::new();
        m.set_volume(Channel::Input, 20).unwrap();
        m.set_muted(Channel::Output, true).unwrap();
        let s = m.state();
        assert_eq!(s.input.volume, 20);
        assert_eq!(s.output.volume, 45);
        assert!(s.output.muted && !s.input.muted);
    }

    #[test]
    fn dispositivo_de_audio_inexistente_falla() {
        let m = MockSystemControls::new();
        assert_eq!(
            m.set_device(Channel::Output, "no-existe"),
            Err("system.audio.device_not_found".to_string())
        );
        assert!(m.set_device(Channel::Input, "mic-cam").is_ok());
        assert_eq!(m.state().input.current, "mic-cam");
    }

    #[test]
    fn apagar_bluetooth_desconecta_y_descarta_lo_no_emparejado() {
        let m = MockSystemControls::new();
        m.set_bluetooth(true).unwrap();
        m.bt_scan(1).unwrap();
        assert!(m.state().bt_devices.iter().any(|d| !d.paired));
        m.set_bluetooth(false).unwrap();
        let s = m.state();
        assert!(s.bt_devices.iter().all(|d| d.paired && !d.connected));
    }

    #[test]
    fn el_bluetooth_apagado_rechaza_las_operaciones() {
        let m = MockSystemControls::new();
        assert_eq!(m.bt_scan(1), Err("system.bt.unavailable".to_string()));
        assert_eq!(
            m.bt_pair("bt:xbox"),
            Err("system.bt.unavailable".to_string())
        );
    }
}
