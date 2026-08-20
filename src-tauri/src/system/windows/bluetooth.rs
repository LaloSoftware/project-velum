//! Bluetooth de Windows con WinRT: listar, descubrir, emparejar y olvidar.
//!
//! # Alcance, y una limitación honesta
//!
//! **No hay conectar/desconectar.** No existe API pública equivalente al botón
//! "Conectar" de Configuración de Windows para dispositivos BR/EDR; lo más
//! cercano es `BluetoothSetServiceState`, que funciona de forma irregular según
//! el perfil (razonable con HID, errático con auriculares A2DP/HFP). Antes que
//! ofrecer un botón que a veces no hace nada, se marca `can_connect: false` y la
//! UI no lo muestra.
//!
//! No es una carencia tan grande como parece: emparejado un mando o unos
//! auriculares, **Windows los reconecta solo al encenderlos**, que es
//! exactamente como se comporta una consola. Lo que sí hace falta —emparejar de
//! cero desde el sofá, sin teclado— está cubierto.
//!
//! Tampoco hay emparejamiento **con PIN**: `PairAsync()` usa la ceremonia por
//! defecto (`ConfirmOnly`), que cubre mandos, auriculares y casi todo periférico
//! de sala. Un teclado Bluetooth que pida escribir un código responderá
//! `system.bt.pin_required`, sugiriendo hacer esa vez desde Windows.
//!
//! # Hilo y bloqueo
//!
//! Igual que `radios.rs`: todo síncrono, `IAsyncOperation::get()` bloquea, y eso
//! es correcto porque se invoca **solo desde `spawn_blocking`** y en apartment
//! MTA. Desde el hilo principal, que Tauri mantiene en STA, sería un deadlock.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use windows::core::HSTRING;
use windows::Devices::Bluetooth::{
    BluetoothConnectionStatus, BluetoothDevice, BluetoothLEDevice, BluetoothMajorClass,
    BluetoothMinorClass,
};
use windows::Devices::Enumeration::{
    DeviceInformation, DevicePairingResultStatus, DeviceUnpairingResultStatus, DeviceWatcher,
};
use windows::Foundation::TypedEventHandler;

use super::super::BtDevice;
use super::radios::ensure_mta;

/// Dispositivos ya emparejados, con su estado de conexión.
pub fn paired() -> Result<Vec<BtDevice>, String> {
    ensure_mta()?;
    let mut out: Vec<BtDevice> = Vec::new();

    // Los dos mundos de Bluetooth se enumeran por separado: un mando de Xbox
    // Series es BLE, uno de Xbox One es clásico, y unos auriculares son
    // clásicos. Buscar solo en uno deja fuera la mitad de la sala.
    for (selector, le) in [
        (BluetoothDevice::GetDeviceSelectorFromPairingState(true), false),
        (BluetoothLEDevice::GetDeviceSelectorFromPairingState(true), true),
    ] {
        let Ok(selector) = selector else { continue };
        let Ok(found) = DeviceInformation::FindAllAsyncAqsFilter(&selector).and_then(|op| op.get())
        else {
            continue;
        };
        for info in found {
            if let Some(dev) = to_bt_device(&info, le) {
                // Un mismo aparato puede salir en las dos listas.
                if !out.iter().any(|d| d.id == dev.id) {
                    out.push(dev);
                }
            }
        }
    }
    Ok(out)
}

