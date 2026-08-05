import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { showToast, reportError } from "./ui.js";
import { mergeSteamGhosts } from "./games.js";
import {
  isTauri,
  steamLinkAccount,
  steamUnlinkAccount,
  steamHasKey,
  steamSyncLibrary,
  steamLibraryCache,
  steamSyncAchievements,
  steamAchievements,
} from "../ipc/index.js";

/*
 * Cuenta de Steam vinculada (Fase 9) — una sola cuenta global, no por perfil
 * de tema (vincular cuentas es un concepto distinto a stores/profiles.js).
 * La identidad (steamid/nombre/avatar) se persiste en config.json vía
 * patchAppConfig; la API key en sí NUNCA pasa por aquí ni por config.json —
 * vive solo en el keyring del SO (ver src-tauri/src/steam_api/mod.rs).
 *
 * Todo lo que toca la Steam Web API real (vincular, sincronizar) requiere
 * Tauri — en modo web (`npm run web`) no hay equivalente mock, se muestra un
 * error claro si se intenta.
 */

export const steamAccount = writable(null); // { steamid, personaName, avatarUrl } | null
export const steamSyncing = writable(false);
export const steamSyncProgress = writable(null); // { done, total, appid } | null

// Opciones de sincronización (Configuración → Cuentas → "Opciones de
// sincronización"), globales igual que la cuenta misma — no por perfil.
export const GLOBAL_PCT_INTERVALS = [
  { value: "daily", label: "Cada día", secs: 24 * 3600 },
  { value: "weekly", label: "Cada semana", secs: 7 * 24 * 3600 },
  { value: "monthly", label: "Cada mes", secs: 30 * 24 * 3600 },
];
const DEFAULT_SYNC_OPTIONS = { includePlayedFreeGames: true, globalPctInterval: "monthly" };
export const steamSyncOptions = writable({ ...DEFAULT_SYNC_OPTIONS });

export function globalPctMaxAgeSecs() {
  const interval = get(steamSyncOptions).globalPctInterval;
  const fallback = GLOBAL_PCT_INTERVALS.find((i) => i.value === DEFAULT_SYNC_OPTIONS.globalPctInterval).secs;
  return GLOBAL_PCT_INTERVALS.find((i) => i.value === interval)?.secs ?? fallback;
}

// Cambiar qué se incluye en la sync (a diferencia del intervalo de % global,
// que solo afecta la próxima lectura) no se aplica solo — hace falta volver a
// sincronizar para que la biblioteca refleje el cambio, así que se avisa.
export async function setSteamSyncOption(key, value) {
  steamSyncOptions.update((o) => ({ ...o, [key]: value }));
  await patchAppConfig({ steamSyncOptions: get(steamSyncOptions) });
  if (key === "includePlayedFreeGames") {
    showToast("Vuelve a sincronizar para aplicar el cambio");
  }
}

export async function initSteamAccount() {
  const cfg = await loadAppConfig();
  if (cfg?.steamSyncOptions) {
    steamSyncOptions.set({ ...DEFAULT_SYNC_OPTIONS, ...cfg.steamSyncOptions });
  }
  if (!cfg || !cfg.steamAccount) return;
  // La identidad (nombre/avatar) vive en config.json, pero la API key vive
  // solo en el keyring del SO (nunca aquí) — si desapareció por fuera (o la
  // escritura original falló en silencio), config.json seguiría diciendo
  // "vinculado" y la UI mostraría nombre/avatar con normalidad, pero
  // cualquier sync fallaría con un error críptico más adelante. Se verifica
  // acá, al arrancar, para no quedar en ese estado fantasma.
  const hasKey = isTauri ? await steamHasKey(cfg.steamAccount.steamid) : true;
  if (hasKey) {
    steamAccount.set(cfg.steamAccount);
    console.log("[gm:steam] cuenta recordada:", cfg.steamAccount);
  } else {
    console.warn(
      "[gm:steam] cuenta recordada pero sin API key en el keyring del SO — hay que vincular de nuevo:",
      cfg.steamAccount
    );
    await patchAppConfig({ steamAccount: null });
    showToast("Se perdió la API key de Steam guardada — vincula tu cuenta de nuevo");
  }
}

