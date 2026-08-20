/*
 * Frontera con el backend (comandos Tauri).
 *
 * Todo el frontend habla con Rust SOLO a través de estas funciones. Si la app
 * corre en un navegador normal (p. ej. `npm run dev` sin Tauri), se usan datos
 * mock en JS para poder desarrollar/verificar la UI sin el backend nativo.
 * Ver docs/architecture.md.
 */

// ¿Estamos dentro de Tauri? (el runtime inyecta esta marca)
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let _invoke = null;
async function invoke(cmd, args) {
  if (!isTauri) throw new Error("no-tauri");
  if (!_invoke) {
    const core = await import("@tauri-apps/api/core");
    _invoke = core.invoke;
  }
  return _invoke(cmd, args);
}

// ------- Datos mock para modo web (espejo de src-tauri/.../mock.rs) -------
const NOW = Math.floor(Date.now() / 1000);
const H = 3600;
function mockGames() {
  // Tamaño simulado determinista (solo juegos; las apps no reportan tamaño),
  // para demostrar el orden por tamaño en dev.
  const fakeSize = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return (1 + (h % 80)) * 1024 * 1024 * 1024;
  };
  const g = (id, title, store, kind, last) => ({
    id, title, store, kind,
    coverPath: null,
    widePath: null,
    heroPath: null,
    logoPath: null,
    installDir: `C:/Games/${id}`,
    launchTarget: `mock://launch/${id}`,
    lastPlayed: last,
    sizeBytes: kind === "game" ? fakeSize(id) : null,
  });
  return [
    g("hades2", "Hades II", "steam", "game", NOW - 1 * H),
    g("eldenring", "Elden Ring", "steam", "game", NOW - 5 * H),
    g("cyberpunk", "Cyberpunk 2077", "gog", "game", NOW - 30 * H),
    g("balatro", "Balatro", "steam", "game", NOW - 2 * H),
    g("hollowknight", "Hollow Knight", "gog", "game", NOW - 80 * H),
    g("stardew", "Stardew Valley", "steam", "game", NOW - 200 * H),
    g("aloy", "Horizon Zero Dawn", "epic", "game", NOW - 12 * H),
    g("rocketleague", "Rocket League", "epic", "game", null),
    g("hades1", "Hades", "steam", "game", NOW - 500 * H),
    g("celeste", "Celeste", "gog", "game", null),
    g("deadcells", "Dead Cells", "gog", "game", NOW - 48 * H),
    g("witcher3", "The Witcher 3", "gog", "game", NOW - 300 * H),
    g("hitman", "HITMAN World of Assassination", "epic", "game", null),
    g("factorio", "Factorio", "steam", "game", NOW - 90 * H),
    g("terraria", "Terraria", "steam", "game", null),
    g("doometernal", "DOOM Eternal", "steam", "game", NOW - 400 * H),
    // Apps (kind: app)
    g("discord", "Discord", "other", "app", null),
    g("spotify", "Spotify", "other", "app", null),
    g("chrome", "Navegador", "other", "app", null),
  ];
}

/*
 * Mock de los controles de sistema (espejo de src-tauri/src/system/mock.rs).
 *
 * Imita también la LATENCIA y los códigos de error del backend: sin eso no se
 * puede diseñar ni verificar la UX de los estados intermedios ("Buscando…",
 * "Conectando…", clave incorrecta) en `npm run web`.
 */
const _mockSystem = {
  wifiPresent: true,
  wifiEnabled: true,
  wifiScanning: false,
  currentNetwork: "SalaWiFi_5G",
  networks: [
    { ssid: "SalaWiFi_5G", secured: true, signal: 92, known: true, active: true },
    { ssid: "SalaWiFi_2G", secured: true, signal: 74, known: true, active: false },
    { ssid: "Vecino_303", secured: true, signal: 41, known: false, active: false },
    { ssid: "Cafe_Invitados", secured: false, signal: 33, known: false, active: false },
  ],
  ethernetConnected: false,
  ethernetName: null,
  bluetoothPresent: true,
  bluetoothEnabled: false,
  btScanning: false,
  btDevices: [
    { id: "bt:xbox", name: "Mando Xbox", paired: true, connected: true, canConnect: true, kind: "gamepad" },
    { id: "bt:dualsense", name: "DualSense", paired: true, connected: false, canConnect: true, kind: "gamepad" },
    { id: "bt:soundcore", name: "Auriculares BT", paired: true, connected: false, canConnect: true, kind: "audio" },
  ],
  output: {
    volume: 45,
    muted: false,
    devices: [
      { id: "tv", name: "TV (HDMI)" },
      { id: "speakers", name: "Altavoces 5.1" },
      { id: "headset", name: "Auriculares USB" },
    ],
    current: "tv",
  },
  input: {
    volume: 70,
    muted: false,
    devices: [
      { id: "mic-usb", name: "Micrófono USB" },
      { id: "mic-headset", name: "Micrófono de auriculares" },
      { id: "mic-cam", name: "Webcam" },
    ],
    current: "mic-usb",
  },
};

