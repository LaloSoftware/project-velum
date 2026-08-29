<script>
  import { onDestroy } from "svelte";
  import { griddbModal, closeGriddbModal, showToast } from "../stores/ui.js";
  import { games } from "../stores/games.js";
  import {
    GRIDDB_SLOTS,
    GRIDDB_STYLES,
    GRIDDB_MIMES,
    griddbKeyLinked,
    globalFilters,
    slotFilters,
    setGlobalFilter,
    setSlotFilter,
    resolveGriddbGame,
    searchGriddbGames,
    chooseGriddbGame,
    fetchGriddbImages,
    importGriddbImage,
  } from "../stores/griddb.js";
  import { errorMessage } from "../i18n/errors.js";
  import { t, tr } from "../i18n/index.js";

  /*
   * Selector de arte de SteamGridDB (Fase 3, feature-imagenes.md). Un solo
   * componente para los 3 endpoints (grids/heroes/logos) en vez de un modal
   * por slot — misma forma (barra de filtros fija arriba + grilla paginada de
   * thumbs), solo cambian los filtros disponibles según GRIDDB_SLOTS. El slot
   * queda fijo durante toda la vida del modal (se abre desde el botón de ESE
   * slot en ArtEditor); no hay forma de cambiarlo desde adentro.
   */

  $: gameId = $griddbModal?.gameId;
  $: slot = $griddbModal?.slot;
  $: game = $games.find((g) => g.id === gameId) || null;
  $: slotCfg = slot ? GRIDDB_SLOTS[slot] : null;

  // --- Resolución del juego (por plataforma, o búsqueda a mano) ---
  let sgdbGame = null; // { id, name } | null
  let resolvingGame = false;
  let resolveErr = null;
  let searchMode = false;
  let searchTerm = "";
  let searchResults = [];
  let searching = false;
  let searchErr = null;

  // Colapsados por defecto: la barra completa de filtros no debe comerse el
  // espacio de la grilla de resultados apenas se abre el modal.
  let filtersExpanded = false;

  let resolvedFor = null; // gameId ya intentado, para no repetir al re-renderizar
  $: if ($griddbKeyLinked && game && game.id !== resolvedFor) {
    resolvedFor = game.id;
    resolveGame();
  }

  async function resolveGame() {
    resolvingGame = true;
    sgdbGame = null;
    resolveErr = null;
    try {
      const found = await resolveGriddbGame(game);
      // `null` = "no hay mapeo de plataforma" o "SteamGridDB confirmó que no
      // existe ese id externo" — casos normales, se cae al buscador sin más.
      // Un `throw` en cambio es un problema real (key inválida, red) que NO
      // se debe esconder detrás del buscador: ese también fallaría por el
      // mismo motivo, y sin el error a la vista parecería un bug distinto.
      if (found) sgdbGame = found;
      else enterSearchMode();
    } catch (e) {
      resolveErr = e;
    } finally {
      resolvingGame = false;
    }
  }

  function enterSearchMode() {
    searchMode = true;
    searchTerm = game?.title || "";
    runSearch();
  }

  async function runSearch() {
    const term = searchTerm.trim();
    if (!term) return;
    searching = true;
    searchErr = null;
    try {
      searchResults = await searchGriddbGames(term);
    } catch (e) {
      searchErr = e;
      searchResults = [];
    } finally {
      searching = false;
    }
  }

  async function pickGame(g) {
    await chooseGriddbGame(game.id, g);
    sgdbGame = g;
    searchMode = false;
  }

  // --- Filtros ---
  // Cambiar cualquier filtro vuelve a página 0 — quedarse en, digamos, la
  // página 3 de un resultado que ahora tiene menos páginas dejaría la grilla
  // vacía sin explicación. Se resetea ANTES de tocar el store (setGlobalFilter/
  // setSlotFilter), así el bloque reactivo de abajo ve el page correcto desde
  // el primer cálculo de la clave de fetch.
  let page = 0;

  function toggleCategory(key) {
    page = 0;
    setGlobalFilter(key, $globalFilters[key] === "false" ? "any" : "false");
  }
  function toggleAnimated() {
    page = 0;
    setGlobalFilter("animated", !$globalFilters.animated);
  }
  function toggleStyle(s) {
    page = 0;
    const list = $slotFilters[slot]?.styles || [];
    setSlotFilter(slot, "styles", list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);
  }
  function toggleDimension(d) {
    page = 0;
    const list = $slotFilters[slot]?.dimensions || [];
    setSlotFilter(slot, "dimensions", list.includes(d) ? list.filter((x) => x !== d) : [...list, d]);
  }
  function toggleMime(m) {
    page = 0;
    const list = $slotFilters[slot]?.mimes || [];
    setSlotFilter(slot, "mimes", list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);
  }

  // --- Imágenes ---
  let results = null; // { page, total, limit, items } | null
  let loadingImages = false;
  let imagesErr = null;
  let imagesFor = null;
  let debounceTimer = null;

  // Debounce de 220ms sobre el FETCH (no sobre el store, que ya persiste su
  // propio patch de inmediato) — cortesía básica con una API gratuita:
  // encadenar varios toggles de filtro rápido no dispara una petición por
  // click. fetchGriddbImages() ya cachea en memoria por clave exacta.
  $: imagesKey = sgdbGame ? JSON.stringify([sgdbGame.id, slot, $globalFilters, $slotFilters[slot], page]) : null;
  $: if (imagesKey && imagesKey !== imagesFor) {
    imagesFor = imagesKey;
    const gid = sgdbGame.id;
    const s = slot;
    const p = page;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadImages(gid, s, p), 220);
  }
  onDestroy(() => clearTimeout(debounceTimer));

  async function loadImages(gid, s, p) {
    loadingImages = true;
    imagesErr = null;
    try {
      results = await fetchGriddbImages(s, gid, p);
    } catch (e) {
      imagesErr = e;
      results = null;
    } finally {
      loadingImages = false;
    }
  }

  $: totalPages = results ? Math.max(1, Math.ceil(results.total / (results.limit || 50))) : 1;
  // Nunca `disabled` nativo (rompería el foco por mando) — el guard vive acá,
  // el markup solo atenúa visualmente con class:disabled.
  function prevPage() {
    if (page > 0) page -= 1;
  }
  function nextPage() {
    if (page + 1 < totalPages) page += 1;
  }

  // --- Elegir imagen ---
  let importing = false;
  async function chooseImage(img) {
    if (importing) return;
    importing = true;
    try {
      await importGriddbImage(game.id, slot, img);
      showToast(tr("griddb.toast.imported"));
      closeGriddbModal();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      importing = false;
    }
  }

  const styleLabel = (s) => tr(`griddb.style.${s}`);
  const mimeLabel = (m) => tr(`griddb.mime.${m.split("/")[1] || m}`);
