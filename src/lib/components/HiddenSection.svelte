<script>
  import { games } from "../stores/games.js";
  import { hidden, unhide } from "../stores/hidden.js";
  import { showToast } from "../stores/ui.js";
  import Select from "./Select.svelte";

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", other: "App" };
  const KIND_OPTIONS = [
    { value: "all", label: "Todos" },
    { value: "game", label: "Juegos" },
    { value: "app", label: "Apps" },
  ];
  let kindFilter = "all";

  $: hiddenItems = $games.filter((g) => $hidden.includes(g.id));
  $: items = hiddenItems.filter((g) => kindFilter === "all" || g.kind === kindFilter);

  async function show(g) {
    await unhide(g.id);
    showToast(`«${g.title}» visible de nuevo`);
  }
</script>

<section class="panel">
  <h1>Ocultos</h1>
  <p class="dim">
    Juegos y apps ocultos de la interfaz. Este es el único sitio para volver a mostrarlos.
  </p>

  {#if hiddenItems.length === 0}
    <p class="dim empty">No hay elementos ocultos.</p>
  {:else}
    <div class="filter">
      <Select
        label="Mostrar"
        value={kindFilter}
        options={KIND_OPTIONS}
        onChange={(v) => (kindFilter = v)}
      />
    </div>
    {#if items.length === 0}
      <p class="dim empty">No hay elementos ocultos en esta categoría.</p>
    {:else}
      <div class="rows">
        {#each items as g, i (g.id)}
          <div class="row">
            <span class="label">{g.title}</span>
            <span class="store">{STORE_LABEL[g.store] || g.store}</span>
            <button
              class="show"
              data-focusable
              data-focus-default={i === 0 ? "" : undefined}
              tabindex="-1"
              on:click={() => show(g)}
            >
              Mostrar
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .panel {
    padding: var(--gm-pad);
    height: 100%;
    overflow-y: auto;
    max-width: 640px;
  }
  h1 {
    font-size: 2rem;
    font-weight: var(--gm-title-weight);
    margin: 0 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
  }
  .filter {
    margin-top: 18px;
    max-width: 260px;
  }
  .empty {
    margin-top: 22px;
  }
  .rows {
    margin: 22px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .label {
    flex: 1;
    font-weight: 700;
  }
  .store {
    color: var(--gm-text-dim);
    font-size: 0.8rem;
  }
  .show {
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
  }
  .show:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
