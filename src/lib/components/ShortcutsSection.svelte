<script>
  import { onDestroy } from "svelte";
  import {
    ACTIONS,
    BUTTON_LABELS,
    bindings,
    assignAction,
    resetBindings,
  } from "../stores/bindings.js";
  import { setCapture, clearCapture } from "../input/index.js";
  import { showToast } from "../stores/ui.js";

  let listening = null; // acción que se está reasignando
  let timer = null;

  // Botón (etiqueta) asignado a una acción, reactivo a $bindings.
  $: labelFor = (action) => {
    const btn = Object.keys($bindings).find((b) => $bindings[b] === action);
    return btn ? BUTTON_LABELS[btn] : "—";
  };

  function stopListening() {
    listening = null;
    clearCapture();
    clearTimeout(timer);
  }

  function rebind(action) {
    listening = action;
    setCapture((rawButton) => {
      assignAction(action, rawButton);
      stopListening();
      showToast("Atajo asignado");
    });
    // Auto-cancela por si no se pulsa nada.
    clearTimeout(timer);
    timer = setTimeout(stopListening, 6000);
  }

  async function reset() {
    await resetBindings();
    showToast("Atajos restaurados por defecto");
  }

  onDestroy(stopListening); // limpia captura si se cierra el menú
</script>

<section class="panel">
  <h1>Configuración de atajos</h1>
  <p class="dim">
    Asigna qué botón del mando ejecuta cada acción. Las direcciones (d-pad/stick) son
    fijas. El teclado sigue funcionando como respaldo.
  </p>

  <div class="rows">
    {#each ACTIONS as a}
      <div class="row">
        <span class="label">{a.label}</span>
        <span class="btn">{labelFor(a.id)}</span>
        <button class="rebind" data-focusable tabindex="-1" on:click={() => rebind(a.id)}>
          Reasignar
        </button>
      </div>
    {/each}
  </div>

  <button class="reset" data-focusable tabindex="-1" on:click={reset}>
    Restaurar por defecto
  </button>
</section>

{#if listening}
  <div class="capture">
    <div class="box">
      <div class="big">Pulsa un botón del mando…</div>
      <div class="dim">para «{ACTIONS.find((a) => a.id === listening)?.label}»</div>
    </div>
  </div>
{/if}

<style>
  .panel {
    padding: var(--gm-pad);
    height: 100%;
    overflow-y: auto;
  }
  h1 {
    font-size: 2rem;
    font-weight: var(--gm-title-weight);
    margin: 0 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
  }
  .rows {
    margin: 22px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .label {
    flex: 1;
    font-weight: 600;
  }
  .btn {
    min-width: 130px;
    color: var(--gm-accent-2);
    font-weight: 800;
  }
  .rebind {
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
  }
  .rebind:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .reset {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-danger);
    font-weight: 700;
  }
  .reset:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .capture {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gm-bg-overlay);
    z-index: 70;
  }
  .box {
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 30px 44px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .big {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 8px;
  }
</style>
