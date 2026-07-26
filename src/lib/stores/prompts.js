import { writable, get } from "svelte/store";
import { loadAppConfig, patchAppConfig } from "./appConfig.js";

/*
 * Estilo de los indicadores de botón (prompts). Por ahora solo "auto" (muestra
 * letras/texto). Preparado para añadir sets de iconos (Xbox/PlayStation/genérico).
 * Lo consume `ButtonPrompt.svelte`.
 */

export const PROMPT_STYLES = [
  { id: "auto", label: "Automático" },
  // Futuro: { id: "xbox", ... }, { id: "playstation", ... }, { id: "letters", ... }
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
