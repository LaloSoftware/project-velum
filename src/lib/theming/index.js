/*
 * Motor de theming.
 *
 * Aplica un PERFIL al DOM en runtime, sin recargar:
 *   1. Escribe los tokens --gm-* del tema base + overrides del perfil en
 *      un <style id="gm-theme-vars">.
 *   2. Inyecta el CSS extra (del tema y/o del perfil) en <style id="gm-theme-extra">.
 *
 * Un perfil:
 *   { id, name, baseTheme, tokenOverrides: {}, extraCss: "", wallpaper?: string }
 */

import { BUILTIN_THEMES } from "./themes.js";

function ensureStyle(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

export function themeOptions() {
  return Object.entries(BUILTIN_THEMES).map(([id, t]) => ({ id, name: t.name }));
}

export function applyProfile(profile) {
  if (!profile) return;
  const base = BUILTIN_THEMES[profile.baseTheme] || BUILTIN_THEMES.midnight;

  // 1. Tokens: base del tema + overrides del perfil + wallpaper explícito.
  const tokens = { ...base.tokens, ...(profile.tokenOverrides || {}) };
  if (profile.wallpaper) tokens["--gm-wallpaper"] = profile.wallpaper;

  const decls = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  ensureStyle("gm-theme-vars").textContent = decls ? `:root {\n${decls}\n}` : "";

  // 2. CSS extra: el del tema + el del perfil (texto libre del usuario).
  const extra = [base.extraCss || "", profile.extraCss || ""].join("\n");
  ensureStyle("gm-theme-extra").textContent = extra;
}
