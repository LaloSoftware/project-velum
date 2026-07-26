<script>
  import { openDetail } from "../stores/ui.js";

  export let game;
  export let focusDefault = false;

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", other: "App" };

  // Portada placeholder determinista a partir del título (sin assets binarios).
  function hue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }
  $: h = hue(game.title);
  $: cover = game.coverPath
    ? `center / cover no-repeat url("${game.coverPath}")`
    : `linear-gradient(150deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 22%))`;

  function open() {
    openDetail(game);
  }
</script>

<div
  class="gm-card"
  data-focusable
  data-focus-default={focusDefault ? "" : undefined}
  tabindex="-1"
  role="button"
  aria-label={game.title}
  on:click={open}
  on:keydown={(e) => (e.key === "Enter" || e.key === " ") && open()}
>
  <div class="cover" style="background: {cover}">
    {#if !game.coverPath}
      <span class="cover-title">{game.title}</span>
    {/if}
    <span class="badge">{STORE_LABEL[game.store] || game.store}</span>
  </div>
  <div class="title">{game.title}</div>
</div>

<style>
  .gm-card {
    width: var(--gm-card-w);
    cursor: pointer;
    transition: transform 0.12s ease;
    outline: none;
  }
  .gm-card:focus {
    transform: scale(var(--gm-focus-scale));
    z-index: 2;
  }
  .cover {
    position: relative;
    width: 100%;
    aspect-ratio: var(--gm-card-ratio);
    border-radius: var(--gm-radius);
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  .cover-title {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    text-align: center;
    font-weight: var(--gm-title-weight);
    font-size: 1.05rem;
    color: #fff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }
  .badge {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--gm-bg-overlay);
    color: var(--gm-text);
    backdrop-filter: blur(4px);
  }
  .title {
    margin-top: 8px;
    font-size: 0.9rem;
    color: var(--gm-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gm-card:focus .title {
    color: var(--gm-text);
  }
</style>
