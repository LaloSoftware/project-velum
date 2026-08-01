<script>
  import { promptStyle } from "../stores/prompts.js";
  import { inputSource } from "../stores/inputSource.js";
  import { keyBindings, tokenForAction, labelForToken } from "../stores/keyBindings.js";

  // Indicador de botón. `token` = "A" | "B" | "LT" | "RT" | "Menú" | ...
  // Si se da `action` (id de ACTIONS en stores/bindings.js) y la última fuente
  // de input detectada es teclado/mouse, se muestra en su lugar el atajo de
  // teclado/mouse configurado para esa acción — `token` sigue siendo lo que se
  // ve en modo mando (sin cambios respecto a hoy).
  // Preparado para sustituir por iconos según `$promptStyle` más adelante.
  export let token = "";
  export let action = null;

  $: display =
    action && $inputSource === "keymouse"
      ? ($keyBindings, labelForToken(tokenForAction(action)))
      : token;
</script>

<span class="prompt" data-style={$promptStyle}>{display}</span>

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
