<script>
  import { openPopover } from "../stores/ui.js";

  // Un solo control que despliega su lista al activarlo (mejor navegación que
  // tener las opciones sueltas). `options` = [{ value, label }].
  export let value;
  export let options = [];
  export let onChange = () => {};
  export let label = "";

  let btn;
  $: current = options.find((o) => o.value === value);

  function open() {
    openPopover({ options, value, anchor: btn, onSelect: onChange });
  }
</script>

<button class="select" bind:this={btn} data-focusable tabindex="-1" on:click={open}>
  {#if label}<span class="lbl">{label}</span>{/if}
  <span class="val">{current ? current.label : "—"}</span>
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
  }
  .caret {
    color: var(--gm-text-dim);
    font-size: 0.8rem;
  }
  .select:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
