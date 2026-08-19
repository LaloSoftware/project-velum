<script>
  import { openPopover } from "../stores/ui.js";
  import { t } from "../i18n/index.js";

  // Un solo control que despliega su lista al activarlo (mejor navegación que
  // tener las opciones sueltas).
  //
  // `options` = [{ value, labelKey }] para texto de la app, o [{ value, label }]
  // para texto que NO se traduce (nombres de grupo, listas y perfiles que
  // escribió el usuario, nombres de tema externos). `labelKey` gana si están los
  // dos. Resolver acá —y no en cada llamador— evita repetir el mismo bloque
  // reactivo en los ~15 sitios que usan este control, y que olvidarlo pase el
  // build y deje la clave cruda en pantalla.
  //
  // Modo single (por defecto): `value` + `onChange`.
  // Modo multi: `multi`, `values` (array) + `onToggle`.
  export let value = undefined;
  export let options = [];
  export let onChange = () => {};
  export let label = "";
  export let multi = false;
  export let values = [];
  export let onToggle = () => {};
  export let placeholder = "—";

  let btn;
  // Se le pasan al popover ya resueltas: una sola traducción por opción.
  $: resolved = options.map((o) => (o.labelKey ? { ...o, label: $t(o.labelKey) } : o));
  $: current = resolved.find((o) => o.value === value);
  $: summary = multi
    ? values.length
      ? resolved
          .filter((o) => values.includes(o.value))
          .map((o) => o.label)
          .join(", ")
      : $t("common.none")
    : current
      ? current.label
      : placeholder;

  function open() {
    if (multi) {
      openPopover({ multi: true, options: resolved, values, anchor: btn, onToggle });
    } else {
      openPopover({ options: resolved, value, anchor: btn, onSelect: onChange });
    }
  }
</script>

<button class="select" bind:this={btn} data-focusable tabindex="-1" on:click={open}>
  {#if label}<span class="lbl">{label}</span>{/if}
  <span class="val">{summary}</span>
  <span class="caret">▾</span>
</button>

<style>
  .select {
    cursor: pointer;
    display: flex;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
  }
  .lbl {
    color: var(--gm-text-dim);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .val {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .caret {
    color: var(--gm-text-dim);
    font-size: 0.8rem;
  }
  .select:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
