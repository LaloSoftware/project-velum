import { loadConfig, saveConfig } from "../ipc/index.js";

/*
 * Config unificada de la app, persistida como un único JSON:
 *   { profiles, activeProfileId, bindings, startup }
 *
 * Varios stores (perfiles, bindings, startup) guardan su "slice" a través de
 * aquí para no pisarse entre ellos al escribir el mismo fichero. Se carga una
 * sola vez (cacheada) y cada `patch` reescribe el objeto completo.
 */

let _config = null;
let _loading = null;

export async function loadAppConfig() {
  if (_config) return _config;
  if (!_loading) {
    _loading = (async () => {
      _config = (await loadConfig()) || {};
      return _config;
    })();
  }
  return _loading;
}

export function getAppConfig() {
  return _config || {};
}

export async function patchAppConfig(patch) {
  _config = { ...(_config || {}), ...patch };
  await saveConfig(_config);
}
