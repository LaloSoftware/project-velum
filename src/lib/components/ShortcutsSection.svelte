<script>
  import { onDestroy } from "svelte";
  import {
    ACTIONS,
    BUTTON_LABELS,
    bindings,
    assignAction,
    resetBindings,
  } from "../stores/bindings.js";
  import {
    keyBindings,
    assignKeyAction,
    resetKeyBindings,
    tokenForAction,
    labelForToken,
  } from "../stores/keyBindings.js";
  import { setCapture, clearCapture, setKeyCapture, clearKeyCapture } from "../input/index.js";
  import { showToast } from "../stores/ui.js";
  import { playConfig, updatePlayConfig } from "../stores/playsession.js";
  import Select from "./Select.svelte";

  // listening: { action, mode: "km" | "pad" } | null
  let listening = null;
  let timer = null;
  let capturingReturn = false; // captura del botón de "volver al launcher"

  const HOLD_OPTS = [
    { value: 500, label: "0.5 s" },
    { value: 800, label: "0.8 s" },
    { value: 1200, label: "1.2 s" },
    { value: 2000, label: "2 s" },
  ];

  function rebindReturn() {
    capturingReturn = true;
    setCapture((rawButton) => {
      updatePlayConfig({ returnButton: rawButton });
      capturingReturn = false;
      clearCapture();
    });
    clearTimeout(timer);
    timer = setTimeout(() => {
      capturingReturn = false;
      clearCapture();
    }, 6000);
  }

  // Botón de mando (etiqueta) asignado a una acción, reactivo a $bindings.
  $: labelFor = (action) => {
    const btn = Object.keys($bindings).find((b) => $bindings[b] === action);
    return btn ? BUTTON_LABELS[btn] : "—";
  };

  // Tecla/botón de mouse (etiqueta) asignado a una acción, reactivo a $keyBindings.
  $: kmLabelFor = (action) => {
    $keyBindings; // dependencia reactiva explícita
    return labelForToken(tokenForAction(action));
  };

  function stopListening() {
    listening = null;
    capturingReturn = false;
    clearCapture();
    clearKeyCapture();
    clearTimeout(timer);
  }

  function rebindPad(action) {
    listening = { action, mode: "pad" };
    setCapture((rawButton) => {
      assignAction(action, rawButton);
      stopListening();
      showToast("Atajo de mando asignado");
    });
    // Auto-cancela por si no se pulsa nada.
    clearTimeout(timer);
    timer = setTimeout(stopListening, 6000);
  }

  function rebindKeyMouse(action) {
    listening = { action, mode: "km" };
    setKeyCapture((token) => {
      assignKeyAction(action, token);
      stopListening();
      showToast("Atajo de teclado/mouse asignado");
    });
    clearTimeout(timer);
    timer = setTimeout(stopListening, 6000);
  }

  async function reset() {
    await resetBindings();
    await resetKeyBindings();
    showToast("Atajos restaurados por defecto");
  }

  onDestroy(stopListening); // limpia captura si se cierra el menú
</script>

<section class="panel">
  <h1>Configuración de atajos</h1>
  <p class="dim">
    Asigna qué tecla/botón de mouse y qué botón de mando ejecutan cada acción — ambos
    atajos conviven a la vez. Las direcciones (d-pad/stick/flechas) son fijas.
  </p>

  <div class="action-rows">
    <div class="action-row head">
      <span></span>
      <span class="col-title">Teclado / Mouse</span>
      <span class="col-title">Control</span>
    </div>
    {#each ACTIONS as a}
      <div class="action-row">
        <span class="label">{a.label}</span>
        <div
          class="cell"
          class:unset={kmLabelFor(a.id) === "—"}
          class:listening={listening?.action === a.id && listening?.mode === "km"}
          data-focusable
          tabindex="-1"
          role="button"
          on:click={() => rebindKeyMouse(a.id)}
          on:keydown={(e) => (e.key === "Enter" || e.key === " ") && rebindKeyMouse(a.id)}
        >
          {kmLabelFor(a.id)}
        </div>
        <div
          class="cell"
          class:unset={labelFor(a.id) === "—"}
          class:listening={listening?.action === a.id && listening?.mode === "pad"}
          data-focusable
          tabindex="-1"
          role="button"
          on:click={() => rebindPad(a.id)}
          on:keydown={(e) => (e.key === "Enter" || e.key === " ") && rebindPad(a.id)}
        >
          {labelFor(a.id)}
        </div>
      </div>
    {/each}
  </div>

  <button class="reset" data-focusable tabindex="-1" on:click={reset}>
    Restaurar por defecto
  </button>

  <h2 class="subhead">Volver al launcher (en juego)</h2>
  <p class="dim">
    Mientras un juego está en marcha, este botón restaura el launcher. Elige si actúa al
    pulsarlo o al mantenerlo pulsado.
  </p>
  <div class="rows">
    <div class="row">
      <span class="label">Botón</span>
      <span class="btn">{BUTTON_LABELS[$playConfig.returnButton] || "—"}</span>
      <button class="rebind" data-focusable tabindex="-1" on:click={rebindReturn}>
        Reasignar
      </button>
    </div>
    <div class="row">
      <span class="label">Modo</span>
      <div class="ctrl">
        <Select
          value={$playConfig.returnMode}
          options={[
            { value: "press", label: "Pulsar" },
            { value: "hold", label: "Mantener" },
          ]}
          onChange={(v) => updatePlayConfig({ returnMode: v })}
        />
      </div>
    </div>
    {#if $playConfig.returnMode === "hold"}
      <div class="row">
        <span class="label">Duración</span>
        <div class="ctrl">
          <Select
            value={$playConfig.holdMs}
            options={HOLD_OPTS}
            onChange={(v) => updatePlayConfig({ holdMs: v })}
          />
        </div>
      </div>
    {/if}
  </div>
</section>

{#if listening || capturingReturn}
  <div class="capture">
    <div class="box">
      <div class="big">
        {capturingReturn || listening.mode === "pad"
          ? "Pulsa un botón del mando…"
          : "Pulsa una tecla o botón del mouse…"}
      </div>
      <div class="dim">
        para «{capturingReturn
          ? "Volver al launcher"
          : ACTIONS.find((a) => a.id === listening.action)?.label}»
      </div>
    </div>
  </div>
{/if}

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
    margin: 0 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
  }
  .subhead {
    font-size: 1.1rem;
    margin: 30px 0 10px;
  }
  .ctrl {
    min-width: 180px;
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
  .action-rows {
    margin: 22px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .action-row {
    display: grid;
    grid-template-columns: 1fr 170px 170px;
    align-items: center;
    gap: 14px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .action-row.head {
    background: none;
    padding: 0 16px;
  }
  .col-title {
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    text-align: center;
  }
  .cell {
    cursor: pointer;
    text-align: center;
    padding: 8px 12px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-accent-2);
    font-weight: 800;
    outline: none;
  }
  .cell.unset {
    color: var(--gm-text-dim);
    font-weight: 600;
  }
  .cell.listening,
  .cell:focus {
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
