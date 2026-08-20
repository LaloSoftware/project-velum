# Controles de sistema (QAM: Wi-Fi / Bluetooth / audio)

El menú de acceso rápido (QAM → "Sistema") permite gestionar red, Bluetooth y audio sin
volver a Windows. Cuatro categorías: **Red · Bluetooth · Salida · Entrada**.

Todo se abstrae tras el trait `SystemControls` (`src-tauri/src/system/mod.rs`), con dos
implementaciones: `MockSystemControls` (dev, cualquier SO) y —en fases posteriores—
`WindowsSystemControls`.

## Estado de la implementación

| Área | Contrato + mock + UI | Backend real de Windows |
|---|---|---|
| Audio salida/entrada (volumen, mute, dispositivo) | ✅ | ✅ validado en hardware |
| Wi-Fi (escanear, conectar, olvidar, radio) | ✅ | ⚠️ fase 4 — ver "Escaneo denegado" |
| Bluetooth (radio, listar, emparejar, conectar) | ✅ | ⏳ fases 5-7 |

Las fases 0-2 (modelo, mock y frontend) están cerradas y se verifican al 100% en macOS.
La fase 3 (audio) está confirmada funcionando en un PC real. La fase 4 (Wi-Fi) está escrita,
**type-checkeada** con `npm run win:check` y con el parseo cubierto por tests que corren en
Mac, pero su comportamiento contra hardware sigue sin confirmar.
El plan detallado de las fases de Windows vive en `feature-system-controls.md` (raíz,
gitignored).

## El trait

```rust
pub trait SystemControls: Send + Sync {
    fn state(&self) -> SystemState;                      // barato, de caché
    fn set_volume(&self, ch: Channel, v: u8) -> Result<(), String>;
    fn set_muted(&self, ch: Channel, muted: bool) -> Result<(), String>;
    fn set_device(&self, ch: Channel, id: &str) -> Result<(), String>;
    fn set_wifi(&self, enabled: bool) -> Result<(), String>;
    fn set_bluetooth(&self, enabled: bool) -> Result<(), String>;
    // lentas: siempre desde spawn_blocking; publican en la caché interna
    fn wifi_scan(&self) -> Result<(), String>;
    fn wifi_connect(&self, ssid: &str, password: Option<&str>) -> Result<(), String>;
    fn wifi_forget(&self, ssid: &str) -> Result<(), String>;
    fn bt_scan(&self, seconds: u8) -> Result<(), String>;
    fn bt_pair(&self, id: &str) -> Result<(), String>;
    fn bt_unpair(&self, id: &str) -> Result<(), String>;
    fn bt_set_connected(&self, id: &str, connected: bool) -> Result<(), String>;
    fn refresh_fast(&self);
}
```

Dos decisiones de forma que conviene **no** deshacer:

1. **`&self` + `SystemHandle(Arc<dyn SystemControls>)`**, no `&mut self` +
   `Mutex<Box<dyn …>>`. Con un mutex global, un escaneo Wi-Fi de 5 s bloquearía subir el
   volumen. La mutabilidad va dentro de cada implementación, con locks finos (canal al
   hilo de audio, `RwLock` para redes/BT, `AtomicBool` para las banderas de escaneo).
2. **Las operaciones lentas devuelven `()`, no la lista.** El resultado se publica por la
   caché interna + el evento `gm://system-state`: una sola vía de verdad para el frontend.

La implementación la elige `system::build_system_controls()` (`mod.rs`), copiando el
criterio best-effort de `library::active_sources`: si el motor real no arranca, degrada al
mock en vez de dejar el QAM muerto.

## Modelo `SystemState`

Serializado en camelCase para el frontend:

```
wifiPresent, wifiEnabled, wifiScanning, currentNetwork, networks[],
ethernetConnected, ethernetName,
bluetoothPresent, bluetoothEnabled, btScanning, btDevices[],
output, input
```

