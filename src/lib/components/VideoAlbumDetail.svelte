<script>
  import { onMount, onDestroy } from "svelte";
  import { listVideoFiles } from "../ipc/index.js";
  import { renameAlbum, removeAlbum } from "../stores/videoLibrary.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { reportError, videoPlayer, openVideoPlayer, closeVideoPlayer } from "../stores/ui.js";
  import { pauseForSession } from "../stores/musicPlayer.js";
  import { t, tr } from "../i18n/index.js";
  import VideoPlayerView from "./VideoPlayerView.svelte";

  export let album;
  export let onBack = () => {};

  let videos = [];
  let loading = true;

  async function load() {
    loading = true;
    try {
      videos = await listVideoFiles(album.id);
    } catch (e) {
      reportError(e, "VideoAlbumDetail:load");
      videos = [];
    } finally {
      loading = false;
    }
  }
  onMount(load);
  // El reproductor solo tiene sentido con este álbum montado — se cierra al
  // salir, igual que musicDetail se resetea al desmontar MusicView.
  onDestroy(() => closeVideoPlayer());

  async function refresh() {
    await load();
  }

  async function rename() {
    const name = await openKeyboard(album.name, tr("keyboard.title.albumName"));
    if (name) {
      await renameAlbum(album.id, name);
      album = { ...album, name };
    }
  }

  async function removeThisAlbum() {
    await removeAlbum(album.id);
    onBack();
  }

  // Video pisa a la música: si estaba sonando, se pausa (sin perder cola —
  // ver musicPlayer.js::pauseForSession, mismo criterio ya usado al iniciar
  // un juego/app). No hay reproducción de fondo pedida para video, así que
  // no hace falta un guard simétrico al revés.
  function openVideo(item) {
    pauseForSession();
    openVideoPlayer(album, item);
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
</script>

{#if $videoPlayer && $videoPlayer.album.id === album.id}
  <VideoPlayerView item={$videoPlayer.item} onClose={closeVideoPlayer} />
{:else}
  <section class="video-album-detail">
    <header class="head">
      <button class="back" data-focusable data-focus-default tabindex="-1" on:click={onBack}>← {$t("common.back")}</button>
      <h1>{album.name}</h1>
      <div class="head-actions">
        <button class="chip" data-focusable tabindex="-1" on:click={rename}>{$t("common.rename")}</button>
        <button class="chip" data-focusable tabindex="-1" on:click={refresh}>{$t("common.refresh")}</button>
        <button class="chip danger" data-focusable tabindex="-1" on:click={removeThisAlbum}>
          {$t("music.removeFromLibrary")}
        </button>
      </div>
    </header>

    {#if loading}
      <p class="dim">{$t("common.loading")}</p>
    {:else if !videos.length}
      <p class="dim">{$t("videos.noVideosFound")}</p>
    {:else}
      <div class="grid">
        {#each videos as v (v.path)}
          <button class="card" data-focusable tabindex="-1" style="background: {cover(v.name)}" on:click={() => openVideo(v)}>
            <span class="play-ico">▶</span>
            <span class="card-title">{v.name}</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .video-album-detail {
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
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .card {
    cursor: pointer;
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: var(--gm-radius-lg);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 14px;
    color: #fff;
    overflow: hidden;
  }
  .card:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .play-ico {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    opacity: 0.85;
  }
  .card-title {
    font-weight: 800;
    font-size: 1.05rem;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  }
</style>
