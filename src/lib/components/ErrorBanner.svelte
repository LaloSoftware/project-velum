<script>
  import { appError, clearAppError } from "../stores/ui.js";
  import { t } from "../i18n/index.js";
</script>

{#if $appError}
  <div class="err">
    <div class="head">
      <span class="tag">⚠ {$t("error.label")}{$appError.ctx ? ` · ${$appError.ctx}` : ""}</span>
      <button class="close" data-focusable tabindex="-1" on:click={clearAppError}>
        {$t("error.close")}
      </button>
    </div>
    <p class="msg">{$appError.msg}</p>
    {#if $appError.stack}
      <pre class="stack">{$appError.stack}</pre>
    {/if}
  </div>
{/if}

<style>
  .err {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: min(760px, calc(100% - 32px));
    max-height: 46%;
    overflow-y: auto;
    background: #2a0f12;
    border: 1px solid #b23a3a;
    color: #ffd9d9;
    border-radius: var(--gm-radius);
    padding: 14px 18px;
    z-index: 200;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .tag {
    font-weight: 800;
  }
  .close {
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: inherit;
    font-weight: 700;
    font-size: 0.8rem;
  }
  .close:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .msg {
    margin: 10px 0 0;
    font-weight: 600;
    white-space: pre-wrap;
  }
  .stack {
    margin: 10px 0 0;
    font-size: 0.72rem;
    line-height: 1.4;
    white-space: pre-wrap;
    opacity: 0.85;
  }
</style>
