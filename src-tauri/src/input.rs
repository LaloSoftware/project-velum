//! Lectura de mando(s) con `gilrs` en un hilo del backend.
//!
//! Cubre Xbox/XInput, DualSense y mandos genéricos (mapeos SDL de gilrs) de forma
//! consistente, y en Windows y macOS (así se prueba con mando real desde el Mac).
//! Emite eventos CRUDOS al frontend por el evento Tauri `gm://input`:
//!   { type: "dir"|"button", name, pressed }
//! Las direcciones son navegación fija; el mapeo botón→acción (remapeable) vive
//! en el frontend (stores/bindings.js). Varios mandos controlan el mismo foco.
//! Ver docs/input.md.

use gilrs::{Axis, Button, Event, EventType, Gilrs};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
struct InputEvent {
    #[serde(rename = "type")]
    kind: &'static str, // "dir" | "button"
    name: String,
    pressed: bool,
}

fn emit_button(app: &AppHandle, name: &str, pressed: bool) {
    let _ = app.emit(
        "gm://input",
        InputEvent {
            kind: "button",
            name: name.to_string(),
            pressed,
        },
    );
}

fn emit_dir(app: &AppHandle, name: &str) {
    let _ = app.emit(
        "gm://input",
        InputEvent {
            kind: "dir",
            name: name.to_string(),
            pressed: true,
        },
    );
}

#[derive(Clone, Serialize)]
struct GamepadConnectionEvent {
    name: String,
    connected: bool,
}

/// Notificación flotante de "mando conectado/desconectado" en el frontend
/// (`GamepadNotice.svelte`) — solo se emite desde `start_gamepad_thread`
/// (gilrs), no desde `start_xinput_poll_thread`: `Connected`/`Disconnected`
/// de gilrs ya llega para mandos clase XInput/Driver en Windows aunque sus
/// botones no (ver comentario grande más abajo), así que emitir también desde
/// el hilo de XInput duplicaría la notificación del mismo mando físico.
fn emit_gamepad_connection(app: &AppHandle, name: String, connected: bool) {
    let _ = app.emit("gm://gamepad-connection", GamepadConnectionEvent { name, connected });
}

/// Nombre crudo del botón de acción (el frontend lo mapea a una acción).
fn button_name(b: Button) -> Option<&'static str> {
    Some(match b {
        Button::South => "south", // A / Cross
        Button::East => "east",   // B / Circle
        Button::North => "north", // Y / Triángulo
        Button::West => "west",   // X / Cuadrado
        Button::LeftTrigger => "l1",   // LB / L1 (bumper)
        Button::RightTrigger => "r1",  // RB / R1 (bumper)
        Button::LeftTrigger2 => "lt",  // LT / L2 (gatillo)
        Button::RightTrigger2 => "rt", // RT / R2 (gatillo)
        Button::LeftThumb => "l3",     // clic stick izq.
        Button::RightThumb => "r3",    // clic stick der.
        Button::Start => "start",
        Button::Select => "select",
        Button::Mode => "guide", // Guide / PS
        _ => return None,
    })
}

fn dpad_dir(b: Button) -> Option<&'static str> {
    Some(match b {
        Button::DPadUp => "up",
        Button::DPadDown => "down",
        Button::DPadLeft => "left",
        Button::DPadRight => "right",
        _ => return None,
    })
}

fn update_axis(
    set: &mut HashSet<&'static str>,
    neg: &'static str,
    pos: &'static str,
    value: f32,
    th: f32,
) {
    if value <= -th {
        set.insert(neg);
    } else {
        set.remove(neg);
    }
    if value >= th {
        set.insert(pos);
    } else {
        set.remove(pos);
    }
}

