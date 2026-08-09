<script>
  /*
   * Configuración inicial — se muestra una sola vez, en el primer arranque
   * sin config previa (ver setupModal/completeSetup en stores/ui.js). Por
   * ahora solo selección de tiendas; a futuro sumaría más pasos (idioma,
   * región, etc.) dentro de este mismo modal, no un mecanismo aparte.
   */
  import { setupModal, completeSetup } from "../stores/ui.js";
  import { STORE_DEFS, enabledStores, setStoreEnabled } from "../stores/library.js";
  import velumSymbol from "../../assets/velum-symbol.svg";

  const isOn = (id) => $enabledStores[id] !== false;
  $: enabledIds = STORE_DEFS.filter((s) => $enabledStores[s.id] !== false).map((s) => s.id);
</script>

{#if $setupModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={completeSetup} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Configuración inicial">
    <header class="head">
      <img class="symbol" src={velumSymbol} alt="" />
      <h2>Bienvenido a VELUM</h2>
      <p class="dim">
        Elegí qué tiendas mostrar en tu biblioteca. Podés cambiarlo después desde
        Configuración → Filtros de biblioteca.
      </p>
    </header>

    <div class="body">
      <div class="stores">
        {#each STORE_DEFS as s (s.id)}
          <button
            class="store"
            class:sel={isOn(s.id)}
            data-focusable
            data-focus-default={s.id === STORE_DEFS[0].id ? "" : undefined}
            tabindex="-1"
            on:click={() => setStoreEnabled(s.id, !isOn(s.id))}
          >
            <span class="s-label">{s.label}</span>
            {#if isOn(s.id)}<span class="tick">✓</span>{/if}
          </button>
        {/each}
      </div>
      <p class="dim hint">
        Podés escanear tu biblioteca de Steam más adelante desde
        Configuración → Cuentas.
      </p>
    </div>

    <footer class="actions">
      <button class="done" data-focusable tabindex="-1" on:click={completeSetup}>
        Continuar
      </button>
    </footer>
  </div>
{/if}

<style>
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--gm-bg-overlay);
    z-index: 62;
  }
  .modal {
    position: absolute;
    z-index: 63;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(520px, 94vw);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 28px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
    text-align: center;
  }
  .head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .symbol {
    width: 44px;
    height: 44px;
  }
  .head h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: var(--gm-title-weight);
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .head .dim {
    max-width: 400px;
  }
  .body {
    margin-top: 22px;
  }
  .stores {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  .store {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .store.sel {
    background: var(--gm-accent);
    color: #06101f;
  }
  .store:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .store.sel:focus {
    color: #06101f;
  }
  .tick {
    font-weight: 800;
  }
  .hint {
    margin-top: 16px;
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    margin-top: 24px;
  }
  .done {
    cursor: pointer;
    flex: 1;
    padding: 13px 0;
    border-radius: 999px;
    background: var(--gm-accent);
    color: #06101f;
    font-weight: 800;
  }
  .done:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
