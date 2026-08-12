/*
 * English (US). Mismas claves que es-419 (ver scripts/i18n-check.mjs).
 */
export default {
  // --- Common ---
  "common.continue": "Continue",

  // --- First-run setup ---
  "setup.aria": "Initial setup",
  "setup.language.title": "Choose your language",
  "setup.language.desc":
    "Used across the whole interface. It also sets which language Steam data is requested in, though you can change that separately when you link your account.",
  "setup.language.hint": "You can change this later in Settings → Language.",
  "setup.stores.title": "Welcome to VELUM",
  "setup.stores.desc":
    "Choose which stores to show in your library. You can change this later in Settings → Library filters.",
  "setup.stores.hint": "You can scan your Steam library later from Settings → Accounts.",

  // --- Settings (sidebar) ---
  "settings.title": "Settings",
  "settings.sections.appearance": "Appearance",
  "settings.sections.language": "Language",
  "settings.sections.startup": "Startup",
  "settings.sections.shortcuts": "Shortcuts",
  "settings.sections.sounds": "Sounds",
  "settings.sections.buttonicons": "Button icons",
  "settings.sections.filters": "Library filters",
  "settings.sections.hidden": "Hidden",
  "settings.sections.system-actions": "System actions",
  "settings.sections.accounts": "Accounts",
  "settings.sections.notifications": "Notifications",

  // --- Settings → Language ---
  "settings.language.title": "Language",
  "settings.language.desc":
    "Language of the VELUM interface. The language Steam data is requested in (achievement names and descriptions) is configured separately under Accounts.",
  "settings.language.ui.label": "Interface language",
  "settings.language.steamHint":
    "Steam data language: {value} — change it in Settings → Accounts.",

  // --- Steam: data language ---
  "steam.lang.label": "Steam data language",
  "steam.lang.desc":
    "Which language achievement names and descriptions are requested in. If a game isn't translated, it falls back to English automatically.",
  "steam.lang.auto": "Same as interface ({value})",
  "steam.lang.changed": "Steam language updated — sync again to see the text in the new language",
};
