//! Implementación simulada de SystemControls (para dev en macOS).
//! Mantiene el estado en memoria; los cambios persisten durante la sesión.

use super::{OutputDevice, SystemControls, SystemState};

pub struct MockSystemControls {
    state: SystemState,
}

impl MockSystemControls {
    pub fn new() -> Self {
        MockSystemControls {
            state: SystemState {
                wifi_enabled: true,
                current_network: Some("SalaWiFi_5G".to_string()),
                networks: vec![
                    "SalaWiFi_5G".to_string(),
                    "SalaWiFi_2G".to_string(),
                    "Vecino_303".to_string(),
                    "AndroidAP".to_string(),
                ],
                bluetooth_enabled: false,
                bt_devices: vec![
                    "Mando Xbox".to_string(),
                    "Auriculares BT".to_string(),
                    "DualSense".to_string(),
                ],
                volume: 45,
                muted: false,
                output_devices: vec![
                    OutputDevice { id: "tv".into(), name: "TV (HDMI)".into() },
                    OutputDevice { id: "speakers".into(), name: "Altavoces 5.1".into() },
                    OutputDevice { id: "headset".into(), name: "Auriculares USB".into() },
                ],
                current_output: "tv".to_string(),
            },
        }
    }
}

impl SystemControls for MockSystemControls {
    fn state(&self) -> SystemState {
        self.state.clone()
    }
    fn set_volume(&mut self, v: u8) {
        self.state.volume = v.min(100);
    }
    fn set_output(&mut self, id: String) {
        self.state.current_output = id;
    }
    fn set_wifi(&mut self, enabled: bool) {
        self.state.wifi_enabled = enabled;
    }
    fn set_bluetooth(&mut self, enabled: bool) {
        self.state.bluetooth_enabled = enabled;
    }
}
