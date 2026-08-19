<script>
  import { confirmDelete, closeConfirm, showToast } from "../stores/ui.js";
  import { uninstallGame } from "../ipc/index.js";
  import { games } from "../stores/games.js";
  import { t, tr } from "../i18n/index.js";

  $: game = $confirmDelete?.game;

  async function eliminar() {
    const g = game;
    closeConfirm();
    showToast(tr("confirmDelete.toast.uninstalling", { title: g.title }));
    await uninstallGame(g.id, g.launchTarget);
    // En la app real el juego desaparece tras desinstalar; aquí lo quitamos de la sesión.
    games.update((l) => l.filter((x) => x.id !== g.id));
  }
</script>

{#if game}
  <div class="scrim">
    <div class="box" role="alertdialog" aria-modal="true">
      <h2>{$t("confirmDelete.title")}</h2>
      <p>
        {$t("confirmDelete.body.pre")}<b>«{game.title}»</b>{$t("confirmDelete.body.post")}
      </p>
      <div class="actions">
        <button class="btn cancel" data-focusable data-focus-default tabindex="-1" on:click={closeConfirm}>
          {$t("common.cancel")}
        </button>
        <button class="btn del" data-focusable tabindex="-1" on:click={eliminar}>
          {$t("common.delete")}
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
  p b {
    color: var(--gm-text);
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
