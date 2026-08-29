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
  "settings.sections.updates": "Updates",

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
  "vk.showPassword": "Show",
  "vk.hidePassword": "Hide",

  // --- F2: Home (empty state, library button) ---
  "home.empty": "You haven't played anything yet. Open the library (Menu button).",
  "home.viewLibrary": "View full library ({count}) →",

  // --- F2: gamepad connected/disconnected notice ---
  "gamepad.connected": "Controller connected",
  "gamepad.disconnected": "Controller disconnected",

  // --- F2: error banner ---
  "error.label": "Error",
  "error.close": "Close",

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
  "detail.sync.desc":
    "Re-fetches this game's cover art and metadata from Steam. If you have a linked account, it also resyncs its achievements.",
  "detail.sync.syncing": "Syncing…",
  "detail.sync.action": "Sync achievements",
  "detail.artSync.syncing": "Syncing…",
  "detail.artSync.action": "Sync cover art and metadata",
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
  "art.toast.refreshed": "Cover art reimported",
  "art.importing": "Copying…",
  "art.pickGriddb": "🔎 SteamGridDB",

  // --- Phase 3: SteamGridDB (feature-imagenes.md) ---
  "griddb.modal.aria": "Pick an image from SteamGridDB",
  "griddb.modal.heading": "SteamGridDB — {slot} for {title}",
  "griddb.modal.noKey": "Add your SteamGridDB API key in Settings → Accounts to search for artwork.",
  "griddb.modal.resolving": "Looking up the game on SteamGridDB…",
  "griddb.search.placeholder": "Game name…",
  "griddb.search.action": "Search",
  "griddb.search.searching": "Searching…",
  "griddb.search.empty": "No results",
  "griddb.filter.nsfw": "Adult content",
  "griddb.filter.humor": "Humor / memes",
  "griddb.filter.epilepsy": "Epilepsy risk",
  "griddb.filter.animated": "Animated images",
  "griddb.filter.toggle": "Filters",
  "griddb.filter.styles": "Style",
  "griddb.filter.dimensions": "Resolution",
  "griddb.filter.mimes": "Format",
  "griddb.style.alternate": "Alternate",
  "griddb.style.blurred": "Blurred",
  "griddb.style.white_logo": "White logo",
  "griddb.style.material": "Material",
  "griddb.style.no_logo": "No logo",
  "griddb.style.official": "Official",
  "griddb.style.white": "White",
  "griddb.style.black": "Black",
  "griddb.style.custom": "Custom",
  "griddb.mime.png": "PNG",
  "griddb.mime.jpeg": "JPEG",
  "griddb.mime.webp": "WEBP",
  "griddb.images.loading": "Loading images…",
  "griddb.images.empty": "No images match these filters",
  "griddb.toast.imported": "Image imported from SteamGridDB",
  "griddb.pager.prev": "‹ Previous",
  "griddb.pager.next": "Next ›",
  "griddb.pager.page": "Page {page} of {total}",
  "griddb.account.title": "SteamGridDB",
  "griddb.account.desc":
    "Brings hand-picked cover art, heroes, and logos when customizing a game's art (the \"SteamGridDB\" button next to each image).",
  "griddb.account.keyPlaceholder": "SteamGridDB API key",
  "griddb.account.linkAction": "Save",
  "griddb.account.linking": "Validating…",
  "griddb.account.linked": "Key saved",
  "griddb.account.unlink": "Remove",
  "griddb.account.getKey": "Generate an API key",
  "griddb.toast.keyLinked": "SteamGridDB API key saved",
  "griddb.toast.keyCleared": "SteamGridDB API key removed",

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

  // --- F4: new common strings ---
  "common.customize": "Customize",
  "common.visible": "Visible",
  "common.opacity": "Opacity",
  "common.image": "Image",
  "common.glow": "Glow",

  // --- F4: virtual keyboard titles per field (Settings) ---
  "keyboard.title.profileName": "Profile name",

  // --- F4: Settings → Appearance ---
  "settings.appearance.profile.title": "Active profile",
  "settings.appearance.profile.new": "+ New profile",
  "settings.appearance.profile.delete": "Delete profile",
  "settings.appearance.profile.baseTheme": "Base theme for profile \"{name}\"",
  "settings.appearance.theme.lightSuffix": " (light)",
  "settings.appearance.accentColor.title": "Accent color",
  "settings.appearance.textColor.title": "Text color",
  "settings.appearance.textColor.desc":
    "When switching to a light-background theme, text automatically resets to a readable dark tone; you can customize it again here.",
  "settings.appearance.font.title": "Font",
  "settings.appearance.uiScale.title": "Interface scale",
  "settings.appearance.cardSize.title": "Card size (library)",
  "settings.appearance.cardSizeHome.title": "Card size (Home)",
  "settings.appearance.interface.title": "Interface",
  "settings.appearance.interface.hideCardText": "Hide card titles",
  "settings.appearance.interface.hideLibraryButton": "Hide \"View library\" button (Home)",
  "settings.appearance.interface.hideFooter": "Hide button-hint footer",
  "settings.appearance.gameView.title": "Game view",
  "settings.appearance.gameView.desc": "Game data shown in the detail view (Play/Back are always visible).",
  "settings.appearance.metaBg.title": "Metadata background (Detail)",
  "settings.appearance.metaBg.desc":
    "Background behind the title/platform/meta in the Detail view, for readability over the hero — adapts to the active theme/profile (not a fixed black).",
  "settings.appearance.homeBgFade.title": "Home background fade",
  "settings.appearance.homeBgFade.desc":
    "How visible the Home background photo is before fading into the theme wallpaper — lower is more faded/dim.",
  "settings.appearance.homeBgFade.label": "Fade",
  "settings.appearance.wallpaper.title": "Home wallpaper",
  "settings.appearance.wallpaper.desc":
    "Replaces the Home background (the photo that changes with the focused game in the strip) with a fixed image for every game. Doesn't affect card covers or each game's Detail.",
  "settings.appearance.wallpaper.change": "Change image…",
  "settings.appearance.wallpaper.choose": "Choose image…",
  "settings.appearance.complete.title": "100% complete highlight (achievements)",
  "settings.appearance.complete.desc":
    "Marks games with every achievement unlocked (card and Detail achievements badge) with this color — change it if it clashes with your profile's accent color. Applies to the text badge and the glow below, each with its own switch.",
  "settings.appearance.complete.badgeLabel": "\"100%\" badge",
  "settings.appearance.home.title": "Home · Welcome",
  "settings.appearance.home.desc":
    "Title, subtitle, and \"Recent\" heading on the Home screen: each can be hidden or replaced with custom text (empty text = default).",
  "settings.appearance.home.editText": "Edit text",
  "settings.appearance.home.cardCount": "Card count (Home)",
  "settings.appearance.home.orientation": "Strip orientation (Home)",
  "settings.appearance.home.scrollMode": "Scroll mode (Home)",
  "settings.appearance.home.reading": "Reading behavior (Home)",
  "settings.appearance.home.position": "Block position (Home)",
  "settings.appearance.home.cardAlign": "Card alignment (Home list)",
  "settings.appearance.tabsAlign": "Tab alignment (top bar)",
  "settings.appearance.clockPosition": "Clock position (top bar)",
  "settings.appearance.advanced.title": "Advanced",
  "settings.appearance.advanced.desc":
    "Test of runtime CSS loading. In the real app you'd load a .css file; here an example that redefines --gm-* tokens is applied.",
  "settings.appearance.advanced.applyExample": "Apply example CSS",
  "settings.appearance.advanced.clear": "Clear customization",
  "settings.appearance.advanced.exportCss": "Export profile CSS",

  // --- F4: Settings → Appearance toasts ---
  "settings.toast.profileCreated": "Profile \"{name}\" created and activated",
  "settings.toast.cssExampleApplied": "Example external CSS applied",
  "settings.toast.cssCleared": "CSS customization cleared",
  "settings.toast.wallpaperUpdated": "Home wallpaper updated",
  "settings.toast.wallpaperRemoved": "Home wallpaper removed",
  "settings.toast.cannotDeleteOnlyProfile": "You can't delete the only profile",
  "settings.toast.profileDeleted": "Profile \"{name}\" deleted",
  "settings.toast.exportComingSoon": "Export profile CSS: coming soon",

  // --- F4: color picker ---
  "colorPicker.default.title": "Color",
  "colorPicker.default.heading": "Choose color",
  "colorPicker.palette.blues": "Blues",
  "colorPicker.palette.greensTeal": "Greens / Teal",
  "colorPicker.palette.warm": "Warm",
  "colorPicker.palette.pinksPurples": "Pinks / Purples",
  "colorPicker.palette.neutrals": "Neutrals",
  "keyboard.title.colorHex": "Color hex (RRGGBB)",
  "colorPicker.wheel.hide": "Hide wheel",
  "colorPicker.wheel.show": "Show color wheel",
  "colorPicker.wheel.ariaLabel": "Color wheel",
  "colorPicker.wheel.hint": "Drag on the wheel with the pointer, or use the sliders with a controller.",
  "colorPicker.apply": "Apply",

  // --- F4: new common strings ---
  "common.edit": "Edit",

  // --- F4: virtual keyboard titles per field (Accounts) ---
  "keyboard.title.steamId": "Steam ID (SteamID64 or profile name)",
  "keyboard.title.steamApiKey": "API key from steamcommunity.com/dev/apikey",

  // --- F4: Settings → Accounts ---
  "accounts.toast.missingFields": "Missing the Steam profile or the API key",
  "accounts.steam.desc":
    "Brings in your full library (installed and not installed) and your achievements. Each person uses their own personal API key — stored encrypted in the system credential store, never as plain text. Generate one at steamcommunity.com/dev/apikey.",
  "accounts.showSteamId": "Show Steam ID",
  "accounts.syncProgress": "achievements {done}/{total} (appid {appid})",
  "accounts.syncOptions.title": "Sync options",
  "accounts.syncOptions.includeFreeGames": "Include played free games",
  "accounts.syncOptions.globalPctLabel": "Refresh global achievement %",
  "accounts.syncNow": "Sync now",
  "accounts.steamIdLabel": "Steam ID",
  "accounts.apiKeyLabel": "API key",
  "accounts.linking": "Linking…",
  "accounts.linkAccount": "Link account",

  // --- F4: Settings → Button icons ---
  "buttonIcons.desc":
    "Style of the gamepad button indicators in the interface: plain text or a per-platform icon set. Keyboard/mouse shortcuts always show as text.",
  "buttonIcons.preview": "Preview",
  "prompts.style.auto": "Automatic (text)",
  "prompts.style.lineXbox": "Line · Xbox",
  "prompts.style.linePlaystation": "Line · PlayStation",
  "prompts.style.lineUniversal": "Line · Universal",
  "prompts.style.duotonoXbox": "Duotone · Xbox",
  "prompts.style.duotonoPlaystation": "Duotone · PlayStation",
  "prompts.style.duotonoUniversal": "Duotone · Universal",
  "prompts.style.badgeXbox": "Badge · Xbox",
  "prompts.style.badgePlaystation": "Badge · PlayStation",
  "prompts.style.badgeUniversal": "Badge · Universal",

  // --- F4: Settings → Library filters ---
  "filters.toast.groupDeleted": "Group \"{name}\" deleted",
  "filters.stores.descPre": "Turn store filters on or off in the ",
  "filters.stores.descPost": " tab. Turning one off hides its filter chip and its games stop showing there.",
  "filters.stores.title": "Stores shown",
  "filters.storeBarAlign": "Filter bar alignment",
  "filters.cardAlign.title": "Card alignment",
  "filters.cardAlign.desc": "Which side cards group toward in Games and Apps. Spacing between them doesn't change.",
  "filters.groups.title": "Custom groups",
  "filters.groups.emptyPre": "You don't have any groups yet. Create them from a ",
  "filters.groups.emptyBold": "game's detail view",
  "filters.groups.emptyPost": " (\"New group\" button); they'll show up as a filter in the Games tab.",
  "filters.groupGameCount": {
    one: "{count} game",
    other: "{count} games",
  },

  // --- F4: new common strings ---
  "common.show": "Show",

  // --- F4: Settings → Hidden ---
  "hidden.desc": "Games and apps hidden from the interface. This is the only place to show them again.",
  "hidden.empty": "No hidden items.",
  "hidden.emptyFiltered": "No hidden items in this category.",
  "hidden.kind.apps": "Apps",
  "hidden.toast.shown": "\"{title}\" visible again",

  // --- F4: Settings → Notifications ---
  "notifications.desc":
    "Where floating notices appear on screen (for now: controller connected/disconnected). Affected by the interface scale and the active theme/profile, like the rest of the app.",
  "notifications.position.title": "Position",

  // --- F4: new common strings ---
  "common.resetDefault": "Reset to default",
  "common.reassign": "Reassign",
  "common.mode": "Mode",
  "common.duration": "Duration",

  // --- F4: virtual keyboard — assignable actions (Settings → Shortcuts) ---
  "shortcuts.vk.toggleShift": "Toggle caps",
  "shortcuts.vk.cancelNoSave": "Cancel (don't save)",
  "shortcuts.vk.confirmClose": "Confirm and close",

  // --- F4: virtual keyboard title per field (Shortcuts) ---
  "keyboard.title.shortcutName": "Shortcut name",

  // --- F4: Settings → Shortcuts ---
  "shortcuts.toast.padAssigned": "Controller shortcut assigned",
  "shortcuts.toast.kmAssigned": "Keyboard/mouse shortcut assigned",
  "shortcuts.toast.vkAssigned": "Virtual keyboard shortcut assigned",
  "shortcuts.toast.vkReset": "Virtual keyboard shortcuts reset to default",
  "shortcuts.toast.reset": "Shortcuts reset to default",
  "shortcuts.toast.customCreated": "Custom shortcut created",
  "shortcuts.desc":
    "Assign which key/mouse button and which controller button trigger each action — both shortcuts coexist. Directions (d-pad/stick/arrows) are fixed.",
  "shortcuts.colKeyboardMouse": "Keyboard / Mouse",
  "shortcuts.colController": "Controller",
  "shortcuts.vk.title": "Virtual keyboard (controller)",
  "shortcuts.vk.desc":
    "Controller buttons for typing on the on-screen keyboard — independent from the rest: the same physical button can do something else outside the virtual keyboard. With a physical keyboard you already type directly (Enter confirms, Esc cancels).",
  "shortcuts.functions.title": "Functions",
  "shortcuts.returnToLauncher.title": "Return to launcher (in-game)",
  "shortcuts.returnToLauncher.shortLabel": "Return to launcher",
  "shortcuts.returnToLauncher.desc":
    "While a game is running, this button restores the launcher. Choose whether it triggers on press or on hold.",
  "shortcuts.buttonLabel": "Button",
  "shortcuts.mode.press": "Press",
  "shortcuts.mode.hold": "Hold",
  "shortcuts.radialMenu.title": "System radial menu (controller)",
  "shortcuts.radialMenu.desc":
    "Hold \"Home/Guide\" to open a full-screen menu with 8 fixed positions — 4 over the face buttons, 4 over shoulders/triggers. Freezes the rest of navigation while open. Release Home without choosing one (or press the cancel button configured below) to close it without doing anything.",
  "shortcuts.radialMenu.cancelWith": "Cancel with",
  "shortcuts.radialMenu.releaseHome": "Release Home",
  "shortcuts.systemMenuKm.title": "System menu (keyboard/mouse)",
  "shortcuts.systemMenuKm.desc":
    "Alternate shortcut to open the same action list without a controller — there's no \"Home/Guide\" button on keyboard, so it's assigned separately from the radial menu above (which is controller-only).",
  "shortcuts.systemMenuKm.openLabel": "Open system menu",
  "shortcuts.custom.title": "Custom shortcuts",
  "shortcuts.custom.desc":
    "OS-level key combinations (e.g. Alt+R for an FPS/CPU overlay) you can trigger from the system menu, in its \"Shortcuts\" section. Some combinations (e.g. Alt+Tab, Alt+F4) may be reserved by Windows.",
  "shortcuts.custom.delete": "Delete",
  "shortcuts.custom.add": "Add shortcut",
  "shortcuts.capture.pressButton": "Press a controller button…",
  "shortcuts.capture.pressKey": "Press a key or mouse button…",
  "shortcuts.capture.for": "for \"{label}\"",
  "shortcuts.custom.editorTitle": "New shortcut: \"{name}\"",
  "shortcuts.custom.editorDesc": "Choose the modifiers and the key (no need to press them).",
  "shortcuts.custom.save": "Save shortcut",

  // --- F4: Settings → Sounds ---
  "sounds.startupHint": "The startup sound is set in Settings > Startup.",
  "sounds.nav.title": "Navigation",
  "sounds.nav.desc": "Moving between cards/menus, accepting, switching tabs, and canceling/going back.",
  "sounds.nav.volume": "Navigation volume",
  "sounds.notifications.desc": "Error messages, and opening/closing the Settings and System menus.",
  "sounds.notifications.volume": "Notifications volume",
  "sounds.musicPlayer.title": "Music player",
  "sounds.musicPlayer.desc":
    "Music player preferences (Multimedia → Music) relative to the rest of the app. All 3 are enabled by default.",
  "sounds.musicPlayer.stopOnGame": "Stop music when starting a game",
  "sounds.musicPlayer.stopOnApp": "Stop music when starting an app",
  "sounds.musicPlayer.muteNavDuringMusic": "Mute navigation sounds while using the music player",

  // --- F4: Settings → Startup ---
  "startup.initialView.title": "Startup view",
  "startup.fullscreen.title": "Fullscreen on startup",
  "startup.sound.title": "Startup sound",
  "startup.soundToPlay.title": "Sound to play",
  "startup.testSound": "Test startup sound",
  "startup.soundVolume.title": "Startup sound volume",
  "startup.autostart.title": "Autostart with Windows",
  "startup.autostart.desc":
    "Launches the app on its own when you sign in to Windows — meant to leave the PC ready as a console without touching anything. Only works in the installed app.",
  "startup.toast.autostartOnlyInApp": "Autostart only available in the installed app",

  // --- F4: Settings → System actions ---
  "systemActions.powerFooter.title": "Show window/power buttons footer",
  "systemActions.powerFooter.desc":
    "Minimize, maximize, fullscreen, close, and shut down at the bottom of the Settings menu. Hidden by default — reach the same actions faster with the button combo (see \"Shortcuts\" → Functions).",
  "systemActions.order.title": "System menu order",
  "systemActions.order.desc":
    "Order of the quick menu options (button combo or keyboard/mouse shortcut — see \"Shortcuts\" → Functions).",

  // --- F4: new common strings ---
  "common.disabled": "Disabled",
  "common.network": "Network",
  "common.volume": "Volume",
  "common.muted": "Muted",
  "common.output": "Output",
  "common.input": "Input",
  "common.connect": "Connect",
  "common.disconnect": "Disconnect",

  // --- F4: system quick access menu (QAM) ---
  "qam.section.system": "System",
  "qam.section.shortcuts": "Shortcuts",
  "qam.section.utilities": "Utilities",
  "qam.shortcuts.empty":
    "You don't have any shortcuts set up. Create them in Settings > Shortcuts, under \"Custom shortcuts\".",
  "qam.system.noConnection": "No connection",
  "qam.system.deviceCount": {
    one: "{count} device",
    other: "{count} devices",
  },
  "qam.system.audioOutput": "Audio output",
  "qam.system.audioInput": "Audio input",
  "qam.system.ethernet": "Wired network",
  "qam.system.connected": "Connected",
  "qam.system.connecting": "Connecting…",
  "qam.system.disconnecting": "Disconnecting…",
  "qam.system.unpairing": "Removing…",
  "qam.system.pairing": "Pairing…",
  "qam.system.scanning": "Searching…",
  "qam.system.wifiScan": "Search for networks",
  "qam.system.secured": "Secured network",
  "qam.system.saved": "Saved",
  "qam.system.forget": "Forget",
  "qam.system.passwordTitle": "Password for {ssid}",
  "qam.system.wrongPasswordRetry": "Wrong password. Type it again for {ssid}",
  "qam.system.noNetworks": "No networks found",
  "qam.system.noWifiAdapter": "No Wi-Fi adapter",
  "qam.system.noBtAdapter": "No Bluetooth adapter",
  "qam.system.btScan": "Search for devices",
  "qam.system.btPaired": "Paired",
  "qam.system.btAvailable": "Available",
  "qam.system.btPair": "Pair",
  "qam.system.btUnpair": "Forget",
  "qam.system.noBtDevices": "No paired devices",
  "qam.utilities.steam.library": "Library",
  "qam.utilities.steam.store": "Store",
  "qam.utilities.steam.myProfile": "My profile",
  "qam.utilities.steam.friends": "Friends",
  "qam.utilities.steam.downloads": "Downloads",
  "qam.utilities.steam.screenshots": "Screenshots",
  "qam.utilities.steam.activateProduct": "Activate a product",
  "qam.utilities.steam.steamSettings": "Steam settings",
  "qam.utilities.steam.shortcuts": "Shortcuts",
  "qam.utilities.gog.comingSoon": "Coming soon",
  "qam.utilities.gog.emptyHint": "No GOG shortcuts yet.",
  "qam.music.nothingPlaying": "Nothing playing — open Multimedia → Music to choose an album or a playlist.",

  // --- F4: system radial menu ---
  "radial.music.hint": "▲▼ Volume · ◀▶ Track",
  "radial.hint.withCancel": "Release Home or press the cancel button",
  "radial.hint.releaseOnly": "Release Home to cancel",

  // --- F4: shutdown confirmation ---
  "shutdown.confirmMsg": "Are you sure you want to shut down the PC?",
  "shutdown.confirmButton": "Shut down",

  // --- F4: keyboard/mouse labels (shortcuts) ---
  "keyBindings.backspace": "Backspace",
  "keyBindings.clickLeft": "Left click",
  "keyBindings.clickMiddle": "Middle click",
  "keyBindings.clickRight": "Right click",
  "keyBindings.mouseBack": "Back button (mouse)",
  "keyBindings.mouseForward": "Forward button (mouse)",
  "keyBindings.mouseButton": "Button {n} (mouse)",

  // --- F4: unnamed custom shortcut (defensive fallback) ---
  "shortcuts.custom.defaultName": "Shortcut",

  // --- App updates (Settings → Updates) ---
  "updates.current": "Installed version: v{version}",
  "updates.channel.title": "Channel",
  "updates.channel.desc":
    "The beta channel gets new things first, with a higher chance of bugs. After switching channels, an update only shows up once that channel publishes a version higher than the installed one.",
  "updates.channel.options.stable": "Stable",
  "updates.channel.options.beta": "Beta",
  "updates.channel.stableEmpty":
    "No stable releases yet: for now, new versions ship only on the beta channel.",
  "updates.checkOnStart.title": "Check on startup",
  "updates.checkOnStart.desc":
    "Looks for a new version every time you open VELUM. Installing is always up to you.",
  "updates.status.title": "Status",
  "updates.status.idle": "Not checked yet.",
  "updates.status.checking": "Checking for updates…",
  "updates.status.uptodate": "You're up to date.",
  "updates.status.ready": "Update ready to install.",
  "updates.status.installing": "Installing…",
  "updates.available.title": "New version available: v{version}",
  "updates.published": "Published on {date}",
  "updates.notes.title": "What's new",
  "updates.progress": "Downloading… {pct}%",
  "updates.progress.unknown": "Downloading…",
  "updates.aria.progress": "Download progress",
  "updates.restartHint": "VELUM will close and reopen to finish.",
  "updates.installHint": "The app will close on its own — don't shut down the machine.",
  "updates.check.action": "Check for updates",
  "updates.check.checking": "Checking…",
  "updates.download.action": "Download",
  "updates.install.action": "Install and restart",
  "updates.later.action": "Later",
  "updates.retry.action": "Retry",
  "updates.webOnly":
    "In the browser this is a simulation: real updates only work in the installed app.",
  "updates.toast.found": "New version available: v{version}",

  // --- F4: Rust backend errors ("code" or "code|detail", see i18n/errors.js) ---
  "errors.steam.key_read_failed":
    "Couldn't read the saved API key: {detail} — link your account again if the problem persists",
  "errors.steam.profile_resolve_failed": "Couldn't resolve the Steam profile: {detail}",
  "errors.steam.no_steamid_returned": "Steam didn't return a SteamID",
  "errors.steam.profile_not_found": "That Steam profile wasn't found (check the name or use your SteamID64)",
  "errors.steam.key_validation_failed": "Couldn't validate the API key: {detail}",
  "errors.steam.invalid_key": "Invalid API key or SteamID",
  "errors.steam.missing_fields": "Missing the Steam profile or the API key",
  "errors.steam.key_save_failed": "Couldn't securely save the API key: {detail}",
  "errors.assets.unsupported_image_ext": "Unsupported image extension: {detail}",
  "errors.assets.unsupported_audio_ext": "Unsupported audio extension: {detail}",
  "errors.art.invalid_kind": "Invalid image slot: {detail}",
  "errors.art.source_missing": "That file no longer exists",
  "errors.art.unsupported_ext": "Unsupported image extension: {detail}",
  "errors.art.too_large": "Image is larger than allowed (max 32 MB)",
  "errors.art.import_failed": "Couldn't import the image: {detail}",
  "errors.art.download_failed": "Couldn't download the image: {detail}",
  "errors.griddb.key_read_failed": "Couldn't read the SteamGridDB API key: {detail}",
  "errors.griddb.missing_key": "Enter an API key",
  "errors.griddb.invalid_key": "Invalid SteamGridDB API key",
  "errors.griddb.key_validation_failed": "Couldn't validate the API key: {detail}",
  "errors.griddb.key_save_failed": "Couldn't save the API key securely: {detail}",
  "errors.griddb.invalid_platform": "Unsupported platform: {detail}",
  "errors.griddb.http": "SteamGridDB returned an error: {detail}",
  "errors.griddb.invalid_kind": "Invalid image slot: {detail}",
  "errors.griddb.invalid_style": "Invalid style: {detail}",
  "errors.griddb.dimensions_not_supported": "This image type doesn't support filtering by resolution",
  "errors.griddb.invalid_dimension": "Invalid resolution: {detail}",
  "errors.griddb.invalid_mime": "Invalid format: {detail}",
  "errors.griddb.invalid_type": "Invalid type: {detail}",
  "errors.griddb.invalid_tag_value": "Invalid filter value: {detail}",
  "errors.shortcuts.unsupported_key": "Unsupported key: {detail}",
  "errors.shortcuts.send_input_failed": "SendInput couldn't send all events",
  "errors.config.dir_resolve_failed": "Couldn't resolve the config directory: {detail}",
  "errors.update.unknown_channel": "Unknown update channel: {detail}",
  "errors.update.endpoint_invalid": "The update channel address isn't valid: {detail}",
  "errors.update.builder_failed":
    "Couldn't set up the update check: {detail} — the signing public key may be missing",
  "errors.update.check_failed": "Couldn't check for updates: {detail}",
  "errors.update.no_pending": "There's no pending update — check again",
  "errors.update.download_failed": "The update download failed: {detail}",
  "errors.update.install_failed": "The update install failed: {detail}",
  "errors.update.relaunch_failed": "Couldn't restart the app: {detail}",
  "errors.system.task_failed": "The system operation couldn't be completed: {detail}",
  "errors.system.unsupported": "This action isn't available on this system",
  "errors.system.shutdown_failed": "Couldn't shut down the PC: {detail}",
  "errors.system.audio.com_failed": "Couldn't reach the system audio: {detail}",
  "errors.system.audio.device_not_found": "That audio device is no longer available",
  "errors.system.audio.set_default_failed": "Couldn't change the default device",
  "errors.system.wifi.access_denied":
    "Windows didn't allow searching for networks. This usually means location permissions are off (Settings → Privacy → Location) or the Wi-Fi service is disabled.",
  "errors.system.wifi.service_stopped":
    "The Windows Wi-Fi service (WlanSvc) isn't running. Start it from Services (services.msc), where it appears as “WLAN AutoConfig”.",
  "errors.system.wifi.unavailable": "Wi-Fi isn't available or is turned off",
  "errors.system.wifi.scan_failed": "Couldn't search for networks: {detail}",
  "errors.system.wifi.profile_failed": "Couldn't save the network profile: {detail}",
  "errors.system.wifi.connect_failed": "Couldn't connect to the network: {detail}",
  "errors.system.wifi.wrong_password": "Wrong password",
  "errors.system.wifi.timeout": "The network didn't respond in time",
  "errors.system.radio.unavailable": "That adapter's radio wasn't found",
  "errors.system.radio.access_denied": "Windows didn't allow controlling the radio",
  "errors.system.radio.set_failed": "Couldn't turn the radio on or off: {detail}",
  "errors.system.bt.unavailable": "Bluetooth isn't available or is turned off",
  "errors.system.bt.scan_failed": "Couldn't search for devices: {detail}",
  "errors.system.bt.device_not_found": "That device is no longer available",
  "errors.system.bt.pair_failed": "Couldn't pair the device: {detail}",
  "errors.system.bt.pair_rejected": "The device rejected pairing",
  "errors.system.bt.pin_required": "That device asks for a PIN: pair it from Windows this once",
  "errors.system.bt.unpair_failed": "Couldn't forget the device: {detail}",
  "errors.system.bt.connect_failed": "Couldn't connect the device: {detail}",
  "errors.system.bt.connect_unsupported":
    "Windows doesn't allow connecting this device from here: turn it on and it will connect by itself",
};
