<script>
  import { onMount, onDestroy } from "svelte";
  import { listImageFiles } from "../ipc/index.js";
  import { imageUrl } from "../util/asset.js";
  import { renameAlbum, removeAlbum } from "../stores/imageLibrary.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { reportError, imageViewer, openImageViewer, closeImageViewer } from "../stores/ui.js";
  import ImageViewer from "./ImageViewer.svelte";

  export let album;
  export let onBack = () => {};

  let images = [];
  let loading = true;
  let thumbs = {}; // path → data URI (cache local del render, imageUrl ya cachea internamente)

  async function load() {
    loading = true;
    try {
      images = await listImageFiles(album.id);
      for (const img of images) {
        imageUrl(img.path).then((u) => {
          if (u) thumbs = { ...thumbs, [img.path]: u };
        });
      }
    } catch (e) {
      reportError(e, "ImageAlbumDetail:load");
      images = [];
    } finally {
      loading = false;
    }
  }
  onMount(load);
  // El visor solo tiene sentido con este álbum montado — se cierra al salir,
  // igual que musicDetail se resetea al desmontar MusicView.
  onDestroy(() => closeImageViewer());

  async function refresh() {
    thumbs = {};
    await load();
  }

  async function rename() {
    const name = await openKeyboard(album.name, "Nombre del álbum");
    if (name) {
      await renameAlbum(album.id, name);
      album = { ...album, name };
    }
  }

  async function removeThisAlbum() {
    await removeAlbum(album.id);
    onBack();
  }
</script>

{#if $imageViewer && $imageViewer.album.id === album.id}
  <ImageViewer {images} />
{:else}
  <section class="image-album-detail">
    <header class="head">
      <button class="back" data-focusable data-focus-default tabindex="-1" on:click={onBack}>← Volver</button>
      <h1>{album.name}</h1>
      <div class="head-actions">
        <button class="chip" data-focusable tabindex="-1" on:click={rename}>Renombrar</button>
        <button class="chip" data-focusable tabindex="-1" on:click={refresh}>Actualizar</button>
        <button class="chip danger" data-focusable tabindex="-1" on:click={removeThisAlbum}>
          Quitar de la biblioteca
        </button>
      </div>
    </header>

    {#if loading}
      <p class="dim">Cargando…</p>
    {:else if !images.length}
      <p class="dim">No se encontraron imágenes en esta carpeta.</p>
    {:else}
      <div class="thumbs">
        {#each images as img, i (img.path)}
          <button
            class="thumb"
            data-focusable
            tabindex="-1"
            on:click={() => openImageViewer(album, i)}
            aria-label={img.name}
          >
            {#if thumbs[img.path]}
              <img src={thumbs[img.path]} alt={img.name} loading="lazy" />
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .image-album-detail {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
  }
  .back {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .back:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 1.6rem;
    font-weight: var(--gm-title-weight);
  }
  .head-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
  .dim {
    color: var(--gm-text-dim);
  }
  .thumbs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .thumb {
    cursor: pointer;
    aspect-ratio: 1 / 1;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    overflow: hidden;
  }
  .thumb:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
