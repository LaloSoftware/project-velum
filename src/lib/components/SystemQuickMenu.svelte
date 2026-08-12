<script>
  import { systemQuickMenu, closeSystemQuickMenu } from "../stores/ui.js";
  import { QUICK_MENU_ACTIONS, quickMenuOrder, runSystemAction } from "../stores/systemActions.js";
  import { t } from "../i18n/index.js";

  // Reactivo, no `const`: si no, las etiquetas quedan congeladas en el idioma
  // con el que arrancó la app.
  $: LABEL = Object.fromEntries(QUICK_MENU_ACTIONS.map((a) => [a.id, $t(a.labelKey)]));

  // Acciones ordenadas según stores/systemActions.js -> quickMenuOrder.
  $: orderedActions = $quickMenuOrder.map((id) => ({ id, label: LABEL[id] || id }));

  async function run(id) {
    // "shutdown" abre la confirmación y deja este menú abierto detrás (ver
    // runSystemAction) — el resto de acciones sí cierran el menú antes.
    if (id !== "shutdown") closeSystemQuickMenu();
    await runSystemAction(id);
  }
</script>

{#if $systemQuickMenu}
  <div class="scrim">
    <div class="box" role="dialog" aria-modal="true" aria-label="Menú de sistema">
      <h2>Menú de sistema</h2>
      <div class="list">
        {#each orderedActions as a (a.id)}
          <button
            class="mi"
            class:danger={a.id === "shutdown"}
            data-focusable
            data-focus-default={a.id === $quickMenuOrder[0] ? "" : undefined}
            tabindex="-1"
            on:click={() => run(a.id)}
          >
            {a.label}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 65;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gm-bg-overlay);
  }
  .box {
    width: min(360px, 92vw);
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 22px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  h2 {
    margin: 0 0 16px;
    font-size: 1.3rem;
    font-weight: var(--gm-title-weight);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mi {
    cursor: pointer;
    text-align: left;
    padding: 13px 16px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 700;
  }
  .mi.danger {
    color: var(--gm-danger);
  }
  .mi:focus {
    box-shadow: var(--gm-focus-ring);
    background: var(--gm-surface-2);
  }
</style>
