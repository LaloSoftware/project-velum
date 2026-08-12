<script>
  import { onMount, tick } from "svelte";

  import { loadGames } from "./lib/stores/games.js";
  import { initProfiles } from "./lib/stores/profiles.js";
  import { initBindings } from "./lib/stores/bindings.js";
  import { initKeyBindings } from "./lib/stores/keyBindings.js";
  import { startup, initStartup } from "./lib/stores/startup.js";
  import { initLibrary, runSearch, cycleFilter, enterGames } from "./lib/stores/library.js";
  import { initSorting } from "./lib/stores/sorting.js";
  import {
    initUiPrefs,
    uiScale,
    tabsAlign,
    clockPosition,
    hideFooter,
  } from "./lib/stores/uiprefs.js";
  import { initGroups } from "./lib/stores/groups.js";
  import { getAppConfig } from "./lib/stores/appConfig.js";
  import { initMusicLibrary } from "./lib/stores/musicLibrary.js";
  import { initImageLibrary } from "./lib/stores/imageLibrary.js";
  import { initVideoLibrary } from "./lib/stores/videoLibrary.js";
  import { initPlaylists } from "./lib/stores/playlists.js";
  import { initSystemActions } from "./lib/stores/systemActions.js";
  import { initComboShortcuts } from "./lib/stores/comboShortcuts.js";
  import { radialMenu, openRadialMenu, initRadialMenu } from "./lib/stores/radialMenu.js";
  import { initVkBindings } from "./lib/stores/vkBindings.js";
  import {
    initSteamAccount,
    mergeCachedSteamGhosts,
    syncNow,
    steamSyncing,
    steamSyncSummary,
    toggleSyncSummaryExpanded,
  } from "./lib/stores/steamAccount.js";
  import { inputSource } from "./lib/stores/inputSource.js";
  import { initCustomShortcuts } from "./lib/stores/customShortcuts.js";
  import { initHidden } from "./lib/stores/hidden.js";
  import { initPrompts } from "./lib/stores/prompts.js";
  import { initLanguage } from "./lib/stores/language.js";
  import { fmt } from "./lib/i18n/index.js";
  import {
    soundSettings,
    initSounds,
    playNavPrimary,
    playNavBack,
    playMenuOpen,
    playMenuClose,
  } from "./lib/stores/sounds.js";
  import { soundFor } from "./lib/theming/sounds.js";
  import {
    view,
    overlay,
    detailGame,
    detailAnchor,
    detailExpanded,
    setDetailExpanded,
    detailSection,
    setDetailSection,
    DETAIL_SECTIONS,
    contextMenu,
    confirmDelete,
    shutdownConfirm,
    closeShutdownConfirm,
    systemQuickMenu,
    closeSystemQuickMenu,
    popover,
    colorPicker,
    filtersModal,
    achievementsModal,
    closeAchievements,
    setupModal,
    setupStep,
    setupBack,
    completeSetup,
    confirmUnlinkSteam,
    closeConfirmUnlinkSteam,
    appError,
    clearAppError,
    musicFooterMode,
    musicDetail,
    closeMusicDetail,
    imagesFooterMode,
    imageAlbumOpen,
    closeImageAlbum,
    imageViewer,
    closeImageViewer,
    videoFooterMode,
    videoAlbumOpen,
    closeVideoAlbum,
    videoPlayer,
    closeVideoPlayer,
    goto,
    openOverlay,
    closeOverlay,
    closeDetail,
    closeContext,
    setContextSub,
    closeConfirm,
    closePopover,
    closeColorPicker,
    openFilters,
    closeFilters,
    openSystemQuickMenu,
  } from "./lib/stores/ui.js";
  import { vk, vkDone, vkType, vkBackspace, vkToggleShift } from "./lib/stores/keyboard.js";

  import { initInput } from "./lib/input/index.js";
  import * as nav from "./lib/input/navigation.js";
  import { initPlaytimes } from "./lib/stores/playtimes.js";
  import { initArtOverrides } from "./lib/stores/artoverrides.js";
  import { initSoundtrack } from "./lib/stores/soundtrackOverrides.js";
  import { initSoundtrackPlayer } from "./lib/stores/soundtrackPlayer.js";
  import { initMusicPlayer, musicPlayer } from "./lib/stores/musicPlayer.js";
  import { session, initPlaySession } from "./lib/stores/playsession.js";
  import { focusGame } from "./lib/ipc/index.js";
  import { isFullscreen, onFullscreenChange } from "./lib/util/window.js";

  import Home from "./lib/components/Home.svelte";
  import GamesView from "./lib/components/GamesView.svelte";
  import AppsView from "./lib/components/AppsView.svelte";
  import MultimediaView from "./lib/components/MultimediaView.svelte";
  import ConfigMenu from "./lib/components/ConfigMenu.svelte";
  import QuickAccessMenu from "./lib/components/QuickAccessMenu.svelte";
  import GameDetail from "./lib/components/GameDetail.svelte";
  import CardContextMenu from "./lib/components/CardContextMenu.svelte";
  import ConfirmDelete from "./lib/components/ConfirmDelete.svelte";
  import ShutdownConfirm from "./lib/components/ShutdownConfirm.svelte";
  import SystemQuickMenu from "./lib/components/SystemQuickMenu.svelte";
  import SelectPopover from "./lib/components/SelectPopover.svelte";
  import VirtualKeyboard from "./lib/components/VirtualKeyboard.svelte";
  import ColorPicker from "./lib/components/ColorPicker.svelte";
  import FiltersModal from "./lib/components/FiltersModal.svelte";
  import InitialSetupModal from "./lib/components/InitialSetupModal.svelte";
  import AchievementsModal from "./lib/components/AchievementsModal.svelte";
  import ConfirmUnlinkSteam from "./lib/components/ConfirmUnlinkSteam.svelte";
  import Toast from "./lib/components/Toast.svelte";
  import SteamSyncIndicator from "./lib/components/SteamSyncIndicator.svelte";
  import SteamSyncSummaryBadge from "./lib/components/SteamSyncSummaryBadge.svelte";
  import GamepadNotice from "./lib/components/GamepadNotice.svelte";
  import ErrorBanner from "./lib/components/ErrorBanner.svelte";
  import PlayingOverlay from "./lib/components/PlayingOverlay.svelte";
  import ButtonPrompt from "./lib/components/ButtonPrompt.svelte";
  import RadialMenu from "./lib/components/RadialMenu.svelte";

  const TABS = [
    { id: "home", label: "Inicio" },
    { id: "games", label: "Juegos" },
    { id: "apps", label: "Aplicaciones" },
    { id: "multimedia", label: "Multimedia" },
  ];


  let mainEl,
    overlayEl,
    detailEl,
    vkEl,
    contextEl,
    confirmEl,
    shutdownEl,
    sysQuickEl,
    popoverEl,
    colorPickerEl,
    filtersEl,
    setupEl,
    achievementsEl,
    confirmUnlinkSteamEl;
  let now = new Date();

  // Escala de interfaz (Ajustes > Apariencia): factor aplicado a toda la app vía `zoom`.
  $: uiScaleFactor = $uiScale;

  // Indicador de música en el header (Multimedia → Música): la barra superior
  // tiene 3 slots (left/center/right) y hoy solo conviven ahí tabsNav
  // ($tabsAlign) y clock ($clockPosition, nunca "center") — con 2 elementos en
  // 3 slots siempre queda al menos uno completamente libre. Prioridad si hay
  // más de uno libre: center → right → left.
  function freeHeaderSlot(tabsAlign, clockPosition) {
    const occupied = { left: false, center: false, right: false };
    occupied[tabsAlign] = true;
    if (clockPosition === "left" || clockPosition === "right") occupied[clockPosition] = true;
    if (!occupied.center) return "center";
    if (!occupied.right) return "right";
    return "left";
  }
  $: musicSlot = freeHeaderSlot($tabsAlign, $clockPosition);
  function hueOf(str) {
    let h = 0;
    for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }
  $: musicIndicatorCover = $musicPlayer.current
    ? `linear-gradient(150deg, hsl(${hueOf($musicPlayer.current.title)} 55% 42%), hsl(${(hueOf($musicPlayer.current.title) + 40) % 360} 60% 22%))`
    : "";
  $: musicIndicatorProgress = $musicPlayer.duration ? ($musicPlayer.currentTime / $musicPlayer.duration) * 100 : 0;

  // Footer de atajos dentro de Multimedia: A/Y hacen cosas distintas según la
  // sección y la pantalla (grilla/álbum/lista/visor) — ver
  // stores/ui.js::musicFooterMode/imagesFooterMode/videoFooterMode (cada
  // sub-vista mantiene el suyo; a lo sumo uno es no-nulo a la vez, porque
  // solo un sub-panel de Multimedia está montado). Fuera de Multimedia,
  // igual que siempre. El visor de imágenes y el reproductor de video no
  // usan A/Y (sus acciones son botones propios en pantalla) — de ahí que
  // ninguno de los dos tenga un modo "viewer"/"player" propio, alcanza con
  // "grid"/"album" en los tres.
  $: inMultimedia = $view === "multimedia";
  $: footerAcceptLabel = !inMultimedia
    ? "Jugar"
    : $musicFooterMode === "grid"
      ? "Abrir"
      : $musicFooterMode === "album" || $musicFooterMode === "playlist"
        ? "Reproducir pista"
        : $imagesFooterMode === "grid" || $videoFooterMode === "grid"
          ? "Abrir"
          : $imagesFooterMode === "album"
            ? "Ver"
            : $videoFooterMode === "album"
              ? "Reproducir"
              : null;
  $: footerSecondaryLabel = !inMultimedia
    ? "Detalle"
    : $musicFooterMode === "grid"
      ? "Reproducir"
      : $musicFooterMode === "album"
        ? "Agregar a lista"
        : null;
  $: showFooterX = !inMultimedia;

  // Auto-ocultar el cursor del mouse cuando se usa mando/teclado: se oculta en
  // cada acción de input procesada (ver dispatch) y reaparece con el mouse.
  // Solo aplica en pantalla completa y fuera de una sesión de juego (ahí el
  // launcher está minimizado/en reposo, ver más abajo).
  let fullscreen = false;
  let cursorHidden = false;
  $: hideCursor = cursorHidden && fullscreen && !$session;
  // El menú contextual y el popover de <Select> se renderizan fuera de .app
  // (ver más abajo) para no quedar bajo su `zoom`, así que el estado se
  // refleja en <body> y no en .app para cubrirlos también.
  $: document.body.classList.toggle("cursor-hidden", hideCursor);

  // ¿Hay algo por ENCIMA del Detalle (teclado virtual, color picker del editor
  // de imágenes, el modal de logros, etc.)? Antes, "arriba"/"abajo" con
  // $detailGame true siempre llamaban a detailUp()/detailDown() sin importar
  // si un modal estaba abierto encima — p. ej. abrir el teclado virtual para
  // nombrar un grupo, o el modal de logros, dejaba que abajo/arriba manipulara
  // el menú del Detalle por detrás en vez de navegar dentro del modal.
  $: modalOverDetail =
    $vk.open ||
    $contextMenu ||
    $confirmDelete ||
    $shutdownConfirm ||
    $systemQuickMenu ||
    $popover ||
    $colorPicker ||
    $setupModal ||
    $filtersModal ||
    $achievementsModal ||
    $confirmUnlinkSteam;

  // ------- Interpretación de acciones de input según el contexto -------
  function dispatch(action) {
    cursorHidden = true;
    // En sesión de juego el launcher está en reposo: se ignora todo el input
    // (el botón de "volver" lo maneja playsession por eventos crudos). Solo
    // Aceptar/Jugar trae la instancia en marcha al frente.
    if ($session) {
      if (action === "accept") focusGame();
      return;
    }
    switch (action) {
      case "up":
        playNavPrimary();
        if ($detailGame && !modalOverDetail) return detailUp();
        return nav.move("up");
      case "down":
        playNavPrimary();
        if ($detailGame && !modalOverDetail) return detailDown();
        return nav.move("down");
      case "left":
      case "right":
        playNavPrimary();
        return nav.move(action);
      case "accept":
        playNavPrimary();
        return nav.activate();
      case "back":
        playNavBack();
        return handleBack();
      case "north": // Y / Triángulo
        playNavPrimary(); // abrir detalle en la tarjeta enfocada
        return nav.secondary();
      case "west": // X / Cuadrado: menú de tarjeta
        if (
          $vk.open ||
          $overlay ||
          $detailGame ||
          $contextMenu ||
          $confirmDelete ||
          $shutdownConfirm ||
          $systemQuickMenu ||
          $popover ||
          $colorPicker ||
          $setupModal ||
          $filtersModal ||
          $achievementsModal ||
          $confirmUnlinkSteam ||
          $radialMenu
        )
          return;
        playNavPrimary();
        return nav.context();
      case "context": // menú contextual de tarjeta (atajo dedicado)
        if (
          $vk.open ||
          $overlay ||
          $detailGame ||
          $shutdownConfirm ||
          $systemQuickMenu ||
          $popover ||
          $colorPicker ||
          $setupModal ||
          $filtersModal ||
          $achievementsModal ||
          $confirmUnlinkSteam ||
          $radialMenu
        )
          return;
        playNavPrimary();
        return nav.context();
      case "filters": // R3: modal de filtros y orden (Juegos/Apps)
        if (
          $vk.open ||
          $overlay ||
          $detailGame ||
          $contextMenu ||
          $confirmDelete ||
          $shutdownConfirm ||
          $systemQuickMenu ||
          $popover ||
          $colorPicker ||
          $setupModal ||
          $filtersModal ||
          $achievementsModal ||
          $confirmUnlinkSteam ||
          $radialMenu
        )
          return;
        if ($view === "games" || $view === "apps") {
          playNavPrimary();
          return openFilters($view);
        }
        return;
      case "menu":
        if (
          $vk.open ||
          $detailGame ||
          $contextMenu ||
          $confirmDelete ||
          $shutdownConfirm ||
          $systemQuickMenu ||
          $popover ||
          $colorPicker ||
          $setupModal ||
          $filtersModal ||
          $achievementsModal ||
          $confirmUnlinkSteam ||
          $radialMenu
        )
          return;
        if ($overlay === "config") {
          playMenuClose();
          return closeOverlay();
        }
        playMenuOpen();
        return openOverlay("config");
      case "quick":
        if (
          $vk.open ||
          $detailGame ||
          $contextMenu ||
          $confirmDelete ||
          $shutdownConfirm ||
          $systemQuickMenu ||
          $popover ||
          $colorPicker ||
          $setupModal ||
          $filtersModal ||
          $achievementsModal ||
          $confirmUnlinkSteam ||
          $radialMenu
        )
          return;
        if ($overlay === "qam") {
          playMenuClose();
          return closeOverlay();
        }
        playMenuOpen();
        return openOverlay("qam");
      case "openSystemMenu":
        // Atajo de teclado/mouse (configurable), abre la lista de siempre —
        // no hay botón "Home/Guide" en teclado para el menú radial de mando
        // (ver "openRadialMenu" abajo y stores/radialMenu.js).
        if (
          $vk.open ||
          $detailGame ||
          $contextMenu ||
          $confirmDelete ||
          $shutdownConfirm ||
          $systemQuickMenu ||
          $popover ||
          $colorPicker ||
          $setupModal ||
          $filtersModal ||
          $achievementsModal ||
          $confirmUnlinkSteam ||
          $radialMenu
        )
          return;
        return openSystemQuickMenu();
      case "openRadialMenu":
        // Disparado por input/index.js al presionar "guide" (Home/PS) — mismas
        // guardas que "openSystemMenu" (no se abre sobre otro modal). Cerrar es
        // aparte: input/index.js llama a closeRadialMenu() directo al soltar
        // Home o al resolver una de las 8 posiciones (stores/radialMenu.js),
        // sin pasar por dispatch().
        if (
          $vk.open ||
          $detailGame ||
          $contextMenu ||
          $confirmDelete ||
          $shutdownConfirm ||
          $systemQuickMenu ||
          $popover ||
          $colorPicker ||
          $setupModal ||
          $filtersModal ||
          $achievementsModal ||
          $confirmUnlinkSteam ||
          $radialMenu
        )
          return;
        return openRadialMenu();
      case "tabLeft":
        if ($vk.open) return; // sin match propio de teclado virtual: no-op
        playNavPrimary();
        return cycleTab(-1);
      case "tabRight":
        if ($vk.open) return;
        playNavPrimary();
        return cycleTab(1);
      case "search":
        if ($vk.open) return;
        if (inGames()) return runSearch();
        return;
      case "filterPrev":
        if ($vk.open) return;
        if (inGames()) return cycleFilter(-1);
        return;
      case "filterNext":
        if ($vk.open) return;
        if (inGames()) return cycleFilter(1);
        return;
      case "steamSyncSummary":
        // Combo Home+L3 (ver comboShortcuts.js) — solo válido mientras el
        // badge de resumen de sync esté vivo; no reabre nada tras cerrarse.
        if ($vk.open || $steamSyncing) return;
        if (!$steamSyncSummary) return;
        return toggleSyncSummaryExpanded();
      case "vkSpace":
        return vkType(" ");
      case "vkBackspace":
        return vkBackspace();
      case "vkShift":
        return vkToggleShift();
      case "vkCancel":
        return vkDone(true);
      case "vkConfirm":
        return vkDone(false);
    }
  }

  // ¿Estamos en la vista Juegos, sin capas por encima?
  function inGames() {
    return (
      $view === "games" &&
      !$overlay &&
      !$detailGame &&
      !$vk.open &&
      !$contextMenu &&
      !$confirmDelete &&
      !$shutdownConfirm &&
      !$systemQuickMenu &&
      !$setupModal &&
      !$filtersModal &&
      !$achievementsModal &&
      !$confirmUnlinkSteam &&
      !$radialMenu
    );
  }

  function handleBack() {
    if ($appError) return clearAppError();
    // Configuración inicial: "atrás" retrocede de paso; en el primero no hay
    // estado previo al que volver, así que completa el setup igual que
    // "Continuar" (lo elegido hasta ahí ya está persistido).
    if ($setupModal) return $setupStep > 0 ? setupBack() : completeSetup();
    if ($vk.open) return vkDone(true);
    if ($shutdownConfirm) return closeShutdownConfirm();
    if ($systemQuickMenu) return closeSystemQuickMenu();
    if ($colorPicker) return closeColorPicker();
    if ($filtersModal) return closeFilters();
    if ($confirmUnlinkSteam) return closeConfirmUnlinkSteam();
    if ($confirmDelete) return closeConfirm();
    if ($popover) {
      const a = $popover.anchor;
      closePopover();
      return a?.focus({ preventScroll: true });
    }
    if ($contextMenu) {
      if ($contextMenu.sub) return setContextSub(null);
      const a = $contextMenu.anchor;
      closeContext();
      return a?.focus({ preventScroll: true });
    }
    if ($achievementsModal) return closeAchievements();
    if ($detailGame) {
      // Si el menú inferior está desplegado, B lo pliega primero; si no, cierra
      // y devuelve el foco a la tarjeta que abrió el detalle.
      if ($detailExpanded) return collapseDetail();
      const a = $detailAnchor;
      closeDetail();
      return a?.focus({ preventScroll: true });
    }
    if ($overlay) return closeOverlay();
    // Álbum/lista/visor/reproductor abierto dentro de Multimedia — sin esto,
    // "atrás" no reconocía estos estados (vivían local en cada componente) y
    // caía directo al fallback de abajo, mandando a Inicio en vez de solo
    // cerrar un nivel. Orden: lo más "adentro" primero (visor/reproductor
    // antes que el álbum que lo contiene) — a lo sumo una de las 3
    // secciones de Multimedia está montada a la vez, así que no hay
    // ambigüedad entre música/imágenes/video acá.
    if ($musicDetail) return closeMusicDetail();
    if ($imageViewer) return closeImageViewer();
    if ($imageAlbumOpen) return closeImageAlbum();
    if ($videoPlayer) return closeVideoPlayer();
    if ($videoAlbumOpen) return closeVideoAlbum();
    if ($view !== "home") return goto("home");
  }

  // Enfoca la primera opción de la sección activa del menú (tras cambiar de sección).
  async function focusSection() {
    await tick();
    const sec = detailEl?.querySelector("[data-detail-top]");
    if (sec) nav.focusFirstIn(sec);
  }

  // Detalle · abajo: despliega el menú; dentro, navega y al llegar al borde inferior
  // pasa a la SIGUIENTE sección (Grupos → Imágenes → Vista de juego).
  async function detailDown() {
    if (!$detailExpanded) {
      setDetailExpanded(true); // reinicia a la sección 0
      return focusSection();
    }
    const before = document.activeElement;
    nav.move("down");
    if (document.activeElement === before && $detailSection < $DETAIL_SECTIONS.length - 1) {
      setDetailSection($detailSection + 1);
      focusSection();
    }
  }
  // Detalle · arriba: si el menú no está desplegado, navegación normal (Jugar/Volver).
  // Desplegado: navega; en el borde superior pasa a la sección ANTERIOR, y desde la
  // primera sección pliega el menú y vuelve a Jugar.
  function detailUp() {
    if (!$detailExpanded) return nav.move("up");
    const before = document.activeElement;
    nav.move("up");
    if (document.activeElement !== before) return;
    if ($detailSection > 0) {
      setDetailSection($detailSection - 1);
      focusSection();
    } else {
      collapseDetail();
    }
  }
  async function collapseDetail() {
    setDetailExpanded(false);
    await tick();
    nav.focusFirst();
  }

  function cycleTab(dir) {
    if (
      $vk.open ||
      $detailGame ||
      $overlay ||
      $contextMenu ||
      $confirmDelete ||
      $shutdownConfirm ||
      $popover ||
      $colorPicker ||
      $setupModal ||
      $filtersModal ||
      $achievementsModal ||
      $confirmUnlinkSteam ||
      $radialMenu
    )
      return;
    const idx = TABS.findIndex((tab) => tab.id === $view);
    const next = (idx + dir + TABS.length) % TABS.length;
    goto(TABS[next].id);
  }

  // ------- Gestión del "scope" de navegación (capa activa) -------
  // $setupModal va primero: debe bloquear literalmente cualquier otra capa
  // hasta completarse (primer arranque, antes de que el usuario haga nada).
  // El paso entra en la clave: cambiar de paso re-dispara scheduleScope() y,
  // con eso, el foco cae en el data-focus-default del paso nuevo.
  $: layerKey = $setupModal
    ? `setup:${$setupStep}`
    : $vk.open
      ? "vk"
      : $shutdownConfirm
        ? "shutdown"
        : $systemQuickMenu
          ? "sysquick"
          : $colorPicker
            ? "colorpicker"
            : $filtersModal
              ? "filters"
              : $confirmUnlinkSteam
                ? "confirm-unlink-steam"
                : $confirmDelete
                  ? "confirm"
                  : $popover
                    ? "popover"
                    : $contextMenu
                      ? "ctx:" + ($contextMenu.sub || "main")
                      : $achievementsModal
                        ? "achievements"
                        : $detailGame
                          ? "detail"
                          : $overlay
                            ? "ov:" + $overlay
                            : "view:" + $view;

  // El scope del detalle también depende de si el menú está desplegado y de qué
  // sección se ve: al desplegar, se acota a la sección activa para que la
  // navegación no se escape a otras regiones (y "el foco no cambió" signifique
  // de verdad "borde de la sección").
  $: layerKey, $detailExpanded, $detailSection, scheduleScope();

  async function scheduleScope() {
    await tick();
    if ($setupModal) nav.setScope(setupEl);
    else if ($vk.open) nav.setScope(vkEl);
    else if ($shutdownConfirm) nav.setScope(shutdownEl);
    else if ($systemQuickMenu) nav.setScope(sysQuickEl);
    else if ($colorPicker) nav.setScope(colorPickerEl);
    else if ($filtersModal) nav.setScope(filtersEl);
    else if ($confirmUnlinkSteam) nav.setScope(confirmUnlinkSteamEl);
    else if ($confirmDelete) nav.setScope(confirmEl);
    else if ($popover) nav.setScope(popoverEl);
    else if ($contextMenu) nav.setScope(contextEl);
    else if ($achievementsModal) nav.setScope(achievementsEl);
    else if ($detailGame) {
      if ($detailExpanded) nav.setScope(detailEl?.querySelector("[data-detail-top]") || detailEl);
      else nav.setScope(detailEl);
    } else if ($overlay) nav.setScope(overlayEl);
    else nav.setScope(mainEl);
  }

  // Al entrar a la vista Juegos, resetear el filtro a "Todos".
  let _prevView = "home";
  $: {
    if ($view === "games" && _prevView !== "games") enterGames();
    _prevView = $view;
  }

  async function applyStartup() {
    const s = $startup;
    if (s.initialView && s.initialView !== "home") view.set(s.initialView);
    if (s.fullscreen) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().setFullscreen(true);
      } catch {
        /* modo web: no-op */
      }
    }
  }

  function playStartupSound() {
    const s = $soundSettings;
    if (!s.startupEnabled) return;
    const url = soundFor("startup", s.startupSound);
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = s.startupVolume;
    audio.play().catch(() => {});
  }

  onMount(async () => {
    await Promise.all([
      loadGames(),
      initProfiles(),
      initBindings(),
      initKeyBindings(),
      initStartup(),
      initLibrary(),
      initGroups(),
      initMusicLibrary(),
      initImageLibrary(),
      initVideoLibrary(),
      initPlaylists(),
      initCustomShortcuts(),
      initHidden(),
      initPrompts(),
      // Antes del chequeo de setupCompleted de abajo: el modal de primer
      // arranque nace con el idioma del SO ya preseleccionado.
      initLanguage(),
      initSounds(),
      initPlaytimes(),
      initArtOverrides(),
      initSoundtrack(),
      initPlaySession(),
      initSorting(),
      initUiPrefs(),
      initSystemActions(),
      initComboShortcuts(),
      initRadialMenu(),
      initVkBindings(),
      initSteamAccount(),
    ]);
    // Primer arranque (sin config previa): configuración inicial — una sola
    // vez, ver stores/ui.js::setupModal/completeSetup.
    if (!getAppConfig().setupCompleted) setupModal.set(true);
    await mergeCachedSteamGhosts(); // necesita loadGames() ya resuelto (arriba)
    // Sync silenciosa de fondo al abrir (sin `await`: no debe demorar el
    // primer pintado; syncNow() ya atrapa sus propios errores).
    syncNow({ silent: true });
    await applyStartup();
    playStartupSound();
    initSoundtrackPlayer();
    initMusicPlayer();
    await initInput(dispatch);
    await scheduleScope();
    const clockTimer = setInterval(() => (now = new Date()), 1000);

    const showCursor = () => (cursorHidden = false);
    window.addEventListener("mousemove", showCursor);
    fullscreen = await isFullscreen();
    const unlistenFs = await onFullscreenChange((v) => (fullscreen = v));

    return () => {
      clearInterval(clockTimer);
      window.removeEventListener("mousemove", showCursor);
      unlistenFs();
    };
  });
