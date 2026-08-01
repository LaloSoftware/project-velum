<script>
  import { tick } from "svelte";
  import { onlyGames } from "../stores/games.js";
  import { reportError } from "../stores/ui.js";
  import {
    enabledStores,
    filterList,
    activeFilter,
    filterAlign,
    query,
    setFilter,
  } from "../stores/library.js";
  import { groups } from "../stores/groups.js";
  import { sortGames, sortList } from "../stores/sorting.js";
  import GameGrid from "./GameGrid.svelte";
  import ButtonPrompt from "./ButtonPrompt.svelte";

  let chipsEl;
  const ALIGN = { left: "flex-start", center: "center", right: "flex-end" };

  // Blindaje: cualquier fallo en estos cómputos no debe dejar la vista muda,
  // sino caer en un valor seguro y reportar el error (ver ErrorBanner).
  function safe(fn, fallback, ctx) {
    try {
      return fn();
    } catch (e) {
      reportError(e, `GamesView:${ctx}`);
      return fallback;
    }
  }

  // Al cambiar de filtro (incl. LT/RT), llevar el chip activo a la vista.
  $: scrollToActive($activeFilter, chipsEl);
  async function scrollToActive(id, el) {
    if (!el) return;
    try {
      await tick();
      const chip = el.querySelector(`[data-filter="${id}"]`);
      if (chip) chip.scrollIntoView({ inline: "nearest", block: "nearest" });
    } catch (e) {
      reportError(e, "GamesView:scrollToActive");
    }
  }

  // Si el filtro activo es un grupo personalizado, mostrar sus juegos;
  // si no, aplicar tiendas habilitadas + filtro de tienda.
  $: activeGroup = safe(() => $groups.find((g) => g.id === $activeFilter), null, "activeGroup");
  $: filtered = safe(
    () =>
      $onlyGames
        .filter((g) =>
          activeGroup
            ? (activeGroup.gameIds || []).includes(g.id)
            : $enabledStores[g.store] !== false &&
              ($activeFilter === "all" || g.store === $activeFilter)
        )
        .filter((g) => (g.title || "").toLowerCase().includes(($query || "").toLowerCase())),
    [],
    "filtered"
  );

  // Orden persistente (Juegos). No afecta a Inicio.
  $: shown = sortList(filtered, $sortGames);
</script>

<section class="games">
  <div class="filterbar">
    <ButtonPrompt token="LT" button="lt" action="filterPrev" />
    <div class="chips" bind:this={chipsEl} style="justify-content: {ALIGN[$filterAlign] || 'flex-start'}">
      {#each $filterList as s}
        <button
          class="tab"
          class:active={$activeFilter === s.id}
          data-focusable
          data-filter={s.id}
          tabindex="-1"
          on:click={() => setFilter(s.id)}
        >
          {s.label}
        </button>
      {/each}
    </div>
    <ButtonPrompt token="RT" button="rt" action="filterNext" />
  </div>

  <div class="grid-wrap">
    <GameGrid items={shown} />
  </div>
</section>

<style>
  .games {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--gm-pad);
    gap: 16px;
  }
  .filterbar {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  .chips {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    overflow-x: auto;
    scrollbar-width: none;
    scroll-padding: 0 40px;
    padding: 4px 0;
  }
  .chips::-webkit-scrollbar {
    display: none;
  }
  .tab {
    flex: 0 0 auto;
    cursor: pointer;
    padding: 8px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .tab.active {
    background: var(--gm-accent);
    color: #06101f;
  }
  .tab:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .tab.active:focus {
    color: #06101f;
  }
  .grid-wrap {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    /* Aire simétrico para que el anillo de foco no se recorte por ningún lado. */
    padding: var(--gm-focus-space);
    margin: 0 -12px;
    scroll-padding: var(--gm-focus-space);
  }
</style>
