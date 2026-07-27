<script>
  import GameCard from "./GameCard.svelte";
  import { cardAlign } from "../stores/library.js";
  export let items = [];
  export let focusFirst = false;

  const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" };
  $: justify = JUSTIFY[$cardAlign] || "center";
</script>

<div class="grid" style="justify-content: {justify}">
  {#each items as g, i (g.id)}
    <GameCard game={g} focusDefault={focusFirst && i === 0} />
  {/each}
  {#if items.length === 0}
    <p class="empty">No hay elementos.</p>
  {/if}
</div>

<style>
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--gm-gap);
    padding: 4px;
  }
  .empty {
    color: var(--gm-text-dim);
  }
</style>
