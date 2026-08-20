//! Wi-Fi de Windows vía `netsh`.
//!
//! El parseo de la salida vive aparte, en `system/netsh_parse.rs`, que se
//! compila en todos los sistemas para poder tener tests en el Mac de desarrollo
//! (es la parte más frágil de todo esto). Aquí queda solo la ejecución.
//!
//! # Dos formas de llamar a netsh, y por qué
//!
//! - **Lecturas** (`show networks`, `show interfaces`, `show profiles`): pasan
//!   por `cmd /c chcp 65001 && netsh` porque netsh escribe en la code page de
//!   consola y un SSID con eñe saldría roto. Sus argumentos son constantes: no
//!   hay datos de nadie en esa línea de comandos.
//! - **Escrituras** (`connect`, `add profile`, `delete profile`): van a netsh
//!   **directamente, sin `cmd`**, porque llevan el SSID dentro. Metido en una
//!   línea de `cmd`, un SSID con `&` o `|` podría ejecutar otra cosa. Como solo
//!   se mira el código de salida, la code page da igual.
//!
//! # Conectar es más que lanzar el comando
//!
//! `netsh wlan connect` devuelve éxito en cuanto **acepta** la petición, no
//! cuando la conexión funciona: con una contraseña incorrecta también responde
//! "correctamente". Por eso hay que sondear el estado y, si no llega a
//! conectar, borrar el perfil recién creado — si se queda, Windows reintentará
//! con la clave mala para siempre, y encima la red aparecerá como "guardada".

use std::fs;
use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use super::super::netsh_parse::{
    self, parse_ethernet, parse_interfaces, parse_networks, parse_profiles, profile_xml,
};
use super::super::WifiNet;
use super::proc::{hidden, netsh};

/// Cuánto se espera a que la conexión se establezca antes de darla por fallida.
/// 12 s cubre de sobra un DHCP lento; más que eso, delante de una tele, es
/// tiempo en el que nadie sabe si la cosa está haciendo algo.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(12);
const POLL_EVERY: Duration = Duration::from_millis(500);

/// Foto del Wi-Fi para el `SystemState`.
pub struct WifiSnapshot {
    pub present: bool,
    pub enabled: bool,
    pub current: Option<String>,
    pub networks: Vec<WifiNet>,
    pub ethernet: Option<String>,
}

/// Solo el SSID conectado: un único `netsh`, sin mirar Ethernet.
///
/// Existe aparte de `status()` porque el sondeo de `connect()` la llama cada
/// 500 ms durante hasta 12 s: con `status()` serían casi cien procesos por
/// intento de conexión.
pub fn current_ssid() -> Option<String> {
    netsh(&["wlan", "show", "interfaces"])
        .ok()
        .and_then(|t| parse_interfaces(&t).ssid)
}

/// Estado de la interfaz + Ethernet. Barato comparado con escanear, pero son
/// dos procesos: no conviene llamarlo en un bucle cerrado.
pub fn status() -> WifiSnapshot {
    let iface = netsh(&["wlan", "show", "interfaces"])
        .map(|t| parse_interfaces(&t))
        .unwrap_or_default();
    let ethernet = netsh(&["interface", "show", "interface"])
        .ok()
        .and_then(|t| parse_ethernet(&t));

    WifiSnapshot {
        present: iface.present,
        enabled: iface.enabled,
        current: iface.ssid,
        networks: Vec::new(),
        ethernet,
    }
}

/// Perfiles guardados: es lo que decide si conectar pide contraseña o no.
pub fn known_profiles() -> Vec<String> {
    netsh(&["wlan", "show", "profiles"])
        .map(|t| parse_profiles(&t))
        .unwrap_or_default()
}

/// Escaneo. Lento (segundos): solo desde `spawn_blocking`.
///
/// `netsh` no tiene un comando de "escanear y esperar": `show networks` devuelve
/// lo que el driver tenga cacheado y dispara un escaneo nuevo por detrás. Se
/// pide dos veces con una pausa para que la segunda ya traiga resultados
/// frescos, que es lo que la gente espera al pulsar "Buscar redes".
pub fn scan() -> Result<Vec<WifiNet>, String> {
    let _ = netsh(&["wlan", "show", "networks", "mode=bssid"]);
    std::thread::sleep(Duration::from_millis(1200));
    let txt = netsh(&["wlan", "show", "networks", "mode=bssid"])?;

    let known = known_profiles();
    let current = current_ssid();

    let nets = parse_networks(&txt)
        .into_iter()
        .map(|n: netsh_parse::ParsedNet| WifiNet {
            active: current.as_deref() == Some(n.ssid.as_str()),
            known: known.iter().any(|k| k == &n.ssid),
            ssid: n.ssid,
            secured: n.secured,
            signal: n.signal,
        })
        .collect();
    Ok(nets)
}

