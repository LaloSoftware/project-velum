<script>
  import { onMount, tick } from "svelte";

  import { loadGames } from "./lib/stores/games.js";
  import { initProfiles } from "./lib/stores/profiles.js";
  import {
    view,
    overlay,
    detailGame,
    goto,
    openOverlay,
    closeOverlay,
    closeDetail,
  } from "./lib/stores/ui.js";
  import { vk, vkDone } from "./lib/stores/keyboard.js";

  import { initInput } from "./lib/input/index.js";
  import * as nav from "./lib/input/navigation.js";

  import Home from "./lib/components/Home.svelte";
  import AppsView from "./lib/components/AppsView.svelte";
  import Settings from "./lib/components/Settings.svelte";
  import GlobalMenu from "./lib/components/GlobalMenu.svelte";
  import QuickAccessMenu from "./lib/components/QuickAccessMenu.svelte";
  import GameDetail from "./lib/components/GameDetail.svelte";
  import VirtualKeyboard from "./lib/components/VirtualKeyboard.svelte";
  import Toast from "./lib/components/Toast.svelte";

  const TABS = [
    { id: "home", label: "Inicio" },
    { id: "apps", label: "Aplicaciones" },
    { id: "settings", label: "Ajustes" },
  ];

  let mainEl, overlayEl, detailEl, vkEl;
  let now = new Date();

  // ------- Interpretación de acciones de input según el contexto -------
  function dispatch(action) {
    switch (action) {
      case "up":
      case "down":
      case "left":
      case "right":
        return nav.move(action);
      case "accept":
        return nav.activate();
      case "back":
        return handleBack();
      case "menu":
        if ($vk.open) return;
        return $overlay === "global" ? closeOverlay() : openOverlay("global");
      case "quick":
        if ($vk.open) return;
        return $overlay === "qam" ? closeOverlay() : openOverlay("qam");
      case "tabLeft":
        return cycleTab(-1);
      case "tabRight":
        return cycleTab(1);
    }
  }

  function handleBack() {
    if ($vk.open) return vkDone(true);
    if ($detailGame) return closeDetail();
    if ($overlay) return closeOverlay();
    if ($view !== "home") return goto("home");
  }

  function cycleTab(dir) {
    if ($vk.open || $detailGame || $overlay) return;
    const idx = TABS.findIndex((t) => t.id === $view);
    const next = (idx + dir + TABS.length) % TABS.length;
    goto(TABS[next].id);
  }

  // ------- Gestión del "scope" de navegación (capa activa) -------
  $: layerKey = $vk.open
    ? "vk"
    : $detailGame
      ? "detail"
      : $overlay
        ? "ov:" + $overlay
        : "view:" + $view;

  $: layerKey, scheduleScope();

  async function scheduleScope() {
    await tick();
    if ($vk.open) nav.setScope(vkEl);
    else if ($detailGame) nav.setScope(detailEl);
    else if ($overlay) nav.setScope(overlayEl);
    else nav.setScope(mainEl);
  }

  onMount(async () => {
    await Promise.all([loadGames(), initProfiles()]);
    await initInput(dispatch);
    await scheduleScope();
    const t = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(t);
  });
</script>

<div class="app" style="background: var(--gm-wallpaper)">
  <!-- Capa base: barra superior + vista -->
  <div class="layer" bind:this={mainEl}>
    <header class="topbar">
      <nav class="tabs">
        {#each TABS as t}
          <button
            class="tab"
            class:active={$view === t.id}
            data-focusable
            tabindex="-1"
            on:click={() => goto(t.id)}
          >
            {t.label}
          </button>
        {/each}
      </nav>
      <div class="clock">{now.toLocaleTimeString().slice(0, 5)}</div>
    </header>

    <main class="content">
      {#if $view === "home"}
        <Home />
      {:else if $view === "apps"}
        <AppsView />
      {:else if $view === "settings"}
        <Settings />
      {/if}
    </main>

    <footer class="hints">
      <span><b>A</b> Aceptar</span>
      <span><b>B</b> Volver</span>
      <span><b>LB/RB</b> Pestañas</span>
      <span><b>Menú</b> Biblioteca</span>
      <span><b>Ver</b> Sistema</span>
    </footer>
  </div>

  <!-- Overlay: biblioteca / QAM -->
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
        {#if $overlay === "global"}
          <GlobalMenu />
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

  <!-- Teclado virtual (capa superior) -->
  {#if $vk.open}
    <div bind:this={vkEl}>
      <VirtualKeyboard />
    </div>
  {/if}

  <Toast />
</div>

<style>
  .app {
    position: relative;
    height: 100%;
    overflow: hidden;
  }
  .layer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px var(--gm-pad);
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
  .content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  .hints {
    display: flex;
    gap: 22px;
    padding: 12px var(--gm-pad);
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    border-top: 1px solid var(--gm-surface);
  }
  .hints b {
    color: var(--gm-accent-2);
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