- `networks[]` → `{ ssid, secured, signal (0-100), known, active }`
- `btDevices[]` → `{ id, name, paired, connected, canConnect, kind }`
  (`kind`: `gamepad` | `audio` | `input` | `phone` | `other`, solo para el icono)
- `output` / `input` → `{ volume, muted, devices[{id,name}], current }`
- `Channel` es un id del protocolo: `"output"` | `"input"`, **no se traduce ni se
  renombra** (regla de oro de `docs/i18n.md`).

`wifiScanning` / `btScanning` viajan en el estado y no solo en el frontend, para que
cerrar y reabrir el QAM a mitad de escaneo reconstruya la UI correcta.

`wifiPresent` / `bluetoothPresent` en `false` hacen que la categoría muestre el aviso y no
se despliegue: un PC de sobremesa sin Wi-Fi no debe mostrar una lista vacía y un botón que
falla.

## Comandos

Rápidos y síncronos (devuelven `Result`, emiten el estado al terminar):
`system_get_state`, `system_set_volume`, `system_set_muted`, `system_set_device`,
`system_set_wifi`, `system_set_bluetooth`.

Lentos (`async` + `spawn_blocking`, emiten `gm://system-state` al terminar **también si
fallan**, para que la UI no se quede con el "Conectando…" puesto):
`system_wifi_scan`, `system_wifi_connect`, `system_wifi_forget`, `system_bt_scan`,
`system_bt_pair`, `system_bt_unpair`, `system_bt_set_connected`.

Aparte, `system_shutdown` (dispara-y-olvida, sin estado, con `CREATE_NO_WINDOW` para que
no parpadee una consola encima del juego).

Ojo al implementar comandos lentos nuevos: hay que sacar el `Arc` del `State` **antes** del
`await` (`State` no es `Send`). El helper `slow()` de `mod.rs` ya encapsula ese patrón.

## Refresco: híbrido

Caché en Rust + comandos explícitos para lo lento + evento push `gm://system-state` +
**poll ligero de 2 s solo mientras la sección del QAM está montada**
(`startSystemWatch()` en `src/lib/stores/system.js` devuelve el `stop()`).

Solo polling no sirve: si `state()` escaneara, cada tick lanzaría un escaneo de 5 s; y si
no escanea, la lista nunca cambiaría. Solo push tampoco: no cubre los cambios externos
baratos (teclas de volumen, auriculares enchufados, cable Ethernet) sin registrar callbacks
COM. El híbrido funciona porque `state()` solo lee caché y valores baratos.

Reglas para cualquier implementación: nunca un lock global; `state()` clona bajo lectura y
suelta; jamás sostener un lock durante un `emit` o una llamada al SO; reentrada de escaneo
protegida con `compare_exchange`; escaneo Wi-Fi al montar la sección (no en cada tick) y
escaneo BT solo bajo demanda.

El store descarta el volumen entrante durante ~600 ms tras el último ajuste local, para que
el poll no pelee con la persona moviendo el slider.

## Frontera con el frontend

`src/lib/ipc/index.js` — **el mock JS se elige por `isTauri`, nunca por `catch`**. Tragarse
el error de un `system_set_wifi` que falla por permisos dejaría la UI mostrando "ON" con la
radio apagada: es el fallo más peligroso de esta frontera. Todos los mutadores propagan, y
`src/lib/stores/system.js` los envuelve con `reportError` + `refreshSystem()`.

`onSystemState(cb)` escucha `gm://system-state` (mismo contrato que `onUpdateProgress`).

## Errores

Códigos estables (`"codigo"` o `"codigo|detalle"`, ver `src/lib/i18n/errors.js`), con una
entrada `errors.system.*` por código en los tres idiomas:

