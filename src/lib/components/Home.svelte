<script>
  import { recentGames, onlyGames } from "../stores/games.js";
  import { goto } from "../stores/ui.js";
  import GameCard from "./GameCard.svelte";
</script>

<section class="home">
  <header class="hero">
    <h1>Bienvenido</h1>
    <p>Reanuda donde lo dejaste o abre la biblioteca completa.</p>
  </header>

  <h2 class="section-title">Reciente</h2>
  <div class="strip">
    {#each $recentGames.slice(0, 12) as g, i (g.id)}
      <GameCard game={g} focusDefault={i === 0} />
    {/each}
    {#if $recentGames.length === 0}
      <p class="empty">Aún no has jugado nada. Abre la biblioteca (botón Menú).</p>
    {/if}
  </div>

  <div class="library-cta">
    <button
      class="cta"
      data-focusable
      tabindex="-1"
      on:click={() => goto("games")}
    >
      Ver biblioteca completa ({$onlyGames.length}) →
    </button>
  </div>
</section>

<style>
  .home {
    padding: var(--gm-pad);
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
