/*
 * Auto-actualización (Configuración → Actualizaciones).
 *
 * Se envuelve `tauri-plugin-updater` en comandos propios en vez de usar su API
 * de JavaScript por una razón dura: `check()` del lado JS NO acepta
 * `endpoints`, así que el selector de canal (estable/beta) es imposible desde
 * el frontend. Desde Rust, `UpdaterBuilder::endpoints()` sí sobreescribe lo que
 * declara tauri.conf.json, que es exactamente lo que necesita el selector.
 *
 * De paso: la WebView no recibe permisos `updater:*` (capabilities/default.json
 * no se toca) — el frontend solo puede pedir "beta" o "stable", nunca una URL
 * arbitraria.
 *
 * Los endpoints NO apuntan al release de cada versión sino a un release-puntero
 * fijo con tag `channels`, porque `releases/latest/download/…` de GitHub
 * resuelve solo al último release que NO sea prerelease — y las betas se
 * publican como prerelease, así que por esa vía no se verían nunca. El workflow
 * de release republica ahí el manifiesto que toca (ver .github/workflows/release.yml).
 */

use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::{Update, UpdaterExt};

const REPO: &str = "https://github.com/LaloSoftware/project-velum";

/// id de canal (dato persistido en config.json, NO se traduce ni se renombra)
/// → manifiesto en el release `channels`.
fn channel_url(channel: &str) -> Result<String, String> {
    let manifest = match channel {
        "stable" => "latest.json",
        "beta" => "beta.json",
        other => return Err(format!("update.unknown_channel|{other}")),
    };
    Ok(format!("{REPO}/releases/download/channels/{manifest}"))
}

/// La actualización encontrada por `update_check`, a la espera de que la
/// persona confirme. `.0` es el handle del updater; `.1`, los bytes del
/// instalador ya descargado (se sostienen en memoria entre "Descargar" e
/// "Instalar": ~10-15 MB del setup de NSIS).
#[derive(Default)]
pub struct PendingUpdate(pub Mutex<Option<Arc<Update>>>, pub Mutex<Option<Vec<u8>>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    current_version: String,
    /// Notas del release. El frontend las pinta como TEXTO PLANO (nunca
    /// `{@html}`): vienen del cuerpo del release de GitHub.
    notes: Option<String>,
    pub_date: Option<String>,
    channel: String,
}

/// Busca en el canal indicado. `Ok(None)` = no hay nada más nuevo (incluye el
/// caso del canal estable "sembrado" con la versión 0.0.0 mientras no haya
/// releases estables).
#[tauri::command]
pub async fn update_check(
    app: AppHandle,
    state: State<'_, PendingUpdate>,
    channel: String,
) -> Result<Option<UpdateInfo>, String> {
    let url = channel_url(&channel)?;
    let updater = app
        .updater_builder()
        .endpoints(vec![url
            .parse()
            .map_err(|e| format!("update.endpoint_invalid|{e}"))?])
        .map_err(|e| format!("update.endpoint_invalid|{e}"))?
        // Sin timeout, un endpoint que no responde deja el botón "Buscando…"
        // para siempre y sin forma de salir con el mando.
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("update.builder_failed|{e}"))?;

    let found = updater
        .check()
        .await
        .map_err(|e| format!("update.check_failed|{e}"))?;

    // Cualquier búsqueda nueva invalida la descarga anterior.
    *state.1.lock().unwrap() = None;

    let Some(update) = found else {
        *state.0.lock().unwrap() = None;
        return Ok(None);
    };

    let info = UpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        notes: update.body.clone(),
        // Del JSON crudo del manifiesto: evita arrastrar el crate `time` solo
        // para volver a formatear una fecha que ya viene como texto ISO.
        pub_date: update
            .raw_json
            .get("pub_date")
            .and_then(|v| v.as_str())
            .map(String::from),
        channel,
    };
    *state.0.lock().unwrap() = Some(Arc::new(update));
    Ok(Some(info))
}

/// Descarga el instalador de la actualización pendiente (no instala nada).
/// Emite `gm://update-progress` con `{ downloaded, total }`; `total` es `null`
/// si el servidor no manda Content-Length.
#[tauri::command]
pub async fn update_download(
    app: AppHandle,
    state: State<'_, PendingUpdate>,
) -> Result<(), String> {
    // Se clona el Arc y se SUELTA el lock antes del await: un MutexGuard vivo
    // a través de un `.await` haría el future no-Send y no compilaría.
    let update = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().cloned()
    };
    let update = update.ok_or_else(|| "update.no_pending".to_string())?;

    let downloaded = Mutex::new(0u64);
    let bytes = update
        .download(
            |chunk, total| {
                let mut acc = downloaded.lock().unwrap();
                *acc += chunk as u64;
                let _ = app.emit(
                    "gm://update-progress",
                    serde_json::json!({ "downloaded": *acc, "total": total }),
                );
            },
            || {},
        )
        .await
        .map_err(|e| format!("update.download_failed|{e}"))?;

    *state.1.lock().unwrap() = Some(bytes);
    Ok(())
}

/// Instala lo ya descargado. **En Windows este comando no retorna**: el
/// instalador de NSIS cierra la app. El frontend trata `installing` como estado
/// terminal por eso.
#[tauri::command]
pub async fn update_install(state: State<'_, PendingUpdate>) -> Result<(), String> {
    let update = {
        let guard = state.0.lock().unwrap();
        guard.as_ref().cloned()
    };
    let update = update.ok_or_else(|| "update.no_pending".to_string())?;
    let bytes = {
        let mut guard = state.1.lock().unwrap();
        guard.take()
    };
    let bytes = bytes.ok_or_else(|| "update.no_pending".to_string())?;

    update
        .install(bytes)
        .map_err(|e| format!("update.install_failed|{e}"))
}

/// Reinicia la app tras instalar (macOS/Linux, donde `install()` sí retorna).
#[tauri::command]
pub fn update_relaunch(app: AppHandle) -> Result<(), String> {
    app.restart()
}

/// Limpia el instalador descargado al descartar la actualización ("Después"),
/// para no sostener ~15 MB en memoria por el resto de la sesión. El handle del
/// updater se conserva: permite reintentar sin volver a buscar.
#[tauri::command]
pub fn update_discard(state: State<'_, PendingUpdate>) -> Result<(), String> {
    *state.1.lock().unwrap() = None;
    Ok(())
}
