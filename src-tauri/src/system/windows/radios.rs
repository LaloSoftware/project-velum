//! Encender y apagar las radios (Wi-Fi y Bluetooth) con la API WinRT `Radio`.
//!
//! # Por qué no `netsh interface set interface`
//!
//! Ese comando **exige privilegios de administrador**. GM corre como una app
//! normal en el PC de la sala, así que por esa vía el interruptor fallaría
//! siempre. `Windows.Devices.Radios.Radio` funciona sin elevación: es la misma
//! API que usa el panel de Configuración de Windows.
//!
//! # Por qué desde Rust y no desde PowerShell
//!
//! Se puede llegar a esta API desde PowerShell cargando el tipo WinRT y
//! sacando el resultado de un `IAsyncOperation` por reflexión. Es frágil de una
//! forma especialmente mala: cuando se rompe entre versiones de Windows no da
//! un error accionable, devuelve vacío. Desde Rust las firmas las comprueba el
//! compilador (ver `npm run win:check`).
//!
//! # Hilo y bloqueo
//!
//! `IAsyncOperation::get()` **bloquea** hasta que la operación termina. Eso es
//! correcto aquí porque todo esto se invoca desde `spawn_blocking` (nunca desde
//! el hilo de la UI ni desde el hilo de audio), y en un apartment MTA — que es
//! lo que garantiza `CoIncrementMTAUsage`. Llamarlo desde el hilo principal, que
//! Tauri/WebView2 mantiene en STA, sería un deadlock.

use windows::Devices::Radios::{Radio, RadioAccessStatus, RadioKind, RadioState};
use windows::Win32::System::Com::CoIncrementMTAUsage;

/// Qué radio se quiere tocar.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Wifi,
    Bluetooth,
}

impl Kind {
    fn winrt(self) -> RadioKind {
        match self {
            Kind::Wifi => RadioKind::WiFi,
            Kind::Bluetooth => RadioKind::Bluetooth,
        }
    }
    /// Prefijo del código de error, para que el mensaje al usuario hable de lo
    /// que ha tocado.
    fn err(self) -> &'static str {
        match self {
            Kind::Wifi => "system.wifi",
            Kind::Bluetooth => "system.bt",
        }
    }
}

/// Registra este proceso en el apartment MTA. Idempotente: WinRT lleva la
/// cuenta, y el `Cookie` se deja vivir a propósito durante toda la vida del
/// proceso (soltarlo cerraría el MTA mientras otras llamadas lo usan).
pub(super) fn ensure_mta() -> Result<(), String> {
    unsafe {
        CoIncrementMTAUsage().map_err(|e| format!("system.radio.set_failed|MTA: {e}"))?;
    }
    Ok(())
}

/// Todas las radios del equipo del tipo pedido.
fn radios_of(kind: Kind) -> Result<Vec<Radio>, String> {
    ensure_mta()?;
    let all = Radio::GetRadiosAsync()
        .map_err(|e| format!("system.radio.set_failed|{e}"))?
        .get()
        .map_err(|e| format!("system.radio.set_failed|{e}"))?;

    let mut out = Vec::new();
    for r in all {
        if r.Kind().map(|k| k == kind.winrt()).unwrap_or(false) {
            out.push(r);
        }
    }
    Ok(out)
}

/// ¿Está encendida? `None` si no hay radio de ese tipo.
pub fn state(kind: Kind) -> Option<bool> {
    let radios = radios_of(kind).ok()?;
    // Con varios adaptadores basta uno encendido para considerarla activa.
    let mut found = false;
    for r in radios {
        if let Ok(s) = r.State() {
            found = true;
            if s == RadioState::On {
                return Some(true);
            }
        }
    }
    if found {
        Some(false)
    } else {
        None
    }
}

/// Enciende o apaga todas las radios de ese tipo.
///
/// Antes hay que pedir permiso una vez con `RequestAccessAsync`: si el usuario
/// o una política lo deniegan, todas las llamadas siguientes fallan de forma
/// indistinguible de un error cualquiera. Por eso se traduce a un código
/// propio, `system.radio.access_denied`, que sí se puede explicar en pantalla.
pub fn set_state(kind: Kind, on: bool) -> Result<(), String> {
    ensure_mta()?;

    let access = Radio::RequestAccessAsync()
        .map_err(|e| format!("system.radio.set_failed|{e}"))?
        .get()
        .map_err(|e| format!("system.radio.set_failed|{e}"))?;
    if access != RadioAccessStatus::Allowed {
        return Err("system.radio.access_denied".to_string());
    }

    let radios = radios_of(kind)?;
    if radios.is_empty() {
        return Err(format!("{}.unavailable", kind.err()));
    }

    let target = if on { RadioState::On } else { RadioState::Off };
    let mut last_err: Option<String> = None;
    let mut any_ok = false;

    for r in radios {
        match r.SetStateAsync(target).and_then(|op| op.get()) {
            Ok(RadioAccessStatus::Allowed) => any_ok = true,
            Ok(RadioAccessStatus::DeniedByUser) | Ok(RadioAccessStatus::DeniedBySystem) => {
                last_err = Some("system.radio.access_denied".to_string());
            }
            Ok(other) => {
                last_err = Some(format!("system.radio.set_failed|status {}", other.0));
            }
            Err(e) => last_err = Some(format!("system.radio.set_failed|{e}")),
        }
    }

    if any_ok {
        Ok(())
    } else {
        Err(last_err.unwrap_or_else(|| "system.radio.set_failed|desconocido".to_string()))
    }
}
