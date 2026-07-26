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

        // Direcciones sostenidas por d-pad y por stick (se unen para el auto-repeat).
        let mut dpad_down: HashSet<&'static str> = HashSet::new();
        let mut axis_dirs: HashSet<&'static str> = HashSet::new();
        let mut next_repeat: HashMap<&'static str, Instant> = HashMap::new();

        let initial = Duration::from_millis(350);
        let rate = Duration::from_millis(130);
        let th = 0.55f32;

        loop {
            while let Some(Event { event, .. }) = gilrs.next_event() {
                match event {
                    EventType::ButtonPressed(b, _) => {
                        if let Some(name) = button_name(b) {
                            emit_button(&app, name, true);
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
                    EventType::AxisChanged(axis, value, _) => match axis {
                        // gilrs: en el eje Y, arriba es positivo.
                        Axis::LeftStickX => update_axis(&mut axis_dirs, "left", "right", value, th),
                        Axis::LeftStickY => update_axis(&mut axis_dirs, "down", "up", value, th),
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
