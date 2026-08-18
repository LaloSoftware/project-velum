import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Estilo de los indicadores de botón (prompts). "auto" muestra letras/texto
 * (comportamiento de siempre); el resto son combinaciones `<set>-<plataforma>`
 * que resuelve `theming/icons.js` contra `src/assets/icons/<set>/<plataforma>/`.
 * Lo consume `ButtonPrompt.svelte`.
 */

export const PROMPT_STYLES = [
  { id: "auto", labelKey: "prompts.style.auto" },
  { id: "line-xbox", labelKey: "prompts.style.lineXbox" },
  { id: "line-playstation", labelKey: "prompts.style.linePlaystation" },
  { id: "line-universal", labelKey: "prompts.style.lineUniversal" },
  { id: "duotono-xbox", labelKey: "prompts.style.duotonoXbox" },
  { id: "duotono-playstation", labelKey: "prompts.style.duotonoPlaystation" },
  { id: "duotono-universal", labelKey: "prompts.style.duotonoUniversal" },
  { id: "badge-xbox", labelKey: "prompts.style.badgeXbox" },
  { id: "badge-playstation", labelKey: "prompts.style.badgePlaystation" },
  { id: "badge-universal", labelKey: "prompts.style.badgeUniversal" },
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
