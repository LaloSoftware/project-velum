import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Preferencias visuales de interfaz (persistentes):
 *   - hideCardText: oculta el título inferior de las tarjetas.
 *   - hideLibraryButton: oculta el botón "Ver biblioteca completa" de Inicio.
 */

export const hideCardText = writable(false);
export const hideLibraryButton = writable(false);

export async function initUiPrefs() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.ui) {
    if (typeof cfg.ui.hideCardText === "boolean") hideCardText.set(cfg.ui.hideCardText);
    if (typeof cfg.ui.hideLibraryButton === "boolean")
      hideLibraryButton.set(cfg.ui.hideLibraryButton);
  }
}

async function persist() {
  await patchAppConfig({
    ui: { hideCardText: get(hideCardText), hideLibraryButton: get(hideLibraryButton) },
  });
}

export async function setHideCardText(v) {
  hideCardText.set(!!v);
  await persist();
}
export async function setHideLibraryButton(v) {
  hideLibraryButton.set(!!v);
  await persist();
}
