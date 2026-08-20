<script>
  import { appError, clearAppError } from "../stores/ui.js";
  import { t } from "../i18n/index.js";
  import ButtonPrompt from "./ButtonPrompt.svelte";
</script>

{#if $appError}
  <div class="err">
    <div class="head">
      <span class="tag">⚠ {$t("error.label")}{$appError.ctx ? ` · ${$appError.ctx}` : ""}</span>
      <!--
        El indicador va por ButtonPrompt y no como "(B)" escrito a mano: así
        muestra el icono del set elegido, y sobre todo respeta el binding real
        — quien haya reasignado "Volver" vería una tecla que no es la suya.
        En teclado/ratón se cambia solo por el atajo configurado (Esc).
        `handleBack()` cierra el banner antes que nada (App.svelte), así que la
        pista es cierta en cualquier pantalla.
      -->
      <button class="close" data-focusable tabindex="-1" on:click={clearAppError}>
        <ButtonPrompt token="B" button="east" action="back" />
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
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: inherit;
    font-weight: 700;
    font-size: 0.85rem;
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
    font-size: 0.85rem;
    line-height: 1.4;
    white-space: pre-wrap;
    opacity: 0.85;
  }
</style>
