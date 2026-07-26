<script>
  import { tick } from "svelte";
  import { onlyGames } from "../stores/games.js";
  import { showToast } from "../stores/ui.js";
  import { openLauncher } from "../ipc/index.js";
  import {
    enabledStores,
    filterList,
    activeFilter,
    filterAlign,
    query,
    setFilter,
    runSearch,
  } from "../stores/library.js";
  import { groups } from "../stores/groups.js";
  import GameGrid from "./GameGrid.svelte";
  import ButtonPrompt from "./ButtonPrompt.svelte";

  let chipsEl;
  const ALIGN = { left: "flex-start", center: "center", right: "flex-end" };

  // Al cambiar de filtro (incl. LT/RT), llevar el chip activo a la vista.
  $: scrollToActive($activeFilter, chipsEl);
  async function scrollToActive(id, el) {
    if (!el) return;
    await tick();
    const chip = el.querySelector(`[data-filter="${id}"]`);
    if (chip) chip.scrollIntoView({ inline: "nearest", block: "nearest" });
  }

  // Si el filtro activo es un grupo personalizado, mostrar sus juegos;
  // si no, aplicar tiendas habilitadas + filtro de tienda.
  $: activeGroup = $groups.find((g) => g.id === $activeFilter);
  $: filtered = $onlyGames
    .filter((g) =>
      activeGroup
        ? activeGroup.gameIds.includes(g.id)
        : $enabledStores[g.store] !== false &&
          ($activeFilter === "all" || g.store === $activeFilter)
    )
    .filter((g) => g.title.toLowerCase().includes($query.toLowerCase()));

  async function launcher(store) {
    await openLauncher(store);
    showToast(`Abriendo launcher de ${store}…`);
  }
</script>

<section class="games">
  <div class="head">
    <h1>Juegos</h1>
    <button class="search" data-focusable data-focus-default tabindex="-1" on:click={runSearch}>
      🔎 {$query ? `"${$query}"` : "Buscar"} <span class="hint">(L3)</span>
    </button>
  </div>

  <div class="filterbar">
    <ButtonPrompt token="LT" />
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
    <ButtonPrompt token="RT" />
  </div>

  <div class="grid-wrap">
    <GameGrid items={filtered} />
  </div>

  <div class="footer">
    <span class="footlabel">Abrir cliente:</span>
    <button class="link" data-focusable tabindex="-1" on:click={() => launcher("steam")}>Steam</button>
    <button class="link" data-focusable tabindex="-1" on:click={() => launcher("gog")}>GOG Galaxy</button>
    <button class="link" data-focusable tabindex="-1" on:click={() => launcher("epic")}>Epic</button>
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
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .head h1 {
    margin: 0;
    font-size: 2.2rem;
    font-weight: var(--gm-title-weight);
  }
  .search {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 600;
  }
  .search:focus {
    box-shadow: var(--gm-focus-ring);
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
  .hint {
    color: var(--gm-text-dim);
    font-size: 0.72rem;
    font-weight: 700;
    opacity: 0.7;
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
    /* Aire para que el grow + anillo no se recorten, dejando un hueco visible
       con el borde (margen negativo pequeño en vez de cancelar el padding). */
    padding: 10px var(--gm-focus-space) var(--gm-focus-space);
    margin: 0 -12px;
    scroll-padding: var(--gm-focus-space);
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 12px;
    border-top: 1px solid var(--gm-surface-2);
    padding-top: 14px;
  }
  .footlabel {
    color: var(--gm-text-dim);
    font-size: 0.9rem;
  }
  .link {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 600;
  }
  .link:focus {
    background: var(--gm-surface-2);
    box-shadow: var(--gm-focus-ring);
  }
</style>
