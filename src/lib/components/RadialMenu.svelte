<script>
  import { radialMenu, radialSlots, radialCancelButton, RADIAL_LABEL } from "../stores/radialMenu.js";
  import { musicPlayer } from "../stores/musicPlayer.js";
  import ButtonPrompt from "./ButtonPrompt.svelte";

  // Token corto por posición, mismo criterio que el pie de App.svelte (los
  // combos/posiciones de mando no tienen atajo de teclado, ButtonPrompt no
  // recibe `action` acá).
  const TOKEN = { south: "A", east: "B", north: "Y", west: "X", l1: "LB", r1: "RB", lt: "LT", rt: "RT" };

  // 8 posiciones fijas: rombo central (botones de cara) + arco superior con
  // hombros/gatillos, imitando la silueta física del mando. Coordenadas en %
  // del contenedor .diamond (480x480, centrado en pantalla).
  const LAYOUT = {
    north: { top: "6%", left: "50%" },
    south: { top: "94%", left: "50%" },
    west: { top: "50%", left: "6%" },
    east: { top: "50%", left: "94%" },
    l1: { top: "16%", left: "24%" },
    r1: { top: "16%", left: "76%" },
    lt: { top: "0%", left: "24%" },
    rt: { top: "0%", left: "76%" },
  };

  $: cancelBtn = $radialCancelButton;
</script>

{#if $radialMenu}
  <div class="scrim" role="presentation">
    <div class="diamond">
      {#each Object.keys(LAYOUT) as pos (pos)}
        {@const actionId = $radialSlots[pos]}
        {@const isCancel = cancelBtn === pos}
        {@const assigned = isCancel || actionId}
        <div class="pos" class:dim={!assigned} class:cancel={isCancel} style="top: {LAYOUT[pos].top}; left: {LAYOUT[pos].left}">
          <span class="btn"><ButtonPrompt token={TOKEN[pos]} button={pos} /></span>
          {#if isCancel}
            <span class="label cancel-label">Cancelar</span>
          {:else if actionId}
            <span class="label">{$RADIAL_LABEL[actionId] || actionId}</span>
          {/if}
        </div>
      {/each}
      {#if $musicPlayer.current}
        <!-- Reflejo visual de los atajos de d-pad (arriba/abajo volumen,
             izquierda/derecha pista, ver input/index.js) — la lógica ya
             funcionaba, faltaba mostrarla acá. -->
        <div class="music-panel">
          <div class="mp-title">{$musicPlayer.current.title}</div>
          <div class="mp-vol">
            <span class="mp-ico">🔊</span>
            <div class="mp-bar"><div class="mp-fill" style="width: {Math.round($musicPlayer.volume * 100)}%"></div></div>
            <span class="mp-pct">{Math.round($musicPlayer.volume * 100)}</span>
          </div>
          <div class="mp-hint">▲▼ Volumen · ◀▶ Pista</div>
        </div>
      {/if}
      <div class="hint">
        {cancelBtn ? "Suelta Home o presiona el botón de cancelar" : "Suelta Home para cancelar"}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Overlay puramente presentacional (no se navega por foco, ver
     input/index.js::runRadialInput) — mismo patrón difuminado que
     PlayingOverlay.svelte/ArtEditor.svelte, sin token nuevo. */
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 320;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gm-bg-overlay);
    backdrop-filter: blur(6px);
  }
  .diamond {
    position: relative;
    width: min(480px, 82vw);
    height: min(480px, 82vw);
  }
  .pos {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transform: translate(-50%, -50%);
  }
  .pos.dim {
    opacity: 0.35;
  }
  .btn :global(.prompt) {
    width: 44px;
    height: 44px;
    min-width: 44px;
    font-size: 1rem;
  }
  .btn :global(.prompt.icon img) {
    width: 40px;
    height: 40px;
  }
  .label {
    max-width: 130px;
    text-align: center;
    color: var(--gm-text);
    font-weight: 700;
    font-size: 0.85rem;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  }
  .cancel-label {
    color: var(--gm-danger);
  }
  .hint {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    color: var(--gm-text-dim);
    font-size: 0.8rem;
  }
  .music-panel {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(220px, 40vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }
  .mp-title {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--gm-text);
    font-weight: 700;
    font-size: 0.9rem;
  }
  .mp-vol {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .mp-bar {
    flex: 1;
    height: 6px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    overflow: hidden;
  }
  .mp-fill {
    height: 100%;
    background: var(--gm-accent);
  }
  .mp-pct {
    min-width: 28px;
    text-align: right;
    color: var(--gm-text-dim);
    font-size: 0.8rem;
    font-weight: 700;
  }
  .mp-hint {
    color: var(--gm-text-dim);
    font-size: 0.75rem;
  }
</style>