// Clave "correcta" de las redes protegidas simuladas (igual que mock.rs).
const MOCK_WIFI_PASSWORD = "1234";
// Redes / dispositivos que cada escaneo va destapando.
const _mockHiddenNets = [
  { ssid: "TP-LINK_9F2C", secured: true, signal: 22, known: false, active: false },
  { ssid: "AndroidAP", secured: true, signal: 58, known: false, active: false },
];
const _mockUndiscoveredBt = [
  { id: "bt:teclado", name: "Teclado K380", paired: false, connected: false, canConnect: true, kind: "input" },
  { id: "bt:pixel", name: "Pixel 8", paired: false, connected: false, canConnect: true, kind: "phone" },
];

const _systemStateSubs = new Set();
const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function _emitSystemState() {
  const snapshot = structuredClone(_mockSystem);
  _systemStateSubs.forEach((cb) => cb(snapshot));
}

// ---------------------------- API pública ----------------------------

export async function listGames() {
  try {
    return await invoke("list_games");
  } catch {
    return mockGames();
  }
}

export async function launchGame(id, target, installDir) {
  try {
    return await invoke("launch_game", { id, target, installDir: installDir || null });
  } catch {
    console.info(`[mock] launch_game: ${id} (${target})`);
  }
}

export async function steamOpenInstall(appid) {
  try {
    return await invoke("steam_open_install", { appid });
  } catch {
    console.info(`[mock] steam_open_install: appid ${appid}`);
  }
}

// Abre una URL/URI externa (steam://…, http(s)://…) con el programa asociado
// del sistema — accesos directos genéricos (QAM → Utilidades).
export async function openUrl(target) {
  try {
    return await invoke("open_url", { target });
  } catch {
    console.info(`[mock] open_url: ${target}`);
  }
}

// Escanea un álbum de música: pistas sueltas + discos (subcarpetas) — ver
// media.rs::scan_album. Módulo Multimedia → Música.
export async function scanAlbum(path) {
  try {
    return await invoke("scan_album", { path });
  } catch {
    return { tracks: [], discs: [] };
  }
}

// Lista las subcarpetas directas de una "carpeta raíz" (ver
// media.rs::list_subfolders) — cada una se agrega como álbum automáticamente.
// Genérica: la reusan Música, Imágenes y Videos.
export async function listSubfolders(path) {
  try {
    return await invoke("list_subfolders", { path });
  } catch {
    return [];
  }
}

// Lista los archivos de imagen/video de una carpeta (un solo nivel — ver
// media.rs::list_image_files/list_video_files). Módulo Multimedia.
export async function listImageFiles(path) {
  try {
    return await invoke("list_image_files", { path });
  } catch {
    return [];
  }
}
export async function listVideoFiles(path) {
  try {
    return await invoke("list_video_files", { path });
  } catch {
    return [];
  }
}

// Concede al protocolo asset acceso a una carpeta de video (ver
// media.rs::allow_video_folder) — necesario antes de poder reproducir algo
// de ahí con videoUrl()/convertFileSrc.
export async function allowVideoFolder(path) {
  try {
    return await invoke("allow_video_folder", { path });
  } catch {
    console.info(`[mock] allow_video_folder: ${path}`);
  }
}

export async function focusGame() {
  try {
    return await invoke("focus_game");
  } catch {
    console.info("[mock] focus_game");
  }
}

export async function uninstallGame(id, target) {
  try {
    return await invoke("uninstall_game", { id, target });
  } catch {
    console.info(`[mock] uninstall_game: ${id} (${target})`);
  }
}

// ------------------------- Controles de sistema (QAM) -------------------------
//
// OJO: acá el mock se elige por `isTauri`, NUNCA por `catch`. Con backend real,
// tragarse el error de un `system_set_wifi` que falla por permisos dejaría la
// UI mostrando "ON" con la radio apagada — el fallo más peligroso de esta
// frontera. Todos los mutadores propagan.

export async function systemGetState() {
  if (!isTauri) return structuredClone(_mockSystem);
  return invoke("system_get_state");
}

// `channel` es un id del protocolo: "output" | "input" (no se traduce).
export async function systemSetVolume(channel, volume) {
  if (!isTauri) {
    _mockSystem[channel].volume = volume;
    _emitSystemState();
    return;
  }
  return invoke("system_set_volume", { channel, volume });
}

export async function systemSetMuted(channel, muted) {
  if (!isTauri) {
    _mockSystem[channel].muted = muted;
    _emitSystemState();
    return;
  }
  return invoke("system_set_muted", { channel, muted });
}

