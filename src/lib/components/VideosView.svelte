<script>
  import { onMount, onDestroy, tick } from "svelte";
  import { videoAlbums, addAlbumFolder, addLibraryRoot, syncLibraryRoots } from "../stores/videoLibrary.js";
  import { showToast, reportError, videoFooterMode, videoAlbumOpen, openVideoAlbum, closeVideoAlbum } from "../stores/ui.js";
  import { isTauri } from "../ipc/index.js";
  import { focusFirstIn } from "../input/navigation.js";
  import VideoAlbumDetail from "./VideoAlbumDetail.svelte";

  let gridEl;

  // Álbum abierto: store global (no estado local) — mismo motivo que
  // musicDetail (ver ui.js): así "atrás" (handleBack en App.svelte) cierra
  // el álbum en vez de caer al fallback de ir a Inicio.
  $: activeAlbum = $videoAlbumOpen;

  onMount(() => {
    syncLibraryRoots();
  });
  onDestroy(() => {
    videoFooterMode.set(null);
    closeVideoAlbum();
  });

  $: videoFooterMode.set(activeAlbum ? "album" : "grid");

  // Reenfoca la grilla cuando el álbum se cierra desde cualquier lado (botón
  // "← Volver" o el atajo global "atrás") — un solo punto, mismo patrón que
  // MusicView.svelte/ImagesView.svelte.
  let wasOpen = false;
  $: {
    const open = !!activeAlbum;
    if (wasOpen && !open) tick().then(() => focusFirstIn(gridEl));
    wasOpen = open;
  }

  function hue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }
  const cover = (name) => {
    const h = hue(name || "");
    return `linear-gradient(150deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 22%))`;
  };

  async function pickFolder() {
    if (!isTauri) return showToast("Selección de carpetas solo en la app");
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true });
      if (dir) {
        await addAlbumFolder(dir);
        showToast("Álbum agregado");
      }
    } catch (e) {
      reportError(e, "VideosView:pickFolder");
    }
  }

  // Carpeta raíz: cada subcarpeta directa se agrega sola como álbum (auto-
  // descubrimiento, ver videoLibrary.js::syncLibraryRoots).
  async function pickRootFolder() {
    if (!isTauri) return showToast("Selección de carpetas solo en la app");
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true });
      if (dir) {
        await addLibraryRoot(dir);
        showToast("Carpeta raíz agregada");
      }
    } catch (e) {
      reportError(e, "VideosView:pickRootFolder");
    }
  }

  async function openAlbum(album) {
    openVideoAlbum(album);
    await tick();
    focusFirstIn(gridEl);
  }
  function backToGrid() {
    closeVideoAlbum();
  }
</script>

<div class="videos" bind:this={gridEl}>
  {#if activeAlbum}
    <VideoAlbumDetail album={activeAlbum} onBack={backToGrid} />
  {:else}
    <div class="grid">
      <button class="card add" data-focusable data-focus-default tabindex="-1" on:click={pickFolder}>
        <span class="add-ico">＋</span>
        <span class="add-label">Agregar álbum</span>
      </button>
      <button class="card add" data-focusable tabindex="-1" on:click={pickRootFolder}>
        <span class="add-ico">＋</span>
        <span class="add-label">Agregar carpeta raíz</span>
      </button>
      {#each $videoAlbums as a (a.id)}
        <button class="card" data-focusable tabindex="-1" style="background: {cover(a.name)}" on:click={() => openAlbum(a)}>
          <span class="card-title">{a.name}</span>
        </button>
      {/each}
    </div>
    {#if !$videoAlbums.length}
      <p class="dim hint">Agrega una carpeta con videos (MP4/WebM) — cada carpeta se convierte en un álbum. O agrega una carpeta raíz y cada subcarpeta se convierte en un álbum automáticamente.</p>
    {/if}
  {/if}
</div>

<style>
  .videos {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }
  .card {
    cursor: pointer;
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: var(--gm-radius-lg);
    display: flex;
    align-items: flex-end;
    padding: 14px;
    color: #fff;
    overflow: hidden;
  }
  .card:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .card-title {
    font-weight: 800;
    font-size: 1.05rem;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  }
  .card.add {
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 8px;
  }
  .add-ico {
    font-size: 2rem;
    font-weight: 800;
  }
  .add-label {
    font-weight: 700;
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .hint {
    font-size: 0.9rem;
  }
</style>
