import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { bustPath } from "../util/asset.js";
import { artImport, artRemove, artPrune, isTauri } from "../ipc/index.js";

/*
 * Overrides de arte por juego (personalización manual desde el detalle). Cada
 * entrada: { cover?, wide?, hero?, logo?, logoPos? } con RUTAS de fichero
 * locales (logoPos es un código de posición, no una ruta). Tienen prioridad
 * sobre el arte detectado de la tienda. Persistente.
 *   - cover: carátula vertical (600×900) — siempre en la tarjeta.
 *   - wide:  carátula expandida / header (~920×430) — tarjeta enfocada en Inicio.
 *   - hero:  fondo ancho (~1920×620) — fondo de Inicio y Detalle.
 *   - logo:  isotipo transparente, superpuesto al hero del Detalle.
 *   - logoPos: posición del logo sobre el hero, preset 3×3
 *     (tl tc tr / ml mc mr / bl bc br). Default "tr" (arriba-derecha).
 *
 * Fase 2 (feature-imagenes.md): las rutas de imagen (no `logoPos`) ya NO son
 * la ruta que eligió el usuario — es una COPIA propia dentro del almacén de
 * la app (`artstore.rs`, `<app_config_dir>/art/`). Antes se guardaba la ruta
 * prestada tal cual: si el archivo original se borraba o movía, el override
 * quedaba "activo" apuntando a la nada (`imageUrl()` fallaba en silencio, sin
 * forma de notarlo salvo "Quitar" a mano). `setOverride()` importa antes de
 * persistir; `initArtOverrides()` adopta/limpia lo que venga de una
 * instalación previa a este cambio (ver `sweepArtOverrides` más abajo).
 */

const IMAGE_KEYS = ["cover", "wide", "hero", "logo"];

export const overrides = writable({}); // { [gameId]: { cover, wide, hero, logo, logoPos } }

export async function initArtOverrides() {
  const cfg = await loadAppConfig();
  const stored = (cfg && cfg.artOverrides) || {};
  overrides.set(stored);
  // Sin `await` — mismo criterio que updates.js::maybeCheckOnStart(): no debe
  // demorar el primer pintado. `artImport()` es idempotente para una ruta que
  // ya vive en el almacén propio (ver artstore.rs), así que no hace falta
  // distinguir acá "ya adoptado" de "ruta externa todavía por adoptar" — se
  // intenta igual para las dos, y no hace nada de más en el caso ya-adoptado.
  if (isTauri) sweepArtOverrides(stored);
}

function isSourceMissing(e) {
  const raw = (e && e.message) || String(e);
  return raw === "art.source_missing" || raw.startsWith("art.source_missing|");
}

// Barrido de adopción y saneo (Fase 2), una sola pasada al arrancar:
//   - ruta ya dentro del almacén propio → artImport() la devuelve sin tocar.
//   - ruta externa (instalación previa a este cambio) → se importa y el
//     override se reescribe con la copia nueva.
//   - el archivo original ya no existe → SE ELIMINA ese override — es
//     exactamente el bug reportado (una personalización "activa" que en
//     realidad no muestra nada). Cualquier OTRO error (permisos, disco
//     lleno) no borra nada del usuario, solo queda sin adoptar por esta vez
//     y se reintenta en el próximo arranque.
// Termina con un solo patchAppConfig() (si hubo cambios) y un artPrune() de
// las carpetas que ya no corresponden a ningún override vigente.
async function sweepArtOverrides(initial) {
  let changed = false;
  const next = {};
  for (const [id, entry] of Object.entries(initial)) {
    const patched = { ...entry };
    for (const kind of IMAGE_KEYS) {
      const path = patched[kind];
      if (!path) continue;
      try {
        const stored = await artImport(id, kind, path);
        if (stored !== path) {
          patched[kind] = stored;
          changed = true;
        }
      } catch (e) {
        if (isSourceMissing(e)) {
          delete patched[kind];
          if (kind === "logo") delete patched.logoPos;
          changed = true;
        } else {
          console.warn(`[gm:art] no se pudo adoptar el override "${kind}" de ${id}`, e);
        }
      }
    }
    if (IMAGE_KEYS.some((k) => patched[k])) next[id] = patched;
    else if (Object.keys(entry).length) changed = true; // se quedó sin ninguna imagen
  }
  if (changed) {
    overrides.set(next);
    await patchAppConfig({ artOverrides: next });
  }
  artPrune(Object.keys(next)).catch(() => {});
}

export async function setOverride(id, kind, path) {
  const stored = await artImport(id, kind, path);
  await recordImportedOverride(id, kind, stored);
}

// Registra una imagen que YA fue importada al almacén propio por OTRO camino
// (SteamGridDB, stores/griddb.js::importGriddbImage, que usa artImportUrl en
// vez de artImport) — mismo efecto final que setOverride(), sin volver a
// llamar a artImport() sobre algo que ya está copiado.
export async function recordImportedOverride(id, kind, storedPath) {
  overrides.update((m) => ({ ...m, [id]: { ...(m[id] || {}), [kind]: storedPath } }));
  await patchAppConfig({ artOverrides: get(overrides) });
}

export async function clearOverride(id, kind) {
  overrides.update((m) => {
    const g = { ...(m[id] || {}) };
    delete g[kind];
    if (kind === "logo") delete g.logoPos; // sin logo, no tiene sentido guardar su posición
    return { ...m, [id]: g };
  });
  await patchAppConfig({ artOverrides: get(overrides) });
  // Best-effort: un fallo al borrar el archivo del almacén no debe impedir
  // quitar el override del JSON (ya se persistió arriba).
  try {
    await artRemove(id, kind);
  } catch (e) {
    console.warn(`[gm:art] no se pudo borrar el archivo del override "${kind}" de ${id}`, e);
  }
}

// Posición del logo sobre el hero: preset 3×3 (tl tc tr / ml mc mr / bl bc br).
export async function setLogoPos(id, pos) {
  overrides.update((m) => ({ ...m, [id]: { ...(m[id] || {}), logoPos: pos } }));
  await patchAppConfig({ artOverrides: get(overrides) });
}

// Arte efectivo de un juego: override manual primero, luego el de la tienda.
export function effectiveArt(game, map) {
  const o = (map && game && map[game.id]) || {};
  return {
    cover: o.cover || game?.coverPath || null,
    wide: o.wide || game?.widePath || null,
    hero: o.hero || game?.heroPath || null,
    logo: o.logo || game?.logoPath || null,
    logoPos: o.logoPos || "tr",
  };
}

// Igual que effectiveArt(), pero con el bust de stores/artRefresh.js aplicado
// a las 3 rutas de imagen (logoPos no es una ruta, no se bustea). El bust
// EFECTIVO de un juego es el más reciente entre el global y el puntual de ese
// juego — un refresco puntual no debe repintar el resto de la biblioteca.
export function bustedArt(game, map, bustState) {
  const art = effectiveArt(game, map);
  const bust = Math.max(bustState?.all || 0, (game && bustState?.byGame?.[game.id]) || 0);
  if (!bust) return art;
  return {
    ...art,
    cover: bustPath(art.cover, bust),
    wide: bustPath(art.wide, bust),
    hero: bustPath(art.hero, bust),
    logo: bustPath(art.logo, bust),
  };
}
