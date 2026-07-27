<script>
  import { onlyApps } from "../stores/games.js";
  import { sortApps, sortList } from "../stores/sorting.js";
  import GameGrid from "./GameGrid.svelte";

  // Orden persistente (Apps), separado del de Juegos.
  $: shownApps = sortList($onlyApps, $sortApps);
</script>

<section class="apps">
  <p class="sub">Apps que no son juegos (multimedia, chat, navegador…).</p>
  <GameGrid items={shownApps} focusFirst={true} />
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
