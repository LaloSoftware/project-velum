<script>
  /*
   * Reproductor de video (Multimedia → Videos → álbum). Reemplaza la grilla
   * de tarjetas dentro del mismo panel (no es un overlay/modal, ver
   * VideoAlbumDetail.svelte). Un único <video> local al componente — sin
   * store tipo musicPlayer.js: no hay reproducción de fondo pedida ni
   * deseable acá, se libera al cerrar (onDestroy).
   *
   * Barra de progreso: <input type=range> con step de 10s — con foco y
   * "Aceptar" (modo edición de range, ya existente en navigation.js),
   * izquierda/derecha avanzan/retroceden sin código nuevo, mismo mecanismo
   * que ya usan los sliders de volumen/opacidad en el resto de la app.
   */
  import { onDestroy } from "svelte";
  import { videoUrl } from "../util/asset.js";
  import { reportError } from "../stores/ui.js";

  export let item; // {path, name}
  export let onClose = () => {};

  let videoEl;
  let src = null;
  let playing = false;
  let currentTime = 0;
  let duration = 0;
  let volume = 1;

  videoUrl(item.path)
    .then((u) => (src = u))
    .catch((e) => reportError(e, "VideoPlayerView:load"));

  onDestroy(() => {
    if (videoEl) {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    }
  });

  function togglePlay() {
    if (!videoEl) return;
    if (videoEl.paused) videoEl.play().catch(() => {});
    else videoEl.pause();
  }
  function seek(t) {
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, Math.min(duration, Number(t)));
  }
  function setVol(v) {
    volume = Math.max(0, Math.min(1, Number(v)));
    if (videoEl) videoEl.volume = volume;
  }
  function mmss(s) {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }
</script>

<section class="video-player">
  <div class="stage">
    {#if src}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={videoEl}
        {src}
        on:play={() => (playing = true)}
        on:pause={() => (playing = false)}
        on:timeupdate={() => (currentTime = videoEl.currentTime)}
        on:loadedmetadata={() => {
          duration = videoEl.duration || 0;
          videoEl.volume = volume;
          videoEl.play().catch(() => {});
        }}
      ></video>
    {/if}
  </div>
  <div class="name dim">{item.name}</div>

  <div class="bar">
    <span class="time dim">{mmss(currentTime)}</span>
    <input
      type="range"
      class="seek"
      data-focusable
      data-focus-default
      tabindex="-1"
      min="0"
      max={duration || 0}
      step="10"
      value={currentTime}
      on:input={(e) => seek(e.target.value)}
    />
    <span class="time dim">{mmss(duration)}</span>
  </div>

  <div class="controls">
    <button class="step" data-focusable tabindex="-1" on:click={togglePlay} aria-label="Reproducir/pausar">
      {playing ? "⏸" : "▶"}
    </button>
    <div class="volrow">
      <span class="ico">🔊</span>
      <input
        type="range"
        class="vol-slider"
        data-focusable
        tabindex="-1"
        min="0"
        max="100"
        step="5"
        value={Math.round(volume * 100)}
        on:input={(e) => setVol(e.target.value / 100)}
      />
    </div>
    <button class="chip danger" data-focusable tabindex="-1" on:click={onClose}>✕ Salir</button>
  </div>
</section>

<style>
  .video-player {
    height: 100%;
    padding: var(--gm-pad);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .stage {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    border-radius: var(--gm-radius);
    overflow: hidden;
  }
  .stage video {
    max-width: 100%;
    max-height: 100%;
  }
  .name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .bar {
    width: min(560px, 100%);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .time {
    min-width: 38px;
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
  }
  .seek {
    flex: 1;
    accent-color: var(--gm-accent);
  }
  .seek:focus {
    outline: none;
    box-shadow: var(--gm-focus-ring);
    border-radius: 999px;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .step {
    cursor: pointer;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-size: 1.2rem;
  }
  .step:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .volrow {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 140px;
  }
  .vol-slider {
    flex: 1;
    accent-color: var(--gm-accent);
  }
  .vol-slider:focus {
    outline: none;
    box-shadow: var(--gm-focus-ring);
    border-radius: 999px;
  }
  .chip {
    cursor: pointer;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .chip.danger {
    color: var(--gm-danger);
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
