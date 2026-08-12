<script>
  import { session, playConfig } from "../stores/playsession.js";
  import { BUTTON_LABELS } from "../stores/bindings.js";
  import { t } from "../i18n/index.js";

  $: btn = $BUTTON_LABELS[$playConfig.returnButton] || $t("input.buttons.guide");
  $: verb = $playConfig.returnMode === "hold" ? "Mantén" : "Pulsa";
  $: isSteamDownload = $session?.mode === "steam-download";
  $: isSteamUtility = $session?.mode === "steam-utility";
  $: overlayLabel = isSteamDownload
    ? "⬇ Descargando desde Steam"
    : isSteamUtility
      ? "🎮 Abriendo Steam"
      : "▶ Jugando a";
  // Los accesos de Steam (steam-utility) no tienen un juego puntual — usan su
  // propia etiqueta ("Biblioteca", "Tienda"...) en vez de $session.game.title.
  $: overlayTitle = isSteamUtility ? $session.label : $session?.game?.title;
</script>

{#if $session}
  <div class="playing" role="alertdialog" aria-live="assertive">
    <div class="box">
      <div class="spinner"></div>
      <div class="label">{overlayLabel}</div>
      <div class="title">{overlayTitle}</div>
      <div class="hint">{verb} <b>{btn}</b> para volver al launcher</div>
    </div>
  </div>
{/if}

<style>
  .playing {
    position: absolute;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gm-bg-overlay);
    backdrop-filter: blur(6px);
  }
  .box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 40px 60px;
    text-align: center;
  }
  .spinner {
    width: 46px;
    height: 46px;
    margin-bottom: 12px;
    border-radius: 50%;
    border: 4px solid var(--gm-surface-2);
    border-top-color: var(--gm-accent);
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .label {
    color: var(--gm-text-dim);
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 0.85rem;
  }
  .title {
    font-size: 2.2rem;
    font-weight: var(--gm-title-weight);
  }
  .hint {
    margin-top: 14px;
    color: var(--gm-text-dim);
  }
  .hint b {
    color: var(--gm-accent-2);
  }
</style>
