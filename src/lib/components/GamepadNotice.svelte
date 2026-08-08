<script>
  import { gamepadNotice } from "../stores/gamepads.js";
  import { notifyPosition } from "../stores/uiprefs.js";
  import { notifyPositionStyle } from "../util/notifyPosition.js";

  $: style = notifyPositionStyle($notifyPosition);
</script>

{#if $gamepadNotice}
  <div class="indicator" class:disconnected={!$gamepadNotice.connected} style={style} role="status" aria-live="polite">
    <span class="dot"></span>
    <span class="label">
      <span class="title">{$gamepadNotice.connected ? "Mando conectado" : "Mando desconectado"}</span>
      <span class="name">{$gamepadNotice.name}</span>
    </span>
  </div>
{/if}

<style>
  /* Mismo estilo "pill" que SteamSyncIndicator (fondo elevado + sombra), solo
     que la posición viene de la preferencia del usuario (notifyPosition, ver
     Ajustes → Notificaciones) en vez de estar fija a una esquina. */
  .indicator {
    z-index: 90;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--gm-bg-elev);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    color: var(--gm-text);
    pointer-events: none;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--gm-success);
  }
  .indicator.disconnected .dot {
    background: var(--gm-danger);
  }
  .label {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .title {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: var(--gm-accent-2);
  }
  .name {
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
  }
</style>