/// Busca dispositivos **sin emparejar** durante `seconds`.
///
/// Hace falta un `DeviceWatcher` y no vale `FindAllAsync`: para lo no
/// emparejado, esa devuelve la caché del sistema, que casi siempre está vacía.
/// El watcher es el que provoca la búsqueda real y va entregando lo que
/// aparece.
pub fn discover(seconds: u8) -> Result<Vec<BtDevice>, String> {
    ensure_mta()?;

    let found: Arc<Mutex<HashMap<String, BtDevice>>> = Arc::new(Mutex::new(HashMap::new()));
    let mut watchers: Vec<DeviceWatcher> = Vec::new();

    for (selector, le) in [
        (BluetoothDevice::GetDeviceSelectorFromPairingState(false), false),
        (BluetoothLEDevice::GetDeviceSelectorFromPairingState(false), true),
    ] {
        let Ok(selector) = selector else { continue };
        let Ok(watcher) = DeviceInformation::CreateWatcherAqsFilter(&selector) else {
            continue;
        };

        let sink = found.clone();
        // El handler hace lo MÍNIMO: id y nombre, nada de I/O.
        //
        // Llamar aquí a `BluetoothDevice::FromIdAsync().get()` —que es lo que
        // haría falta para el estado de conexión— bloquearía el hilo de eventos
        // de WinRT desde su propio callback, y el descubrimiento se arrastraría
        // o se colgaría. Para un aparato sin emparejar tampoco aporta nada:
        // `connected` es false por definición.
        let _ = le;
        let handler = TypedEventHandler::new(move |_w: &Option<DeviceWatcher>, info: &Option<DeviceInformation>| {
            if let Some(info) = info {
                if let (Ok(id), Ok(name)) = (info.Id(), info.Name()) {
                    let id = id.to_string();
                    let name = name.to_string();
                    if !id.is_empty() && !name.trim().is_empty() {
                        if let Ok(mut map) = sink.lock() {
                            map.insert(
                                id.clone(),
                                BtDevice {
                                    kind: kind_from_name(&name),
                                    id,
                                    name,
                                    paired: false,
                                    connected: false,
                                    can_connect: false,
                                },
                            );
                        }
                    }
                }
            }
            Ok(())
        });
        if watcher.Added(&handler).is_err() {
            continue;
        }
        if watcher.Start().is_ok() {
            watchers.push(watcher);
        }
    }

    if watchers.is_empty() {
        return Err("system.bt.scan_failed|no se pudo iniciar la búsqueda".to_string());
    }

    std::thread::sleep(Duration::from_secs(seconds.clamp(1, 15) as u64));
    for w in &watchers {
        let _ = w.Stop();
    }

    let map = found
        .lock()
        .map_err(|_| "system.bt.scan_failed|estado interno".to_string())?;
    Ok(map.values().cloned().collect())
}

/// Empareja con la ceremonia por defecto (sin interacción).
pub fn pair(id: &str) -> Result<(), String> {
    ensure_mta()?;
    let info = info_by_id(id)?;
    let pairing = info
        .Pairing()
        .map_err(|e| format!("system.bt.pair_failed|{e}"))?;

    let result = pairing
        .PairAsync()
        .and_then(|op| op.get())
        .map_err(|e| format!("system.bt.pair_failed|{e}"))?;
    let status = result
        .Status()
        .map_err(|e| format!("system.bt.pair_failed|{e}"))?;

    match status {
        DevicePairingResultStatus::Paired | DevicePairingResultStatus::AlreadyPaired => Ok(()),

        // El aparato pide una ceremonia que necesita un handler registrado —en
        // la práctica, escribir o confirmar un PIN—. Implementarla es un puente
        // asíncrono Rust↔JS dentro de un callback de WinRT, y su público real
        // hoy son básicamente teclados Bluetooth. Se explica y se sugiere
        // hacerlo esa vez desde Windows, en vez de fallar sin más.
        DevicePairingResultStatus::RequiredHandlerNotRegistered
        | DevicePairingResultStatus::InvalidCeremonyData => {
            Err("system.bt.pin_required".to_string())
        }

        // El aparato dijo que no: clave mal, fuera de modo emparejamiento, o
        // ya emparejado con otro equipo.
        DevicePairingResultStatus::AuthenticationFailure
        | DevicePairingResultStatus::AuthenticationNotAllowed
        | DevicePairingResultStatus::AuthenticationTimeout
        | DevicePairingResultStatus::ConnectionRejected
        | DevicePairingResultStatus::RejectedByHandler
        | DevicePairingResultStatus::RemoteDeviceHasAssociation => {
            Err("system.bt.pair_rejected".to_string())
        }

        other => Err(format!("system.bt.pair_failed|status {}", other.0)),
    }
}

/// Olvida el dispositivo (deja de estar emparejado).
pub fn unpair(id: &str) -> Result<(), String> {
    ensure_mta()?;
    let info = info_by_id(id)?;
    let result = info
        .Pairing()
        .and_then(|p| p.UnpairAsync())
        .and_then(|op| op.get())
        .map_err(|e| format!("system.bt.unpair_failed|{e}"))?;
    let status = result
        .Status()
        .map_err(|e| format!("system.bt.unpair_failed|{e}"))?;

    match status {
        DeviceUnpairingResultStatus::Unpaired | DeviceUnpairingResultStatus::AlreadyUnpaired => {
            Ok(())
        }
        other => Err(format!("system.bt.unpair_failed|status {}", other.0)),
    }
}

