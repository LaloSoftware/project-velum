import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";
import { applyProfile } from "../theming/index.js";

/*
 * Perfiles visuales. Cada perfil elige un tema base y puede añadir overrides
 * de tokens y CSS extra. Se persisten vía backend (o localStorage en web).
 */

export const profiles = writable([]);
export const activeProfileId = writable(null);

function defaultProfile() {
  return {
    id: "default",
    name: "Por defecto",
    baseTheme: "velum",
    tokenOverrides: {},
    extraCss: "",
    wallpaper: "",
  };
}

let _loaded = false;

export async function initProfiles() {
  if (_loaded) return;
  const cfg = await loadAppConfig();
  if (cfg && Array.isArray(cfg.profiles) && cfg.profiles.length) {
    profiles.set(cfg.profiles);
    activeProfileId.set(cfg.activeProfileId || cfg.profiles[0].id);
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
    name: name || "Nuevo perfil",
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
