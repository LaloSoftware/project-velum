//! Lanzar procesos de consola **sin que parpadee una ventana negra**.
//!
//! GM corre a pantalla completa, normalmente encima de un juego. Un `netsh`
//! lanzado sin `CREATE_NO_WINDOW` abre una consola durante unos milisegundos
//! que roba el foco y, a pantalla completa exclusiva, puede llegar a minimizar
//! el juego. Con el escaneo Wi-Fi eso pasaría cada vez que se abre el QAM.

use std::os::windows::process::CommandExt;
use std::process::{Command, Output};

/// `CREATE_NO_WINDOW` de la API de procesos de Win32.
pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Prepara un `Command` que no abrirá consola.
pub fn hidden(exe: &str) -> Command {
    let mut c = Command::new(exe);
    c.creation_flags(CREATE_NO_WINDOW);
    c
}

/// Ejecuta `netsh` con los argumentos dados y devuelve su salida como texto.
///
/// **Por qué pasa por `cmd /c chcp 65001`**: `netsh` escribe en la code page de
/// consola (850/1252 en la mayoría de instalaciones en español), no en UTF-8.
/// Sin esto, un SSID con acentos o eñe —"Casa de Muñoz", "Salón"— sale con
/// caracteres rotos, y como el SSID es la clave con la que luego se conecta, no
/// es solo un problema estético: la conexión falla.
///
/// Los argumentos se pasan por separado y nunca se interpolan en la línea de
/// `cmd`, para que un SSID con `&` o `|` no pueda ejecutar nada.
/// Devuelve `(salida, ok)`. El `ok` hace falta para distinguir "cero redes
/// visibles" (resultado legítimo) de "Windows rechazó la consulta" — ver
/// `netsh_parse::classify_netsh_error`. Sin eso, una denegación se muestra
/// como "No se encontraron redes", que es sencillamente falso.
pub fn netsh(args: &[&str]) -> Result<(String, bool), String> {
    // `chcp` cambia la code page de ESTA consola; por eso tiene que ir en el
    // mismo `cmd` que el netsh, no en una invocación aparte.
    let mut cmd = hidden("cmd");
    cmd.arg("/c").arg("chcp").arg("65001").arg(">nul").arg("&&").arg("netsh");
    cmd.args(args);

    let out: Output = cmd
        .output()
        .map_err(|e| format!("system.wifi.scan_failed|netsh: {e}"))?;
    // netsh escribe los motivos de fallo en stdout, no en stderr.
    let mut text = String::from_utf8_lossy(&out.stdout).to_string();
    let err = String::from_utf8_lossy(&out.stderr);
    if !err.trim().is_empty() {
        text.push('\n');
        text.push_str(&err);
    }
    Ok((text, out.status.success()))
}
