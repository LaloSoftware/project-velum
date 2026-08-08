<script>
  import { musicPlayer, togglePlayPause, next, previous, toggleShuffle, seek } from "../stores/musicPlayer.js";

  // Mismo degradado por hash del título ya usado en tarjetas de álbum
  // (MusicView.svelte/App.svelte) — no hay carátulas reales (sin parseo de
  // tags ID3), así que el placeholder consistente hace de "arte, si tiene".
  function hue(str) {
    let h = 0;
    for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }
  $: cover = $musicPlayer.current
    ? `linear-gradient(150deg, hsl(${hue($musicPlayer.current.title)} 55% 42%), hsl(${(hue($musicPlayer.current.title) + 40) % 360} 60% 22%))`
    : "";

  $: format = $musicPlayer.current?.path.split(".").pop()?.toUpperCase() || "";

  function mmss(secs) {
    if (!Number.isFinite(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  $: pct = $musicPlayer.duration ? ($musicPlayer.currentTime / $musicPlayer.duration) * 100 : 0;
</script>

<div class="now-playing">
  {#if !$musicPlayer.current}
    <p class="dim">Nada reproduciéndose — elige un álbum o una lista.</p>
  {:else}
    <div class="art" style="background: {cover}"></div>

    <div class="meta">
      <div class="title">{$musicPlayer.current.title}</div>
      <div class="sub dim">
        {$musicPlayer.current.albumName}
        {#if $musicPlayer.current.discName} · {$musicPlayer.current.discName}{/if}
        {#if format} · {format}{/if}
      </div>
    </div>

    <div class="progress">
      <span class="time dim">{mmss($musicPlayer.currentTime)}</span>
      <input
        type="range"
        class="seek"
        data-focusable
        data-focus-default
        tabindex="-1"
        min="0"
        max={$musicPlayer.duration || 0}
        step="1"
        value={$musicPlayer.currentTime}
        on:input={(e) => seek(e.target.value)}
      />
      <span class="time dim">{mmss($musicPlayer.duration)}</span>
    </div>

    <div class="controls">
      <button class="step" data-focusable tabindex="-1" on:click={previous} aria-label="Anterior">⏮</button>
      <button class="step big" data-focusable tabindex="-1" on:click={togglePlayPause} aria-label="Reproducir/pausar">
        {$musicPlayer.playing ? "⏸" : "▶"}
      </button>
      <button class="step" data-focusable tabindex="-1" on:click={next} aria-label="Siguiente">⏭</button>
      <button
        class="step"
        class:on={$musicPlayer.shuffle}
        data-focusable
        tabindex="-1"
        on:click={toggleShuffle}
        aria-label="Aleatorio"
      >
        🔀
      </button>
    </div>
  {/if}
</div>

<style>
  .now-playing {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    text-align: center;
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .art {
    width: min(240px, 50vw);
    aspect-ratio: 1 / 1;
    border-radius: var(--gm-radius-lg);
  }
  .meta {
    max-width: 420px;
  }
  .title {
    font-weight: 800;
    font-size: 1.3rem;
  }
  .sub {
    margin-top: 4px;
    font-size: 0.9rem;
  }
  .progress {
    width: min(420px, 90%);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .time {
    min-width: 38px;
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
  }
  .seek {
    flex: 1;
    accent-color: var(--gm-accent);
  }
  .seek:focus {
    outline: none;
    box-shadow: var(--gm-focus-ring);
    border-radius: 999px;
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
</style>
