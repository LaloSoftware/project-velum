<script>
  import Settings from "./Settings.svelte";
  import StartupSection from "./StartupSection.svelte";
  import ShortcutsSection from "./ShortcutsSection.svelte";
  import FiltersSection from "./FiltersSection.svelte";
  import { minimizeWindow, exitFullscreen, closeApp } from "../util/window.js";

  const SECTIONS = [
    { id: "appearance", label: "Apariencia" },
    { id: "startup", label: "Configuración de inicio" },
    { id: "shortcuts", label: "Configuración de atajos" },
    { id: "filters", label: "Filtros de biblioteca" },
  ];
  let section = "appearance";
</script>

<div class="config">
  <div class="main">
    <aside class="side">
      <h2>Configuración</h2>
      {#each SECTIONS as s, i}
        <button
          class="sec"
          class:active={section === s.id}
          data-focusable
          data-focus-default={i === 0 ? "" : undefined}
          tabindex="-1"
          on:click={() => (section = s.id)}
        >
          {s.label}
        </button>
      {/each}
    </aside>

    <div class="content">
      {#if section === "appearance"}
        <Settings />
      {:else if section === "startup"}
        <StartupSection />
      {:else if section === "shortcuts"}
        <ShortcutsSection />
      {:else if section === "filters"}
        <FiltersSection />
      {/if}
    </div>
  </div>

  <!-- Controles de ventana / energía (fijos) -->
  <div class="power">
    <button class="pbtn" data-focusable tabindex="-1" on:click={minimizeWindow}>
      <span class="ico">🗕</span> Minimizar
    </button>
    <button class="pbtn" data-focusable tabindex="-1" on:click={exitFullscreen}>
      <span class="ico">🗗</span> Salir de pantalla completa
    </button>
    <button class="pbtn danger" data-focusable tabindex="-1" on:click={closeApp}>
      <span class="ico">⏻</span> Cerrar
    </button>
  </div>
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