export async function systemSetDevice(channel, id) {
  if (!isTauri) {
    if (!_mockSystem[channel].devices.some((d) => d.id === id))
      throw new Error("system.audio.device_not_found");
    _mockSystem[channel].current = id;
    _emitSystemState();
    return;
  }
  return invoke("system_set_device", { channel, id });
}

export async function systemSetWifi(enabled) {
  if (!isTauri) {
    _mockSystem.wifiEnabled = enabled;
    _emitSystemState();
    return;
  }
  return invoke("system_set_wifi", { enabled });
}

export async function systemSetBluetooth(enabled) {
  if (!isTauri) {
    _mockSystem.bluetoothEnabled = enabled;
    if (!enabled) {
      _mockSystem.btDevices = _mockSystem.btDevices
        .filter((d) => d.paired)
        .map((d) => ({ ...d, connected: false }));
    }
    _emitSystemState();
    return;
  }
  return invoke("system_set_bluetooth", { enabled });
}

export async function systemWifiScan() {
  if (!isTauri) {
    if (!_mockSystem.wifiEnabled) throw new Error("system.wifi.unavailable");
    if (_mockSystem.wifiScanning) return;
    _mockSystem.wifiScanning = true;
    _emitSystemState();
    await _sleep(1500);
    const found = _mockHiddenNets.pop();
    if (found) _mockSystem.networks.push(found);
    _mockSystem.wifiScanning = false;
    _emitSystemState();
    return;
  }
  return invoke("system_wifi_scan");
}

export async function systemWifiConnect(ssid, password) {
  if (!isTauri) {
    const net = _mockSystem.networks.find((n) => n.ssid === ssid);
    if (!net) throw new Error(`system.wifi.connect_failed|${ssid}`);
    await _sleep(2000);
    if (net.secured && !net.known && password !== MOCK_WIFI_PASSWORD)
      throw new Error("system.wifi.wrong_password");
    for (const n of _mockSystem.networks) {
      n.active = n.ssid === ssid;
      if (n.active) n.known = true;
    }
    _mockSystem.currentNetwork = ssid;
    _emitSystemState();
    return;
  }
  return invoke("system_wifi_connect", { ssid, password: password ?? null });
}

export async function systemWifiForget(ssid) {
  if (!isTauri) {
    const net = _mockSystem.networks.find((n) => n.ssid === ssid);
    if (!net) throw new Error(`system.wifi.profile_failed|${ssid}`);
    net.known = false;
    if (net.active) {
      net.active = false;
      _mockSystem.currentNetwork = null;
    }
    _emitSystemState();
    return;
  }
  return invoke("system_wifi_forget", { ssid });
}

export async function systemBtScan(seconds = 6) {
  if (!isTauri) {
    if (!_mockSystem.bluetoothEnabled) throw new Error("system.bt.unavailable");
    if (_mockSystem.btScanning) return;
    _mockSystem.btScanning = true;
    _emitSystemState();
    await _sleep(3000);
    for (const d of _mockUndiscoveredBt.splice(0)) {
      if (!_mockSystem.btDevices.some((x) => x.id === d.id)) _mockSystem.btDevices.push(d);
    }
    _mockSystem.btScanning = false;
    _emitSystemState();
    return;
  }
  return invoke("system_bt_scan", { seconds });
}

export async function systemBtPair(id) {
  if (!isTauri) {
    if (!_mockSystem.bluetoothEnabled) throw new Error("system.bt.unavailable");
    const d = _mockSystem.btDevices.find((x) => x.id === id);
    if (!d) throw new Error("system.bt.device_not_found");
    await _sleep(2500);
    d.paired = true;
    d.connected = d.canConnect;
    _emitSystemState();
    return;
  }
  return invoke("system_bt_pair", { id });
}

export async function systemBtUnpair(id) {
  if (!isTauri) {
    if (!_mockSystem.btDevices.some((x) => x.id === id))
      throw new Error("system.bt.device_not_found");
    _mockSystem.btDevices = _mockSystem.btDevices.filter((x) => x.id !== id);
    _emitSystemState();
    return;
  }
  return invoke("system_bt_unpair", { id });
}

export async function systemBtSetConnected(id, connected) {
  if (!isTauri) {
    const d = _mockSystem.btDevices.find((x) => x.id === id);
    if (!d) throw new Error("system.bt.device_not_found");
    if (!d.canConnect) throw new Error("system.bt.connect_unsupported");
    await _sleep(1200);
    d.connected = connected;
    _emitSystemState();
    return;
  }
  return invoke("system_bt_set_connected", { id, connected });
}

// Estado completo tras cada cambio (lo emite Rust en cada mutador y al terminar
// cada operación lenta). Devuelve la función para dejar de escuchar, igual que
// `listen` y que `onUpdateProgress`.
export async function onSystemState(cb) {
  if (!isTauri) {
    _systemStateSubs.add(cb);
    return () => _systemStateSubs.delete(cb);
  }
  const { listen } = await import("@tauri-apps/api/event");
  return listen("gm://system-state", (event) => cb(event.payload));
}