/// Conecta, verificando de verdad que la conexión se estableció.
///
/// `password` solo se usa si la red no tiene perfil guardado.
pub fn connect(ssid: &str, password: Option<&str>, secured: bool) -> Result<(), String> {
    let had_profile = known_profiles().iter().any(|k| k == ssid);

    // Sin perfil y sin clave en una red protegida no hay nada que intentar:
    // mejor decirlo ya que esperar 12 s al timeout.
    if !had_profile && secured && password.map(|p| p.is_empty()).unwrap_or(true) {
        return Err("system.wifi.wrong_password".to_string());
    }

    if !had_profile {
        let profile = profile_xml(ssid, password, secured);
        add_profile(ssid, &profile)?;
    }

    // Lanzar la conexión. Los argumentos van sin pasar por el shell.
    let out = hidden("netsh")
        .args(["wlan", "connect", &format!("name={ssid}"), &format!("ssid={ssid}")])
        .output()
        .map_err(|e| format!("system.wifi.connect_failed|{e}"))?;
    if !out.status.success() {
        if !had_profile {
            let _ = forget(ssid);
        }
        return Err(format!(
            "system.wifi.connect_failed|{}",
            String::from_utf8_lossy(&out.stdout).trim()
        ));
    }

    // Sondear hasta que el estado diga que estamos en esa red.
    let deadline = Instant::now() + CONNECT_TIMEOUT;
    while Instant::now() < deadline {
        std::thread::sleep(POLL_EVERY);
        if current_ssid().as_deref() == Some(ssid) {
            return Ok(());
        }
    }

    // No conectó. Si el perfil lo creamos nosotros, hay que quitarlo: si no,
    // Windows reintentará indefinidamente con una clave que no vale y la red
    // quedará marcada como guardada en la lista.
    if !had_profile {
        let _ = forget(ssid);
        if secured {
            // La causa abrumadoramente más común con un perfil recién creado.
            // `netsh` no distingue clave incorrecta de fuera de alcance — para
            // eso hace falta la WLAN API nativa (ver docs/system-controls.md).
            return Err("system.wifi.wrong_password".to_string());
        }
    }
    Err("system.wifi.timeout".to_string())
}

/// Borra el perfil guardado (deja de reconectar sola).
pub fn forget(ssid: &str) -> Result<(), String> {
    let out = hidden("netsh")
        .args(["wlan", "delete", "profile", &format!("name={ssid}")])
        .output()
        .map_err(|e| format!("system.wifi.profile_failed|{e}"))?;
    if out.status.success() {
        Ok(())
    } else {
        Err(format!(
            "system.wifi.profile_failed|{}",
            String::from_utf8_lossy(&out.stdout).trim()
        ))
    }
}

// ----------------------------- perfil XML -----------------------------

/// Instala un perfil desde un fichero temporal.
///
/// El fichero **contiene la contraseña en claro**, así que se escribe con un
/// nombre irrepetible y se borra en cuanto netsh lo lee — también si netsh
/// falla.
fn add_profile(ssid: &str, xml: &str) -> Result<(), String> {
    let path = temp_profile_path();
    fs::write(&path, xml).map_err(|e| format!("system.wifi.profile_failed|{e}"))?;

    let result = hidden("netsh")
        .args([
            "wlan",
            "add",
            "profile",
            &format!("filename={}", path.display()),
            "user=all",
        ])
        .output()
        .map_err(|e| format!("system.wifi.profile_failed|{e}"));

    // Antes de mirar el resultado: el fichero con la clave desaparece.
    let _ = fs::remove_file(&path);

    let out = result?;
    if !out.status.success() {
        let _ = ssid;
        return Err(format!(
            "system.wifi.profile_failed|{}",
            String::from_utf8_lossy(&out.stdout).trim()
        ));
    }
    Ok(())
}

fn temp_profile_path() -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("gm-wlan-{}-{}.xml", std::process::id(), nanos))
}
