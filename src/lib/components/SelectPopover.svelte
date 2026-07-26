<script>
  import { onMount, tick } from "svelte";
  import { popover, closePopover } from "../stores/ui.js";

  $: p = $popover;
  let el;
  let pos = { left: -9999, top: -9999, width: 0 };

  function reposition() {
    if (!el || !p?.anchor) return;
    const r = p.anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = el.offsetHeight;
    const width = Math.max(r.width, 180);
    let left = r.left;
    if (left + width > vw - 8) left = vw - width - 8;
    left = Math.max(8, left);
    // Debajo del anclaje; si no cabe, encima.
    let top = r.bottom + 4;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - 4);
    pos = { left, top, width };
  }

  onMount(reposition);
  $: p, tick().then(reposition);

  function pick(v) {
    const a = p.anchor;
    p.onSelect(v);
    closePopover();
    a?.focus({ preventScroll: true });
  }
</script>

{#if p}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={closePopover} role="presentation"></div>
  <div class="pop" bind:this={el} style="left:{pos.left}px; top:{pos.top}px; min-width:{pos.width}px" role="listbox">
    {#each p.options as o (o.value)}
      <button
        class="opt"
        class:sel={o.value === p.value}
        data-focusable
        data-focus-default={o.value === p.value ? "" : undefined}
        tabindex="-1"
        on:click={() => pick(o.value)}
      >
        {o.label}
        {#if o.value === p.value}<span class="tick">✓</span>{/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 58;
  }
  .pop {
    position: fixed;
    z-index: 59;
    max-height: 60vh;
    overflow-y: auto;
    padding: 6px;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .opt {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
    padding: 11px 14px;
    border-radius: 10px;
    color: var(--gm-text);
    font-weight: 600;
    white-space: nowrap;
  }
  .opt.sel {
    color: var(--gm-accent-2);
  }
  .opt:focus {
    background: var(--gm-surface-2);
    box-shadow: var(--gm-focus-ring);
  }
  .tick {
    color: var(--gm-accent-2);
  }
</style>
