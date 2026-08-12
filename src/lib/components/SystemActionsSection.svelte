<script>
  import {
    showPowerFooter,
    setShowPowerFooter,
    QUICK_MENU_ACTIONS,
    quickMenuOrder,
    moveQuickMenuAction,
    resetQuickMenuOrder,
  } from "../stores/systemActions.js";
  import { t } from "../i18n/index.js";

  // Reactivo, no `const`: si no, las etiquetas quedan congeladas en el idioma
  // con el que arrancó la app.
  $: LABEL = Object.fromEntries(QUICK_MENU_ACTIONS.map((a) => [a.id, $t(a.labelKey)]));
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

  <h2>Orden del menú de sistema</h2>
  <p class="dim">
    Orden de las opciones del menú rápido (combo de botones o atajo de teclado/mouse
    — ver "Configuración de atajos" → Funciones).
  </p>
  <div class="rows">
    {#each $quickMenuOrder as id, i (id)}
      <div class="row">
        <span class="rlabel">{LABEL[id] || id}</span>
        <button
          class="move"
          data-focusable
          tabindex="-1"
          disabled={i === 0}
          on:click={() => moveQuickMenuAction(id, -1)}
          aria-label="Mover arriba"
        >
          ↑
        </button>
        <button
          class="move"
          data-focusable
          tabindex="-1"
          disabled={i === $quickMenuOrder.length - 1}
          on:click={() => moveQuickMenuAction(id, 1)}
          aria-label="Mover abajo"
        >
          ↓
        </button>
      </div>
    {/each}
  </div>
  <button class="reset" data-focusable tabindex="-1" on:click={resetQuickMenuOrder}>
    Restaurar por defecto
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
  .rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .rlabel {
    flex: 1;
    font-weight: 600;
  }
  .move {
    cursor: pointer;
    min-width: 40px;
    padding: 8px 0;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 800;
  }
  .move:disabled {
    color: var(--gm-text-dim);
    cursor: default;
    opacity: 0.4;
  }
  .move:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .reset {
    cursor: pointer;
    margin-top: 14px;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-danger);
    font-weight: 700;
  }
  .reset:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
