<script>
  import {
    playlists,
    renamePlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    moveTrackUp,
    moveTrackDown,
  } from "../stores/playlists.js";
  import { musicPlayer, playPlaylist, playPlaylistFrom } from "../stores/musicPlayer.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { showToast } from "../stores/ui.js";
  import { names, playlistNameNow } from "../i18n/names.js";

  export let playlist;
  export let onBack = () => {};

  // Sigue la playlist actualizada del store (reorder/quitar pistas la muta).
  $: current = $playlists.find((p) => p.id === playlist.id) || playlist;

  async function rename() {
    const name = await openKeyboard(current.name, "Nombre de la lista");
    if (name) await renamePlaylist(current.id, name);
  }

  async function removeThisPlaylist() {
    await deletePlaylist(current.id);
    showToast(`Lista "${playlistNameNow(current)}" eliminada`);
    onBack();
  }
</script>

<section class="playlist-detail">
  <header class="head">
    <button class="back" data-focusable data-focus-default tabindex="-1" on:click={onBack}>← Volver</button>
    <h1>{$names.playlist(current)}</h1>
    <div class="head-actions">
      <button class="chip" data-focusable tabindex="-1" on:click={rename}>Renombrar</button>
      <button class="chip danger" data-focusable tabindex="-1" on:click={removeThisPlaylist}>
        Eliminar lista
      </button>
    </div>
  </header>

  <div class="actions">
    <button
      class="chip primary"
      data-focusable
      tabindex="-1"
      disabled={!current.trackIds.length}
      on:click={() => playPlaylist(current)}
    >
      ▶ Reproducir
    </button>
    <button
      class="chip"
      data-focusable
      tabindex="-1"
      disabled={!current.trackIds.length}
      on:click={() => playPlaylist(current, { shuffle: true })}
    >
      🔀 Aleatorio
    </button>
  </div>

  <!-- Sin data-focus-group propio a propósito — ver MusicAlbumDetail.svelte
       (mismo bug de foco anidado, ver docs/input.md). -->
  <div class="tracks">
    {#if !current.trackIds.length}
      <p class="dim">Sin pistas todavía — agrégalas desde el detalle de un álbum ("Agregar a lista").</p>
    {:else}
      {#each current.trackIds as t, i (t.path)}
        <div class="track-row">
          <button
            class="track"
            class:current={$musicPlayer.current?.path === t.path}
            data-focusable
            tabindex="-1"
            on:click={() => playPlaylistFrom(current, t.path)}
          >
            <span class="tnum">{i + 1}</span>
            <span class="tname">{t.title}</span>
            <span class="talbum dim">{t.albumName}</span>
            {#if $musicPlayer.current?.path === t.path}
              <span class="tplaying">{$musicPlayer.playing ? "▶" : "⏸"}</span>
            {/if}
          </button>
          <div class="reorder">
            <button
              class="mini"
              data-focusable
              tabindex="-1"
              disabled={i === 0}
              on:click={() => moveTrackUp(current.id, t.path)}
              aria-label="Mover arriba"
            >
              ▲
            </button>
            <button
              class="mini"
              data-focusable
              tabindex="-1"
              disabled={i === current.trackIds.length - 1}
              on:click={() => moveTrackDown(current.id, t.path)}
              aria-label="Mover abajo"
            >
              ▼
            </button>
            <button
              class="mini danger"
              data-focusable
              tabindex="-1"
              on:click={() => removeTrackFromPlaylist(current.id, t.path)}
              aria-label="Quitar de la lista"
            >
              ✕
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>

<style>
  .playlist-detail {
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
  .track-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .track {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
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
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .talbum {
    font-size: 0.8rem;
    flex-shrink: 0;
  }
  .tplaying {
    color: var(--gm-accent-2);
  }
  .reorder {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .mini {
    cursor: pointer;
    width: 34px;
    height: 34px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text-dim);
  }
  .mini.danger {
    color: var(--gm-danger);
  }
  .mini:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .mini:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
