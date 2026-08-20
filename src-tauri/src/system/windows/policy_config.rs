//! `IPolicyConfig` — cambiar el dispositivo de audio por defecto.
//!
//! **Esta interfaz no es API pública de Windows**: no está documentada ni
//! incluida en las bindings del crate `windows`, así que hay que declararla a
//! mano. Es la única vía desde un proceso normal para hacer lo que hace el
//! desplegable de sonido de Windows; todo lo demás (WASAPI, Core Audio) sabe
//! *leer* cuál es el dispositivo por defecto pero no *cambiarlo*.
//!
//! # Por qué el orden de los métodos es crítico
//!
//! Una interfaz COM se llama por posición en la vtable, no por nombre. Los diez
//! métodos que preceden a `SetDefaultEndpoint` **tienen que estar declarados**
//! aunque no se usen: si falta uno, `SetDefaultEndpoint` acaba invocando al
//! método anterior con los argumentos equivocados, y eso no da un error — da un
//! *crash* del proceso, o algo peor y silencioso.
//!
//! Los parámetros de esos diez van como punteros opacos a propósito: sus tipos
//! reales (`WAVEFORMATEX`, `DeviceShareMode`…) no importan mientras no se
//! llamen, y escribirlos "bien" solo añadiría superficie para equivocarse. Lo
//! que sí es exacto es la firma de `SetDefaultEndpoint`.
//!
//! Orden de la vtable (Vista en adelante, estable desde entonces):
//!   1 GetMixFormat · 2 GetDeviceFormat · 3 ResetDeviceFormat ·
//!   4 SetDeviceFormat · 5 GetProcessingPeriod · 6 SetProcessingPeriod ·
//!   7 GetShareMode · 8 SetShareMode · 9 GetPropertyValue ·
//!   10 SetPropertyValue · **11 SetDefaultEndpoint** · 12 SetEndpointVisibility

use core::ffi::c_void;

// El macro `#[interface]` genera código que referencia `::windows_core` por
// ruta absoluta, así que ese crate tiene que estar como dependencia directa
// (es el mismo que ya trae `windows`, sin coste extra) y `IUnknown_Vtbl` tiene
// que estar en el ámbito.
use windows::core::{interface, IUnknown, IUnknown_Vtbl, GUID, HRESULT, PCWSTR};
use windows::Win32::Media::Audio::ERole;

/// CLSID del coclass `CPolicyConfigClient`.
pub const CLSID_POLICY_CONFIG: GUID = GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9);

#[interface("f8679f50-850a-41cf-9c72-430f290290c8")]
pub unsafe trait IPolicyConfig: IUnknown {
    // --- los diez de antes: declarados solo para ocupar su hueco en la vtable ---
    fn GetMixFormat(&self, device_id: PCWSTR, format: *mut *mut c_void) -> HRESULT;
    fn GetDeviceFormat(&self, device_id: PCWSTR, default: i32, format: *mut *mut c_void)
        -> HRESULT;
    fn ResetDeviceFormat(&self, device_id: PCWSTR) -> HRESULT;
    fn SetDeviceFormat(
        &self,
        device_id: PCWSTR,
        endpoint_format: *const c_void,
        mix_format: *const c_void,
    ) -> HRESULT;
    fn GetProcessingPeriod(
        &self,
        device_id: PCWSTR,
        default: i32,
        default_period: *mut i64,
        min_period: *mut i64,
    ) -> HRESULT;
    fn SetProcessingPeriod(&self, device_id: PCWSTR, period: *const i64) -> HRESULT;
    fn GetShareMode(&self, device_id: PCWSTR, mode: *mut c_void) -> HRESULT;
    fn SetShareMode(&self, device_id: PCWSTR, mode: *const c_void) -> HRESULT;
    fn GetPropertyValue(
        &self,
        device_id: PCWSTR,
        key: *const c_void,
        value: *mut c_void,
    ) -> HRESULT;
    fn SetPropertyValue(
        &self,
        device_id: PCWSTR,
        key: *const c_void,
        value: *const c_void,
    ) -> HRESULT;

    // --- el que sí se usa ---
    fn SetDefaultEndpoint(&self, device_id: PCWSTR, role: ERole) -> HRESULT;
    fn SetEndpointVisibility(&self, device_id: PCWSTR, visible: i32) -> HRESULT;
}

/// Los tres roles. Cambiar solo `eConsole` deja el chat de voz sonando por el
/// dispositivo viejo y la música por el nuevo, que es exactamente el tipo de
/// medio-arreglo que hace que la gente desconfíe del launcher.
pub const ALL_ROLES: [ERole; 3] = [
    windows::Win32::Media::Audio::eConsole,
    windows::Win32::Media::Audio::eMultimedia,
    windows::Win32::Media::Audio::eCommunications,
];

/// Aplica el dispositivo por defecto en los tres roles.
///
/// # Safety
/// Debe llamarse desde un hilo con COM inicializado (el hilo de audio).
pub unsafe fn set_default_endpoint(device_id: PCWSTR) -> Result<(), String> {
    let cfg: IPolicyConfig = windows::Win32::System::Com::CoCreateInstance(
        &CLSID_POLICY_CONFIG,
        None,
        windows::Win32::System::Com::CLSCTX_ALL,
    )
    .map_err(|e| format!("system.audio.com_failed|IPolicyConfig: {e}"))?;

    for role in ALL_ROLES {
        let hr = cfg.SetDefaultEndpoint(device_id, role);
        if hr.is_err() {
            return Err("system.audio.set_default_failed".to_string());
        }
    }
    // `cfg` se suelta acá: no se cachea a propósito. Cambiar de dispositivo es
    // una acción rara y mantener viva una interfaz no documentada entre
    // llamadas no compensa.
    drop(cfg);
    Ok(())
}
