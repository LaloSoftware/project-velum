<script>
  import { filtersModal, closeFilters } from "../stores/ui.js";
  import { onlyGames, onlyApps } from "../stores/games.js";
  import {
    filterList,
    activeFilter,
    setFilter,
    installFilter,
    INSTALL_FILTER_OPTIONS,
    setInstallFilter,
  } from "../stores/library.js";
  import {
    sortGames,
    sortApps,
    setSortGames,
    setSortApps,
    sortOptionsFor,
  } from "../stores/sorting.js";
  import { t } from "../i18n/index.js";

  $: scope = $filtersModal?.scope || "games";
  $: list = scope === "apps" ? $onlyApps : $onlyGames;
  $: options = sortOptionsFor(scope, list);
  $: currentSort = scope === "apps" ? $sortApps : $sortGames;
  $: showCategories = scope === "games";

  function pickSort(id) {
    if (scope === "apps") setSortApps(id);
    else setSortGames(id);
  }

  function pickCategory(id) {
    setFilter(id);
    closeFilters();
  }
</script>

{#if $filtersModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={closeFilters} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label={$t("filters.title")}>
    <header class="head">
      <h2>{$t("filters.title")}</h2>
      <span class="scope">{scope === "apps" ? $t("nav.apps") : $t("nav.games")}</span>
    </header>

    <div class="body">
      {#if showCategories}
        <section class="block">
          <h3>{$t("filters.category")}</h3>
          <div class="cats">
            {#each $filterList as c (c.id)}
              <button
                class="cat"
                class:sel={$activeFilter === c.id}
                data-focusable
                data-focus-default={$activeFilter === c.id ? "" : undefined}
                tabindex="-1"
                on:click={() => pickCategory(c.id)}
              >
                {c.label}
              </button>
            {/each}
          </div>
        </section>

        <section class="block">
          <h3>{$t("filters.installation")}</h3>
          <div class="cats">
            {#each INSTALL_FILTER_OPTIONS as o (o.value)}
              <button
                class="cat"
                class:sel={$installFilter === o.value}
                data-focusable
                tabindex="-1"
                on:click={() => setInstallFilter(o.value)}
              >
                {$t(o.labelKey)}
              </button>
            {/each}
          </div>
        </section>
      {/if}

      <section class="block">
        <h3>{$t("filters.sortBy")}</h3>
        <div class="sorts">
          {#each options as o (o.id)}
            <button
              class="sort"
              class:sel={currentSort === o.id}
              data-focusable
              data-focus-default={!showCategories && currentSort === o.id ? "" : undefined}
              tabindex="-1"
              on:click={() => pickSort(o.id)}
            >
              <span class="s-label">{$t(o.labelKey)}</span>
              {#if currentSort === o.id}<span class="tick">✓</span>{/if}
            </button>
          {/each}
        </div>
      </section>
    </div>

    <footer class="actions">
      <button class="done" data-focusable tabindex="-1" on:click={closeFilters}>{$t("common.done")}</button>
    </footer>
  </div>
{/if}

<style>
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--gm-bg-overlay);
    z-index: 62;
  }
  .modal {
    position: absolute;
    z-index: 63;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(620px, 94vw);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 24px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .head h2 {
    flex: 1;
    margin: 0;
    font-size: 1.4rem;
    font-weight: var(--gm-title-weight);
  }
  .scope {
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 0.9rem;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 22px;
    margin-top: 20px;
  }
  .block h3 {
    margin: 0 0 12px;
    font-size: 1.05rem;
    color: var(--gm-text-dim);
  }
  .cats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .cat {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .cat.sel {
    background: var(--gm-accent);
    color: #06101f;
  }
  .cat:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .cat.sel:focus {
    color: #06101f;
  }
  .sorts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sort {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
    padding: 12px 16px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 600;
  }
  .sort.sel {
    color: var(--gm-accent-2);
  }
  .sort:focus {
    background: var(--gm-surface-2);
    box-shadow: var(--gm-focus-ring);
  }
  .tick {
    color: var(--gm-accent-2);
    font-weight: 800;
  }
  .actions {
    display: flex;
    margin-top: 22px;
  }
  .done {
    cursor: pointer;
    flex: 1;
    padding: 13px 0;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 800;
  }
  .done:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
