//! Audio de Windows (Core Audio / WASAPI): volumen, silencio y dispositivo por
//! defecto, para salida y entrada.
//!
//! # Por qué un hilo residente
//!
//! Los comandos de Tauri corren en hilos de un pool **sin COM inicializado**, y
//! windows-rs marca las interfaces como `Send`/`Sync`, así que el compilador no
//! avisa si un puntero COM cruza de apartment: se manifiesta como fallos
//! esporádicos y difíciles de reproducir. Un hilo propio con
//! `CoInitializeEx(COINIT_MULTITHREADED)`, dueño de todos los objetos COM y con
//! un canal de comandos, elimina el problema de raíz.
//!
//! Y de paso permite **cachear el `IAudioEndpointVolume`** del endpoint por
//! defecto: subir el volumen queda en una sola llamada
//! (`SetMasterVolumeLevelScalar`, microsegundos) en vez de enumerar
//! dispositivos en cada pulsación. Ése era el requisito que motivó hacer el
//! audio nativo en vez de por línea de comandos.

use std::sync::mpsc::{sync_channel, Receiver, SyncSender};
use std::thread;

use windows::core::{HSTRING, PCWSTR, PWSTR};
use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
use windows::Win32::Foundation::{BOOL, RPC_E_CHANGED_MODE, S_FALSE, S_OK};
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{
    eCapture, eConsole, eRender, EDataFlow, IMMDevice, IMMDeviceEnumerator, MMDeviceEnumerator,
    DEVICE_STATE_ACTIVE,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
    COINIT_MULTITHREADED, STGM_READ,
};

use super::super::{AudioChannel, Channel, Device};
use super::policy_config::set_default_endpoint;

// --------------------------- API del módulo ---------------------------

/// Handle al hilo de audio. Clonable y `Send`: lo único que viaja es el canal.
#[derive(Clone)]
pub struct AudioEngine {
    tx: SyncSender<Cmd>,
}

enum Cmd {
    Snapshot(SyncSender<Snapshot>),
    SetVolume(Channel, u8, SyncSender<Result<(), String>>),
    SetMuted(Channel, bool, SyncSender<Result<(), String>>),
    SetDefault(Channel, String, SyncSender<Result<(), String>>),
}

#[derive(Clone, Default)]
pub struct Snapshot {
    pub output: ChannelState,
    pub input: ChannelState,
}

#[derive(Clone, Default)]
pub struct ChannelState {
    pub volume: u8,
    pub muted: bool,
    pub devices: Vec<Device>,
    pub current: String,
}

impl From<ChannelState> for AudioChannel {
    fn from(c: ChannelState) -> Self {
        AudioChannel {
            volume: c.volume,
            muted: c.muted,
            devices: c.devices,
            current: c.current,
        }
    }
}

impl AudioEngine {
    /// Arranca el hilo. Devuelve `Err` si COM no se pudo inicializar allí, para
    /// que `WindowsSystemControls::new()` pueda degradar al mock en vez de
    /// dejar un QAM que falla en cada pulsación.
    pub fn start() -> Result<Self, String> {
        let (tx, rx) = sync_channel::<Cmd>(16);
        let (ready_tx, ready_rx) = sync_channel::<Result<(), String>>(1);

        thread::Builder::new()
            .name("gm-audio".into())
            .spawn(move || audio_thread(rx, ready_tx))
            .map_err(|e| format!("system.task_failed|hilo de audio: {e}"))?;

        ready_rx
            .recv()
            .map_err(|e| format!("system.task_failed|hilo de audio: {e}"))??;
        Ok(AudioEngine { tx })
    }

    fn ask<T>(&self, make: impl FnOnce(SyncSender<T>) -> Cmd, on_dead: T) -> T {
        let (tx, rx) = sync_channel::<T>(1);
        if self.tx.send(make(tx)).is_err() {
            return on_dead;
        }
        rx.recv().unwrap_or(on_dead)
    }

    pub fn snapshot(&self) -> Snapshot {
        self.ask(Cmd::Snapshot, Snapshot::default())
    }

    pub fn set_volume(&self, ch: Channel, v: u8) -> Result<(), String> {
        self.ask(
            |tx| Cmd::SetVolume(ch, v, tx),
            Err("system.audio.com_failed|hilo de audio caído".into()),
        )
    }