</script>

{#if $griddbModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={closeGriddbModal} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label={$t("griddb.modal.aria")}>
    <header class="head">
      <div class="head-top">
        <h2>
          {$t("griddb.modal.heading", {
            slot: slot ? $t(`art.slots.${slot}.label`) : "",
            title: game?.title || "",
          })}
        </h2>
        <button
          class="close"
          data-focusable
          tabindex="-1"
          aria-label={$t("common.close")}
          on:click={closeGriddbModal}
        >
          ✕
        </button>
      </div>

      {#if !$griddbKeyLinked}
        <p class="hint">{$t("griddb.modal.noKey")}</p>
      {:else if searchMode}
        <div class="search-row">
          <input
            class="search-input"
            type="text"
            bind:value={searchTerm}
            placeholder={$t("griddb.search.placeholder")}
            data-focusable
            tabindex="-1"
            on:keydown={(e) => e.key === "Enter" && runSearch()}
          />
          <button class="chip" data-focusable tabindex="-1" on:click={runSearch}>
            {$t("griddb.search.action")}
          </button>
        </div>
      {:else if sgdbGame && slotCfg}
        <!-- Colapsados por defecto: la barra de filtros completa ocupaba
             mucho alto fijo (header no scrollea) a costa del espacio real
             de la grilla de resultados. -->
        <button
          class="filters-toggle"
          data-focusable
          tabindex="-1"
          aria-expanded={filtersExpanded}
          on:click={() => (filtersExpanded = !filtersExpanded)}
        >
          {filtersExpanded ? "▾" : "▸"} {$t("griddb.filter.toggle")}
        </button>
      {/if}
      {#if $griddbKeyLinked && !searchMode && sgdbGame && slotCfg && filtersExpanded}
        <div class="filters">
          <div class="filter-row">
            <button
              class="toggle"
              class:on={$globalFilters.nsfw !== "false"}
              data-focusable
              tabindex="-1"
              on:click={() => toggleCategory("nsfw")}
            >
              {$t("griddb.filter.nsfw")}
            </button>
            <button
              class="toggle"
              class:on={$globalFilters.humor !== "false"}
              data-focusable
              tabindex="-1"
              on:click={() => toggleCategory("humor")}
            >
              {$t("griddb.filter.humor")}
            </button>
            <button
              class="toggle"
              class:on={$globalFilters.epilepsy !== "false"}
              data-focusable
              tabindex="-1"
              on:click={() => toggleCategory("epilepsy")}
            >
              {$t("griddb.filter.epilepsy")}
            </button>
            <button
              class="toggle"
              class:on={$globalFilters.animated}
              data-focusable
              tabindex="-1"
              on:click={toggleAnimated}
            >
              {$t("griddb.filter.animated")}
            </button>
          </div>
          <div class="filter-row">
            <span class="filter-label">{$t("griddb.filter.styles")}</span>
            {#each GRIDDB_STYLES[slotCfg.kind] as s (s)}
              <button
                class="chip small"
                class:on={($slotFilters[slot]?.styles || []).includes(s)}
                data-focusable
                tabindex="-1"
                on:click={() => toggleStyle(s)}
              >
                {styleLabel(s)}
              </button>
            {/each}
          </div>
          {#if slotCfg.dims}
            <div class="filter-row">
              <span class="filter-label">{$t("griddb.filter.dimensions")}</span>
              {#each slotCfg.dims as d (d)}
                <button
                  class="chip small"
                  class:on={($slotFilters[slot]?.dimensions || []).includes(d)}
                  data-focusable
                  tabindex="-1"
                  on:click={() => toggleDimension(d)}
                >
                  {d.replace("x", " × ")}
                </button>
              {/each}
            </div>
          {/if}
          <div class="filter-row">
            <span class="filter-label">{$t("griddb.filter.mimes")}</span>
            {#each GRIDDB_MIMES[slotCfg.kind] as m (m)}
              <button
                class="chip small"
                class:on={($slotFilters[slot]?.mimes || []).includes(m)}
                data-focusable
                tabindex="-1"
                on:click={() => toggleMime(m)}
              >
                {mimeLabel(m)}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </header>

    <div class="body">
      {#if !$griddbKeyLinked}
        <!-- Sin key: solo el aviso de la cabecera, nada más que mostrar. -->
      {:else if searchMode}
        {#if searching}
          <p class="dim">{$t("griddb.search.searching")}</p>
        {:else if searchErr}
          <p class="dim">{errorMessage(searchErr)}</p>
        {:else if !searchResults.length}
          <p class="dim">{$t("griddb.search.empty")}</p>
        {:else}
          <div class="game-results">
            {#each searchResults as g, i (g.id)}
              <button
                class="game-result"
                data-focusable
                data-focus-default={i === 0 ? "" : undefined}
                tabindex="-1"
                on:click={() => pickGame(g)}
              >
                {g.name}
              </button>
            {/each}
          </div>
        {/if}
      {:else if resolvingGame}
        <p class="dim">{$t("griddb.modal.resolving")}</p>
      {:else if resolveErr}
        <p class="dim">{errorMessage(resolveErr)}</p>
      {:else if sgdbGame}
        {#if loadingImages && !results}
          <p class="dim">{$t("griddb.images.loading")}</p>
        {:else if imagesErr}
          <p class="dim">{errorMessage(imagesErr)}</p>
        {:else if results && !results.items.length}
          <p class="dim">{$t("griddb.images.empty")}</p>
        {:else if results}
          <!-- Columnas anchas/angostas según la forma real del slot (menos
               columnas en hero/wide, más en cover) — ver el porqué en
               stores/griddb.js::GRIDDB_SLOTS. -->
          <div
            class="grid"
            class:loading={loadingImages}
            style="grid-template-columns: repeat(auto-fill, minmax({slotCfg.minCol}px, 1fr));"
          >
            {#each results.items as img, i (img.id)}
              <button
                class="thumb-btn"
                class:busy={importing}
                data-focusable
                data-focus-default={i === 0 ? "" : undefined}
                tabindex="-1"
                on:click={() => chooseImage(img)}
              >
                <img
                  class="thumb-img"
                  style="aspect-ratio: {slotCfg.aspect}; object-fit: {slotCfg.fit};"
                  src={img.thumb}
                  alt=""
                  loading="lazy"
                />
                <div class="thumb-meta">
                  <span class="thumb-score">▲ {img.score}</span>
                  {#if img.author?.name}<span class="thumb-author dim">{img.author.name}</span>{/if}
                </div>
              </button>
            {/each}
          </div>
          {#if totalPages > 1}
            <div class="pager">
              <button
                class="chip small"
                class:disabled={page === 0}
                data-focusable
                tabindex="-1"
                on:click={prevPage}
              >
                {$t("griddb.pager.prev")}
              </button>
              <span class="pager-label">{$t("griddb.pager.page", { page: page + 1, total: totalPages })}</span>
              <button
                class="chip small"
                class:disabled={page + 1 >= totalPages}
                data-focusable
                tabindex="-1"
                on:click={nextPage}
              >
                {$t("griddb.pager.next")}
              </button>
            </div>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Mismo shell que AchievementsModal.svelte: scrim + modal centrado, tamaño
     fijo pensado para 1080p, header fijo + body con scroll. */
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--gm-bg-overlay);
    z-index: 72;
  }
  .modal {
    position: absolute;
    z-index: 73;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 960px;
    max-width: 92vw;
    height: 720px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 24px 28px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  }
  .head {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .head-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .head-top h2 {
    flex: 1;
    margin: 0;
    font-size: 1.15rem;
    font-weight: var(--gm-title-weight);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .close {
    cursor: pointer;
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-size: 1rem;
    line-height: 1;
  }
  .close:hover {
    color: var(--gm-text);
  }
  .close:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .hint {
    color: var(--gm-text-dim);
    font-size: 0.88rem;
  }
  .search-row {
    display: flex;
    gap: 10px;
  }
  .search-input {
    flex: 1;
    background: var(--gm-surface);
    color: var(--gm-text);
    border-radius: var(--gm-radius);
    padding: 8px 14px;
    font-size: 0.9rem;
  }
  .search-input:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .filter-label {
    color: var(--gm-text-dim);
    font-size: 0.78rem;
    font-weight: 700;
    min-width: 70px;
  }
  .toggle,
  .chip {
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 0.78rem;
    white-space: nowrap;
  }
  .chip.small {
    padding: 5px 10px;
    font-size: 0.74rem;
  }
  .toggle.on,
  .chip.on {
    background: var(--gm-accent);
    color: #06101f;
  }
  .toggle:focus,
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  /* Paginación agotada en ese extremo — atenuado, nunca `disabled` nativo
     (prevPage/nextPage ya guardan el límite por su cuenta). */
  .chip.disabled {
    opacity: 0.4;
  }
  .filters-toggle {
    cursor: pointer;
    align-self: flex-start;
    padding: 4px 10px;
    border-radius: 999px;
    background: transparent;
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 0.78rem;
  }
  .filters-toggle:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }

  .body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    margin-top: 18px;
    padding: 4px 4px 10px;
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .game-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .game-result {
    cursor: pointer;
    text-align: left;
    background: var(--gm-surface);
    color: var(--gm-text);
    border-radius: var(--gm-radius);
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  .game-result:focus {
    box-shadow: var(--gm-focus-ring);
  }

  .grid {
    display: grid;
    /* grid-template-columns real viene inline por slot (GRIDDB_SLOTS.minCol
       en stores/griddb.js) — cover angosto, hero/wide bien anchos. */
    gap: 14px;
  }
  .grid.loading {
    opacity: 0.6;
  }
  .thumb-btn {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    overflow: hidden;
    text-align: left;
  }
  .thumb-btn.busy {
    opacity: 0.6;
  }
  .thumb-btn:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .thumb-img {
    width: 100%;
    /* aspect-ratio y object-fit reales vienen inline por slot (GRIDDB_SLOTS
       en stores/griddb.js) — el fondo es el "letterbox" cuando el thumb de
       SteamGridDB (documentado como 380×178 para los 3 endpoints) no llena
       la caja del todo con object-fit:contain. */
    background: var(--gm-surface-2);
  }
  .thumb-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    font-size: 0.72rem;
  }
  .thumb-score {
    font-weight: 700;
    color: var(--gm-accent-2);
  }
  .thumb-author {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 16px;
  }
  .pager-label {
    color: var(--gm-text-dim);
    font-size: 0.8rem;
    font-weight: 700;
  }
</style>
