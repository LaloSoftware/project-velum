import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Estilo de los indicadores de botón (prompts). "auto" muestra letras/texto
 * (comportamiento de siempre); el resto son combinaciones `<set>-<plataforma>`
 * que resuelve `theming/icons.js` contra `src/assets/icons/<set>/<plataforma>/`.
 * Lo consume `ButtonPrompt.svelte`.
 */

export const PROMPT_STYLES = [
  { id: "auto", label: "Automático (texto)" },
  { id: "line-xbox", label: "Línea · Xbox" },
  { id: "line-playstation", label: "Línea · PlayStation" },
  { id: "line-universal", label: "Línea · Universal" },
  { id: "duotono-xbox", label: "Duotono · Xbox" },
  { id: "duotono-playstation", label: "Duotono · PlayStation" },
  { id: "duotono-universal", label: "Duotono · Universal" },
  { id: "badge-xbox", label: "Badge · Xbox" },
  { id: "badge-playstation", label: "Badge · PlayStation" },
  { id: "badge-universal", label: "Badge · Universal" },
];

export const promptStyle = writable("auto");

export async function initPrompts() {
  const cfg = await loadAppConfig();
  if (cfg && cfg.promptStyle) promptStyle.set(cfg.promptStyle);
}

export async function setPromptStyle(id) {
  promptStyle.set(id);
  await patchAppConfig({ promptStyle: get(promptStyle) });
}
