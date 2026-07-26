<script>
  import { onlyGames } from "../stores/games.js";
  import { goto, closeOverlay } from "../stores/ui.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { openLauncher } from "../ipc/index.js";
  import { showToast } from "../stores/ui.js";
  import GameGrid from "./GameGrid.svelte";

  const STORES = [
    { id: "all", label: "Todos" },
    { id: "steam", label: "Steam" },
    { id: "gog", label: "GOG" },
    { id: "epic", label: "Epic" },
  ];

  let filter = "all";
  let query = "";

  $: filtered = $onlyGames
    .filter((g) => filter === "all" || g.store === filter)
    .filter((g) => g.title.toLowerCase().includes(query.toLowerCase()));

  async function search() {
    const q = await openKeyboard(query, "Buscar juego");
    if (q !== null) query = q;
  }

  async function launcher(store) {
    await openLauncher(store);
    showToast(`Abriendo launcher de ${store}…`);
  }
</script>

<div class="menu">
  <div class="head">
    <h2>Biblioteca</h2>
    <button class="search" data-focusable data-focus-default tabindex="-1" on:click={search}>
      🔎 {query ? `"${query}"` : "Buscar"}
    </button>
  </div>

  <div class="tabs">
    {#each STORES as s}
      <button
        class="tab"
        class:active={filter === s.id}
        data-focusable
        tabindex="-1"
        on:click={() => (filter = s.id)}
      >
        {s.label}
      </button>
    {/each}
  </div>

  <div class="grid-wrap">
    <GameGrid items={filtered} />
  </div>

  <div class="footer">
    <span class="footlabel">Abrir cliente:</span>
    <button class="link" data-focusable tabindex="-1" on:click={() => launcher("steam")}>Steam</button>
    <button class="link" data-focusable tabindex="-1" on:click={() => launcher("gog")}>GOG Galaxy</button>
    <button class="link" data-focusable tabindex="-1" on:click={() => launcher("epic")}>Epic</button>
    <span class="spacer"></span>
    <button
      class="link"
      data-focusable
      tabindex="-1"
      on:click={() => {
        closeOverlay();
        goto("settings");
      }}
    >
      ⚙ Ajustes
    </button>
  </div>
</div>

<style>
  .menu {
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
  .head h2 {
    margin: 0;
    font-size: 1.8rem;
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
  .tabs {
    display: flex;
    gap: 10px;
  }
  .tab {
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
  .spacer {
    flex: 1;
  }
</style>
