<script>
  import { confirmUnlinkSteam, closeConfirmUnlinkSteam } from "../stores/ui.js";
  import { unlinkAccount } from "../stores/steamAccount.js";

  async function desvincular() {
    closeConfirmUnlinkSteam();
    await unlinkAccount();
  }
</script>

{#if $confirmUnlinkSteam}
  <div class="scrim">
    <div class="box" role="alertdialog" aria-modal="true">
      <h2>Desvincular cuenta de Steam</h2>
      <p>
        ¿Seguro que quieres desvincular tu cuenta? Se borra la biblioteca y los
        logros sincronizados de este launcher (tu cuenta de Steam no se ve
        afectada).
      </p>
      <div class="actions">
        <button
          class="btn cancel"
          data-focusable
          data-focus-default
          tabindex="-1"
          on:click={closeConfirmUnlinkSteam}
        >
          Cancelar
        </button>
        <button class="btn del" data-focusable tabindex="-1" on:click={desvincular}>
          Desvincular
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 66;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gm-bg-overlay);
  }
  .box {
    width: min(460px, 92vw);
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 26px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  h2 {
    margin: 0 0 10px;
    font-size: 1.4rem;
    font-weight: var(--gm-title-weight);
  }
  p {
    color: var(--gm-text-dim);
    margin: 0 0 22px;
  }
  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  .btn {
    cursor: pointer;
    padding: 12px 22px;
    border-radius: var(--gm-radius);
    font-weight: 800;
  }
  .cancel {
    background: var(--gm-surface);
    color: var(--gm-text);
  }
  .del {
    background: var(--gm-danger);
    color: #1a0606;
  }
  .btn:focus {
    box-shadow: var(--gm-focus-ring);
    transform: scale(1.04);
  }
</style>
