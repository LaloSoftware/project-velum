<script>
  import { tick, onMount } from "svelte";
  import Settings from "./Settings.svelte";
  import StartupSection from "./StartupSection.svelte";
  import ShortcutsSection from "./ShortcutsSection.svelte";
  import FiltersSection from "./FiltersSection.svelte";
  import HiddenSection from "./HiddenSection.svelte";
  import ButtonIconsSection from "./ButtonIconsSection.svelte";
  import SoundsSection from "./SoundsSection.svelte";
  import SystemActionsSection from "./SystemActionsSection.svelte";
  import AccountsSection from "./AccountsSection.svelte";
  import NotificationsSection from "./NotificationsSection.svelte";
  import { showPowerFooter } from "../stores/systemActions.js";
  import {
    minimizeWindow,
    enterFullscreen,
    exitFullscreen,
    toggleMaximize,
    isFullscreen,
    closeApp,
  } from "../util/window.js";
  import { focusFirstIn } from "../input/navigation.js";
  import { openShutdownConfirm } from "../stores/ui.js";

  let fullscreen = false;
  onMount(async () => {
    fullscreen = await isFullscreen();
  });
  async function maximizar() {
    await toggleMaximize();
  }
  async function pantallaCompleta() {
    await enterFullscreen();
    fullscreen = true;
  }
  async function salirFullscreen() {
    await exitFullscreen();
    fullscreen = false;
  }

  const SECTIONS = [
    { id: "appearance", label: "Apariencia" },
    { id: "startup", label: "Configuración de inicio" },
    { id: "shortcuts", label: "Configuración de atajos" },
    { id: "sounds", label: "Sonidos" },
    { id: "buttonicons", label: "Iconos de botones" },
    { id: "filters", label: "Filtros de biblioteca" },
    { id: "hidden", label: "Ocultos" },
    { id: "system-actions", label: "Acciones del sistema" },
    { id: "accounts", label: "Cuentas" },
    { id: "notifications", label: "Notificaciones" },
  ];
  let section = "appearance";
  let contentEl;

  // Enfocar una sección (arriba/abajo) la previsualiza; "entrar" al panel es
  // explícito con Aceptar (A/X) o Derecha (esto último lo maneja navigation por regiones).
  async function enterSection(id) {
    section = id;
    await tick();
    focusFirstIn(contentEl);
  }
</script>

<div class="config">
  <div class="main">
    <aside class="side" data-focus-group="side">
      <h2>Configuración</h2>
      {#each SECTIONS as s, i}
        <button
          class="sec"
          class:active={section === s.id}
          data-focusable
          data-focus-default={i === 0 ? "" : undefined}
          tabindex="-1"
          on:focus={() => (section = s.id)}
          on:click={() => enterSection(s.id)}
        >
          {s.label}
        </button>
      {/each}
    </aside>

    <div class="content" data-focus-group="panel" bind:this={contentEl}>
      {#if section === "appearance"}
        <Settings />
      {:else if section === "startup"}
        <StartupSection />
      {:else if section === "shortcuts"}
        <ShortcutsSection />
      {:else if section === "filters"}
        <FiltersSection />
      {:else if section === "hidden"}
        <HiddenSection />
      {:else if section === "buttonicons"}
        <ButtonIconsSection />
      {:else if section === "sounds"}
        <SoundsSection />
      {:else if section === "system-actions"}
        <SystemActionsSection />
      {:else if section === "accounts"}
        <AccountsSection />
      {:else if section === "notifications"}
        <NotificationsSection />
      {/if}
    </div>
  </div>

  <!-- Controles de ventana / energía (fijos). Ocultos por defecto — ver
       "Acciones del sistema"; el combo de botones da acceso equivalente. -->
  {#if $showPowerFooter}
  <div class="power" data-focus-group="power">
    <button class="pbtn" data-focusable tabindex="-1" on:click={minimizeWindow}>
      <span class="ico">🗕</span> Minimizar
    </button>
    {#if fullscreen}
      <button class="pbtn" data-focusable tabindex="-1" on:click={salirFullscreen}>
        <span class="ico">🗗</span> Salir de pantalla completa
      </button>
    {:else}
      <button class="pbtn" data-focusable tabindex="-1" on:click={maximizar}>
        <span class="ico">🗖</span> Maximizar
      </button>
      <button class="pbtn" data-focusable tabindex="-1" on:click={pantallaCompleta}>
        <span class="ico">⛶</span> Pantalla completa
      </button>
    {/if}
    <button class="pbtn danger" data-focusable tabindex="-1" on:click={closeApp}>
      <span class="ico">⏻</span> Cerrar
    </button>
    <button class="pbtn danger" data-focusable tabindex="-1" on:click={openShutdownConfirm}>
      <span class="ico">⏼</span> Apagar
    </button>
  </div>
  {/if}
</div>

<style>
  .config {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .main {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .power {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    border-top: 1px solid var(--gm-surface-2);
    background: var(--gm-bg-elev);
  }
  .pbtn {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 700;
  }
  .pbtn .ico {
    font-size: 1.05rem;
  }
  .pbtn.danger {
    color: var(--gm-danger);
  }
  .pbtn:focus {
    box-shadow: var(--gm-focus-ring);
    background: var(--gm-surface-2);
  }
  .side {
    width: 260px;
    flex: 0 0 260px;
    background: var(--gm-bg-elev);
    padding: var(--gm-pad) 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }
  .side h2 {
    margin: 0 0 14px;
    font-size: 1.4rem;
    font-weight: var(--gm-title-weight);
  }
  .sec {
    cursor: pointer;
    text-align: left;
    padding: 12px 16px;
    border-radius: var(--gm-radius);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .sec.active {
    background: var(--gm-surface);
    color: var(--gm-text);
  }
  .sec:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    position: relative;
  }
</style>
