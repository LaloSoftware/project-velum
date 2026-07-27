<script>
  import { onMount } from "svelte";
  import GameCard from "./GameCard.svelte";
  import { cardAlign } from "../stores/library.js";

  export let items = [];
  export let focusFirst = false;

  // Alineación del BLOQUE de columnas dentro del contenedor. Las tarjetas
  // siempre caen en columna (grid); izq/centro/der solo mueve el bloque.
  const JUSTIFY = { left: "start", center: "center", right: "end" };

  let gridEl;
  let gridW = 0; // ancho del contenedor (bind:clientWidth)
  let cardW = 190;
  let gap = 18;

  // Lee las medidas reales de los tokens (--gm-card-w / --gm-gap) para calcular
  // cuántas columnas caben. Se relee al montar y si cambia la alineación.
  function readVars() {
    if (!gridEl) return;
    const cs = getComputedStyle(gridEl);
    cardW = parseFloat(cs.getPropertyValue("--gm-card-w")) || 190;
    gap = parseFloat(cs.getPropertyValue("--gm-gap")) || 18;
  }
  onMount(readVars);
  $: $cardAlign, readVars();

  // Columnas fijas que caben. Con columnas explícitas (no auto-fill) el bloque
  // suma menos que el contenedor, así que `justify-content` puede posicionarlo.
  $: cols = Math.max(1, Math.floor((gridW + gap) / (cardW + gap)));
</script>

<div
  class="grid"
  bind:this={gridEl}
  bind:clientWidth={gridW}
  style="grid-template-columns: repeat({cols}, var(--gm-card-w)); justify-content: {JUSTIFY[
    $cardAlign
  ] || 'center'}"
>
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
    gap: var(--gm-gap);
    padding: 4px;
  }
  .empty {
    color: var(--gm-text-dim);
    grid-column: 1 / -1;
  }
</style>
