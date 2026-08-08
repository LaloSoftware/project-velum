// Evita abrir una consola extra en Windows en modo release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod assets;
mod config;
mod input;
mod launch;
mod library;
mod shortcuts;
mod steam_api;
mod system;

use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        // Leer el portapapeles del SO para "Pegar" en el teclado virtual
        // (Ctrl+V) — más confiable que la Clipboard API del navegador, que en
        // WebView2/WKWebView necesita un permiso que no siempre se resuelve.
        .plugin(tauri_plugin_clipboard_manager::init())
        // Controles de sistema (mock en dev; WindowsSystemControls en el futuro).
        .manage(system::SystemHandle(Mutex::new(Box::new(
            system::mock::MockSystemControls::new(),
        ))))
        // Sesión de juego activa (ciclo lanzar/suspender/restaurar).
        .manage(launch::PlayState::default())
        .setup(|app| {
            // Hilo de lectura de mando(s) que emite eventos al frontend.
            input::start_gamepad_thread(app.handle().clone());
            // Poll de XInput suplementario (solo Windows, no-op en otros SOs) —
            // cubre mandos XInput-class que WGI no reparte sin foco de ventana
            // (ver src/input.rs::start_xinput_poll_thread, fix/control-input).
            input::start_xinput_poll_thread(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            library::list_games,
            system::system_get_state,
            system::system_set_volume,
            system::system_set_muted,
            system::system_set_output_device,
            system::system_set_wifi,
            system::system_set_bluetooth,
            system::system_shutdown,
            launch::launch_game,
            launch::focus_game,
            launch::uninstall_game,
            launch::steam_open_install,
            launch::open_url,
            assets::read_image,
            assets::read_audio,
            config::load_config,
            config::save_config,
            shortcuts::run_shortcut,
            steam_api::steam_link_account,
            steam_api::steam_unlink_account,
            steam_api::steam_has_key,
            steam_api::library::steam_sync_library,
            steam_api::library::steam_library,
            steam_api::achievements::steam_sync_achievements,
            steam_api::achievements::steam_achievements,
            steam_api::achievements::steam_achievements_summary,
            steam_api::global_achievements::steam_global_achievement_percentages,
        ])
        .run(tauri::generate_context!())
        .expect("error al arrancar la aplicación Tauri");
}
