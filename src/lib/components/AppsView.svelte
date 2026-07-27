<script>
  import { onlyApps } from "../stores/games.js";
  import GameGrid from "./GameGrid.svelte";
</script>

<section class="apps">
  <p class="sub">Apps que no son juegos (multimedia, chat, navegador…).</p>
  <GameGrid items={$onlyApps} focusFirst={true} />
</section>

<style>
  .apps {
    padding: var(--gm-pad);
  }
  .sub {
    color: var(--gm-text-dim);
    margin: 0 0 24px;
  }
</style>
