<script>
  import { achievementsModal, closeAchievements } from "../stores/ui.js";
  import { loadAchievements, globalPctMaxAgeSecs } from "../stores/steamAccount.js";
  import { steamGlobalAchievementPercentages } from "../ipc/index.js";

  $: appid = $achievementsModal?.appid;
  $: title = $achievementsModal?.title;

  let list = [];
  let listFor = null;
  $: if (appid && appid !== listFor) {
    listFor = appid;
    loadAchievements(appid).then((l) => (list = l));
  }

  // % global (rareza) — opcional, bajo demanda ("Ver % global"), no se pide
  // hasta que el jugador lo quiere ver (mismo criterio que el usuario pidió).
  let showGlobal = false;
  let globalPct = {}; // apiname -> percent
  let globalFor = null;
  let loadingGlobal = false;
  async function toggleGlobal() {
    showGlobal = !showGlobal;
    if (showGlobal && appid !== globalFor) {
      globalFor = appid;
      loadingGlobal = true;
      try {
        const rows = await steamGlobalAchievementPercentages(appid, globalPctMaxAgeSecs());
        globalPct = Object.fromEntries(rows.map((r) => [r.apiname, r.percent]));
      } catch {
        globalPct = {};
      } finally {
        loadingGlobal = false;
      }
    }
  }
</script>

{#if $achievementsModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={closeAchievements} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Logros">
    <header class="head">
      <h2>Logros — {title}</h2>
      <button class="stats-toggle" data-focusable tabindex="-1" on:click={toggleGlobal}>
        {showGlobal ? "Ocultar % global" : "Ver % global"}
      </button>
    </header>

    <div class="body">
      {#each list as a (a.apiname)}
        <div class="ach" class:locked={!a.achieved}>
          {#if a.iconUrl}<img class="ach-icon" src={a.iconUrl} alt="" />{/if}
          <div class="ach-text">
            <div class="ach-name">{a.displayName || a.apiname}</div>
            {#if a.description}<div class="ach-desc dim">{a.description}</div>{/if}
            {#if showGlobal}
              <div class="ach-global dim">
                {#if loadingGlobal}
                  cargando %…
                {:else if globalPct[a.apiname] != null}
                  {globalPct[a.apiname].toFixed(1)}% de los jugadores lo tienen
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <p class="dim">Sin logros sincronizados todavía — sincroniza desde Configuración → Cuentas.</p>
      {/each}
    </div>

    <footer class="actions">
      <button class="done" data-focusable data-focus-default tabindex="-1" on:click={closeAchievements}>
        Listo
      </button>
    </footer>
  </div>
{/if}

<style>
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
    width: min(620px, 94vw);
    max-height: 82vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 24px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  }
  .head {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .head h2 {
    flex: 1;
    margin: 0;
    font-size: 1.3rem;
    font-weight: var(--gm-title-weight);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stats-toggle {
    cursor: pointer;
    flex: 0 0 auto;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 0.82rem;
    white-space: nowrap;
  }
  .stats-toggle:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  /* Único elemento con scroll: la lista de logros. Título/botones quedan
     fijos (pedido explícito, para no romper la UI al escalar). */
  .body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    margin: 18px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .actions {
    flex: 0 0 auto;
    display: flex;
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
  .dim {
    color: var(--gm-text-dim);
  }
  .ach {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 8px 12px;
  }
  .ach.locked {
    opacity: 0.5;
  }
  .ach-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .ach-name {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .ach-desc,
  .ach-global {
    font-size: 0.8rem;
  }
</style>
