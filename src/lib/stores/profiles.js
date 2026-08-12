import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { applyProfile } from "../theming/index.js";

/*
 * Perfiles visuales. Cada perfil elige un tema base y puede añadir overrides
 * de tokens y CSS extra. Se persisten vía backend (o localStorage en web).
 */

export const profiles = writable([]);
export const activeProfileId = writable(null);

/*
 * `name: ""` a propósito, no un texto: el nombre por defecto NO se materializa
 * en la config. Lo resuelve quien lo pinta (`profileName()`), así que sigue al
 * idioma activo. En cuanto el usuario renombra el perfil, su texto queda
 * guardado y ya no se traduce nunca — ver docs/i18n.md.
 */
function defaultProfile() {
  return {
    id: "default",
    name: "",
    baseTheme: "velum",
    tokenOverrides: {},
    extraCss: "",
    wallpaper: "",
  };
}

let _loaded = false;

// Nombre que tenía el perfil inicial antes de que los nombres autogenerados
// pasaran a resolverse por idioma. Ver migrateDefaultProfileName().
const LEGACY_DEFAULT_NAME = "Por defecto";

/**
 * Migración de una sola vez: el perfil inicial de instalaciones previas tiene
 * literalmente "Por defecto" escrito en la config. Si sigue intacto, se vacía
 * para que empiece a seguir el idioma como los nuevos. Cualquier otro nombre
 * se respeta — es texto que escribió el usuario.
 */
function migrateDefaultProfileName(list) {
  let changed = false;
  const out = list.map((p) => {
    if (p.id === "default" && p.name === LEGACY_DEFAULT_NAME) {
      changed = true;
      return { ...p, name: "" };
    }
    return p;
  });
  return changed ? out : list;
}

export async function initProfiles() {
  if (_loaded) return;
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.profiles) && cfg.profiles.length) {
    const migrated = migrateDefaultProfileName(cfg.profiles);
    profiles.set(migrated);
    activeProfileId.set(cfg.activeProfileId || migrated[0].id);
    if (migrated !== cfg.profiles) await patchAppConfig({ profiles: migrated });
  } else {
    const p = defaultProfile();
    profiles.set([p]);
    activeProfileId.set(p.id);
  }
  _loaded = true;
  applyActive();
}

export function getActive() {
  const id = get(activeProfileId);
  return get(profiles).find((p) => p.id === id) || get(profiles)[0];
}

export function applyActive() {
  applyProfile(getActive());
}

export async function persist() {
  await patchAppConfig({
    profiles: get(profiles),
    activeProfileId: get(activeProfileId),
  });
}

export async function setActive(id) {
  activeProfileId.set(id);
  applyActive();
  await persist();
}

export async function createProfile(name, baseTheme = "velum") {
  const p = {
    id: `p_${Date.now()}`,
    // Vacío = "sin nombre propio": lo resuelve profileName() al pintar.
    name: name || "",
    baseTheme,
    tokenOverrides: {},
    extraCss: "",
    wallpaper: "",
  };
  profiles.update((list) => [...list, p]);
  await setActive(p.id);
  return p;
}

export async function updateActive(patch) {
  const id = get(activeProfileId);
  profiles.update((list) =>
    list.map((p) => (p.id === id ? { ...p, ...patch } : p))
  );
  applyActive();
  await persist();
}

export async function deleteProfile(id) {
  const list = get(profiles).filter((p) => p.id !== id);
  if (!list.length) list.push(defaultProfile());
  profiles.set(list);
  if (get(activeProfileId) === id) {
    await setActive(list[0].id);
  } else {
    await persist();
  }
}
