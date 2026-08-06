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

let _mockSystem = {
  wifiEnabled: true,
  currentNetwork: "SalaWiFi_5G",
  networks: ["SalaWiFi_5G", "SalaWiFi_2G", "Vecino_303", "AndroidAP"],
  bluetoothEnabled: false,
  btDevices: ["Mando Xbox", "Auriculares BT", "DualSense"],
  volume: 45,
  muted: false,
  outputDevices: [
    { id: "tv", name: "TV (HDMI)" },
    { id: "speakers", name: "Altavoces 5.1" },
    { id: "headset", name: "Auriculares USB" },
  ],
  currentOutput: "tv",
};

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

export async function systemGetState() {
  try {
    return await invoke("system_get_state");
  } catch {
    return structuredClone(_mockSystem);
  }
}

export async function systemSetVolume(volume) {
  try {
    return await invoke("system_set_volume", { volume });
  } catch {
    _mockSystem.volume = volume;
  }
}

export async function systemSetOutputDevice(id) {
  try {
    return await invoke("system_set_output_device", { id });
  } catch {
    _mockSystem.currentOutput = id;
  }
}

export async function systemSetMuted(muted) {
  try {
    return await invoke("system_set_muted", { muted });
  } catch {
    _mockSystem.muted = muted;
  }
}

export async function systemSetWifi(enabled) {
  try {
    return await invoke("system_set_wifi", { enabled });
  } catch {
    _mockSystem.wifiEnabled = enabled;
  }
}

export async function systemSetBluetooth(enabled) {
  try {
    return await invoke("system_set_bluetooth", { enabled });
  } catch {
    _mockSystem.bluetoothEnabled = enabled;
  }
}

export async function systemShutdown() {
  try {
    return await invoke("system_shutdown");
  } catch {
    console.info("[mock] system_shutdown");
  }
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
export async function steamSyncLibrary(steamid, includePlayedFreeGames) {
  return invoke("steam_sync_library", { steamid, includePlayedFreeGames });
}
export async function steamLibraryCache(steamid) {
  return invoke("steam_library", { steamid });
}
export async function steamSyncAchievements(steamid, appids) {
  return invoke("steam_sync_achievements", { steamid, appids });
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
