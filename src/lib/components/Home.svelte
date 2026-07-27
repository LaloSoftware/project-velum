<script>
  import { recentGames, onlyGames } from "../stores/games.js";
  import { goto } from "../stores/ui.js";
  import { imageUrl } from "../util/asset.js";
  import { overrides, effectiveArt } from "../stores/artoverrides.js";
  import GameCard from "./GameCard.svelte";

  // Juego destacado = el enfocado en la tira (por defecto el primero). Su hero se
  // muestra de fondo a pantalla completa, con difuminado arriba/abajo (según tema).
  let featured = null;
  $: if (!featured && $recentGames.length) featured = $recentGames[0];
  // Si cambia la lista y el destacado ya no está, recolocar al primero.
  $: if (featured && !$recentGames.some((g) => g.id === featured.id)) {
    featured = $recentGames[0] || null;
  }

  let bgUrl = null;
  let bgFor = null;
  $: bgSrc = featured ? effectiveArt(featured, $overrides).hero || effectiveArt(featured, $overrides).cover : null;
  $: if (bgSrc !== bgFor) {
    bgFor = bgSrc;
    bgUrl = null;
    imageUrl(bgSrc).then((u) => {
      if (bgSrc === bgFor) bgUrl = u;
    });
  }

  const onCardFocus = (g) => (featured = g);
</script>

<section class="home">
  {#if bgUrl}
    <div class="bg" style="background-image: url('{bgUrl}')"></div>
  {/if}

  <div class="content">
    <header class="hero">
      <h1>Bienvenido</h1>
      <p>Reanuda donde lo dejaste o abre la biblioteca completa.</p>
    </header>

    <h2 class="section-title">Reciente</h2>
    <div class="strip">
      {#each $recentGames.slice(0, 12) as g, i (g.id)}
        <GameCard game={g} focusDefault={i === 0} heroOnFocus={true} onFocus={onCardFocus} />
      {/each}
      {#if $recentGames.length === 0}
        <p class="empty">Aún no has jugado nada. Abre la biblioteca (botón Menú).</p>
      {/if}
    </div>

    <div class="library-cta">
      <button class="cta" data-focusable tabindex="-1" on:click={() => goto("games")}>
        Ver biblioteca completa ({$onlyGames.length}) →
      </button>
    </div>
  </div>
</section>

<style>
  .home {
    position: relative;
    height: 100%;
    padding: var(--gm-pad);
    overflow: hidden;
  }
  /* Fondo hero a pantalla completa, difuminado arriba/abajo hacia el tema
     (la máscara lo desvanece a transparente y deja ver el wallpaper del tema). */
  .bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 22%;
    z-index: 0;
    opacity: 0.55;
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 20%,
      #000 60%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 20%,
      #000 60%,
      transparent 100%
    );
    transition: opacity 0.3s ease;
  }
  /* Velo hacia el color de fondo del tema para legibilidad del texto. */
  .bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      var(--gm-bg) 0%,
      transparent 30%,
      transparent 55%,
      var(--gm-bg) 100%
    );
    opacity: 0.55;
  }
  .content {
    position: relative;
    z-index: 1;
  }
  .hero h1 {
    font-size: 2.6rem;
    font-weight: var(--gm-title-weight);
    margin: 0;
  }
  .hero p {
    color: var(--gm-text-dim);
    margin: 6px 0 26px;
  }
  .section-title {
    font-size: 1.15rem;
    margin: 0 0 14px;
  }
  .strip {
    display: flex;
    gap: var(--gm-gap);
    overflow-x: auto;
    /* Aire para que el grow + anillo no se recorten. El padding da espacio al
       anillo; un margen negativo pequeño deja un hueco visible con el borde
       sin indentar demasiado las tarjetas respecto al título. */
    padding: 10px var(--gm-focus-space) var(--gm-focus-space);
    margin: 0 -12px;
    scroll-padding-inline: var(--gm-focus-space);
    scrollbar-width: none;
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  .strip > :global(.gm-card) {
    flex: 0 0 auto;
  }
  .empty {
    color: var(--gm-text-dim);
  }
  .library-cta {
    margin-top: 18px;
  }
  .cta {
    cursor: pointer;
    padding: 14px 22px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 700;
  }
  .cta:focus {
    background: var(--gm-surface-2);
  }
</style>
