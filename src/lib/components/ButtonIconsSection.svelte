<script>
  import { PROMPT_STYLES, promptStyle, setPromptStyle } from "../stores/prompts.js";
  import Select from "./Select.svelte";
</script>

<section class="panel">
  <h1>Iconos de botones</h1>
  <p class="dim">
    Estilo de los indicadores de botón en la interfaz. Por ahora se muestran como texto;
    los sets de iconos (Xbox / PlayStation / genérico) llegarán más adelante.
  </p>

  <div class="wrap">
    <Select
      value={$promptStyle}
      options={PROMPT_STYLES.map((s) => ({ value: s.id, label: s.label }))}
      onChange={setPromptStyle}
    />
  </div>

  <p class="dim soon">Más estilos de iconos: próximamente.</p>
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
    margin: 0 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
  }
  .soon {
    margin-top: 26px;
  }
  .wrap {
    margin-top: 20px;
  }
</style>
