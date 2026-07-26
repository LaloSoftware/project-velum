//! Lanzamiento de juegos.
//!
//! MVP: solo registra la intención (no-op), porque en macOS/dev no hay juegos ni
//! tiendas reales. La frontera ya está lista para la lógica definitiva (fase F3):
//!   1. lanzar el juego (URI `steam://...` o ejecutable, vía plugin-shell),
//!   2. SUSPENDER el launcher (ocultar la ventana / liberar recursos),
//!   3. un watcher detecta el fin del proceso y RESTAURA la ventana.
//! Ver docs/architecture.md.

#[tauri::command]
pub async fn launch_game(id: String, target: String) -> Result<(), String> {
    println!("[launch] juego '{id}' -> {target} (mock: no se suspende la ventana en dev)");
    Ok(())
}

#[tauri::command]
pub async fn open_launcher(store: String) -> Result<(), String> {
    println!("[launch] abrir cliente nativo: {store} (mock)");
    Ok(())
}

/// Desinstalar un juego/app. MVP: solo registra. En Windows (futuro) ejecutará
/// el desinstalador real del juego.
#[tauri::command]
pub async fn uninstall_game(id: String, target: String) -> Result<(), String> {
    println!("[launch] desinstalar '{id}' -> {target} (mock: no ejecuta nada en dev)");
    Ok(())
}
