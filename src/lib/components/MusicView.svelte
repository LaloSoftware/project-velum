<script>
  import { tick } from "svelte";
  import { musicAlbums, addAlbumFolder } from "../stores/musicLibrary.js";
  import { playlists, createPlaylist } from "../stores/playlists.js";
  import { playAlbum, playPlaylist } from "../stores/musicPlayer.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { showToast, reportError } from "../stores/ui.js";
  import { isTauri } from "../ipc/index.js";
  import { focusFirstIn } from "../input/navigation.js";
  import MusicAlbumDetail from "./MusicAlbumDetail.svelte";
  import PlaylistDetail from "./PlaylistDetail.svelte";

  let tab = "albums"; // "albums" | "playlists"
  let activeAlbum = null;
  let activePlaylist = null;
  let gridEl;

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
      reportError(e, "MusicView:pickFolder");
    }
  }

  async function newPlaylist() {
    const name = await openKeyboard("", "Nombre de la lista");
    if (name) {
      await createPlaylist(name);
      showToast(`Lista "${name}" creada`);
    }
  }

  async function openAlbum(album) {
    activeAlbum = album;
    await tick();
    focusFirstIn(gridEl);
  }
  async function openPlaylist(pl) {
    activePlaylist = pl;
    await tick();
    focusFirstIn(gridEl);
  }
  async function backToGrid() {
    activeAlbum = null;
    activePlaylist = null;
    await tick();
    focusFirstIn(gridEl);
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
        Álbumes
      </button>
      <button class="tab" class:active={tab === "playlists"} data-focusable tabindex="-1" on:click={() => selectTab("playlists")}>
        Listas
      </button>
    </div>

    {#if tab === "albums"}
      <div class="grid">
        <button class="card add" data-focusable tabindex="-1" on:click={pickFolder}>
          <span class="add-ico">＋</span>
          <span class="add-label">Agregar carpeta</span>
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
        <p class="dim hint">Agrega una carpeta con música — cada carpeta se convierte en un álbum.</p>
      {/if}
    {:else}
      <div class="grid">
        <button class="card add" data-focusable tabindex="-1" on:click={newPlaylist}>
          <span class="add-ico">＋</span>
          <span class="add-label">Nueva lista</span>
        </button>
        {#each $playlists as p (p.id)}
          <button
            class="card"
            data-focusable
            tabindex="-1"
            style="background: {cover(p.name)}"
            on:click={() => openPlaylist(p)}
            on:gmdetail={() => playPlaylist(p)}
          >
            <span class="card-title">{p.name}</span>
            <span class="card-sub">{p.trackIds.length} pista(s)</span>
          </button>
        {/each}
      </div>
      {#if !$playlists.length}
        <p class="dim hint">Crea una lista para combinar pistas de distintos álbumes.</p>
      {/if}
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