// ------------------------------ internos ------------------------------

fn info_by_id(id: &str) -> Result<DeviceInformation, String> {
    DeviceInformation::CreateFromIdAsync(&HSTRING::from(id))
        .and_then(|op| op.get())
        .map_err(|_| "system.bt.device_not_found".to_string())
}

/// Convierte un dispositivo **ya emparejado** en el modelo del QAM.
///
/// El estado de conexión y la categoría se piden aparte, por id: la vía
/// alternativa (propiedades adicionales en el filtro AQS) obliga a construir un
/// `IIterable<HSTRING>` a mano y a leer `IInspectable` sin tipar, para el mismo
/// resultado. La lista de una sala son unos pocos aparatos.
fn to_bt_device(info: &DeviceInformation, le: bool) -> Option<BtDevice> {
    let id = info.Id().ok()?.to_string();
    let name = info.Name().ok()?.to_string();
    if id.is_empty() || name.trim().is_empty() {
        return None;
    }

    let (connected, kind) = details(&id, le);

    Some(BtDevice {
        id,
        name,
        paired: true,
        connected,
        // Ver la nota de cabecera: conectar/desconectar a mano no tiene una vía
        // fiable, así que la UI no ofrece ese botón.
        can_connect: false,
        kind,
    })
}

/// `(conectado, categoría)`. Best-effort: si el aparato no responde, se asume
/// desconectado y categoría desconocida antes que descartarlo de la lista.
fn details(id: &str, le: bool) -> (bool, String) {
    let h = HSTRING::from(id);

    if le {
        if let Ok(dev) = BluetoothLEDevice::FromIdAsync(&h).and_then(|op| op.get()) {
            let connected = dev
                .ConnectionStatus()
                .map(|s| s == BluetoothConnectionStatus::Connected)
                .unwrap_or(false);
            // BLE no expone Class of Device; su `Appearance` es un código
            // distinto y poco fiable entre fabricantes, así que el icono se
            // deja genérico salvo que el nombre lo delate.
            return (connected, kind_from_name(&dev.Name().unwrap_or_default().to_string()));
        }
        return (false, "other".to_string());
    }

    if let Ok(dev) = BluetoothDevice::FromIdAsync(&h).and_then(|op| op.get()) {
        let connected = dev
            .ConnectionStatus()
            .map(|s| s == BluetoothConnectionStatus::Connected)
            .unwrap_or(false);
        let kind = dev
            .ClassOfDevice()
            .ok()
            .map(|cod| {
                let major = cod.MajorClass().unwrap_or(BluetoothMajorClass::Miscellaneous);
                let minor = cod.MinorClass().unwrap_or(BluetoothMinorClass::Uncategorized);
                kind_from_cod(major, minor)
            })
            .unwrap_or_else(|| "other".to_string());
        return (connected, kind);
    }
    (false, "other".to_string())
}

/// Categoría a partir de la Class of Device (Bluetooth clásico). Solo decide
/// qué icono se pinta.
fn kind_from_cod(major: BluetoothMajorClass, minor: BluetoothMinorClass) -> String {
    match major {
        BluetoothMajorClass::AudioVideo => "audio",
        BluetoothMajorClass::Phone => "phone",
        BluetoothMajorClass::Peripheral => match minor {
            BluetoothMinorClass::PeripheralJoystick
            | BluetoothMinorClass::PeripheralGamepad => "gamepad",
            _ => "input",
        },
        _ => "other",
    }
    .to_string()
}

/// Último recurso para BLE, donde no hay Class of Device. Es solo el icono: si
/// falla, sale el genérico.
fn kind_from_name(name: &str) -> String {
    let n = name.to_lowercase();
    if n.contains("controller") || n.contains("gamepad") || n.contains("mando")
        || n.contains("dualsense") || n.contains("dualshock") || n.contains("xbox")
    {
        "gamepad".to_string()
    } else if n.contains("headset") || n.contains("headphone") || n.contains("buds")
        || n.contains("auricular") || n.contains("speaker") || n.contains("altavoz")
    {
        "audio".to_string()
    } else if n.contains("keyboard") || n.contains("teclado") || n.contains("mouse")
        || n.contains("ratón")
    {
        "input".to_string()
    } else {
        "other".to_string()
    }
}
