# Controles de sistema (QAM: Wi-Fi / Bluetooth / audio)

El menú de acceso rápido (QAM) permite gestionar red y audio sin volver a Windows.
Se abstrae tras el trait `SystemControls` (`src-tauri/src/system/mod.rs`):

```rust
pub trait SystemControls: Send + Sync {
    fn state(&self) -> SystemState;
    fn set_volume(&mut self, v: u8);
    fn set_output(&mut self, id: String);
    fn set_wifi(&mut self, enabled: bool);
    fn set_bluetooth(&mut self, enabled: bool);
}
```

La implementación se registra como estado gestionado por Tauri
(`.manage(SystemHandle(Mutex<Box<dyn SystemControls>>))`) y los comandos
`system_get_state` / `system_set_*` operan sobre ella.

## Hoy: `MockSystemControls`

`src-tauri/src/system/mock.rs`. Estado en memoria (Wi-Fi/redes, BT, volumen, salidas de
audio) que persiste durante la sesión. **Activo por defecto en macOS** para probar toda
la UX del QAM sin Windows.

## Fase posterior: `WindowsSystemControls`

Con el crate `windows`:
- **Audio**: Core Audio / WASAPI — volumen maestro y **enumerar/cambiar** el dispositivo
  de salida por defecto.
- **Wi-Fi**: WLAN API (o `netsh wlan`) — estado, escaneo y conexión.
- **Bluetooth**: APIs de radio Bluetooth — on/off y dispositivos.

Para añadirla: crear `system/windows.rs`, implementar el trait, y en `main.rs` elegir la
implementación según plataforma (`#[cfg(windows)]`). El frontend (QAM) no cambia: solo
habla con los comandos `system_*`.

## Modelo `SystemState`

`{ wifiEnabled, currentNetwork, networks[], bluetoothEnabled, btDevices[], volume,
muted, outputDevices[{id,name}], currentOutput }` (camelCase para el frontend).
