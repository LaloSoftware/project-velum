<script>
  import { tick, onMount } from "svelte";
  import Settings from "./Settings.svelte";
  import LanguageSection from "./LanguageSection.svelte";
  import StartupSection from "./StartupSection.svelte";
  import ShortcutsSection from "./ShortcutsSection.svelte";
  import FiltersSection from "./FiltersSection.svelte";
  import HiddenSection from "./HiddenSection.svelte";
  import ButtonIconsSection from "./ButtonIconsSection.svelte";
  import SoundsSection from "./SoundsSection.svelte";
  import SystemActionsSection from "./SystemActionsSection.svelte";
  import AccountsSection from "./AccountsSection.svelte";
  import NotificationsSection from "./NotificationsSection.svelte";
  import UpdatesSection from "./UpdatesSection.svelte";
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
  import { t } from "../i18n/index.js";
  import velumSymbol from "../../assets/velum-symbol.svg";

  let fullscreen = false;
  onMount(async () => {
    fullscreen = await isFullscreen();
  });

  // "Acerca de VELUM" — versión real vía Tauri, con fallback en modo web/dev
  // sin backend nativo (mismo criterio try/catch que ipc/index.js). Vive
  // acá (pie del sidebar, fuera de la lista de secciones) en vez de dentro
  // de Apariencia para que sea visible sin importar la sección activa.
  let appVersion = "0.1.0";
  onMount(async () => {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      appVersion = await getVersion();
    } catch {
      // modo web: se queda el fallback de arriba
    }
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

  // El id es dato (decide qué panel se monta); la etiqueta sale del
  // diccionario. "language" va en el índice 1 y no en el 0 a propósito: el
  // índice 0 lleva data-focus-default y sería la sección de aterrizaje del
  // menú.
  const SECTIONS = [
    { id: "appearance", labelKey: "settings.sections.appearance" },
    { id: "language", labelKey: "settings.sections.language" },
    { id: "startup", labelKey: "settings.sections.startup" },
    { id: "shortcuts", labelKey: "settings.sections.shortcuts" },
    { id: "sounds", labelKey: "settings.sections.sounds" },
    { id: "buttonicons", labelKey: "settings.sections.buttonicons" },
    { id: "filters", labelKey: "settings.sections.filters" },
    { id: "hidden", labelKey: "settings.sections.hidden" },
    { id: "system-actions", labelKey: "settings.sections.system-actions" },
    { id: "accounts", labelKey: "settings.sections.accounts" },
    { id: "notifications", labelKey: "settings.sections.notifications" },
    { id: "updates", labelKey: "settings.sections.updates" },
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
      <div class="side-scroll">
        <h2>{$t("settings.title")}</h2>
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
            {$t(s.labelKey)}
          </button>
        {/each}
      </div>

      <!-- Pie fijo (fuera del scroll de la lista de secciones), visible sin
           importar cuál esté activa. Sin acción real — igual foco-alcanzable
           (data-focusable) para que la navegación por mando/teclado llegue
           acá; si no, al no recibir foco nunca queda invisible para quien
           navega sin mouse. -->
      <div class="about" data-focusable tabindex="-1">
        <img class="about-symbol" src={velumSymbol} alt="" />
        <div class="about-text">
          <span class="about-name">VELUM</span>
          <span class="about-version">v{appVersion}</span>
        </div>
      </div>
    </aside>

    <div class="content" data-focus-group="panel" bind:this={contentEl}>
      {#if section === "appearance"}
        <Settings />
      {:else if section === "language"}
        <LanguageSection />
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
      {:else if section === "updates"}
        <UpdatesSection />
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
    /* El pie "Acerca de" (más abajo) queda FUERA de este scroll a propósito
       — visible siempre, no importa cuál sección esté activa ni cuánto
       scrollee la lista. */
    overflow: hidden;
  }
  .side-scroll {
    flex: 1;
    min-height: 0;
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
  .about {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--gm-surface);
    border-radius: var(--gm-radius);
  }
  .about:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .about-symbol {
    width: 22px;
    height: 22px;
  }
  .about-text {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .about-name {
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--gm-text-dim);
  }
  .about-version {
    font-size: 0.8rem;
    color: var(--gm-text-dim);
    font-variant-numeric: tabular-nums;
  }
  .content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    position: relative;
  }
</style>
