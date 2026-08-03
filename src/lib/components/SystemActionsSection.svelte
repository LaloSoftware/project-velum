<script>
  import { showPowerFooter, setShowPowerFooter } from "../stores/systemActions.js";
</script>

<section class="panel">
  <h1>Acciones del sistema</h1>

  <h2>Mostrar pie con botones de ventana/energía</h2>
  <p class="dim">
    Minimizar, maximizar, pantalla completa, cerrar y apagar al final del menú de
    Configuración. Oculto por defecto — accede a lo mismo más rápido con el combo de
    botones (ver "Configuración de atajos" → Funciones).
  </p>
  <button
    class="toggle"
    class:on={$showPowerFooter}
    data-focusable
    tabindex="-1"
    on:click={() => setShowPowerFooter(!$showPowerFooter)}
  >
    {$showPowerFooter ? "ON" : "OFF"}
  </button>
</section>

<style>
  .panel {
    padding: var(--gm-pad);
    height: 100%;
    overflow-y: auto;
    max-width: 640px;
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
    max-width: 620px;
  }
  .toggle {
    display: block;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    padding: 12px 0;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 800;
    text-align: center;
    margin-top: 10px;
  }
  .toggle.on {
    background: var(--gm-success);
    color: #04140d;
  }
  .toggle:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
