import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

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
 */

export const overrides = writable({}); // { [gameId]: { cover, wide, hero, logo, logoPos } }

export async function initArtOverrides() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.artOverrides) overrides.set(cfg.artOverrides);
}

export async function setOverride(id, kind, path) {
  overrides.update((m) => ({ ...m, [id]: { ...(m[id] || {}), [kind]: path } }));
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
