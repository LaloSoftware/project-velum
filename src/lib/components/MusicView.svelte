<script>
  import { onMount, onDestroy, tick } from "svelte";
  import { musicAlbums, addAlbumFolder, addLibraryRoot, syncLibraryRoots } from "../stores/musicLibrary.js";
  import { playlists, createPlaylist } from "../stores/playlists.js";
  import { playAlbum, playPlaylist } from "../stores/musicPlayer.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { names } from "../i18n/names.js";
  import {
    showToast,
    reportError,
    musicFooterMode,
    musicDetail,
    openMusicDetail,
    closeMusicDetail,
  } from "../stores/ui.js";
  import { isTauri } from "../ipc/index.js";
  import { focusFirstIn } from "../input/navigation.js";
  import { t, tr } from "../i18n/index.js";
  import MusicAlbumDetail from "./MusicAlbumDetail.svelte";
  import PlaylistDetail from "./PlaylistDetail.svelte";
  import NowPlayingView from "./NowPlayingView.svelte";

  let tab = "albums"; // "albums" | "playlists" | "nowplaying"
  let gridEl;

  // Álbum/lista abierto: en el store global `musicDetail` (no estado local) —
  // así el atajo "atrás" (handleBack en App.svelte) lo reconoce y solo cierra
  // el detalle en vez de caer al fallback de ir a Inicio.
  $: activeAlbum = $musicDetail?.type === "album" ? $musicDetail.item : null;
  $: activePlaylist = $musicDetail?.type === "playlist" ? $musicDetail.item : null;

  onMount(() => {
    syncLibraryRoots();
  });
  onDestroy(() => {
    musicFooterMode.set(null);
    closeMusicDetail();
  });

  // Footer de atajos (App.svelte): refleja lo que A/Y hacen realmente en cada
  // pantalla de Música (ver docs/input.md / plan de fixes).
  $: musicFooterMode.set(activeAlbum ? "album" : activePlaylist ? "playlist" : tab === "nowplaying" ? null : "grid");

  // Reenfoca la grilla cuando el detalle se cierra desde CUALQUIER lado (el
  // botón "← Volver" o el atajo global "atrás", ambos pasan por
  // closeMusicDetail/musicDetail=null) — un solo punto en vez de duplicar el
  // focusFirstIn en cada vía de cierre.
  let wasDetailOpen = false;
  $: {
    const open = !!$musicDetail;
    if (wasDetailOpen && !open) tick().then(() => focusFirstIn(gridEl));
    wasDetailOpen = open;
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
    if (!isTauri) return showToast(tr("common.foldersOnlyInApp"));
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true });
      if (dir) {
        await addAlbumFolder(dir);
        showToast(tr("music.toast.albumAdded"));
      }
    } catch (e) {
      reportError(e, "MusicView:pickFolder");
    }
  }

  // Carpeta raíz: cada subcarpeta directa se agrega sola como álbum (auto-
  // descubrimiento, ver musicLibrary.js::syncLibraryRoots) — pensado para
  // rutas tipo "C:/Usuarios/Música/" con varias OSTs copiadas adentro.
  async function pickRootFolder() {
    if (!isTauri) return showToast(tr("common.foldersOnlyInApp"));
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true });
      if (dir) {
        await addLibraryRoot(dir);
        showToast(tr("music.toast.rootFolderAdded"));
      }
    } catch (e) {
      reportError(e, "MusicView:pickRootFolder");
    }
  }

  async function newPlaylist() {
    const name = await openKeyboard("", tr("keyboard.title.playlistName"));
    if (name) {
      await createPlaylist(name);
      showToast(tr("music.toast.playlistCreated", { name }));
    }
  }

  async function openAlbum(album) {
    openMusicDetail("album", album);
    await tick();
    focusFirstIn(gridEl);
  }
  async function openPlaylist(pl) {
    openMusicDetail("playlist", pl);
    await tick();
    focusFirstIn(gridEl);
  }
  // El reenfoque a la grilla lo hace el bloque reactivo de arriba
  // (wasDetailOpen) — funciona igual venga de acá o del atajo "atrás".
  function backToGrid() {
    closeMusicDetail();
  }

  async function selectTab(id) {
    tab = id;
    await tick();
    focusFirstIn(gridEl);
  }
</script>

<div class="music" bind:this={gridEl}>
  {#if activeAlbum}
    <MusicAlbumDetail album={activeAlbum} onBack={backToGrid} />
  {:else if activePlaylist}
    <PlaylistDetail playlist={activePlaylist} onBack={backToGrid} />
  {:else}
    <div class="tabs">
      <button class="tab" class:active={tab === "albums"} data-focusable data-focus-default tabindex="-1" on:click={() => selectTab("albums")}>
        {$t("music.tab.albums")}
      </button>
      <button class="tab" class:active={tab === "playlists"} data-focusable tabindex="-1" on:click={() => selectTab("playlists")}>
        {$t("music.tab.playlists")}
      </button>
      <button class="tab" class:active={tab === "nowplaying"} data-focusable tabindex="-1" on:click={() => selectTab("nowplaying")}>
        {$t("music.tab.nowPlaying")}
      </button>
    </div>

    {#if tab === "albums"}
      <div class="grid">
        <button class="card add" data-focusable tabindex="-1" on:click={pickFolder}>
          <span class="add-ico">＋</span>
          <span class="add-label">{$t("music.addAlbum")}</span>
        </button>
        <button class="card add" data-focusable tabindex="-1" on:click={pickRootFolder}>
          <span class="add-ico">＋</span>
          <span class="add-label">{$t("music.addRootFolder")}</span>
        </button>
        {#each $musicAlbums as a (a.id)}
          <button
            class="card"
            data-focusable
            tabindex="-1"
            style="background: {cover(a.name)}"
            on:click={() => openAlbum(a)}
            on:gmdetail={() => playAlbum(a)}
          >
            <span class="card-title">{a.name}</span>
          </button>
        {/each}
      </div>
      {#if !$musicAlbums.length}
        <p class="dim hint">{$t("music.emptyAlbums")}</p>
      {/if}
    {:else if tab === "playlists"}
      <div class="grid">
        <button class="card add" data-focusable tabindex="-1" on:click={newPlaylist}>
          <span class="add-ico">＋</span>
          <span class="add-label">{$t("music.newPlaylist")}</span>
        </button>
        {#each $playlists as p (p.id)}
          <button
            class="card"
            data-focusable
            tabindex="-1"
            style="background: {cover($names.playlist(p))}"
            on:click={() => openPlaylist(p)}
            on:gmdetail={() => playPlaylist(p)}
          >
            <span class="card-title">{$names.playlist(p)}</span>
            <span class="card-sub">{$t("music.trackCount", { count: p.trackIds.length })}</span>
          </button>
        {/each}
      </div>
      {#if !$playlists.length}
        <p class="dim hint">{$t("music.emptyPlaylists")}</p>
      {/if}
    {:else}
      <NowPlayingView />
    {/if}
  {/if}
</div>

<style>
  .music {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .tabs {
    display: flex;
    gap: 10px;
  }
  .tab {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .tab.active {
    background: var(--gm-accent);
    color: #06101f;
  }
  .tab:focus {
    box-shadow: var(--gm-focus-ring);
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
  .card-sub {
    position: absolute;
    top: 12px;
    right: 14px;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.85);
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
