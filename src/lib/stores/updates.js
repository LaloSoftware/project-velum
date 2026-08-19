import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import {
  updateCheck,
  updateDownload,
  updateInstall,
  updateRelaunch,
  updateDiscard,
  onUpdateProgress,
  isTauri,
} from "../ipc/index.js";
import { showToast, reportError } from "./ui.js";
import { tr } from "../i18n/index.js";
import { errorMessage } from "../i18n/errors.js";

/*
 * Actualizaciones de la app (Configuración → Actualizaciones).
 *
 * `updatePrefs` es una slice más de config.json (mismo patrón que
 * stores/startup.js). `updateState` es estado de sesión: no se persiste, cada
 * arranque empieza en "idle".
 *
 * El canal es un id persistido: "stable"/"beta" no se traducen ni se renombran
 * (la etiqueta sale del diccionario, ver docs/i18n.md).
 */

const DEFAULTS = { channel: "beta", checkOnStart: false };

export const updatePrefs = writable({ ...DEFAULTS });

export async function initUpdates() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.updates) updatePrefs.set({ ...DEFAULTS, ...cfg.updates });
}

export async function setUpdatePrefs(patch) {
  updatePrefs.update((p) => ({ ...p, ...patch }));
  await patchAppConfig({ updates: get(updatePrefs) });
}

// idle | checking | uptodate | available | downloading | ready | installing | error
export const updateState = writable({
  status: "idle",
  info: null,
  progress: null, // { downloaded, total } — `total` puede ser null (sin Content-Length)
  error: null,
});

function setStatus(status, patch = {}) {
  updateState.update((s) => ({ ...s, status, ...patch }));
}

function fail(e, ctx) {
  reportError(e, ctx);
  setStatus("error", { error: errorMessage(e) });
}

/**
 * Busca en el canal activo.
 * `silent`: sin toast si no hay nada nuevo (auto-búsqueda al iniciar); si la
 * hay, avisa igual. Los errores del modo silencioso no levantan el banner:
 * quedarse sin red al arrancar no es algo que deba interrumpir a nadie.
 */
export async function checkForUpdates({ silent = false } = {}) {
  const s = get(updateState).status;
  if (s === "checking" || s === "downloading" || s === "installing") return;
  setStatus("checking", { error: null, progress: null, info: null });
  try {
    const info = await updateCheck(get(updatePrefs).channel);
    if (info) {
      setStatus("available", { info });
      if (silent) showToast(tr("updates.toast.found", { version: info.version }));
    } else {
      setStatus("uptodate");
    }
  } catch (e) {
    if (silent) {
      console.warn("[gm:update] búsqueda silenciosa fallida", e);
      setStatus("idle");
      return;
    }
    fail(e, "updates:check");
  }
}

export async function downloadUpdate() {
  if (get(updateState).status !== "available") return;
  setStatus("downloading", { progress: null, error: null });
  let unlisten = null;
  try {
    unlisten = await onUpdateProgress((p) => updateState.update((s) => ({ ...s, progress: p })));
    await updateDownload();
    setStatus("ready", { progress: null });
  } catch (e) {
    fail(e, "updates:download");
  } finally {
    unlisten?.();
  }
}

export async function installUpdate() {
  if (get(updateState).status !== "ready") return;
  setStatus("installing");
  try {
    await updateInstall();
    // En Windows nunca se llega acá: el instalador de NSIS ya cerró la app.
    // En macOS/Linux hay que reiniciar a mano.
    await updateRelaunch();
  } catch (e) {
    fail(e, "updates:install");
  }
}

/** "Después": vuelve a idle y suelta el instalador descargado (~15 MB). */
export async function dismissUpdate() {
  setStatus("idle", { info: null, progress: null, error: null });
  try {
    await updateDiscard();
  } catch (e) {
    console.warn("[gm:update] no se pudo descartar la descarga", e);
  }
}

/** Búsqueda automática al arrancar, si está activada. No bloquea el arranque. */
export async function maybeCheckOnStart() {
  if (!isTauri) return; // en web no hay nada real que actualizar
  if (!get(updatePrefs).checkOnStart) return;
  await checkForUpdates({ silent: true });
}