export async function systemShutdown() {
  if (!isTauri) {
    console.info("[mock] system_shutdown");
    return;
  }
  return invoke("system_shutdown");
}

// Ejecuta un atajo de teclado a nivel de sistema operativo (ver stores/customShortcuts.js).
export async function runShortcut(modifiers, code) {
  try {
    return await invoke("run_shortcut", { modifiers, code });
  } catch {
    console.info(`[mock] run_shortcut: ${modifiers.join("+")}+${code}`);
  }
}

// Config (perfiles/temas). En web se guarda en localStorage.
export async function loadConfig() {
  try {
    return await invoke("load_config");
  } catch {
    const raw = localStorage.getItem("gm-config");
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveConfig(data) {
  try {
    return await invoke("save_config", { data });
  } catch {
    localStorage.setItem("gm-config", JSON.stringify(data));
  }
}

// ------- Cuenta de Steam vinculada (Fase 9) -------
// Sin equivalente mock: vincular cuenta/sincronizar habla con la Steam Web API
// real y con el keyring del SO, así que no tiene sentido en modo navegador.
// Cada wrapper deja pasar el error tal cual (la UI lo muestra con reportError).
export async function steamLinkAccount(profileInput, apiKey) {
  return invoke("steam_link_account", { profileInput, apiKey });
}
export async function steamUnlinkAccount(steamid) {
  return invoke("steam_unlink_account", { steamid });
}
export async function steamHasKey(steamid) {
  try {
    return await invoke("steam_has_key", { steamid });
  } catch {
    return false;
  }
}
export async function steamSyncLibrary(steamid, includePlayedFreeGames, lang) {
  return invoke("steam_sync_library", { steamid, includePlayedFreeGames, lang });
}
export async function steamLibraryCache(steamid) {
  return invoke("steam_library", { steamid });
}
export async function steamSyncAchievements(steamid, appids, force = false, lang) {
  return invoke("steam_sync_achievements", { steamid, appids, force, lang });
}
export async function steamAchievements(steamid, appid) {
  return invoke("steam_achievements", { steamid, appid });
}
export async function steamGlobalAchievementPercentages(appid, maxAgeSecs) {
  return invoke("steam_global_achievement_percentages", { appid, maxAgeSecs });
}
export async function steamAchievementsSummary(steamid) {
  return invoke("steam_achievements_summary", { steamid });
}

// ------- Actualizaciones de la app (Configuración → Actualizaciones) -------
// Igual criterio que los wrappers de Steam: dentro de Tauri el error se
// propaga tal cual (un fallo de red tiene que llegar a reportError, no
// convertirse en un mock silencioso). Fuera de Tauri sí hay mock, porque el
// ciclo completo de la UI (buscar → descargar → listo) debe poder recorrerse
// en `npm run web`.

// Suscriptores al progreso de descarga: en Tauri los alimenta el evento
// gm://update-progress; en web, el mock de updateDownload().
const _updateProgressSubs = new Set();

export async function updateCheck(channel) {
  if (isTauri) return invoke("update_check", { channel });
  await new Promise((r) => setTimeout(r, 600));
  if (channel !== "beta") return null; // el canal estable aún no tiene releases
  return {
    version: "0.2.0-beta.1",
    currentVersion: "0.1.0",
    notes: "[mock] Sección de actualizaciones\n[mock] Correcciones varias",
    pubDate: new Date().toISOString(),
    channel,
  };
}

export async function updateDownload() {
  if (isTauri) return invoke("update_download");
  const total = 14 * 1024 * 1024;
  for (let downloaded = 0; downloaded < total; ) {
    await new Promise((r) => setTimeout(r, 120));
    downloaded = Math.min(total, downloaded + total / 12);
    _updateProgressSubs.forEach((cb) => cb({ downloaded, total }));
  }
}

export async function updateInstall() {
  if (isTauri) return invoke("update_install");
  await new Promise((r) => setTimeout(r, 800));
  console.info("[mock] update_install");
}

export async function updateRelaunch() {
  if (isTauri) return invoke("update_relaunch");
  console.info("[mock] update_relaunch");
}

export async function updateDiscard() {
  if (isTauri) return invoke("update_discard");
  console.info("[mock] update_discard");
}

// Devuelve la función para dejar de escuchar (mismo contrato que `listen`).
export async function onUpdateProgress(cb) {
  if (!isTauri) {
    _updateProgressSubs.add(cb);
    return () => _updateProgressSubs.delete(cb);
  }
  const { listen } = await import("@tauri-apps/api/event");
  return listen("gm://update-progress", (event) => cb(event.payload));
}
