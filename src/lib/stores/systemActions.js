import { writable } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Preferencias de la sección "Acciones del sistema" (menú de Configuración).
 * Globales (no por perfil): son sobre comportamiento del launcher, no aspecto.
 *   - showPowerFooter: fila de botones de ventana/energía al final del menú
 *     de Configuración. Oculta por defecto; el acceso rápido equivalente es
 *     el combo de botones (ver stores/comboShortcuts.js).
 */

export const showPowerFooter = writable(false);

let _loaded = false;

export async function initSystemActions() {
  if (_loaded) return;
  const cfg = await loadAppConfig();
  showPowerFooter.set(cfg?.showPowerFooter ?? false);
  _loaded = true;
}

export async function setShowPowerFooter(v) {
  showPowerFooter.set(v);
  await patchAppConfig({ showPowerFooter: v });
}
