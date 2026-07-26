<script>
  import { onlyApps } from "../stores/games.js";
  import GameGrid from "./GameGrid.svelte";
</script>

<section class="apps">
  <h1>Aplicaciones</h1>
  <p class="sub">Apps que no son juegos (multimedia, chat, navegador…).</p>
  <GameGrid items={$onlyApps} focusFirst={true} />
</section>

<style>
  .apps {
    padding: var(--gm-pad);
  }
  h1 {
    font-size: 2.2rem;
    font-weight: var(--gm-title-weight);
    margin: 0;
  }
  .sub {
    color: var(--gm-text-dim);
    margin: 6px 0 24px;
  }
</style>
