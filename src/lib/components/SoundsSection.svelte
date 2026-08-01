<script>
  // El sonido de inicio se configura en Ajustes > Configuración de inicio
  // (StartupSection.svelte), junto al resto de lo que pasa al arrancar.
  // Esta sección queda para los próximos sets de sonidos (navegación, etc.)
  // cuando se agreguen — ver theming/sounds.js.
</script>

<section class="panel">
  <h1>Sonidos</h1>
  <p class="dim">
    El sonido de inicio se configura en Ajustes &gt; Configuración de inicio.
    Los sonidos de navegación (al moverse por menús y tarjetas) llegarán acá
    más adelante.
  </p>
</section>

<style>
  .panel {
    padding: var(--gm-pad);
    height: 100%;
    overflow-y: auto;
    max-width: 640px;
  }
  h1 {
    font-size: 2rem;
    font-weight: var(--gm-title-weight);
    margin: 0 0 18px;
  }
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
  }
</style>