```
system.task_failed · system.unsupported · system.shutdown_failed
system.audio.com_failed · system.audio.device_not_found · system.audio.set_default_failed
system.wifi.unavailable · system.wifi.scan_failed · system.wifi.profile_failed
system.wifi.connect_failed · system.wifi.wrong_password · system.wifi.timeout
system.radio.unavailable · system.radio.access_denied · system.radio.set_failed
system.bt.unavailable · system.bt.scan_failed · system.bt.device_not_found
system.bt.pair_failed · system.bt.pair_rejected · system.bt.pin_required
system.bt.unpair_failed · system.bt.connect_failed · system.bt.connect_unsupported
```

`system.wifi.wrong_password` no es solo un mensaje: el store lo trata como flujo y vuelve a
pedir la clave en el teclado virtual en vez de perder lo tecleado.

## Mock (`system/mock.rs` y su espejo JS)

No es un stub: imita la **concurrencia** y la **latencia** del backend real, que es justo lo
que hay que poder diseñar sin un PC Windows delante.

- Escaneo Wi-Fi 1,5 s (cada escaneo destapa una red más) · conectar 2 s · escaneo BT 3 s
  (añade 2 dispositivos sin emparejar) · emparejar 2,5 s.
- Conectar a una red protegida **nueva** falla con `system.wifi.wrong_password` si la clave
  no es `1234`.
- Apagar la radio BT desconecta todo y descarta lo no emparejado, como hace Windows.

El espejo en JS (`ipc/index.js`) reproduce las mismas latencias y códigos para que
`npm run web` se comporte igual que la app.

## Teclado virtual: `mask`

`openKeyboard(inicial, título, { mask: true })` pinta el valor con puntos y añade un botón
"Mostrar" (`stores/keyboard.js`, `VirtualKeyboard.svelte`). Obligatorio para claves de
Wi-Fi: la pantalla está en la sala, a la vista de todos.

## `npm run win:check` — comprobar el código de Windows desde Mac

`src-tauri/src/system/windows/` solo compila con `#[cfg(windows)]`, así que en Mac se
escribe a ciegas y el primer error de tipos aparecería en el PC de la sala, con el ciclo de
prueba más lento posible.

`cargo check --target x86_64-pc-windows-msvc` sobre el proyecto entero no sirve: `ring` (vía
el updater) y `rusqlite` compilan C y necesitan la toolchain de MSVC. Pero el crate
`windows` es Rust puro, así que `scripts/win-check.mjs` monta un crate desechable con solo
ese crate y los archivos reales incluidos por `#[path]`, y comprueba ése.

Los tipos del contrato se **extraen de `system/mod.rs`** en cada ejecución en vez de
copiarse: si el contrato cambia y el módulo de Windows se queda atrás, el check falla.

Requiere una vez: `rustup target add x86_64-pc-windows-msvc`.

Lo que **no** valida: nada de comportamiento. Que `IPolicyConfig` tenga la vtable correcta,
que un micrófono acepte `SetMute` o que `netsh` parsee bien solo se sabe en el PC.

## Fase 3: audio (implementada)

`system/windows/audio.rs` + `policy_config.rs`.

- **Hilo residente** `gm-audio` con `CoInitializeEx(COINIT_MULTITHREADED)`, dueño de todos
  los objetos COM, con un canal de comandos. Los comandos de Tauri corren en hilos del pool
  sin COM inicializado y windows-rs marca las interfaces como `Send`/`Sync`, así que el
  compilador no protege del cruce de apartments: el hilo propio elimina el problema de raíz.
- **`IAudioEndpointVolume` cacheado** por canal. Los mutadores usan `endpoint_fast()`, que
  no le pregunta a Windows cuál es el endpoint por defecto: mover el slider dispara una
  ráfaga de `set_volume` y verificar en cada uno añadiría dos llamadas COM por pulsación.
  El snapshot (poll de 2 s) sí verifica y reabre si el default cambió por fuera.
- `set_volume`/`set_muted` **no** republican el estado entero (eso enumera dispositivos);
  solo retocan el número cacheado. `set_device` sí, porque cambia el snapshot completo.
