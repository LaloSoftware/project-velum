import { writable, get } from "svelte/store";
import {
  systemGetState,
  systemSetVolume,
  systemSetMuted,
  systemSetDevice,
  systemSetWifi,
  systemSetBluetooth,
  systemWifiScan,
  systemWifiConnect,
  systemWifiForget,
  systemBtScan,
  systemBtPair,
  systemBtUnpair,
  systemBtSetConnected,
  onSystemState,
} from "../ipc/index.js";
import { openKeyboard } from "./keyboard.js";
import { reportError } from "./ui.js";
import { tr } from "../i18n/index.js";

/*
 * Controles de sistema del QAM (Wi-Fi / Bluetooth / audio de salida y entrada).
 *
 * Refresco híbrido, decidido así a propósito (ver feature-system-controls.md):
 *   - caché en Rust + comandos explícitos para lo lento (escanear, conectar…),
 *   - evento push `gm://system-state` tras cada cambio,
 *   - y un poll ligero de 2 s SOLO mientras la sección está montada.
 * El poll cubre lo que cambia por fuera de la app y es barato (teclas de
 * volumen del teclado, auriculares enchufados, cable Ethernet); el push cubre
 * lo lento sin tener que sondear.
 *
 * Escritura: update optimista → `await ipc` → si falla, `reportError` +
 * `refreshSystem()` para volver a la verdad del backend (patrón de
 * stores/updates.js). Nada de errores silenciosos: un toggle que falla tiene
 * que verse.
 */

export const systemState = writable(null);

/**
 * Operaciones en curso, por clave:
 *   wifiScan · btScan · `wifi:<ssid>` · `bt:<id>` · `audio:<channel>`
 * El valor es el nombre de la operación ("connecting", "pairing"…) para que la
 * fila muestre el texto correcto, no solo un spinner genérico.
 */
export const systemBusy = writable({});

const POLL_MS = 2000;
/** Ventana en la que el valor local de volumen gana al que llega del backend. */
const VOLUME_ECHO_MS = 600;

const lastVolumeAt = { output: 0, input: 0 };

function busySet(key, value) {
  systemBusy.update((b) => {
    if (value === null) {
      const { [key]: _drop, ...rest } = b;
      return rest;
    }
    return { ...b, [key]: value };
  });
}

/**
 * Aplica un estado que viene del backend, conservando el volumen que la persona
 * acaba de mover: sin esto, el poll de 2 s "tira" del slider hacia atrás
 * mientras se arrastra.
 */
function applyState(next) {
  if (!next) return;
  systemState.update((prev) => {
    if (!prev) return next;
    const now = Date.now();
    const merged = { ...next };
    for (const ch of ["output", "input"]) {
      if (now - lastVolumeAt[ch] < VOLUME_ECHO_MS) {
        merged[ch] = { ...next[ch], volume: prev[ch].volume };
      }
    }
    return merged;
  });
}

export async function refreshSystem() {
  try {
    applyState(await systemGetState());
  } catch (e) {
    console.warn("[gm:system] no se pudo leer el estado", e);
  }
}

/** Carga inicial (antes de que la sección pinte nada). */
export async function initSystem() {
  await refreshSystem();
}

/**
 * Arranca el seguimiento mientras la sección está a la vista: escucha el push,
 * hace un escaneo Wi-Fi inicial y sondea cada 2 s. Devuelve `stop()` — hay que
 * llamarlo en `onDestroy` o el poll sigue corriendo con el QAM cerrado.
 */
export function startSystemWatch() {
  let stopped = false;
  let unlisten = null;

  onSystemState((s) => {
    if (!stopped) applyState(s);
  }).then((fn) => {
    if (stopped) fn?.();
    else unlisten = fn;
  });

  const timer = setInterval(refreshSystem, POLL_MS);

  // Escaneo al montar, no en cada tick: es la operación cara.
  refreshSystem().then(() => {
    const s = get(systemState);
    if (!stopped && s?.wifiPresent && s.wifiEnabled && !s.wifiScanning) scanWifi();
  });

  return () => {
    stopped = true;
    clearInterval(timer);
    unlisten?.();
  };
}

/** Envuelve un mutador: si falla, lo reporta y vuelve a la verdad del backend. */
async function mutate(ctx, fn) {
  try {
    await fn();
  } catch (e) {
    reportError(e, ctx);
    await refreshSystem();
    return false;
  }
  return true;
}

// ------------------------------- audio -------------------------------

export async function setVolume(channel, volume) {
  const v = Math.max(0, Math.min(100, Math.round(volume)));
  lastVolumeAt[channel] = Date.now();
  systemState.update((s) => (s ? { ...s, [channel]: { ...s[channel], volume: v } } : s));
  await mutate("system:volume", () => systemSetVolume(channel, v));
}

