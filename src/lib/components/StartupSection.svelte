<script>
  import { startup, updateStartup } from "../stores/startup.js";

  const VIEWS = [
    { id: "home", label: "Inicio" },
    { id: "games", label: "Juegos" },
    { id: "apps", label: "Aplicaciones" },
  ];
</script>

<section class="panel">
  <h1>Configuración de inicio</h1>

  <h2>Vista al arrancar</h2>
  <div class="chips">
    {#each VIEWS as v, i}
      <button
        class="chip"
        class:sel={$startup.initialView === v.id}
        data-focusable
        data-focus-default={i === 0 ? "" : undefined}
        tabindex="-1"
        on:click={() => updateStartup({ initialView: v.id })}
      >
        {v.label}
      </button>
    {/each}
  </div>

  <h2>Pantalla completa al arrancar</h2>
  <button
    class="toggle"
    class:on={$startup.fullscreen}
    data-focusable
    tabindex="-1"
    on:click={() => updateStartup({ fullscreen: !$startup.fullscreen })}
  >
    {$startup.fullscreen ? "ON" : "OFF"}
  </button>

  <p class="dim">Autoarranque con Windows: próximamente.</p>
</section>

<style>
  .panel {
    padding: var(--gm-pad);
    height: 100%;
    overflow-y: auto;
  }
  h1 {
    font-size: 2rem;
    font-weight: var(--gm-title-weight);
    margin: 0 0 18px;
  }
  h2 {
    font-size: 1.1rem;
    margin: 24px 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
    margin-top: 28px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .chip {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .chip.sel {
    background: var(--gm-accent);
    color: #06101f;
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .toggle {
    cursor: pointer;
    min-width: 72px;
    padding: 12px 0;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 800;
  }
  .toggle.on {
    background: var(--gm-success);
    color: #04140d;
  }
  .toggle:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
