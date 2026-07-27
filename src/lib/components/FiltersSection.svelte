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

  const isOn = (id) => $enabledStores[id] !== false;
  const ALIGNS = [
    { id: "left", label: "Izquierda" },
    { id: "center", label: "Centro" },
    { id: "right", label: "Derecha" },
  ];

  async function remove(g) {
    await deleteGroup(g.id);
    showToast(`Grupo «${g.name}» eliminado`);
  }
</script>

<section class="panel">
  <h1>Filtros de biblioteca</h1>
  <p class="dim">
    Activa o desactiva los filtros de tienda en la pestaña <b>Juegos</b>. Al desactivar
    uno, se oculta su chip de filtro y sus juegos dejan de aparecer allí.
  </p>

  <div class="rows">
    {#each STORE_DEFS as s, i}
      <div class="row">
        <span class="label">{s.label}</span>
        <button
          class="toggle"
          class:on={isOn(s.id)}
          data-focusable
          data-focus-default={i === 0 ? "" : undefined}
          tabindex="-1"
          on:click={() => setStoreEnabled(s.id, !isOn(s.id))}
        >
          {isOn(s.id) ? "ON" : "OFF"}
        </button>
      </div>
    {/each}
  </div>

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
          <span class="label">{g.name}</span>
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
  .toggle {
    cursor: pointer;
    min-width: 66px;
    padding: 10px 0;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 800;
  }
  .toggle.on {
    background: var(--gm-success);
    color: #04140d;
  }
  .toggle:focus {
    box-shadow: var(--gm-focus-ring);
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