- Se usa la escala **Scalar** (0.0-1.0, la perceptual del mezclador), nunca la de dB.
- `CoInitializeEx` se tolera con `S_OK`, `S_FALSE` y `RPC_E_CHANGED_MODE`; solo se llama
  `CoUninitialize` si este hilo fue quien inicializó.
- **`IPolicyConfig`** (cambiar el dispositivo por defecto) **no es API pública** ni está en
  las bindings: se declara a mano. Los diez métodos previos a `SetDefaultEndpoint` están
  declarados aunque no se usen — COM llama por posición en la vtable, y si falta uno la
  llamada cae en el método anterior: eso no da error, da un crash. Se aplica a los **tres
  roles** (`eConsole`, `eMultimedia`, `eCommunications`); cambiar solo el primero deja el
  chat de voz en el dispositivo viejo.
- Si algo de esto falla al arrancar, `build_system_controls()` degrada al mock en vez de
  reventar el arranque.

## Fase 4: Wi-Fi (implementada)

`system/windows/{wifi,proc,radios}.rs` + `system/netsh_parse.rs`.

### El parseo va aparte, y con tests

`netsh_parse.rs` **se compila en todos los sistemas a propósito**: son funciones puras de
`&str` a datos, así que sus tests corren en el Mac de desarrollo. El parseo de texto
localizado es lo más frágil de toda esta fase, y era justo lo que se quedaría sin pruebas
hasta llegar al PC. Ya pilló un bug real: el estado de radio ocupa **dos líneas** y la
segunda no tiene `:`, así que mirando solo la primera una radio apagada por software pasaba
por encendida.

**Regla de oro: anclar en lo que no se traduce.** `netsh` imprime en el idioma de Windows y
las etiquetas se traducen ("Signal" → "Señal"). Lo que no cambia: los identificadores
`SSID`/`BSSID`/`GUID`, los valores técnicos (`WPA2-Personal`, `Open`) y el `%`. Por eso la
autenticación se detecta por el **valor** de la línea y no por su etiqueta. Ante la duda se
asume red protegida: pedir una contraseña de más es mejor que fallar sin explicación.

Ojo con `parse_ethernet`: "desconectado" **contiene** "conectado", así que se compara el
token entero y no con `contains`. Hay un test para eso.

### Dos formas de llamar a netsh

- **Lecturas** (`show networks`, `show interfaces`, `show profiles`): por
  `cmd /c chcp 65001 && netsh`, porque netsh escribe en la code page de consola y un SSID
  con eñe saldría roto — y como el SSID es la clave con la que se conecta, no es cosmético.
  Sus argumentos son constantes: no hay datos de nadie en esa línea.
- **Escrituras** (`connect`, `add profile`, `delete profile`): a netsh **directamente, sin
  `cmd`**, porque llevan el SSID dentro y en una línea de shell un SSID con `&` podría
  ejecutar otra cosa. Solo se mira el código de salida, así que la code page da igual.

### Conectar verifica de verdad

`netsh wlan connect` responde con éxito en cuanto **acepta** la petición: con una contraseña
incorrecta también dice que sí. Por eso se sondea `show interfaces` cada 500 ms hasta 12 s,
y si no conecta se **borra el perfil recién creado** — si se queda, Windows reintenta con la
clave mala indefinidamente y la red aparece como "guardada" en la lista.

El sondeo usa `current_ssid()` (un solo proceso) y no `status()` (dos): con `status()` serían
casi cien procesos por intento de conexión.

El perfil XML se escribe en un temporal con nombre irrepetible y **se borra en cuanto netsh
lo lee**, también si falla: contiene la contraseña en claro. El SSID y la clave se escapan
como XML (un SSID puede llevar `&` perfectamente). `</authEncryption>` **cierra antes de**
`<sharedKey>`; con los dos anidados al revés el perfil no valida y netsh falla sin explicar
por qué — era el bug del prototipo, y ahora hay un test que lo fija.

