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

  // --- Common ---
  "common.none": "None",
  "common.done": "Done",
  "common.hidden": "Hidden",
  "common.align.left": "Left",
  "common.align.center": "Center",
  "common.align.right": "Right",
  "common.align.top": "Top",
  "common.align.bottom": "Bottom",
  "common.pos.tl": "Top left",
  "common.pos.tc": "Top center",
  "common.pos.tr": "Top right",
  "common.pos.ml": "Middle left",
  "common.pos.mr": "Middle right",
  "common.pos.bl": "Bottom left",
  "common.pos.bc": "Bottom center",
  "common.pos.br": "Bottom right",

  // --- Default names for things the user can rename ---
  "profiles.defaultName": "Default",
  "groups.defaultName": "Group",
  "playlists.defaultName": "Playlist",

  // --- Home default texts ---
  "home.title": "Welcome",
  "home.subtitle": "Pick up where you left off, or open your full library.",
  "home.recent": "Recent",

  // --- System menu and radial actions ---
  "system.actions.minimize": "Minimize",
  "system.actions.maximize": "Maximize",
  "system.actions.exitFullscreen": "Exit fullscreen",
  "system.actions.enterFullscreen": "Enter fullscreen",
  "system.actions.closeApp": "Quit the app",
  "system.actions.shutdown": "Shut down the system",
  "system.actions.musicToggle": "Play/pause music",
  "system.actions.musicStop": "Stop music",

  // --- Actions you can bind to gamepad buttons ---
  "input.actions.accept": "Accept / Play",
  "input.actions.north": "Details",
  "input.actions.back": "Back / Cancel",
  "input.actions.west": "Card menu (alternate)",
  "input.actions.menu": "Settings menu",
  "input.actions.quick": "System menu (QAM)",
  "input.actions.tabLeft": "Previous tab",
  "input.actions.tabRight": "Next tab",
  "input.actions.search": "Search (in Games)",
  "input.actions.filterPrev": "Store filter ◀ (Games)",
  "input.actions.filterNext": "Store filter ▶ (Games)",
  "input.actions.filters": "Filters and sorting (Games/Apps)",
  "input.actions.context": "Card menu",

  // Button descriptors: the token (A, B, LB, RT, Start…) is printed on the
  // controller itself and is never translated — only what goes with it.
  "input.buttons.triangle": "Triangle",
  "input.buttons.square": "Square",
  "input.buttons.leftStick": "left stick",
  "input.buttons.rightStick": "right stick",
  "input.buttons.guide": "Guide",

  // --- Detail fields (which data is shown) ---
  "detail.fields.title": "Title",
  "detail.fields.platform": "Platform",
  "detail.fields.lastPlayed": "Last played",
  "detail.fields.installDir": "Install path",
  "detail.fields.playtime": "Hours played (Steam)",
  "detail.fields.recentPlaytime": "Played recently, 2 weeks (Steam)",
  "detail.fields.steamLastPlayed": "Last played according to Steam",
  "detail.fields.achievements": "Achievements as badge (otherwise, section)",
  "detail.fields.achievementsBadgeFixed": "Pin the achievements badge to the corner",
  "detail.fields.showGlobalPct": "Show global unlock rate (achievements)",
  "detail.fields.revealHiddenAchievements": "Show hidden achievements (spoiler)",

  // --- Settings → Appearance: Home block ---
  "settings.home.text.title": "Title",
  "settings.home.text.subtitle": "Subtitle",
  "settings.home.text.recent": "\"Recent\" heading",
  "settings.home.mode.custom": "Custom",
  "settings.home.mode.focus": "Focused game",
  "settings.home.orientation.horizontal": "Horizontal",
  "settings.home.orientation.vertical": "Vertical",
  "settings.home.scroll.scroll": "Scroll",
  "settings.home.scroll.infinito": "Infinite scroll",
  "settings.home.reading.natural": "Natural",
  "settings.home.reading.invertido": "Inverted",
  "settings.home.reading.centrado": "Main item centered",

  // --- F2: shell (tabs, footer) ---
  "nav.home": "Home",
  "nav.games": "Games",
  "nav.apps": "Apps",
  "nav.multimedia": "Multimedia",
  "footer.accept.open": "Open",
  "footer.accept.playTrack": "Play track",
  "footer.accept.view": "View",
  "footer.accept.playVideo": "Play",
  "footer.secondary.detail": "Details",
  "footer.secondary.play": "Play",
  "footer.secondary.addToPlaylist": "Add to playlist",
  "footer.cardMenu": "Menu",
  "footer.search": "Search",
  "footer.tabs": "Tabs",
  "footer.settings": "Settings",
  "footer.system": "System",
  "footer.systemMenu": "System menu",

  // --- F2: new common strings ---
  "common.play": "Play",
  "common.cancel": "Cancel",
  "common.back": "Back",
  "common.delete": "Delete",

  // --- F2: Filters and sorting modal ---
  "filters.title": "Filters and sorting",
  "filters.category": "Category",
  "filters.installation": "Installation",
  "filters.sortBy": "Sort by",

  // --- F2: library (filters, search, empty grid) ---
  "library.filter.all": "All",
  "library.filter.installed": "Installed",
  "library.filter.notInstalled": "Not installed",
  "library.search.title": "Search game",
  "library.empty": "No items.",

  // --- F2: Games/Apps sorting ---
  "sort.original": "Original",
  "sort.titleAsc": "Title A → Z",
  "sort.titleDesc": "Title Z → A",
  "sort.storeAsc": "Platform A → Z",
  "sort.storeDesc": "Platform Z → A",
  "sort.sizeAsc": "Size (smallest → largest)",
  "sort.sizeDesc": "Size (largest → smallest)",

  // --- F2: game card (GameCard) ---
  "card.toast.notInstalled": "Install \"{title}\" from {store} to play it",
  "card.tooltip.notInstalled": "Not installed — install it from {store}",
  "card.tooltip.complete": "100% achievements complete",
  "card.badge.notInstalled": "{store} · not installed",

  // --- F2: card context menu ---
  "ctx.run": "Run",
  "ctx.details": "Details",
  "ctx.addToGroup": "Add to group ›",
  "ctx.removeFromGroup": "Remove from group ›",
  "ctx.hide": "Hide",
  "ctx.newGroup": "+ New group…",
  "ctx.toast.hidden": "\"{title}\" hidden",
  "ctx.toast.addedTo": "Added to \"{name}\"",
  "ctx.toast.removedFrom": "Removed from \"{name}\"",

  // --- F2: virtual keyboard title per field ---
  "keyboard.title.groupName": "Group name",

  // --- F2: delete game confirmation ---
  "confirmDelete.title": "Delete game",
  "confirmDelete.body.pre": "Are you sure you want to delete ",
  "confirmDelete.body.post": "? Its uninstaller will run.",
  "confirmDelete.toast.uninstalling": "Running the uninstaller for {title}…",

  // --- F2: virtual keyboard ---
  "vk.write": "Type",
  "vk.shift": "Shift",
  "vk.backspace": "Delete",
  "vk.space": "Space",
  "vk.accept": "Accept",
  "vk.submit": "Submit",

  // --- F2: Home (empty state, library button) ---
  "home.empty": "You haven't played anything yet. Open the library (Menu button).",
  "home.viewLibrary": "View full library ({count}) →",

  // --- F2: gamepad connected/disconnected notice ---
  "gamepad.connected": "Controller connected",
  "gamepad.disconnected": "Controller disconnected",

  // --- F2: error banner ---
  "error.label": "Error",
  "error.close": "Close (B)",
};
