<script>
  import { onMount } from "svelte";
  import GameCard from "./GameCard.svelte";
  import { cardAlign } from "../stores/library.js";

  export let items = [];
  export let focusFirst = false;

  const ALIGN = { left: "flex-start", center: "center", right: "flex-end" };

  let gridEl;
  let gridW = 0; // ancho disponible (bind:clientWidth)
  let cardW = 190;
  let gap = 18;

  // Lee las medidas reales de los tokens (--gm-card-w / --gm-gap) para calcular
  // cuántas tarjetas caben por fila. Se relee al montar y si cambia la alineación.
  function readVars() {
    if (!gridEl) return;
    const cs = getComputedStyle(gridEl);
    cardW = parseFloat(cs.getPropertyValue("--gm-card-w")) || 190;
    gap = parseFloat(cs.getPropertyValue("--gm-gap")) || 18;
  }
  onMount(readVars);
  $: $cardAlign, readVars();

  // Columnas que caben (el `gap` actúa como separación mínima).
  $: cols = Math.max(1, Math.floor((gridW + gap) / (cardW + gap)));

  // Partimos en filas: las completas se reparten a lo ancho (space-between);
  // la última fila incompleta usa hueco fijo y se alinea según `cardAlign`.
  $: rows = (() => {
    const out = [];
    for (let i = 0; i < items.length; i += cols) out.push(items.slice(i, i + cols));
    return out;
  })();
</script>

<div class="grid" bind:this={gridEl} bind:clientWidth={gridW}>
  {#each rows as row, ri}
    <div
      class="row"
      style="justify-content: {row.length === cols && cols > 1
        ? 'space-between'
        : ALIGN[$cardAlign] || 'center'}"
    >
      {#each row as g, ci (g.id)}
        <GameCard game={g} focusDefault={focusFirst && ri === 0 && ci === 0} />
      {/each}
    </div>
  {/each}
  {#if items.length === 0}
    <p class="empty">No hay elementos.</p>
  {/if}
</div>

<style>
  .grid {
    display: flex;
    flex-direction: column;
    gap: var(--gm-gap);
    padding: 4px;
  }
  .row {
    display: flex;
    gap: var(--gm-gap);
  }
  .empty {
    color: var(--gm-text-dim);
  }
</style>
