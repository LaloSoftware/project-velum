<script>
  import { closeDetail, showToast, detailExpanded } from "../stores/ui.js";
  import { startPlay } from "../stores/playsession.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { groups, createGroup, toggleGameInGroup } from "../stores/groups.js";
  import { imageUrl } from "../util/asset.js";
  import { overrides, effectiveArt } from "../stores/artoverrides.js";
  import ArtEditor from "./ArtEditor.svelte";

  export let game;

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", other: "App" };

  const inGroup = (g) => g.gameIds.includes(game.id);
  // Fondo = hero efectivo (override manual o el de la tienda).
  let heroUrl = null;
  let heroFor = null;
  $: heroSrc = effectiveArt(game, $overrides).hero;
  $: if (heroSrc !== heroFor) {
    heroFor = heroSrc;
    heroUrl = null;
    imageUrl(heroSrc).then((u) => {
      if (heroSrc === heroFor) heroUrl = u;
    });
  }

  // Carátula expandida (wide) para el lado derecho del menú, si está disponible.
  let wideUrl = null;
  let wideFor = null;
  $: wideSrc = effectiveArt(game, $overrides).wide;
  $: if (wideSrc !== wideFor) {
    wideFor = wideSrc;
    wideUrl = null;
    if (wideSrc)
      imageUrl(wideSrc).then((u) => {
        if (wideSrc === wideFor) wideUrl = u;
      });
  }

  async function newGroup() {
    const name = await openKeyboard("", "Nombre del grupo");
    if (name) {
      await createGroup(name, game.id);
      showToast(`Añadido a «${name}»`);
    }
  }

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
    await startPlay(game);
  }
</script>

<div class="detail" class:expanded={$detailExpanded} style="--hue: {h}">
  <!-- Escenario (hero): a pantalla completa; al desplegar el menú baja a la mitad -->
  <div class="stage">
    <div
      class="art"
      class:photo={!!heroUrl}
      style={heroUrl ? `background-image: url("${heroUrl}")` : ""}
    ></div>
    <div class="content">
      <span class="store">{STORE_LABEL[game.store] || game.store}</span>
      <h1>{game.title}</h1>
      <p class="meta">{fmtLast(game.lastPlayed)}</p>
      {#if game.installDir}<p class="meta dim">{game.installDir}</p>{/if}

      <div class="actions">
        <button
          class="play"
          data-focusable={!$detailExpanded ? "" : undefined}
          data-focus-default
          tabindex="-1"
          on:click={play}
        >
          ▶ Jugar
        </button>
        <button
          class="back"
          data-focusable={!$detailExpanded ? "" : undefined}
          tabindex="-1"
          on:click={closeDetail}
        >
          Volver
        </button>
      </div>
    </div>
  </div>

  <!-- Menú inferior (aparece al pulsar abajo): Grupos + Imágenes -->
  {#if $detailExpanded}
    <div class="menu">
      <!-- Mitad izquierda: opciones (Grupos + Imágenes), más anchas -->
      <div class="menu-main">
        <section class="msection" data-focus-group="grupos" data-detail-top>
          <h3>Grupos</h3>
          <div class="groups">
            {#each $groups as g (g.id)}
              <button
                class="chip"
                class:on={inGroup(g)}
                data-focusable
                tabindex="-1"
                on:click={() => toggleGameInGroup(g.id, game.id)}
              >
                {inGroup(g) ? "✓ " : "+ "}{g.name}
              </button>
            {/each}
            <button class="chip new" data-focusable tabindex="-1" on:click={newGroup}>
              + Nuevo grupo
            </button>
          </div>
        </section>

        <section class="msection" data-focus-group="imagenes">
          <h3>Imágenes</h3>
          <ArtEditor {game} />
        </section>
      </div>

      <!-- Mitad derecha: carátula expandida con difuminado a la izquierda -->
      {#if wideUrl}
        <div class="menu-art" style="background-image: url('{wideUrl}')"></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .detail {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--gm-wallpaper);
  }
  .stage {
    position: relative;
    display: flex;
    align-items: flex-end;
    padding: var(--gm-pad);
    overflow: hidden;
    /* flex-basis (no height%) para que el tamaño resuelva bien dentro del flex.
       Colapsado ocupa todo; expandido, la mitad, con transición suave. */
    flex: 0 0 100%;
    transition: flex-basis 0.3s ease;
  }
  .detail.expanded .stage {
    flex-basis: 50%;
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
  .art.photo {
    background-color: hsl(var(--hue) 55% 12%);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
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

  /* Menú inferior a dos columnas: opciones (izq) + carátula expandida (der) */
  .menu {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    display: flex;
    flex-direction: row;
  }
  /* Mitad izquierda: opciones, más anchas y con scroll propio */
  .menu-main {
    flex: 1 1 50%;
    min-width: 0;
    overflow-y: auto;
    padding: var(--gm-pad);
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  /* Mitad derecha: carátula expandida, difuminada hacia la izquierda para
     fundirse con las opciones. */
  .menu-art {
    flex: 1 1 50%;
    align-self: stretch;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 38%);
    mask-image: linear-gradient(to right, transparent 0%, #000 38%);
  }
  .msection h3 {
    margin: 0 0 12px;
    font-size: 1.15rem;
    color: var(--gm-text-dim);
  }
  .groups {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .groups .chip {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 600;
  }
  .groups .chip.on {
    background: var(--gm-accent);
    color: #06101f;
  }
  .groups .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
