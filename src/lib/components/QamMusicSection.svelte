<script>
  import {
    musicPlayer,
    togglePlayPause,
    next,
    previous,
    toggleShuffle,
    setVolume,
  } from "../stores/musicPlayer.js";
  import { t } from "../i18n/index.js";

  $: pct = $musicPlayer.duration ? Math.round(($musicPlayer.currentTime / $musicPlayer.duration) * 100) : 0;
</script>

<div class="qam">
  <h2>{$t("multimedia.section.music")}</h2>
  {#if !$musicPlayer.current}
    <p class="dim">
      {$t("qam.music.nothingPlaying")}
    </p>
  {:else}
    <div class="now">
      <div class="now-title">{$musicPlayer.current.title}</div>
      <div class="now-sub dim">{$musicPlayer.current.albumName}</div>
    </div>
    <div class="bar">
      <div class="fill" style="width: {pct}%"></div>
    </div>

    <div class="controls">
      <button class="step" data-focusable tabindex="-1" on:click={previous} aria-label={$t("music.previous")}>⏮</button>
      <button class="step big" data-focusable data-focus-default tabindex="-1" on:click={togglePlayPause} aria-label={$t("music.playPause")}>
        {$musicPlayer.playing ? "⏸" : "▶"}
      </button>
      <button class="step" data-focusable tabindex="-1" on:click={next} aria-label={$t("music.next")}>⏭</button>
      <button
        class="step"
        class:on={$musicPlayer.shuffle}
        data-focusable
        tabindex="-1"
        on:click={toggleShuffle}
        aria-label={$t("common.shuffle")}
      >
        🔀
      </button>
    </div>

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
        value={Math.round($musicPlayer.volume * 100)}
        on:input={(e) => setVolume(e.target.value / 100)}
      />
      <span class="pct">{Math.round($musicPlayer.volume * 100)}</span>
    </div>
  {/if}
</div>

<style>
  .qam {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  h2 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: var(--gm-title-weight);
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .now-title {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .now-sub {
    font-size: 0.85rem;
  }
  .bar {
    height: 6px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--gm-accent);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
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
  .step.big {
    width: 56px;
    height: 56px;
    font-size: 1.4rem;
    background: var(--gm-accent);
    color: #06101f;
  }
  .step.on {
    background: var(--gm-accent);
    color: #06101f;
  }
  .step:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .volrow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
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
  .pct {
    min-width: 30px;
    text-align: right;
    font-weight: 700;
    color: var(--gm-text-dim);
  }
</style>