export async function toggleMute(channel) {
  const s = get(systemState);
  if (!s) return;
  const muted = !s[channel].muted;
  systemState.update((st) => ({ ...st, [channel]: { ...st[channel], muted } }));
  await mutate("system:mute", () => systemSetMuted(channel, muted));
}

export async function setAudioDevice(channel, id) {
  const s = get(systemState);
  if (!s) return;
  systemState.update((st) => ({ ...st, [channel]: { ...st[channel], current: id } }));
  busySet(`audio:${channel}`, "switching");
  await mutate("system:audioDevice", () => systemSetDevice(channel, id));
  busySet(`audio:${channel}`, null);
}

// ------------------------------- Wi-Fi -------------------------------

export async function toggleWifi() {
  const s = get(systemState);
  if (!s) return;
  const enabled = !s.wifiEnabled;
  systemState.update((st) => ({ ...st, wifiEnabled: enabled }));
  const ok = await mutate("system:wifi", () => systemSetWifi(enabled));
  if (ok && enabled) scanWifi();
}

export async function scanWifi() {
  if (get(systemBusy).wifiScan) return;
  busySet("wifiScan", true);
  systemState.update((s) => (s ? { ...s, wifiScanning: true } : s));
  await mutate("system:wifiScan", () => systemWifiScan());
  busySet("wifiScan", null);
}

/**
 * Conectar es la única acción con flujo: una red protegida que no está guardada
 * pide la clave por teclado virtual (enmascarada), y si el backend responde
 * `wrong_password` se vuelve a pedir en vez de solo mostrar el error — teclear
 * una clave con el mando cuesta bastante como para perderla por una errata.
 */
export async function connectWifi(net) {
  const key = `wifi:${net.ssid}`;
  if (get(systemBusy)[key]) return;

  let password = null;
  if (net.secured && !net.known) {
    password = await openKeyboard("", tr("qam.system.passwordTitle", { ssid: net.ssid }), {
      mask: true,
    });
    if (password === null) return; // cancelado
  }

  for (;;) {
    busySet(key, "connecting");
    try {
      await systemWifiConnect(net.ssid, password);
      busySet(key, null);
      await refreshSystem();
      return;
    } catch (e) {
      busySet(key, null);
      if (errorCode(e) !== "system.wifi.wrong_password") {
        reportError(e, "system:wifiConnect");
        await refreshSystem();
        return;
      }
      password = await openKeyboard("", tr("qam.system.wrongPasswordRetry", { ssid: net.ssid }), {
        mask: true,
      });
      if (password === null) {
        await refreshSystem();
        return;
      }
    }
  }
}

export async function forgetWifi(ssid) {
  const key = `wifi:${ssid}`;
  busySet(key, "forgetting");
  await mutate("system:wifiForget", () => systemWifiForget(ssid));
  busySet(key, null);
}

// ----------------------------- Bluetooth -----------------------------

export async function toggleBluetooth() {
  const s = get(systemState);
  if (!s) return;
  const enabled = !s.bluetoothEnabled;
  systemState.update((st) => ({ ...st, bluetoothEnabled: enabled }));
  await mutate("system:bluetooth", () => systemSetBluetooth(enabled));
}

export async function scanBt() {
  if (get(systemBusy).btScan) return;
  busySet("btScan", true);
  systemState.update((s) => (s ? { ...s, btScanning: true } : s));
  await mutate("system:btScan", () => systemBtScan());
  busySet("btScan", null);
}

export async function pairBt(dev) {
  const key = `bt:${dev.id}`;
  if (get(systemBusy)[key]) return;
  busySet(key, "pairing");
  await mutate("system:btPair", () => systemBtPair(dev.id));
  busySet(key, null);
}

export async function unpairBt(dev) {
  const key = `bt:${dev.id}`;
  busySet(key, "unpairing");
  await mutate("system:btUnpair", () => systemBtUnpair(dev.id));
  busySet(key, null);
}

export async function setBtConnected(dev, connected) {
  const key = `bt:${dev.id}`;
  if (get(systemBusy)[key]) return;
  busySet(key, connected ? "connecting" : "disconnecting");
  await mutate("system:btConnect", () => systemBtSetConnected(dev.id, connected));
  busySet(key, null);
}

/**
 * Código del error de Rust, sin el detalle (`"codigo|detalle"` → `"codigo"`).
 * `errorMessage` ya traduce para mostrar; acá hace falta el código crudo para
 * decidir el flujo (reintentar la clave).
 */
function errorCode(err) {
  const raw = (err && err.message) || String(err);
  const sep = raw.indexOf("|");
  return sep === -1 ? raw : raw.slice(0, sep);
}
