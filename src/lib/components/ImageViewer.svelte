<script>
  /*
   * Visor de imágenes (Multimedia → Imágenes → álbum). Reemplaza la grilla
   * de miniaturas dentro del mismo panel (no es un overlay/modal, ver
   * ImageAlbumDetail.svelte) — solo 3 acciones (avanzar/retroceder/cerrar),
   * el foco entre ellas ya resuelve "izquierda/derecha", sin interceptar
   * d-pad.
   */
  import { imageViewer, closeImageViewer } from "../stores/ui.js";
  import { imageUrl } from "../util/asset.js";

  export let images = [];

  $: index = $imageViewer?.index ?? 0;
  $: current = images[index];
  $: srcPromise = current ? imageUrl(current.path) : Promise.resolve(null);

  function next() {
    if (images.length < 2) return;
    imageViewer.update((v) => (v ? { ...v, index: (v.index + 1) % images.length } : v));
  }
  function prev() {
    if (images.length < 2) return;
    imageViewer.update((v) => (v ? { ...v, index: (v.index - 1 + images.length) % images.length } : v));
  }
</script>

<section class="image-viewer">
  <div class="stage">
    {#await srcPromise then src}
      {#if src}
        <img {src} alt={current?.name || ""} />
      {/if}
    {/await}
  </div>
  <div class="name dim">{current?.name || ""}</div>
  <div class="controls">
    <button class="chip" data-focusable tabindex="-1" disabled={images.length < 2} on:click={prev}>
      ← Anterior
    </button>
    <button class="chip primary" data-focusable data-focus-default tabindex="-1" on:click={closeImageViewer}>
      ✕ Cerrar
    </button>
    <button class="chip" data-focusable tabindex="-1" disabled={images.length < 2} on:click={next}>
      Siguiente →
    </button>
  </div>
</section>

<style>
  .image-viewer {
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
  }
  .stage img {
    max-width: 100%;
    max-height: 100%;
    border-radius: var(--gm-radius);
    object-fit: contain;
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
  .controls {
    display: flex;
    gap: 10px;
  }
  .chip {
    cursor: pointer;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .chip.primary {
    background: var(--gm-accent);
    color: #06101f;
  }
  .chip:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
