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

  // --- F3: game detail ---
  "detail.playtime.none": "No hours logged",
  "detail.playtime.hours": "{hours}h played",
  "detail.playtime.minutes": "{minutes} min played",
  "detail.recentPlaytime.none": "No hours in the last 2 weeks",
  "detail.recentPlaytime.hours": "{hours}h played (2 weeks)",
  "detail.recentPlaytime.minutes": "{minutes} min played (2 weeks)",
  "detail.steamLastPlayed.none": "No Steam record",
  "detail.steamLastPlayed.value": "Last played (Steam): {date}",
  "detail.lastPlayed.never": "Never played",
  "detail.lastPlayed.value": "Last played: {date}",
  "detail.downloadFromSteam": "Download from Steam",
  "detail.downloadFromSteam.hint": "Opens Steam on this game's page to install it.",
  "detail.notInstalled.tooltip": "Install it from {store} to play it",
  "detail.notInstalled.hint": "Install it from {store} to play it.",
  "detail.achievements.title": "{store} achievements",
  "detail.achievements.hidden": "Hidden achievement",
  "detail.achievements.viewAll": "View all achievements",
  "detail.sections.groups": "Groups",
  "detail.groups.new": "+ New group",
  "detail.sections.images": "Images",
  "detail.sections.soundtrack": "Soundtrack",
  "detail.sync.desc": "Force a resync of this game's achievements with Steam.",
  "detail.sync.syncing": "Syncing…",
  "detail.sync.action": "Sync achievements",
  "detail.sections.gameView": "Game view",

  // --- F3: new common strings ---
  "common.on": "ON",
  "common.off": "OFF",
  "common.filesOnlyInApp": "File picker only available in the app",
  "common.foldersOnlyInApp": "Folder picker only available in the app",
  "common.pickerError": "Couldn't open the picker",
  "common.choose": "Choose…",
  "common.remove": "Remove",

  // --- F3: game art editor (ArtEditor) ---
  "art.slots.cover.label": "Cover",
  "art.slots.cover.dims": "600 × 900",
  "art.slots.wide.label": "Wide cover",
  "art.slots.wide.dims": "920 × 430",
  "art.slots.hero.label": "Hero (background)",
  "art.slots.hero.dims": "3840 × 1240 (suggested, depends on your screen)",
  "art.slots.logo.label": "Logo",
  "art.slots.logo.dims": "Transparent PNG",
  "art.noImage": "No image",
  "art.logoPosition": "Logo position",
  "art.dragHint": "Drag an image here or use \"{choose}\".",
  "art.toast.updated": "Image updated",
  "art.toast.cleared": "Customization removed",

  // --- F3: game soundtrack editor ---
  "soundtrack.head": "Game audio",
  "soundtrack.change": "Change audio…",
  "soundtrack.choose": "Choose audio…",
  "soundtrack.warn":
    "Compressed files with a moderate size are recommended (MP3/OGG). Files that are too large can affect app performance while playing.",
  "soundtrack.hint": "Plays on loop while the game is focused on Home or its Detail is open.",
  "soundtrack.filterName": "Audio",
  "soundtrack.toast.updated": "Soundtrack updated",
  "soundtrack.toast.cleared": "Soundtrack removed",

  // --- F3: new common strings ---
  "common.close": "Close",

  // --- F3: full achievements modal ---
  "achievements.modal.aria": "Achievements",
  "achievements.modal.heading": "Achievements — {title}",
  "achievements.globalPct.hide": "Hide global %",
  "achievements.globalPct.show": "Show global %",
  "achievements.sort.label": "Sort:",
  "achievements.sort.byDate": "Unlock date",
  "achievements.sort.byGlobal": "Global %",
  "achievements.unlockedAt": "Unlocked: {date}",
  "achievements.global.loading": "loading %…",
  "achievements.global.pct": "{pct}% of players have this",
  "achievements.global.error": "couldn't fetch the global %",
  "achievements.empty": "No achievements synced yet — sync from Settings → Accounts.",

  // --- F3: Steam sync indicator and summary ---
  "steamSync.progress": "Steam: achievements {done}/{total}",
  "steamSync.library": "Steam: syncing library…",
  "steamSync.summary.achievementsUpdated": "Achievements updated: {done}/{total}",
  "steamSync.summary.scanned": "Scanned: {scanned}/{total} · New: {newScanned}/{newTotal}",
  "steamSync.summary.errors": "Errors during the process: {count}",
  "steamSync.summary.detailTitle": "Sync details",
  "steamSync.summary.noErrors": "No errors in this sync.",
  "steamSync.errorAppid": "appid {appid}",

  // --- F3: Steam account ---
  "steamAccount.unlink.title": "Unlink Steam account",
  "steamAccount.unlink.body":
    "Are you sure you want to unlink your account? This deletes the library and achievements synced in this launcher (your Steam account itself isn't affected).",
  "steamAccount.unlink.confirm": "Unlink",
  "steamAccount.interval.daily": "Every day",
  "steamAccount.interval.weekly": "Every week",
  "steamAccount.interval.monthly": "Every month",
  "steamAccount.syncOptions.reapplyHint": "Sync again to apply the change",
  "steamAccount.toast.keyLost": "The saved Steam API key was lost — link your account again",
  "steamAccount.toast.linked": "Steam account linked: {name}",
  "steamAccount.toast.unlinked": "Steam account unlinked",

  // --- F3: sync plurals (no "game(s)", see docs/i18n.md) ---
  "steam.toast.librarySynced": {
    one: "Library synced: {count} game",
    other: "Library synced: {count} games",
  },
  "steam.toast.achievementsSynced": {
    one: "Achievements updated in {count} game",
    other: "Achievements updated in {count} games",
  },

  // --- F3: "playing" overlay and play session ---
  "playing.downloading": "⬇ Downloading from Steam",
  "playing.openingSteam": "🎮 Opening Steam",
  "playing.playing": "▶ Playing",
  "playing.hint.hold": "Hold",
  "playing.hint.press": "Press",
  "playing.hint.suffix": "to return to the launcher",
  "common.preferenceSaved": "Preference saved",

  // --- F3: multimedia common strings ---
  "common.rename": "Rename",
  "common.refresh": "Refresh",
  "common.shuffle": "Shuffle",
  "common.loading": "Loading…",
  "media.play": "Play",

  // --- F3: Multimedia (section shell) ---
  "multimedia.section.music": "Music",
  "multimedia.section.videos": "Videos",

  // --- F3: virtual keyboard titles per field (multimedia) ---
  "keyboard.title.playlistName": "Playlist name",
  "keyboard.title.albumName": "Album name",

  // --- F3: Music — main view ---
  "music.tab.albums": "Albums",
  "music.tab.playlists": "Playlists",
  "music.tab.nowPlaying": "Now Playing",
  "music.addAlbum": "Add album",
  "music.addRootFolder": "Add root folder",
  "music.emptyAlbums":
    "Add a folder with music — each folder becomes an album. Or add a root folder and each subfolder automatically becomes an album.",
  "music.newPlaylist": "New playlist",
  "music.trackCount": {
    one: "{count} track",
    other: "{count} tracks",
  },
  "music.emptyPlaylists": "Create a playlist to combine tracks from different albums.",
  "music.toast.albumAdded": "Album added",
  "music.toast.rootFolderAdded": "Root folder added",
  "music.toast.playlistCreated": "Playlist \"{name}\" created",

  // --- F3: Music — album detail ---
  "music.toast.addedToPlaylist": "Added to \"{name}\"",
  "music.newPlaylistOption": "Create new playlist…",
  "music.removeFromLibrary": "Remove from library",
  "music.playAlbum": "Play album",
  "music.noAudioFiles": "No audio files found in this folder.",

  // --- F3: Music — playlist detail ---
  "music.toast.playlistDeleted": "Playlist \"{name}\" deleted",
  "music.deletePlaylist": "Delete playlist",
  "music.playlistEmpty":
    "No tracks yet — add them from an album's detail (\"Add to playlist\").",
  "music.moveUp": "Move up",
  "music.moveDown": "Move down",
  "music.removeFromPlaylist": "Remove from playlist",

  // --- F3: Music — now playing ---
  "music.nothingPlaying": "Nothing playing — choose an album or a playlist.",
  "music.previous": "Previous",
  "music.playPause": "Play/pause",
  "music.next": "Next",

  // --- F3: Images ---
  "images.emptyAlbums":
    "Add a folder with images — each folder becomes an album. Or add a root folder and each subfolder automatically becomes an album.",
  "images.noImagesFound": "No images found in this folder.",

  // --- F3: Video ---
  "videos.emptyAlbums":
    "Add a folder with videos (MP4/WebM) — each folder becomes an album. Or add a root folder and each subfolder automatically becomes an album.",
  "videos.noVideosFound": "No videos (MP4/WebM) found in this folder.",
  "videos.exit": "Exit",
};
