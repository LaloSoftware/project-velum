<script>
  import GameCard from "./GameCard.svelte";
  export let items = [];
  export let focusFirst = false;
</script>

<div class="grid">
  {#each items as g, i (g.id)}
    <GameCard game={g} focusDefault={focusFirst && i === 0} />
  {/each}
  {#if items.length === 0}
    <p class="empty">No hay elementos.</p>
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, var(--gm-card-w));
    gap: var(--gm-gap);
    justify-content: start;
    padding: 4px;
  }
  .empty {
    color: var(--gm-text-dim);
  }
</style>