    pub fn set_muted(&self, ch: Channel, muted: bool) -> Result<(), String> {
        self.ask(
            |tx| Cmd::SetMuted(ch, muted, tx),
            Err("system.audio.com_failed|hilo de audio caído".into()),
        )
    }

    pub fn set_device(&self, ch: Channel, id: &str) -> Result<(), String> {
        let id = id.to_string();
        self.ask(
            |tx| Cmd::SetDefault(ch, id, tx),
            Err("system.audio.com_failed|hilo de audio caído".into()),
        )
    }
}

// ------------------------------ el hilo ------------------------------

fn audio_thread(rx: Receiver<Cmd>, ready: SyncSender<Result<(), String>>) {
    unsafe {
        // `CoInitializeEx` devuelve HRESULT (no Result) en windows 0.58.
        // `RPC_E_CHANGED_MODE` significa "este hilo ya estaba en otro
        // apartment": no es nuestro caso (el hilo es nuevo), pero se tolera por
        // si el runtime cambia — lo que NO se puede hacer entonces es
        // `CoUninitialize` al salir.
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        let owns_com = hr == S_OK || hr == S_FALSE;
        if !owns_com && hr != RPC_E_CHANGED_MODE {
            let _ = ready.send(Err(format!("system.audio.com_failed|CoInitializeEx {hr:?}")));
            return;
        }

        let enumerator: IMMDeviceEnumerator =
            match CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) {
                Ok(e) => e,
                Err(e) => {
                    let _ = ready.send(Err(format!("system.audio.com_failed|{e}")));
                    if owns_com {
                        CoUninitialize();
                    }
                    return;
                }
            };

        let _ = ready.send(Ok(()));

        // Volumen del endpoint por defecto, cacheado por canal: es lo que hace
        // que mover el slider sea instantáneo.
        let mut cache = VolumeCache::default();

        while let Ok(cmd) = rx.recv() {
            match cmd {
                Cmd::Snapshot(reply) => {
                    let _ = reply.send(read_snapshot(&enumerator, &mut cache));
                }
                Cmd::SetVolume(ch, v, reply) => {
                    let r = cache.endpoint_fast(&enumerator, ch).and_then(|vol| {
                        vol.SetMasterVolumeLevelScalar(v.min(100) as f32 / 100.0, std::ptr::null())
                            .map_err(|e| format!("system.audio.com_failed|{e}"))
                    });
                    let _ = reply.send(r);
                }
                Cmd::SetMuted(ch, muted, reply) => {
                    let r = cache.endpoint_fast(&enumerator, ch).and_then(|vol| {
                        vol.SetMute(BOOL::from(muted), std::ptr::null()).map_err(|e| {
                            // Un micrófono sin control de silencio por hardware
                            // responde E_NOTIMPL. No es un fallo del launcher.
                            format!("system.audio.com_failed|{e}")
                        })
                    });
                    let _ = reply.send(r);
                }
                Cmd::SetDefault(ch, id, reply) => {
                    let wide = HSTRING::from(id.as_str());
                    let r = set_default_endpoint(PCWSTR(wide.as_ptr()));
                    if r.is_ok() {
                        // El endpoint por defecto cambió: el volumen cacheado
                        // apunta al dispositivo viejo.
                        cache.invalidate(ch);
                    }
                    let _ = reply.send(r);
                }
            }
        }

        if owns_com {
            CoUninitialize();
        }
    }
}

// --------------------------- caché de volumen ---------------------------

#[derive(Default)]
struct VolumeCache {
    output: Option<(String, IAudioEndpointVolume)>,
    input: Option<(String, IAudioEndpointVolume)>,
}

impl VolumeCache {
    fn slot(&mut self, ch: Channel) -> &mut Option<(String, IAudioEndpointVolume)> {
        match ch {
            Channel::Output => &mut self.output,
            Channel::Input => &mut self.input,
        }
    }

    fn invalidate(&mut self, ch: Channel) {
        *self.slot(ch) = None;
    }