pub fn start_gamepad_thread(app: AppHandle) {
    std::thread::spawn(move || {
        let mut gilrs = match Gilrs::new() {
            Ok(g) => g,
            Err(e) => {
                eprintln!("[input] gilrs no disponible: {e}");
                return;
            }
        };

        // Diagnóstico de mandos no detectados (fix/control-input): sin este env var
        // solo se loguean eventos "de una vez" (conexión/desconexión, botón/eje sin
        // mapear la primera vez), deduplicados para no inundar la consola. Con
        // GM_INPUT_DEBUG=1 se loguea también cada evento crudo (botón/eje conocido).
        let verbose = std::env::var("GM_INPUT_DEBUG").is_ok();
        let mut unmapped_logged: HashSet<String> = HashSet::new();

        // Direcciones sostenidas por d-pad y por stick (se unen para el auto-repeat).
        let mut dpad_down: HashSet<&'static str> = HashSet::new();
        let mut axis_dirs: HashSet<&'static str> = HashSet::new();
        let mut next_repeat: HashMap<&'static str, Instant> = HashMap::new();

        let initial = Duration::from_millis(350);
        let rate = Duration::from_millis(130);
        let th = 0.55f32;

        loop {
            while let Some(Event { id, event, .. }) = gilrs.next_event() {
                if verbose {
                    println!("[input] evento crudo id={id:?} {event:?}");
                }
                // Mandos "Driver" (clase XInput real vía WGI en Windows: Xbox, mandos
                // en modo PC) no entregan eventos de botón/eje sin foco real de
                // ventana — confirmado con logs reales (fix/control-input, sesión de
                // ago-2026): `Connected` sí llega, pero ButtonPressed/AxisChanged
                // nunca, mientras GM corre a pantalla completa. Se ignoran aquí a
                // propósito (Connected/Disconnected/Dropped se siguen logueando) — los
                // cubre `start_xinput_poll_thread` de más abajo (solo Windows, lee
                // XInput directo, sin ese requisito de foco), para no duplicar el
                // input si alguna vez WGI sí llegara a entregarlo.
                if matches!(
                    event,
                    EventType::ButtonPressed(..) | EventType::ButtonReleased(..) | EventType::AxisChanged(..)
                ) && gilrs.gamepad(id).mapping_source() == gilrs::MappingSource::Driver
                {
                    continue;
                }
                match event {
                    EventType::Connected => {
                        let gp = gilrs.gamepad(id);
                        println!(
                            "[input] Connected id={id:?} name={:?} os_name={:?} vendor={:?} product={:?} mapping_source={:?}",
                            gp.name(),
                            gp.os_name(),
                            gp.vendor_id(),
                            gp.product_id(),
                            gp.mapping_source()
                        );
                        emit_gamepad_connection(&app, gp.name().to_string(), true);
                    }
                    EventType::Disconnected => {
                        println!("[input] Disconnected id={id:?}");
                        emit_gamepad_connection(&app, gilrs.gamepad(id).name().to_string(), false);
                    }
                    EventType::Dropped => {
                        println!("[input] Dropped id={id:?}");
                    }
                    EventType::ButtonPressed(b, code) => {
                        if let Some(name) = button_name(b) {
                            emit_button(&app, name, true);
                        } else if b == Button::Unknown {
                            let key = format!("{id:?}:{code:?}");
                            if unmapped_logged.insert(key) {
                                println!("[input] Button::Unknown id={id:?} code={code:?} (sin mapear)");
                            }
                        }
                        if let Some(d) = dpad_dir(b) {
                            dpad_down.insert(d);
                        }
                    }
                    EventType::ButtonReleased(b, _) => {
                        if let Some(name) = button_name(b) {
                            emit_button(&app, name, false);
                        }
                        if let Some(d) = dpad_dir(b) {
                            dpad_down.remove(d);
                        }
                    }
                    EventType::AxisChanged(axis, value, code) => match axis {
                        // gilrs: en el eje Y, arriba es positivo.
                        Axis::LeftStickX => update_axis(&mut axis_dirs, "left", "right", value, th),
                        Axis::LeftStickY => update_axis(&mut axis_dirs, "down", "up", value, th),
                        Axis::Unknown => {
                            let key = format!("{id:?}:{code:?}");
                            if unmapped_logged.insert(key) {
                                println!("[input] Axis::Unknown id={id:?} code={code:?} value={value} (sin mapear)");
                            }
                        }
                        _ => {}
                    },
                    _ => {}
                }
            }

            // Auto-repetición de direcciones sostenidas.
            let now = Instant::now();
            for dir in ["up", "down", "left", "right"] {
                let active = dpad_down.contains(dir) || axis_dirs.contains(dir);
                if active {
                    match next_repeat.get(dir) {
                        None => {
                            emit_dir(&app, dir);
                            next_repeat.insert(dir, now + initial);
                        }
                        Some(&t) if now >= t => {
                            emit_dir(&app, dir);
                            next_repeat.insert(dir, now + rate);
                        }
                        _ => {}
                    }
                } else {
                    next_repeat.remove(dir);
                }
            }

            std::thread::sleep(Duration::from_millis(16));
        }
    });
}