Limitación conocida: `netsh` no distingue *contraseña incorrecta* de *fuera de alcance*.
Como el caso abrumadoramente más común al crear un perfil nuevo es la clave, se devuelve
`system.wifi.wrong_password` y el store vuelve a pedirla. Distinguirlos requiere la WLAN API
nativa (`WlanRegisterNotification` da un `WLAN_REASON_CODE`), ~250 líneas de FFI; `wifi.rs`
está encapsulado para poder cambiarlo por dentro.

### El interruptor va por WinRT, no por netsh

`netsh interface set interface` **exige administrador** y GM corre como app normal: por esa
vía el interruptor fallaría siempre. `radios.rs` usa `Windows.Devices.Radios.Radio`, la
misma API del panel de Configuración, que funciona sin elevación. Desde Rust y no desde
PowerShell porque sacar el resultado de un `IAsyncOperation` por reflexión se rompe entre
versiones de Windows **devolviendo vacío en vez de un error**.

`RequestAccessAsync` puede responder `DeniedByUser`/`DeniedBySystem`; se traduce a
`system.radio.access_denied`, que sí se puede explicar en pantalla. `IAsyncOperation::get()`
bloquea, lo cual es correcto en el MTA (`CoIncrementMTAUsage`) y llamándolo solo desde
`spawn_blocking` — desde el hilo principal, que Tauri mantiene en STA, sería un deadlock.

### Limitación abierta: el escaneo puede venir denegado

**Estado: sin resolver, pendiente de datos de usuarios reales.**

En el primer PC de prueba, `netsh wlan show networks` respondió **acceso denegado**. Ese
equipo tenía la telemetría y varios servicios de Windows recortados a mano, así que no se
sabe todavía si es consecuencia de eso o algo más general.

Causas conocidas de que el escaneo no devuelva redes, ninguna descartada aún:

1. **Permisos de ubicación desactivados.** Desde Windows 10 1803, enumerar redes Wi-Fi los
   exige — es una restricción de privacidad, no del adaptador. Con ellos cerrados, `netsh`
   suele devolver cero redes sin más.
2. **`WlanSvc` (Configuración automática de WLAN) detenido o deshabilitado.** Es de los
   servicios que se tocan al recortar Windows.
3. **Directiva de grupo** que restrinja la configuración de red.

Lo que sí está resuelto es **no mentir sobre ello**: `classify_netsh_error` distingue "cero
redes visibles" (resultado legítimo) de "Windows rechazó la consulta", y en el segundo caso
la UI muestra un error que dice qué revisar, en vez de un "No se encontraron redes" que es
falso y no deja a nadie con nada que hacer. `wlansvc` se reconoce por su id, que no se
traduce; la denegación, por varias formas en ambos idiomas. Hay tests.

Si con más equipos resulta que la denegación es común en instalaciones normales, la
alternativa es la WLAN API nativa (`WlanGetAvailableNetworkList`) — que tiene el **mismo**
requisito de ubicación, así que probablemente no cambie nada, pero al menos devuelve un
código de error concreto en vez de texto.

### Coste del poll

`refresh_fast()` lo llama el poll cada 2 s, pero leer el estado del Wi-Fi cuesta dos procesos
`netsh` más una llamada WinRT (~300 ms de un hilo del pool). Por eso lleva un **TTL de 6 s**:
lo que ese poll debe detectar (cable enchufado, radio apagada desde Windows, red cambiada) no
necesita más resolución. Las acciones del usuario refrescan sin esperar al TTL.

## Qué falta (backend de Windows)

Resumen de lo que traerán las fases 3-7, con sus límites ya conocidos:

- **Bluetooth**: WinRT desde Rust (nunca PowerShell), en un hilo MTA dedicado.
  `DeviceWatcher` para descubrir lo no emparejado. **Conectar/desconectar es parcial**: no
  existe API pública equivalente al botón de Configuración de Windows para BR/EDR; por eso
  `canConnect` puede venir en `false` y la UI oculta ese botón. Emparejar con PIN queda
  fuera (`system.bt.pin_required` sugiere hacerlo esa vez desde Windows).
