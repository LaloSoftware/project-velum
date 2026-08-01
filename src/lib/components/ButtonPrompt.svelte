<script>
  import { promptStyle } from "../stores/prompts.js";
  import { inputSource } from "../stores/inputSource.js";
  import { keyBindings, tokenForAction, labelForToken } from "../stores/keyBindings.js";
  import { iconFor } from "../theming/icons.js";

  // Indicador de botón. `token` = "A" | "B" | "LT" | "RT" | "Menú" | ...
  // Si se da `action` (id de ACTIONS en stores/bindings.js) y la última fuente
  // de input detectada es teclado/mouse, se muestra en su lugar el atajo de
  // teclado/mouse configurado para esa acción — `token` sigue siendo lo que se
  // ve en modo mando (sin cambios respecto a hoy).
  // `button` = id físico de mando (south/east/l1/lt/...) usado en `bindings.js`;
  // si se da y `$promptStyle` no es "auto", se muestra el SVG del set elegido
  // en vez de `token` (solo aplica al indicador de mando, nunca al de
  // teclado/mouse — ese set de iconos no existe).
  export let token = "";
  export let action = null;
  export let button = null;

  // l1/r1 (hombros), lt/rt (gatillos) y l3/r3 (stick) ocupan mucho menos del
  // lienzo de 48x48 que los círculos de south/east/north/west en el set de
  // iconos importado — se agrandan un poco para no quedar casi invisibles.
  const BIG_ICON_BUTTONS = new Set(["l1", "r1", "lt", "rt", "l3", "r3"]);

  $: isKeymouse = action && $inputSource === "keymouse";
  $: display = isKeymouse ? ($keyBindings, labelForToken(tokenForAction(action))) : token;
  $: [iconSet, iconPlatform] = $promptStyle === "auto" ? [null, null] : $promptStyle.split("-");
  $: iconSrc = !isKeymouse && iconSet && button ? iconFor(iconSet, iconPlatform, button) : null;
  $: iconBig = iconSrc && BIG_ICON_BUTTONS.has(button);
</script>

<span class="prompt" class:icon={iconSrc} class:icon-big={iconBig} data-style={$promptStyle}>
  {#if iconSrc}
    <img src={iconSrc} alt={display} />
  {:else}
    {display}
  {/if}
</span>

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
  .prompt.icon {
    padding: 0;
    background: none;
  }
  .prompt.icon img {
    width: 22px;
    height: 22px;
  }
  .prompt.icon-big {
    min-width: 30px;
    height: 30px;
  }
  .prompt.icon-big img {
    width: 30px;
    height: 30px;
  }
</style>