// -------- Poll de XInput suplementario (solo Windows) --------
//
// `gilrs` en Windows usa por defecto el backend WGI (Windows Gaming Input), que
// según su propia documentación "requires an in focus window to be associated
// with the process to receive events" — confirmado con logs reales (ver arriba):
// los mandos de clase XInput real (`mapping_source() == Driver`: Xbox, mandos en
// modo PC) se conectan bien (`Connected` llega, con nombre/vendor/product
// correctos) pero nunca entregan botones/ejes mientras GM corre a pantalla
// completa. Los mandos DirectInput/HID (`SdlMappings`, ej. DualSense/PS5 cableado)
// no tienen ese problema y siguen cubiertos por `start_gamepad_thread` arriba, sin
// tocarlo.
//
// `rusty-xinput` llama `XInputGetState`/`XInputGetStateEx` directo (sin pasar por
// WGI), sin el requisito de foco — es la misma razón por la que gilrs ofrece su
// propia feature `xinput` para apps sin ventana enfocada (no se puede usar esa
// feature aquí: es mutuamente excluyente con `wgi` a nivel de compilación, y
// rompería el camino DirectInput/HID que sí funciona). Corre en un hilo aparte,
// sondeando los 4 slots de XInput (0-3) — que por diseño de Windows solo reportan
// mandos genuinamente XInput-class, nunca DualSense/PS5, así que no hay riesgo de
// procesar el mismo mando por partida doble con el hilo de `gilrs`.
#[cfg(windows)]
pub fn start_xinput_poll_thread(app: AppHandle) {
    use rusty_xinput::XInputHandle;

    let handle = match XInputHandle::load_default() {
        Ok(h) => h,
        Err(e) => {
            eprintln!("[input] rusty-xinput no disponible: {e:?}");
            return;
        }
    };

    // (nombre crudo, getter) — mismo set de nombres que `button_name()`, sin el
    // d-pad (aparte, ver `arrow_*` abajo). `get_state_ex` (no `get_state`) para
    // poder leer el botón Guide/Home, que la API pública de XInput no expone.
    type Getter = fn(&rusty_xinput::XInputState) -> bool;
    const BUTTONS: &[(&str, Getter)] = &[
        ("south", rusty_xinput::XInputState::south_button),
        ("east", rusty_xinput::XInputState::east_button),
        ("north", rusty_xinput::XInputState::north_button),
        ("west", rusty_xinput::XInputState::west_button),
        ("l1", rusty_xinput::XInputState::left_shoulder),
        ("r1", rusty_xinput::XInputState::right_shoulder),
        ("lt", rusty_xinput::XInputState::left_trigger_bool),
        ("rt", rusty_xinput::XInputState::right_trigger_bool),
        ("l3", rusty_xinput::XInputState::left_thumb_button),
        ("r3", rusty_xinput::XInputState::right_thumb_button),
        ("start", rusty_xinput::XInputState::start_button),
        ("select", rusty_xinput::XInputState::select_button),
        ("guide", rusty_xinput::XInputState::guide_button),
    ];

    let verbose = std::env::var("GM_INPUT_DEBUG").is_ok();

    std::thread::spawn(move || {
        let mut connected = [false; 4];
        // Estado previo por slot, mismo orden que BUTTONS, para detectar flancos
        // (XInput solo da "estado actual", no eventos press/release como gilrs).
        let mut prev = [[false; BUTTONS.len()]; 4];

        // Autorepetición de d-pad/stick — instancia propia de este hilo (no
        // comparte estado con `start_gamepad_thread`; caso límite aceptado: dos
        // mandos de tipos distintos empujando la misma dirección a la vez podrían
        // dar dos ticks de autorepeat independientes, poco probable en la sala).
        let mut dpad_down: HashSet<&'static str> = HashSet::new();
        let mut axis_dirs: HashSet<&'static str> = HashSet::new();
        let mut next_repeat: HashMap<&'static str, Instant> = HashMap::new();
        let initial = Duration::from_millis(350);
        let rate = Duration::from_millis(130);
        let th = 0.55f32;

        loop {
            for slot in 0u32..4 {
                match handle.get_state_ex(slot) {
                    Ok(state) => {
                        if !connected[slot as usize] {
                            connected[slot as usize] = true;
                            println!("[input] XInput Connected slot={slot}");
                        }
                        if verbose {
                            println!("[input] XInput estado slot={slot} {state:?}");
                        }
                        for (i, (name, getter)) in BUTTONS.iter().enumerate() {
                            let now = getter(&state);
                            if now != prev[slot as usize][i] {
                                prev[slot as usize][i] = now;
                                emit_button(&app, name, now);
                            }
                        }
                        let dpad_active = [
                            ("up", state.arrow_up()),
                            ("down", state.arrow_down()),
                            ("left", state.arrow_left()),
                            ("right", state.arrow_right()),
                        ];
                        for (dir, active) in dpad_active {
                            if active {
                                dpad_down.insert(dir);
                            } else {
                                dpad_down.remove(dir);
                            }
                        }
                        let (lx, ly) = state.left_stick_normalized();
                        update_axis(&mut axis_dirs, "left", "right", lx, th);
                        update_axis(&mut axis_dirs, "down", "up", ly, th);
                    }
                    Err(rusty_xinput::XInputUsageError::DeviceNotConnected) => {
                        if connected[slot as usize] {
                            connected[slot as usize] = false;
                            println!("[input] XInput Disconnected slot={slot}");
                            for i in 0..BUTTONS.len() {
                                prev[slot as usize][i] = false;
                            }
                        }
                    }
                    Err(e) => {
                        if verbose {
                            println!("[input] XInput error slot={slot} {e:?}");
                        }
                    }
                }
            }

            // Auto-repetición de direcciones sostenidas (mismo criterio que
            // start_gamepad_thread, ver comentario ahí).
            let now = Instant::now();
            for dir in ["up", "down", "left", "right"] {
                let active = dpad_down.contains(dir) || axis_dirs.contains(dir);
                if active {
                    match next_repeat.get(dir) {
                        None => {
                            emit_dir(&app, dir);
                            next_repeat.insert(dir, now + initial);
                        }
                        Some(&t) if now >= t => {
                            emit_dir(&app, dir);
                            next_repeat.insert(dir, now + rate);
                        }
                        _ => {}
                    }
                } else {
                    next_repeat.remove(dir);
                }
            }

            std::thread::sleep(Duration::from_millis(16));
        }
    });
}

#[cfg(not(windows))]
pub fn start_xinput_poll_thread(_app: AppHandle) {
    // No-op fuera de Windows: WGI no existe en otros SOs, `gilrs` (con su backend
    // nativo de cada plataforma) cubre todo sin este problema.
}
