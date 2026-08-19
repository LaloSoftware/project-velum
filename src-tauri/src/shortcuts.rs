//! Simula combinaciones de teclado a nivel de sistema operativo, para los
//! atajos personalizados que el usuario define en Ajustes > Atajos (ver
//! `stores/customShortcuts.js` en el frontend) — ej. Alt+R para activar un
//! overlay de FPS/CPU de terceros.
//!
//! Solo Windows (`SendInput`, crate `windows`, feature
//! `Win32_UI_Input_KeyboardAndMouse` en Cargo.toml); en otras plataformas
//! (dev en macOS) es un no-op, igual que el resto de controles de sistema
//! (ver `system/mod.rs`).

#[tauri::command]
pub async fn run_shortcut(modifiers: Vec<String>, code: String) -> Result<(), String> {
    #[cfg(windows)]
    send_shortcut_windows(&modifiers, &code)?;
    #[cfg(not(windows))]
    println!("[mock] run_shortcut: {:?} + {}", modifiers, code);
    Ok(())
}

#[cfg(windows)]
fn send_shortcut_windows(modifiers: &[String], code: &str) -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_CONTROL, VK_LWIN, VK_MENU, VK_SHIFT,
    };

    let key_vk = code_to_vk(code).ok_or_else(|| format!("shortcuts.unsupported_key|{code}"))?;
    let mod_vks: Vec<VIRTUAL_KEY> = modifiers
        .iter()
        .filter_map(|m| match m.as_str() {
            "ctrl" => Some(VK_CONTROL),
            "alt" => Some(VK_MENU),
            "shift" => Some(VK_SHIFT),
            "meta" => Some(VK_LWIN),
            _ => None,
        })
        .collect();

    let key_input = |vk: VIRTUAL_KEY, up: bool| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    // Secuencia: modificadores abajo → tecla abajo → tecla arriba →
    // modificadores arriba (orden inverso), como sostener y soltar a mano.
    let mut sequence: Vec<INPUT> = Vec::with_capacity(mod_vks.len() * 2 + 2);
    for vk in &mod_vks {
        sequence.push(key_input(*vk, false));
    }
    sequence.push(key_input(key_vk, false));
    sequence.push(key_input(key_vk, true));
    for vk in mod_vks.iter().rev() {
        sequence.push(key_input(*vk, true));
    }

    let sent = unsafe { SendInput(&sequence, std::mem::size_of::<INPUT>() as i32) };
    if sent as usize != sequence.len() {
        return Err("shortcuts.send_input_failed".into());
    }
    Ok(())
}

// `code` = KeyboardEvent.code del navegador (ej. "KeyR", "Digit5", "F5").
// Subset útil para MVP: letras, dígitos, F1-F12 y algunas teclas nombradas
// comunes — no exhaustivo (ver docs/input.md).
#[cfg(windows)]
fn code_to_vk(code: &str) -> Option<windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;
    Some(match code {
        "KeyA" => VK_A,
        "KeyB" => VK_B,
        "KeyC" => VK_C,
        "KeyD" => VK_D,
        "KeyE" => VK_E,
        "KeyF" => VK_F,
        "KeyG" => VK_G,
        "KeyH" => VK_H,
        "KeyI" => VK_I,
        "KeyJ" => VK_J,
        "KeyK" => VK_K,
        "KeyL" => VK_L,
        "KeyM" => VK_M,
        "KeyN" => VK_N,
        "KeyO" => VK_O,
        "KeyP" => VK_P,
        "KeyQ" => VK_Q,
        "KeyR" => VK_R,
        "KeyS" => VK_S,
        "KeyT" => VK_T,
        "KeyU" => VK_U,
        "KeyV" => VK_V,
        "KeyW" => VK_W,
        "KeyX" => VK_X,
        "KeyY" => VK_Y,
        "KeyZ" => VK_Z,
        "Digit0" => VK_0,
        "Digit1" => VK_1,
        "Digit2" => VK_2,
        "Digit3" => VK_3,
        "Digit4" => VK_4,
        "Digit5" => VK_5,
        "Digit6" => VK_6,
        "Digit7" => VK_7,
        "Digit8" => VK_8,
        "Digit9" => VK_9,
        "F1" => VK_F1,
        "F2" => VK_F2,
        "F3" => VK_F3,
        "F4" => VK_F4,
        "F5" => VK_F5,
        "F6" => VK_F6,
        "F7" => VK_F7,
        "F8" => VK_F8,
        "F9" => VK_F9,
        "F10" => VK_F10,
        "F11" => VK_F11,
        "F12" => VK_F12,
        "Escape" => VK_ESCAPE,
        "Tab" => VK_TAB,
        "Enter" => VK_RETURN,
        "Space" => VK_SPACE,
        "Backspace" => VK_BACK,
        "ArrowUp" => VK_UP,
        "ArrowDown" => VK_DOWN,
        "ArrowLeft" => VK_LEFT,
        "ArrowRight" => VK_RIGHT,
        _ => return None,
    })
}
