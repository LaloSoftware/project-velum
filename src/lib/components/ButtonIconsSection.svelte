<script>
  import { PROMPT_STYLES, promptStyle, setPromptStyle } from "../stores/prompts.js";
  import Select from "./Select.svelte";
  import ButtonPrompt from "./ButtonPrompt.svelte";

  // Botones representativos para la vista previa (acción, dirección y hombros).
  const PREVIEW_BUTTONS = ["south", "east", "north", "west", "l1", "r1", "lt", "rt", "start", "select", "guide"];
</script>

<section class="panel">
  <h1>Iconos de botones</h1>
  <p class="dim">
    Estilo de los indicadores de botón de mando en la interfaz: texto plano o un set
    de iconos por plataforma. Los atajos de teclado/mouse siempre se muestran como texto.
  </p>

  <div class="wrap">
    <Select
      value={$promptStyle}
      options={PROMPT_STYLES.map((s) => ({ value: s.id, label: s.label }))}
      onChange={setPromptStyle}
    />
  </div>

  <p class="dim preview-label">Vista previa</p>
  <div class="preview">
    {#each PREVIEW_BUTTONS as b}
      <ButtonPrompt token={b} button={b} />
    {/each}
  </div>
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
  .wrap {
    margin-top: 20px;
  }
  .preview-label {
    margin-top: 26px;
  }
  .preview {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
  }
</style>
