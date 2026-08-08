<script>
  import { onMount } from "svelte";
  import { listAudioFiles } from "../ipc/index.js";
  import { musicPlayer, playAlbum, playAlbumFrom, invalidateAlbumTracks } from "../stores/musicPlayer.js";
  import { renameAlbum, removeAlbum } from "../stores/musicLibrary.js";
  import { playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } from "../stores/playlists.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { openPopover, showToast, reportError } from "../stores/ui.js";

  export let album;
  export let onBack = () => {};

  let tracks = [];
  let loading = true;

  async function load() {
    loading = true;
    try {
      tracks = await listAudioFiles(album.id);
    } catch (e) {
      reportError(e, "MusicAlbumDetail:load");
      tracks = [];
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function refresh() {
    invalidateAlbumTracks(album.id);
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

  const NEW_PLAYLIST = "__new__";

  function playlistsWithTrack(path) {
    return $playlists.filter((p) => p.trackIds.some((t) => t.path === path)).map((p) => p.id);
  }

  async function togglePlaylist(track, playlistId) {
    if (playlistId === NEW_PLAYLIST) {
      const name = await openKeyboard("", "Nombre de la lista");
      if (!name) return;
      const pl = await createPlaylist(name);
      await addTrackToPlaylist(pl.id, {
        path: track.path,
        title: track.name,
        albumId: album.id,
        albumName: album.name,
      });
      showToast(`Agregado a "${name}"`);
      return;
    }
    const already = playlistsWithTrack(track.path).includes(playlistId);
    if (already) {
      await removeTrackFromPlaylist(playlistId, track.path);
    } else {
      await addTrackToPlaylist(playlistId, {
        path: track.path,
        title: track.name,
        albumId: album.id,
        albumName: album.name,
      });
    }
  }

  // Secundario (Y/gmdetail) en una pista: popover "Agregar a lista" —
  // reusa el mismo primitivo que Select.svelte (openPopover), sin el botón
  // de ancho completo de Select (sería demasiado pesado por fila).
  function addToListMenu(track, anchor) {
    const options = [
      ...$playlists.map((p) => ({ value: p.id, label: p.name })),
      { value: NEW_PLAYLIST, label: "＋ Crear lista nueva…" },
    ];
    openPopover({
      multi: true,
      options,
      values: playlistsWithTrack(track.path),
      anchor,
      onToggle: (id) => togglePlaylist(track, id),
    });
  }
</script>

<section class="album-detail">
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

  <div class="actions">
    <button
      class="chip primary"
      data-focusable
      tabindex="-1"
      disabled={!tracks.length}
      on:click={() => playAlbum(album)}
    >
      ▶ Reproducir álbum
    </button>
    <button
      class="chip"
      data-focusable
      tabindex="-1"
      disabled={!tracks.length}
      on:click={() => playAlbum(album, { shuffle: true })}
    >
      🔀 Aleatorio
    </button>
  </div>

  <div class="tracks" data-focus-group="tracks">
    {#if loading}
      <p class="dim">Cargando…</p>
    {:else if !tracks.length}
      <p class="dim">No se encontraron archivos de audio en esta carpeta.</p>
    {:else}
      {#each tracks as t, i (t.path)}
        <button
          class="track"
          class:current={$musicPlayer.current?.path === t.path}
          data-focusable
          tabindex="-1"
          on:click={() => playAlbumFrom(album, t.path)}
          on:gmdetail={(e) => addToListMenu(t, e.currentTarget)}
        >
          <span class="tnum">{i + 1}</span>
          <span class="tname">{t.name}</span>
          {#if $musicPlayer.current?.path === t.path}
            <span class="tplaying">{$musicPlayer.playing ? "▶" : "⏸"}</span>
          {/if}
        </button>
      {/each}
    {/if}
  </div>
</section>

<style>
  .album-detail {
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
  .actions {
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
  .chip.danger {
    color: var(--gm-danger);
  }
  .chip:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .tracks {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .track {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text);
  }
  .track.current {
    background: var(--gm-surface-2);
    color: var(--gm-accent-2);
  }
  .track:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .tnum {
    min-width: 24px;
    color: var(--gm-text-dim);
    font-variant-numeric: tabular-nums;
  }
  .tname {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tplaying {
    color: var(--gm-accent-2);
  }
</style>