// Aplica al store de juegos los "fantasmas" (de la cuenta vinculada, no
// instalados localmente) usando el caché YA sincronizado, sin red — se llama
// al arrancar, una vez que loadGames() ya resolvió (ver App.svelte).
export async function mergeCachedSteamGhosts() {
  const acc = get(steamAccount);
  if (!acc || !isTauri) return;
  try {
    const entries = await steamLibraryCache(acc.steamid);
    console.log(`[gm:steam] biblioteca cacheada: ${entries.length} juego(s)`, entries);
    mergeSteamGhosts(entries);
  } catch (e) {
    console.warn("[gm:steam] no se pudo leer el caché de biblioteca al arrancar", e);
  }
}

export async function linkAccount(profileInput, apiKey) {
  const info = await steamLinkAccount(profileInput, apiKey);
  console.log("[gm:steam] cuenta vinculada:", info);
  steamAccount.set(info);
  await patchAppConfig({ steamAccount: info });
  showToast(`Cuenta de Steam vinculada: ${info.personaName}`);
  return info;
}

export async function unlinkAccount() {
  const acc = get(steamAccount);
  if (!acc) return;
  await steamUnlinkAccount(acc.steamid);
  steamAccount.set(null);
  await patchAppConfig({ steamAccount: null });
  showToast("Cuenta de Steam desvinculada");
  console.log("[gm:steam] cuenta desvinculada");
}

let progressUnlisten = null;
async function listenSteamProgress() {
  if (!isTauri) return;
  const { listen } = await import("@tauri-apps/api/event");
  progressUnlisten = await listen("gm://steam-sync-progress", (event) => {
    steamSyncProgress.set(event.payload);
    console.log("[gm:steam] progreso de logros:", event.payload);
  });
}

// `silent`: sin toasts de resumen (sync automática — fin de partida/arranque);
// progreso (steamSyncing/steamSyncProgress) y logs de consola igual siempre.
// `full`: re-verifica logros de TODA la biblioteca, ignorando el atajo de
// "solo lo que cambió de playtime" — la sync manual ("Sincronizar ahora") lo
// usa para una revisión completa; las automáticas se quedan con el atajo
// liviano (importa cuando hay cientos de juegos).
export async function syncNow({ silent = false, full = false } = {}) {
  const acc = get(steamAccount);
  if (!acc || get(steamSyncing)) return;
  steamSyncing.set(true);
  steamSyncProgress.set(null);
  try {
    console.log(`[gm:steam] sincronizando biblioteca de ${acc.steamid}...`);
    const { includePlayedFreeGames } = get(steamSyncOptions);
    const summary = await steamSyncLibrary(acc.steamid, includePlayedFreeGames);
    console.log("[gm:steam] resumen de biblioteca:", summary);
    if (!silent) showToast(`Biblioteca sincronizada: ${summary.totalGames} juego(s)`);

    const entries = await steamLibraryCache(acc.steamid);
    mergeSteamGhosts(entries);

    const appidsToSync = full ? entries.map((e) => e.appid) : summary.changedAppids;
    if (appidsToSync.length) {
      console.log(
        `[gm:steam] sincronizando logros de ${appidsToSync.length} juego(s)` +
          (full ? " (revisión completa)" : " con playtime nuevo/distinto") +
          ":",
        appidsToSync
      );
      await listenSteamProgress();
      const synced = await steamSyncAchievements(acc.steamid, appidsToSync);
      progressUnlisten?.();
      console.log(`[gm:steam] logros sincronizados en ${synced} juego(s) (de ${appidsToSync.length})`);
      if (!silent) showToast(`Logros actualizados en ${synced} juego(s)`);
    } else {
      console.log("[gm:steam] sin juegos nuevos/con cambios de playtime — se omite sincronizar logros");
    }
  } catch (e) {
    reportError(e, "steamAccount:syncNow");
  } finally {
    steamSyncing.set(false);
    steamSyncProgress.set(null);
  }
}

// Logros cacheados de un juego (ya con nombre/descripción/ícono resueltos por
// el backend) — los consume GameDetail.svelte.
export async function loadAchievements(appid) {
  const acc = get(steamAccount);
  if (!acc) return [];
  try {
    const list = await steamAchievements(acc.steamid, appid);
    console.log(`[gm:steam] logros cacheados de appid ${appid}:`, list);
    return list;
  } catch (e) {
    console.warn(`[gm:steam] no se pudieron leer logros de appid ${appid}`, e);
    return [];
  }
}
