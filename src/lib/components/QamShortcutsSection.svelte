<script>
  import { customShortcuts, displayLabel } from "../stores/customShortcuts.js";
  import { runShortcut } from "../ipc/index.js";
</script>

<div class="qam">
  <h2>Atajos</h2>
  {#if $customShortcuts.length === 0}
    <p class="dim">
      No tienes atajos configurados. Créalos en Configuración &gt; Configuración de atajos,
      en "Atajos personalizados".
    </p>
  {:else}
    <div class="list">
      {#each $customShortcuts as s (s.id)}
        <button
          class="item"
          data-focusable
          data-focus-default={$customShortcuts[0] === s ? "" : undefined}
          tabindex="-1"
          on:click={() => runShortcut(s.modifiers, s.code)}
        >
          <span class="label">{s.label}</span>
          <span class="combo dim">{displayLabel(s)}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .qam {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 1.6rem;
    font-weight: var(--gm-title-weight);
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .item {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 14px 16px;
    text-align: left;
  }
  .item:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .label {
    font-weight: 700;
  }
  .combo {
    font-size: 0.85rem;
    font-weight: 600;
  }
</style>
