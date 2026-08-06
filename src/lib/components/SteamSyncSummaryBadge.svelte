<script>
  import {
    steamSyncing,
    steamSyncSummary,
    syncSummaryExpanded,
    toggleSyncSummaryExpanded,
    dismissSyncSummary,
  } from "../stores/steamAccount.js";

  // El detalle (log de errores) se abre/cierra con click o con el combo de
  // mando Home+L3 (App.svelte, mientras el badge esté vivo) — mismo estado
  // compartido (syncSummaryExpanded), no es un modal que bloquee el resto.
  function close() {
    dismissSyncSummary();
  }
</script>

{#if $steamSyncSummary && !$steamSyncing}
  <div class="summary">
    <button class="row" on:click={toggleSyncSummaryExpanded}>
      <span class="dot" class:err={$steamSyncSummary.errors.length}></span>
      <div class="lines">
        <div>
          Logros actualizados: {$steamSyncSummary.achievementsSynced}/{$steamSyncSummary.withAchievementsTotal}
        </div>
        <div>
          Escaneados: {$steamSyncSummary.scanned}/{$steamSyncSummary.total} · Nuevos:
          {$steamSyncSummary.newSchemasScanned}/{$steamSyncSummary.newSchemasTotal}
        </div>
        {#if $steamSyncSummary.errors.length}
          <div class="errline">Errores en el proceso: {$steamSyncSummary.errors.length}</div>
        {/if}
      </div>
    </button>

    {#if $syncSummaryExpanded}
      <div class="detail">
        <div class="detail-head">
          <span>Detalle de la sincronización</span>
          <button class="close" on:click={close}>✕</button>
        </div>
        {#if $steamSyncSummary.errors.length}
          <div class="errors">
            {#each $steamSyncSummary.errors as e (e.appid)}
              <div class="errrow">
                <span class="appid">appid {e.appid}</span>
                <span class="msg">{e.message}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="dim">Sin errores en esta sincronización.</p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .summary {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 90;
    max-width: 320px;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }
  .row {
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    color: var(--gm-text);
    font-size: 0.8rem;
  }
  .dot {
    flex-shrink: 0;
    margin-top: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gm-success);
  }
  .dot.err {
    background: var(--gm-danger);
  }
  .lines {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .errline {
    color: var(--gm-danger);
    font-weight: 700;
  }
  .detail {
    border-top: 1px solid var(--gm-surface-2);
    padding: 10px 14px 14px;
    max-height: 220px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .detail-head {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--gm-text-dim);
    margin-bottom: 8px;
  }
  .close {
    cursor: pointer;
    color: var(--gm-text-dim);
    padding: 2px 6px;
  }
  .close:hover {
    color: var(--gm-text);
  }
  .errors {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .errrow {
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 6px 10px;
    font-size: 0.76rem;
  }
  .appid {
    display: block;
    font-weight: 700;
    color: var(--gm-text-dim);
  }
  .msg {
    display: block;
    color: var(--gm-text);
    word-break: break-word;
  }
  .dim {
    color: var(--gm-text-dim);
    font-size: 0.78rem;
    margin: 0;
  }
</style>
