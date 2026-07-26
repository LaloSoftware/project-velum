<script>
  import { promptStyle } from "../stores/prompts.js";

  // Indicador de botón. `token` = "A" | "B" | "LT" | "RT" | "Menú" | ...
  // Hoy siempre muestra el texto; preparado para sustituir por iconos según
  // `$promptStyle` (Xbox/PlayStation/genérico) más adelante.
  export let token = "";
</script>

<span class="prompt" data-style={$promptStyle}>{token}</span>

<style>
  .prompt {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.3px;
  }
</style>
