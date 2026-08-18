<script>
  import { onMount } from "svelte";
  import { musicPlayer, playAlbum, playAlbumFrom, getAlbumScan, invalidateAlbumTracks } from "../stores/musicPlayer.js";
  import { renameAlbum, removeAlbum } from "../stores/musicLibrary.js";
  import { playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } from "../stores/playlists.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { openPopover, showToast, reportError } from "../stores/ui.js";
  import { names } from "../i18n/names.js";
  import { t, tr } from "../i18n/index.js";

  export let album;
  export let onBack = () => {};

  let scan = { tracks: [], discs: [] };
  let loading = true;

  // Numeración continua a través de todo el álbum (sueltas + discos en
  // orden), igual que muestra Steam para OSTs multi-disco.
  $: rows = (() => {
    let n = 0;
    const loose = scan.tracks.map((t) => ({ ...t, num: ++n }));
    const discs = scan.discs.map((d) => ({ ...d, tracks: d.tracks.map((t) => ({ ...t, num: ++n })) }));
    return { loose, discs };
  })();
  $: hasTracks = scan.tracks.length > 0 || scan.discs.some((d) => d.tracks.length);

  async function load() {
    loading = true;
    try {
      scan = await getAlbumScan(album);
    } catch (e) {
      reportError(e, "MusicAlbumDetail:load");
      scan = { tracks: [], discs: [] };
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

  const NEW_PLAYLIST = "__new__";

  function playlistsWithTrack(path) {
    return $playlists.filter((p) => p.trackIds.some((t) => t.path === path)).map((p) => p.id);
  }

  async function togglePlaylist(track, playlistId) {
    if (playlistId === NEW_PLAYLIST) {
      const name = await openKeyboard("", tr("keyboard.title.playlistName"));
      if (!name) return;
      const pl = await createPlaylist(name);
      await addTrackToPlaylist(pl.id, {
        path: track.path,
        title: track.name,
        albumId: album.id,
        albumName: album.name,
      });
      showToast(tr("music.toast.addedToPlaylist", { name }));
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
      ...$playlists.map((p) => ({ value: p.id, label: $names.playlist(p) })),
      { value: NEW_PLAYLIST, label: `＋ ${$t("music.newPlaylistOption")}` },
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

  <div class="actions">
    <button
      class="chip primary"
      data-focusable
      tabindex="-1"
      disabled={!hasTracks}
      on:click={() => playAlbum(album)}
    >
      ▶ {$t("music.playAlbum")}
    </button>
    <button
      class="chip"
      data-focusable
      tabindex="-1"
      disabled={!hasTracks}
      on:click={() => playAlbum(album, { shuffle: true })}
    >
      🔀 {$t("common.shuffle")}
    </button>
  </div>

  {#snippet trackRow(t)}
    <button
      class="track"
      class:current={$musicPlayer.current?.path === t.path}
      data-focusable
      tabindex="-1"
      on:click={() => playAlbumFrom(album, t.path)}
      on:gmdetail={(e) => addToListMenu(t, e.currentTarget)}
    >
      <span class="tnum">{t.num}</span>
      <span class="tname">{t.name}</span>
      {#if $musicPlayer.current?.path === t.path}
        <span class="tplaying">{$musicPlayer.playing ? "▶" : "⏸"}</span>
      {/if}
    </button>
  {/snippet}

  <!-- Sin data-focus-group propio a propósito: agrupar la lista de pistas
       anida un grupo dentro del "panel" de MultimediaView y rompe la
       navegación geométrica hacia abajo (ver docs/input.md). La geometría
       normal de una lista vertical ya resuelve "abajo" sin agrupar. -->
  <div class="tracks">
    {#if loading}
      <p class="dim">{$t("common.loading")}</p>
    {:else if !hasTracks}
      <p class="dim">{$t("music.noAudioFiles")}</p>
    {:else}
      {#each rows.loose as t (t.path)}
        {@render trackRow(t)}
      {/each}
      {#each rows.discs as d (d.name)}
        <div class="disc-header">{d.name}</div>
        {#each d.tracks as t (t.path)}
          {@render trackRow(t)}
        {/each}
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
  .disc-header {
    margin: 10px 0 2px;
    padding: 8px 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
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
