<script>
  import { onMount, tick } from "svelte";
  import { popover, closePopover } from "../stores/ui.js";

  $: p = $popover;
  let el;
  let pos = { left: -9999, top: -9999, width: 0 };

  // Estado local de selección para el modo multi: da feedback ✓ inmediato sin
  // depender de re-leer el store externo mientras el popover sigue abierto.
  let selected = new Set();
  let lastP = null;
  $: if (p !== lastP) {
    lastP = p;
    selected = new Set(p && p.multi ? p.values || [] : []);
  }

  function isSel(o) {
    return p.multi ? selected.has(o.value) : o.value === p.value;
  }

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
    // Multi: alterna y mantiene abierto (selección múltiple).
    if (p.multi) {
      if (selected.has(v)) selected.delete(v);
      else selected.add(v);
      selected = new Set(selected); // reactividad
      p.onToggle(v);
      return;
    }
    // Single: elige, cierra y devuelve el foco al anclaje.
    const a = p.anchor;
    p.onSelect(v);
    closePopover();
    a?.focus({ preventScroll: true });
  }

  // Foco por defecto: en single, la opción activa; en multi, la primera.
  function isDefaultFocus(o, i) {
    return p.multi ? i === 0 : o.value === p.value;
  }

  // Cierra devolviendo el foco al anclaje (para scrim y "Listo" del modo multi).
  function done() {
    const a = p.anchor;
    closePopover();
    a?.focus({ preventScroll: true });
  }
</script>

{#if p}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={done} role="presentation"></div>
  <div class="pop" bind:this={el} style="left:{pos.left}px; top:{pos.top}px; min-width:{pos.width}px" role="listbox">
    {#each p.options as o, i (o.value)}
      <button
        class="opt"
        class:sel={isSel(o)}
        data-focusable
        data-focus-default={isDefaultFocus(o, i) ? "" : undefined}
        tabindex="-1"
        on:click={() => pick(o.value)}
      >
        {#if p.multi}<span class="box" class:on={isSel(o)}>{isSel(o) ? "✓" : ""}</span>{/if}
        <span class="opt-label">{o.label}</span>
        {#if !p.multi && isSel(o)}<span class="tick">✓</span>{/if}
      </button>
    {/each}
    {#if p.multi}
      <button class="opt done" data-focusable tabindex="-1" on:click={done}>
        <span class="opt-label">Listo</span>
      </button>
    {/if}
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
  .opt-label {
    flex: 1;
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
  /* Casilla del modo multi */
  .box {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: 2px solid var(--gm-surface-2);
    color: #06101f;
    font-size: 0.8rem;
    font-weight: 800;
  }
  .box.on {
    background: var(--gm-accent);
    border-color: var(--gm-accent);
  }
  .done {
    justify-content: center;
    color: var(--gm-text-dim);
    margin-top: 4px;
    border-top: 1px solid var(--gm-surface-2);
    border-radius: 0 0 10px 10px;
  }
  .done .opt-label {
    flex: 0 0 auto;
    font-weight: 800;
  }
</style>