    /// Para los mutadores: usa lo cacheado sin preguntarle a Windows cuál es el
    /// endpoint por defecto.
    ///
    /// Es la razón de ser de la caché. Mover el slider dispara una ráfaga de
    /// `set_volume`, y verificar el default en cada uno añadiría dos llamadas
    /// COM por pulsación — precisamente el coste que este diseño existe para
    /// evitar. Si el dispositivo por defecto cambió por fuera, lo corrige el
    /// siguiente snapshot (el poll del QAM va cada 2 s).
    unsafe fn endpoint_fast(
        &mut self,
        enumerator: &IMMDeviceEnumerator,
        ch: Channel,
    ) -> Result<IAudioEndpointVolume, String> {
        if let Some((_, vol)) = self.slot(ch) {
            return Ok(vol.clone());
        }
        self.endpoint(enumerator, ch)
    }

    /// Para el snapshot: comprueba cuál es el endpoint por defecto AHORA y
    /// reabre el control si cambió (auriculares enchufados, cambio desde
    /// Windows).
    unsafe fn endpoint(
        &mut self,
        enumerator: &IMMDeviceEnumerator,
        ch: Channel,
    ) -> Result<IAudioEndpointVolume, String> {
        let flow = flow_of(ch);
        let device = enumerator
            .GetDefaultAudioEndpoint(flow, eConsole)
            .map_err(|_| "system.audio.device_not_found".to_string())?;
        let id = device_id(&device)?;

        if let Some((cached_id, vol)) = self.slot(ch) {
            if *cached_id == id {
                return Ok(vol.clone());
            }
        }

        let vol: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("system.audio.com_failed|{e}"))?;
        *self.slot(ch) = Some((id, vol.clone()));
        Ok(vol)
    }
}

// ------------------------------ lecturas ------------------------------

fn flow_of(ch: Channel) -> EDataFlow {
    match ch {
        Channel::Output => eRender,
        Channel::Input => eCapture,
    }
}

unsafe fn read_snapshot(enumerator: &IMMDeviceEnumerator, cache: &mut VolumeCache) -> Snapshot {
    Snapshot {
        output: read_channel(enumerator, cache, Channel::Output),
        input: read_channel(enumerator, cache, Channel::Input),
    }
}

unsafe fn read_channel(
    enumerator: &IMMDeviceEnumerator,
    cache: &mut VolumeCache,
    ch: Channel,
) -> ChannelState {
    let mut state = ChannelState::default();

    // Lista de dispositivos activos. Un PC sin micrófono devuelve 0: no es un
    // error, la categoría simplemente sale vacía.
    if let Ok(collection) = enumerator.EnumAudioEndpoints(flow_of(ch), DEVICE_STATE_ACTIVE) {
        let count = collection.GetCount().unwrap_or(0);
        for i in 0..count {
            if let Ok(dev) = collection.Item(i) {
                if let (Ok(id), Some(name)) = (device_id(&dev), friendly_name(&dev)) {
                    state.devices.push(Device { id, name });
                }
            }
        }
    }

    // Volumen/silencio del que esté por defecto.
    match cache.endpoint(enumerator, ch) {
        Ok(vol) => {
            state.volume = vol
                .GetMasterVolumeLevelScalar()
                .map(|v| (v * 100.0).round().clamp(0.0, 100.0) as u8)
                .unwrap_or(0);
            state.muted = vol.GetMute().map(|m| m.as_bool()).unwrap_or(false);
            if let Some((id, _)) = cache.slot(ch) {
                state.current = id.clone();
            }
        }
        // Sin dispositivo por defecto (todo desconectado): el resto del
        // snapshot sigue siendo válido.
        Err(_) => {}
    }

    state
}

/// Id estable del endpoint (el mismo string que consume `set_device`).
unsafe fn device_id(device: &IMMDevice) -> Result<String, String> {
    let pw: PWSTR = device
        .GetId()
        .map_err(|e| format!("system.audio.com_failed|{e}"))?;
    let s = pw.to_string().unwrap_or_default();
    // `GetId` devuelve memoria del asignador de COM: hay que soltarla.
    CoTaskMemFree(Some(pw.0 as *const _));
    if s.is_empty() {
        Err("system.audio.device_not_found".to_string())
    } else {
        Ok(s)
    }
}

/// Nombre para mostrar ("Altavoces (Realtek…)"). `None` si el dispositivo no lo
/// expone: se omite de la lista en vez de mostrar una fila sin nombre.
unsafe fn friendly_name(device: &IMMDevice) -> Option<String> {
    let store = device.OpenPropertyStore(STGM_READ).ok()?;
    let value = store.GetValue(&PKEY_Device_FriendlyName).ok()?;
    let name = value.to_string();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}
