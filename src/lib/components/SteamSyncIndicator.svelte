<script>
  import { steamSyncing, steamSyncProgress } from "../stores/steamAccount.js";
  import { t } from "../i18n/index.js";

  $: pct = $steamSyncProgress && $steamSyncProgress.total
    ? Math.round(($steamSyncProgress.done / $steamSyncProgress.total) * 100)
    : null;
</script>

{#if $steamSyncing}
  <div class="indicator" role="status" aria-live="polite">
    <span class="dot"></span>
    <span class="label">
      {#if $steamSyncProgress}
        {$t("steamSync.progress", { done: $steamSyncProgress.done, total: $steamSyncProgress.total })}
      {:else}
        {$t("steamSync.library")}
      {/if}
    </span>
    {#if pct !== null}
      <div class="bar"><div class="fill" style="width: {pct}%"></div></div>
    {/if}
  </div>
{/if}

<style>
  .indicator {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 90;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-bg-elev);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    font-size: 0.8rem;
    color: var(--gm-text);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gm-accent);
    animation: pulse 1.2s ease-in-out infinite;
  }
  .bar {
    width: 60px;
    height: 4px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--gm-accent);
    transition: width 0.2s ease;
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
</style>
