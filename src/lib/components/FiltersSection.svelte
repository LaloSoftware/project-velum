<script>
  import {
    STORE_DEFS,
    enabledStores,
    setStoreEnabled,
    filterAlign,
    setFilterAlign,
    cardAlign,
    setCardAlign,
  } from "../stores/library.js";
  import { groups, deleteGroup } from "../stores/groups.js";
  import { showToast } from "../stores/ui.js";
  import Select from "./Select.svelte";
  import { names, groupNameNow } from "../i18n/names.js";

  const isOn = (id) => $enabledStores[id] !== false;
  $: enabledIds = STORE_DEFS.filter((s) => $enabledStores[s.id] !== false).map((s) => s.id);
  const ALIGNS = [
    { id: "left", label: "Izquierda" },
    { id: "center", label: "Centro" },
    { id: "right", label: "Derecha" },
  ];

  async function remove(g) {
    await deleteGroup(g.id);
    showToast(`Grupo «${groupNameNow(g)}» eliminado`);
  }
</script>

<section class="panel">
  <h1>Filtros de biblioteca</h1>
  <p class="dim">
    Activa o desactiva los filtros de tienda en la pestaña <b>Juegos</b>. Al desactivar
    uno, se oculta su chip de filtro y sus juegos dejan de aparecer allí.
  </p>

  <h2>Tiendas mostradas</h2>
  <Select
    multi
    options={STORE_DEFS.map((s) => ({ value: s.id, label: s.label }))}
    values={enabledIds}
    onToggle={(id) => setStoreEnabled(id, !isOn(id))}
  />

  <h2>Alineación de la barra de filtros</h2>
  <Select value={$filterAlign} options={ALIGNS.map((a) => ({ value: a.id, label: a.label }))} onChange={setFilterAlign} />

  <h2>Alineación de las tarjetas</h2>
  <p class="dim">
    Hacia qué lado se agrupan las tarjetas en Juegos y Aplicaciones. El espaciado entre
    ellas no cambia.
  </p>
  <Select value={$cardAlign} options={ALIGNS.map((a) => ({ value: a.id, label: a.label }))} onChange={setCardAlign} />


  <h2>Grupos personalizados</h2>
  {#if $groups.length === 0}
    <p class="dim">
      Aún no tienes grupos. Créalos desde el <b>detalle de un juego</b> (botón
      «Nuevo grupo»); aparecerán como filtro en la pestaña Juegos.
    </p>
  {:else}
    <div class="rows">
      {#each $groups as g (g.id)}
        <div class="row">
          <span class="label">{$names.group(g)}</span>
          <span class="count">{g.gameIds.length} juego{g.gameIds.length === 1 ? "" : "s"}</span>
          <button class="del" data-focusable tabindex="-1" on:click={() => remove(g)}>
            Eliminar
          </button>
        </div>
      {/each}
    </div>
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
    gap: 14px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .label {
    flex: 1;
    font-weight: 700;
  }
  h2 {
    font-size: 1.1rem;
    margin: 26px 0 12px;
  }
  .count {
    color: var(--gm-text-dim);
    font-size: 0.85rem;
  }
  .del {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-danger);
    font-weight: 700;
  }
  .del:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
