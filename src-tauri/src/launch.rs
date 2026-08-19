//! Lanzamiento de juegos + ciclo "en juego" (F3).
//!
//!   1. lanzar el juego (URI `steam://...`, ejecutable o `.lnk`),
//!   2. el frontend SUSPENDE el launcher (minimiza la ventana),
//!   3. un hilo vigía detecta el fin del proceso (por `installDir`) y emite
//!      `gm://game-ended`, con lo que el frontend RESTAURA la ventana.
//! Ver docs/architecture.md.

use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

/// Sesión de juego activa (para poder traerla al frente). Gestionada por Tauri.
#[derive(Default)]
pub struct PlayState(pub Mutex<Option<PlaySession>>);

#[derive(Clone)]
pub struct PlaySession {
    pub install_dir: String,
}

#[derive(Clone, Serialize)]
struct GameEnded {
    id: String,
}

#[tauri::command]
pub async fn launch_game(
    app: AppHandle,
    state: tauri::State<'_, PlayState>,
    id: String,
    target: String,
    install_dir: Option<String>,
) -> Result<(), String> {
    println!("[launch] juego '{id}' -> {target}");
    open_target(&target).map_err(|e| e.to_string())?;

    // Registrar la sesión y, si conocemos la carpeta de instalación, vigilar el
    // proceso para restaurar el launcher al cerrarse el juego.
    let dir = install_dir.filter(|d| !d.trim().is_empty());
    *state.0.lock().unwrap() = dir.clone().map(|install_dir| PlaySession { install_dir });
    if let Some(dir) = dir {
        watch_process(app, id, dir);
    }
    Ok(())
}

/// Hilo vigía: espera a que aparezca un proceso bajo `install_dir` (fase de
/// gracia) y luego sondea hasta que no quede ninguno → emite `gm://game-ended`.
fn watch_process(app: AppHandle, id: String, install_dir: String) {
    use std::time::{Duration, Instant};
    use sysinfo::{ProcessesToUpdate, System};

    std::thread::spawn(move || {
        let needle = normalize(&install_dir);
        let mut sys = System::new();
        let poll = Duration::from_millis(1500);

        let any_running = |sys: &mut System| -> bool {
            sys.refresh_processes(ProcessesToUpdate::All, true);
            sys.processes().values().any(|p| {
                p.exe()
                    .map(|e| normalize(&e.to_string_lossy()).starts_with(&needle))
                    .unwrap_or(false)
            })
        };

        // Fase 1: esperar a que arranque (hasta 120 s).
        let deadline = Instant::now() + Duration::from_secs(120);
        loop {
            if any_running(&mut sys) {
                break;
            }
            if Instant::now() >= deadline {
                println!("[launch] vigía '{id}': no apareció proceso en la carpeta; sin auto-restaurar");
                return;
            }
            std::thread::sleep(poll);
        }

        // Fase 2: esperar a que termine.
        while any_running(&mut sys) {
            std::thread::sleep(poll);
        }
        println!("[launch] vigía '{id}': proceso terminado → gm://game-ended");
        let _ = app.emit("gm://game-ended", GameEnded { id });
    });
}

/// Normaliza una ruta para comparar (separadores `/` y minúsculas en Windows).
fn normalize(p: &str) -> String {
    let s = p.replace('\\', "/");
    #[cfg(windows)]
    {
        s.to_lowercase()
    }
    #[cfg(not(windows))]
    {
        s
    }
}

/// Trae al frente la ventana del juego en marcha (best-effort, solo Windows).
#[tauri::command]
pub async fn focus_game(state: tauri::State<'_, PlayState>) -> Result<(), String> {
    let _dir = match state.0.lock().unwrap().clone() {
        Some(s) => s.install_dir,
        None => return Ok(()),
    };
    #[cfg(windows)]
    focus_window_under(&_dir);
    Ok(())
}

/// Enumera ventanas top-level visibles y enfoca la primera cuyo proceso tenga el
/// ejecutable bajo `install_dir`.
#[cfg(windows)]
fn focus_window_under(install_dir: &str) {
    use sysinfo::{ProcessesToUpdate, System};
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, TRUE};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowThreadProcessId, IsWindowVisible, SetForegroundWindow,
    };

    let needle = normalize(install_dir);
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    // PIDs cuyo ejecutable cuelga de la carpeta del juego.
    let pids: std::collections::HashSet<u32> = sys
        .processes()
        .iter()
        .filter(|(_, p)| {
            p.exe()
                .map(|e| normalize(&e.to_string_lossy()).starts_with(&needle))
                .unwrap_or(false)
        })
        .map(|(pid, _)| pid.as_u32())
        .collect();
    if pids.is_empty() {
        return;
    }

    struct Ctx {
        pids: std::collections::HashSet<u32>,
    }
    let mut ctx = Ctx { pids };

    unsafe extern "system" fn cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let ctx = &*(lparam.0 as *const Ctx);
        if !IsWindowVisible(hwnd).as_bool() {
            return TRUE;
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if ctx.pids.contains(&pid) {
            let _ = SetForegroundWindow(hwnd);
            return BOOL(0); // detener enumeración
        }
        TRUE
    }

    unsafe {
        let _ = EnumWindows(Some(cb), LPARAM(&mut ctx as *mut _ as isize));
    }
}

/// Desinstalar un juego/app. MVP: solo registra. En Windows (futuro) ejecutará
/// el desinstalador real del juego.
#[tauri::command]
pub async fn uninstall_game(id: String, target: String) -> Result<(), String> {
    println!("[launch] desinstalar '{id}' -> {target} (mock: no ejecuta nada en dev)");
    Ok(())
}

/// Abre Steam en la página de instalación de un juego de la cuenta vinculada
/// que no está instalado localmente (los "fantasmas" de `mergeSteamGhosts`,
/// ver `docs/accounts.md`) — no es una sesión de juego (no toca `PlayState`
/// ni el vigía de proceso, a diferencia de `launch_game`): el usuario decide
/// instalar o no desde la propia ventana de Steam.
#[tauri::command]
pub fn steam_open_install(appid: i64) -> Result<(), String> {
    let target = format!("steam://install/{appid}");
    println!("[launch] abrir Steam para instalar appid {appid} -> {target}");
    open_target(&target).map_err(|e| e.to_string())
}

/// Abre una URL/URI externa con el programa asociado del sistema — accesos
/// directos genéricos del frontend que no son "lanzar un juego" ni "instalar"
/// (ej. QAM → Utilidades → Steam: biblioteca, tienda, perfil…, cada uno un
/// `steam://…` fijo que ya conoce el frontend). Mismo `open_target` que usan
/// `launch_game`/`steam_open_install`, sin registrar sesión ni vigía de proceso.
#[tauri::command]
pub fn open_url(target: String) -> Result<(), String> {
    println!("[launch] abrir URL externa -> {target}");
    open_target(&target).map_err(|e| e.to_string())
}

/// Abre un destino: URI de protocolo (`steam://…`), ejecutable o acceso `.lnk`.
fn open_target(target: &str) -> std::io::Result<()> {
    use std::process::Command;
    #[cfg(windows)]
    {
        // `start` resuelve URIs, .exe y .lnk con el SO.
        Command::new("cmd").args(["/C", "start", "", target]).spawn()?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg(target).spawn()?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open").arg(target).spawn()?;
    }
    Ok(())
}
