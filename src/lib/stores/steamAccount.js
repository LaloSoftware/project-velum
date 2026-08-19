import { writable, derived, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { showToast, reportError } from "./ui.js";
import { mergeSteamGhosts } from "./games.js";
import { uiLanguage, steamLangFor } from "./language.js";
import { tr } from "../i18n/index.js";
import {
  isTauri,
  steamLinkAccount,
  steamUnlinkAccount,
  steamHasKey,
  steamSyncLibrary,
  steamLibraryCache,
  steamSyncAchievements,
  steamAchievements,
  steamAchievementsSummary,
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

// Resumen simplificado de la última sincronización de logros — badge flotante
// (SteamSyncSummaryBadge.svelte), NO un modal: se cierra clickeando (o con el
// combo de mando Home+L3, ver comboShortcuts.js) o solo, con temporizador,
// para no acumular. Se llena en syncNow() cuando de verdad se sincronizaron
// logros de al menos un juego (silenciosa o no).
export const steamSyncSummary = writable(null); // AchievementsSyncSummary | null
// Detalle (log de errores) expandido o no — compartido entre el click del
// mouse y el combo de mando, ambos deben abrir/cerrar lo mismo.
export const syncSummaryExpanded = writable(false);
const SYNC_SUMMARY_AUTOCLOSE_MS = 20000;
let summaryTimer = null;
export function dismissSyncSummary() {
  clearTimeout(summaryTimer);
  steamSyncSummary.set(null);
  syncSummaryExpanded.set(false);
}
function showSyncSummary(summary) {
  clearTimeout(summaryTimer);
  steamSyncSummary.set(summary);
  summaryTimer = setTimeout(() => steamSyncSummary.set(null), SYNC_SUMMARY_AUTOCLOSE_MS);
}
// Pausa/reanuda el auto-cierre mientras el jugador tiene abierto el detalle
// (el log de errores) — no tiene sentido que se cierre solo mientras lo lee.
export function holdSyncSummary() {
  clearTimeout(summaryTimer);
}
export function resumeSyncSummaryTimer() {
  clearTimeout(summaryTimer);
  if (get(steamSyncSummary)) {
    summaryTimer = setTimeout(() => steamSyncSummary.set(null), SYNC_SUMMARY_AUTOCLOSE_MS);
  }
}
// Expande/colapsa el detalle — usado tanto por el click del badge como por el
// combo de mando Home+L3 (App.svelte, acción "steamSyncSummary").
export function toggleSyncSummaryExpanded() {
  const next = !get(syncSummaryExpanded);
  syncSummaryExpanded.set(next);
  if (next) holdSyncSummary();
  else resumeSyncSummaryTimer();
}

// Opciones de sincronización (Configuración → Cuentas → "Opciones de
// sincronización"), globales igual que la cuenta misma — no por perfil.
export const GLOBAL_PCT_INTERVALS = [
  { value: "daily", labelKey: "steamAccount.interval.daily", secs: 24 * 3600 },
  { value: "weekly", labelKey: "steamAccount.interval.weekly", secs: 7 * 24 * 3600 },
  { value: "monthly", labelKey: "steamAccount.interval.monthly", secs: 30 * 24 * 3600 },
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
    showToast(tr("steamAccount.syncOptions.reapplyHint"));
  }
}

/*
 * Idioma en que se le piden los datos a Steam (parámetro `l` de la Web API:
 * nombres y descripciones de logros, nombres de juegos no instalados).
 *
 * Es un ajuste SEPARADO del idioma de la interfaz, pero por defecto lo sigue:
 * el sentinel "auto" resuelve al idioma de Steam asociado al de la UI (ver
 * i18n/index.js::UI_LOCALES), que es la preselección que hace la
 * configuración inicial. Elegir un código concreto lo desacopla para siempre
 * — el caso de quien quiere la interfaz en español y los logros en inglés.
 */
export const steamLangPref = writable("auto"); // "auto" | código de STEAM_LANGUAGES
export const effectiveSteamLang = derived([steamLangPref, uiLanguage], ([$pref, $ui]) =>
  $pref === "auto" ? steamLangFor($ui) : $pref
);

export async function setSteamLangPref(v) {
  const before = get(effectiveSteamLang);
  steamLangPref.set(v);
  await patchAppConfig({ steamLang: v });
  // Mismo criterio que includePlayedFreeGames: el cambio no re-traduce lo ya
  // cacheado por sí solo (ver el refetch por idioma en achievements.rs), hace
  // falta volver a sincronizar.
  if (get(effectiveSteamLang) !== before) showToast(tr("steam.lang.changed"));
}

// Visibilidad del SteamID en Cuentas — oculto por defecto (dato semi-privado),
// el jugador lo activa a propósito si quiere verlo. Preferencia persistida
// como el resto (config.json), no vive en steamAccount porque no es parte de
// la identidad en sí, solo de cómo se muestra.
export const showSteamId = writable(false);
export async function setShowSteamId(v) {
  showSteamId.set(!!v);
  await patchAppConfig({ showSteamId: !!v });
}

export async function initSteamAccount() {
  const cfg = await loadAppConfig();
  if (cfg?.steamSyncOptions) {
    steamSyncOptions.set({ ...DEFAULT_SYNC_OPTIONS, ...cfg.steamSyncOptions });
  }
  showSteamId.set(!!cfg?.showSteamId);
  if (cfg?.steamLang) steamLangPref.set(cfg.steamLang);
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
    showToast(tr("steamAccount.toast.keyLost"));
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
  await loadAchievementSummaries();
}

// Resumen unlocked/total de logros por juego (appid -> {unlocked, total}),
// para marcar en las tarjetas los juegos 100% completados sin abrir el
// Detalle de cada uno (ver GameCard.svelte). Lee del caché SQLite, sin red —
// se recarga al arrancar (junto con mergeCachedSteamGhosts) y tras cada sync.
export const steamAchievementSummaries = writable(new Map());

export async function loadAchievementSummaries() {
  const acc = get(steamAccount);
  if (!acc || !isTauri) return;
  try {
    const rows = await steamAchievementsSummary(acc.steamid);
    steamAchievementSummaries.set(new Map(rows.map((r) => [r.appid, r])));
  } catch (e) {
    console.warn("[gm:steam] no se pudo leer el resumen de logros", e);
  }
}

export async function linkAccount(profileInput, apiKey) {
  const info = await steamLinkAccount(profileInput, apiKey);
  console.log("[gm:steam] cuenta vinculada:", info);
  steamAccount.set(info);
  await patchAppConfig({ steamAccount: info });
  showToast(tr("steamAccount.toast.linked", { name: info.personaName }));
  return info;
}

export async function unlinkAccount() {
  const acc = get(steamAccount);
  if (!acc) return;
  await steamUnlinkAccount(acc.steamid);
  steamAccount.set(null);
  await patchAppConfig({ steamAccount: null });
  showToast(tr("steamAccount.toast.unlinked"));
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
    const lang = get(effectiveSteamLang);
    const summary = await steamSyncLibrary(acc.steamid, includePlayedFreeGames, lang);
    console.log("[gm:steam] resumen de biblioteca:", summary);
    if (!silent) showToast(tr("steam.toast.librarySynced", { count: summary.totalGames }));

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
      const achSummary = await steamSyncAchievements(acc.steamid, appidsToSync, false, lang);
      progressUnlisten?.();
      console.log("[gm:steam] resumen de logros:", achSummary);
      if (!silent) showToast(tr("steam.toast.achievementsSynced", { count: achSummary.achievementsSynced }));
      // Un error de UN juego (red, HTTP, etc.) ya no aborta el resto de la
      // sincronización — se registra en achSummary.errors y sigue. El badge
      // flotante avisa del resumen (y de los errores, si hubo) sin
      // interrumpir con un toast/error modal disruptivo.
      showSyncSummary(achSummary);
      await loadAchievementSummaries();
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

// Sincroniza logros de UN solo juego (sección "Steam" del Detalle) — mismo
// camino que syncNow pero sin steamSyncLibrary/GetOwnedGames (no hace falta
// releer toda la biblioteca solo para revisar el juego que el jugador ya
// tiene abierto) y con `force: true`: al ser un solo juego no hay problema de
// costo en red, así que se ignora schema_cache por completo (ver `force` en
// steam_sync_achievements/sync_one_game) en vez de confiar en cualquier
// negativo cacheado — la vía manual para no esperar el recheck automático
// (p. ej. un juego predescargado que recién lanzó y ganó logros).
export async function syncGameNow(appid) {
  const acc = get(steamAccount);
  if (!acc || get(steamSyncing)) return;
  steamSyncing.set(true);
  steamSyncProgress.set(null);
  try {
    await listenSteamProgress();
    const achSummary = await steamSyncAchievements(
      acc.steamid,
      [appid],
      true,
      get(effectiveSteamLang)
    );
    progressUnlisten?.();
    showToast(tr("steam.toast.achievementsSynced", { count: achSummary.achievementsSynced }));
    showSyncSummary(achSummary);
    await loadAchievementSummaries();
  } catch (e) {
    reportError(e, "steamAccount:syncGameNow");
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