</script>

<div class="app" style="background: var(--gm-wallpaper); zoom: {uiScaleFactor}">
  <!-- Capa base: barra superior + vista -->
  <div class="layer" bind:this={mainEl}>
    {#snippet tabsNav()}
      <nav class="tabs">
        {#each TABS as tab}
          <button
            class="tab"
            class:active={$view === tab.id}
            data-focusable
            tabindex="-1"
            on:click={() => goto(tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </nav>
    {/snippet}

    {#snippet clock()}
      <div class="clock">{$fmt.time(now)}</div>
    {/snippet}

    {#snippet musicIndicator()}
      <!-- Solo informativo (no focusable): vive fuera de todo data-focus-group,
           los controles reales están en el QAM → Música. -->
      <div class="music-indicator" title={$musicPlayer.current.title}>
        <span class="mi-swatch" style="background: {musicIndicatorCover}"></span>
        <span class="mi-title">{$musicPlayer.current.title}</span>
        <span class="mi-progress"><span class="mi-progress-fill" style="width: {musicIndicatorProgress}%"></span></span>
      </div>
    {/snippet}

    <header class="topbar">
      <div class="topbar-slot left">
        {#if $tabsAlign === "left"}{@render tabsNav()}{/if}
        {#if $clockPosition === "left"}{@render clock()}{/if}
        {#if musicSlot === "left" && $musicPlayer.current}{@render musicIndicator()}{/if}
      </div>
      <div class="topbar-slot center">
        {#if $tabsAlign === "center"}{@render tabsNav()}{/if}
        {#if musicSlot === "center" && $musicPlayer.current}{@render musicIndicator()}{/if}
      </div>
      <div class="topbar-slot right">
        {#if $tabsAlign === "right"}{@render tabsNav()}{/if}
        {#if $clockPosition === "right"}{@render clock()}{/if}
        {#if musicSlot === "right" && $musicPlayer.current}{@render musicIndicator()}{/if}
      </div>
    </header>

    <main class="content">
      {#if $view === "home"}
        <Home />
      {:else if $view === "games"}
        <GamesView />
      {:else if $view === "apps"}
        <AppsView />
      {:else if $view === "multimedia"}
        <MultimediaView />
      {/if}
    </main>

    {#if !$hideFooter}
      <footer class="hints">
        {#if footerAcceptLabel}<span><ButtonPrompt token="A" button="south" action="accept" /> {footerAcceptLabel}</span>{/if}
        {#if footerSecondaryLabel}<span><ButtonPrompt token="Y" button="north" action="north" /> {footerSecondaryLabel}</span>{/if}
        {#if showFooterX}<span><ButtonPrompt token="X" button="west" action="west" /> Menú</span>{/if}
        {#if $view === "games"}<span><ButtonPrompt token="L3" button="l3" action="search" /> Buscar</span>{/if}
        {#if $view === "games" || $view === "apps"}<span><ButtonPrompt token="R3" button="r3" action="filters" /> Filtros y orden</span>{/if}
        <span><ButtonPrompt token="B" button="east" action="back" /> Volver</span>
        <span><ButtonPrompt token="LB" button="l1" action="tabLeft" />/<ButtonPrompt token="RB" button="r1" action="tabRight" /> Pestañas</span>
        <span><ButtonPrompt token="Menú" button="start" action="menu" /> Configuración</span>
        <span><ButtonPrompt token="Ver" button="select" action="quick" /> Sistema</span>
        <span>
          {#if $inputSource === "keymouse"}
            <!-- Home no existe en teclado; en teclado/mouse se muestra el
                 atajo alterno configurable (ver ShortcutsSection > Funciones). -->
            <ButtonPrompt action="openSystemMenu" />
          {:else}
            <!-- Mantener Home abre el menú radial (mando, ver RadialMenu.svelte). -->
            <ButtonPrompt token="Home" button="guide" />
          {/if}
          Menú de sistema
        </span>
      </footer>
    {/if}
  </div>

  <!-- Overlay: Configuración / QAM -->
  {#if $overlay}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="overlay-scrim" on:click={closeOverlay} role="presentation">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="overlay-panel"
        class:right={$overlay === "qam"}
        bind:this={overlayEl}
        on:click|stopPropagation
        tabindex="-1"
        role="dialog"
        aria-modal="true"
      >
        {#if $overlay === "config"}
          <ConfigMenu />
        {:else if $overlay === "qam"}
          <QuickAccessMenu />
        {/if}
      </div>
    </div>
  {/if}

  <!-- Detalle de juego -->
  {#if $detailGame}
    <div class="detail-layer" bind:this={detailEl}>
      <GameDetail game={$detailGame} />
    </div>
  {/if}

  <!-- Modal de logros completos (se abre desde el badge del Detalle) -->
  {#if $achievementsModal}
    <div bind:this={achievementsEl}>
      <AchievementsModal />
    </div>
  {/if}

  <!-- Confirmación de eliminar -->
  {#if $confirmDelete}
    <div bind:this={confirmEl}>
      <ConfirmDelete />
    </div>
  {/if}

  <!-- Confirmación de desvincular cuenta de Steam -->
  {#if $confirmUnlinkSteam}
    <div bind:this={confirmUnlinkSteamEl}>
      <ConfirmUnlinkSteam />
    </div>
  {/if}

  <!-- Confirmación de apagar el sistema -->
  {#if $shutdownConfirm}
    <div bind:this={shutdownEl}>
      <ShutdownConfirm />
    </div>
  {/if}

  <!-- Menú rápido de sistema (combo de botones o atajo configurable) -->
  {#if $systemQuickMenu}
    <div bind:this={sysQuickEl}>
      <SystemQuickMenu />
    </div>
  {/if}

  <!-- Modal de color (capa por encima de overlays) -->
  {#if $colorPicker}
    <div bind:this={colorPickerEl}>
      <ColorPicker />
    </div>
  {/if}

  <!-- Modal de filtros y orden (Juegos/Apps) -->
  {#if $filtersModal}
    <div bind:this={filtersEl}>
      <FiltersModal />
    </div>
  {/if}

  <!-- Configuración inicial (primer arranque) -->
  {#if $setupModal}
    <div bind:this={setupEl}>
      <InitialSetupModal />
    </div>
  {/if}

  <!-- Teclado virtual (capa superior) -->
  {#if $vk.open}
    <div bind:this={vkEl}>
      <VirtualKeyboard />
    </div>
  {/if}

  <Toast />
  <ErrorBanner />
  <PlayingOverlay />
  <SteamSyncIndicator />
  <SteamSyncSummaryBadge />
  <GamepadNotice />
  <!-- Menú radial de sistema (mando, mantener Home): overlay puramente
       presentacional, no participa del scope de navegación (ver dispatch()
       "openRadialMenu" e input/index.js). -->
  {#if $radialMenu}<RadialMenu />{/if}
</div>

<!-- Menú contextual de tarjeta y desplegable de <Select>: fuera de .app para que
     su `position: fixed` no quede anidado bajo el `zoom` de escala de interfaz
     (Ajustes > Apariencia), que si no reescala también sus coordenadas. -->
{#if $contextMenu}
  <div bind:this={contextEl}>
    <CardContextMenu />
  </div>
{/if}

{#if $popover}
  <div bind:this={popoverEl}>
    <SelectPopover />
  </div>
{/if}

<style>
  .app {
    position: relative;
    height: 100%;
    overflow: hidden;
  }
  :global(body.cursor-hidden),
  :global(body.cursor-hidden *) {
    cursor: none !important;
  }
  .layer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .topbar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 16px var(--gm-pad);
  }
  .topbar-slot {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .topbar-slot.left {
    justify-content: flex-start;
  }
  .topbar-slot.center {
    justify-content: center;
  }
  .topbar-slot.right {
    justify-content: flex-end;
  }
  .tabs {
    display: flex;
    gap: 10px;
  }
  .tab {
    cursor: pointer;
    padding: 8px 20px;
    border-radius: 999px;
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 1.05rem;
  }
  .tab.active {
    color: var(--gm-text);
    background: var(--gm-surface);
  }
  .tab:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .clock {
    font-weight: 700;
    color: var(--gm-text-dim);
    font-variant-numeric: tabular-nums;
  }
  .music-indicator {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 220px;
    padding-bottom: 5px;
    pointer-events: none;
  }
  .mi-swatch {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .mi-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--gm-text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mi-progress {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    overflow: hidden;
  }
  .mi-progress-fill {
    display: block;
    height: 100%;
    background: var(--gm-accent);
  }
  .content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  .hints {
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 12px var(--gm-pad);
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    border-top: 1px solid var(--gm-surface);
  }
  .hints span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .overlay-scrim {
    position: absolute;
    inset: 0;
    background: var(--gm-bg-overlay);
    z-index: 40;
    display: flex;
  }
  .overlay-panel {
    width: min(920px, 100%);
    height: 100%;
    background: var(--gm-bg);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
    animation: slideL 0.16s ease;
  }
  .overlay-panel.right {
    margin-left: auto;
    width: min(460px, 100%);
    animation: slideR 0.16s ease;
  }
  @keyframes slideL {
    from {
      transform: translateX(-24px);
      opacity: 0.6;
    }
  }
  @keyframes slideR {
    from {
      transform: translateX(24px);
      opacity: 0.6;
    }
  }

  .detail-layer {
    position: absolute;
    inset: 0;
    z-index: 50;
    background: var(--gm-bg);
  }
</style>
