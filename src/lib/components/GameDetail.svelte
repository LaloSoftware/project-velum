<script>
  import { detailGame, closeDetail, showToast } from "../stores/ui.js";
  import { launchGame } from "../ipc/index.js";

  export let game;

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", other: "App" };

  function hue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }
  $: h = hue(game.title);

  function fmtLast(ts) {
    if (!ts) return "Nunca jugado";
    const d = new Date(ts * 1000);
    return "Última vez: " + d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  }

  async function play() {
    showToast(`Lanzando ${game.title}…`);
    await launchGame(game.id, game.launchTarget);
    // En la app real, aquí el launcher se suspende hasta que el juego cierra.
  }
</script>

<div
  class="detail"
  style="--hue: {h}"
>
  <div class="art"></div>
  <div class="content">
    <span class="store">{STORE_LABEL[game.store] || game.store}</span>
    <h1>{game.title}</h1>
    <p class="meta">{fmtLast(game.lastPlayed)}</p>
    {#if game.installDir}<p class="meta dim">{game.installDir}</p>{/if}

    <div class="actions">
      <button class="play" data-focusable data-focus-default tabindex="-1" on:click={play}>
        ▶ Jugar
      </button>
      <button class="back" data-focusable tabindex="-1" on:click={closeDetail}>
        Volver
      </button>
    </div>
  </div>
</div>

<style>
  .detail {
    position: relative;
    height: 100%;
    display: flex;
    align-items: flex-end;
    padding: var(--gm-pad);
    overflow: hidden;
  }
  .art {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        120deg,
        hsl(var(--hue) 55% 30%),
        hsl(calc(var(--hue) + 40) 60% 14%)
      );
    z-index: 0;
  }
  .art::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.72));
  }
  .content {
    position: relative;
    z-index: 1;
    max-width: 720px;
  }
  .store {
    font-weight: 700;
    color: var(--gm-accent-2);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 0.85rem;
  }
  h1 {
    font-size: 3rem;
    margin: 6px 0 12px;
    font-weight: var(--gm-title-weight);
  }
  .meta {
    margin: 2px 0;
    color: var(--gm-text);
  }
  .meta.dim {
    color: var(--gm-text-dim);
    font-size: 0.9rem;
  }
  .actions {
    margin-top: 26px;
    display: flex;
    gap: 14px;
  }
  .play,
  .back {
    cursor: pointer;
    padding: 16px 34px;
    border-radius: var(--gm-radius);
    font-weight: 800;
    font-size: 1.05rem;
  }
  .play {
    background: var(--gm-accent);
    color: #06101f;
  }
  .back {
    background: var(--gm-surface);
    color: var(--gm-text);
  }
  .play:focus,
  .back:focus {
    box-shadow: var(--gm-focus-ring);
    transform: scale(1.04);
  }
</style>
