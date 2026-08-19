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
  import { t, tr } from "../i18n/index.js";

  const isOn = (id) => $enabledStores[id] !== false;
  $: enabledIds = STORE_DEFS.filter((s) => $enabledStores[s.id] !== false).map((s) => s.id);
  const ALIGNS = [
    { id: "left", labelKey: "common.align.left" },
    { id: "center", labelKey: "common.align.center" },
    { id: "right", labelKey: "common.align.right" },
  ];

  async function remove(g) {
    await deleteGroup(g.id);
    showToast(tr("filters.toast.groupDeleted", { name: groupNameNow(g) }));
  }
</script>

<section class="panel">
  <h1>{$t("settings.sections.filters")}</h1>
  <p class="dim">
    {$t("filters.stores.descPre")}<b>{$t("nav.games")}</b>{$t("filters.stores.descPost")}
  </p>

  <h2>{$t("filters.stores.title")}</h2>
  <Select
    multi
    options={STORE_DEFS.map((s) => ({ value: s.id, label: s.label }))}
    values={enabledIds}
    onToggle={(id) => setStoreEnabled(id, !isOn(id))}
  />

  <h2>{$t("filters.storeBarAlign")}</h2>
  <Select value={$filterAlign} options={ALIGNS.map((a) => ({ value: a.id, labelKey: a.labelKey }))} onChange={setFilterAlign} />

  <h2>{$t("filters.cardAlign.title")}</h2>
  <p class="dim">
    {$t("filters.cardAlign.desc")}
  </p>
  <Select value={$cardAlign} options={ALIGNS.map((a) => ({ value: a.id, labelKey: a.labelKey }))} onChange={setCardAlign} />


  <h2>{$t("filters.groups.title")}</h2>
  {#if $groups.length === 0}
    <p class="dim">
      {$t("filters.groups.emptyPre")}<b>{$t("filters.groups.emptyBold")}</b>{$t("filters.groups.emptyPost")}
    </p>
  {:else}
    <div class="rows">
      {#each $groups as g (g.id)}
        <div class="row">
          <span class="label">{$names.group(g)}</span>
          <span class="count">{$t("filters.groupGameCount", { count: g.gameIds.length })}</span>
          <button class="del" data-focusable tabindex="-1" on:click={() => remove(g)}>
            {$t("common.delete")}
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
