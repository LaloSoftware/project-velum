<script>
  export let label = "";
</script>

<section class="coming-soon">
  <p class="dim">{label}: próximamente.</p>
</section>

<style>
  .coming-soon {
    padding: var(--gm-pad);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dim {
    color: var(--gm-text-dim);
  }
</style>
