<script>
  import { onMount, tick } from "svelte";
  import {
    contextMenu,
    setContextSub,
    closeContext,
    openDetail,
    openConfirm,
    showToast,
  } from "../stores/ui.js";
  import { startPlay } from "../stores/playsession.js";
  import { hide } from "../stores/hidden.js";
  import { groups, createGroup, toggleGameInGroup } from "../stores/groups.js";
  import { openKeyboard } from "../stores/keyboard.js";

  $: menu = $contextMenu; // { game, rect, sub }
  $: game = menu?.game;
  $: sub = menu?.sub || null;
  $: isApp = game?.kind === "app";
  $: inGroups = game ? $groups.filter((g) => g.gameIds.includes(game.id)) : [];
  $: notInGroups = game ? $groups.filter((g) => !g.gameIds.includes(game.id)) : [];

  let el;
  let pos = { left: -9999, top: -9999 };

  function reposition() {
    if (!el || !menu?.rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = menu.rect.right + 8;
    if (left + w > vw - 8) left = menu.rect.left - w - 8;
    left = Math.max(8, left);
    let top = menu.rect.top;
    if (top + h > vh - 8) top = vh - h - 8;
    top = Math.max(8, top);
    pos = { left, top };
  }

  onMount(reposition);
  // Reposicionar al cambiar de submenú (cambia la altura del menú) o si
  // cambia el tamaño de la ventana mientras el menú sigue abierto.
  $: sub, tick().then(reposition);
  onMount(() => {
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  });

  function play() {
    closeContext();
    startPlay(game);
  }
  function detail() {
    // Se traslada el ancla al detalle: al cerrarlo, el foco vuelve a esta tarjeta.
    openDetail(game, menu.anchor);
    closeContext();
  }
  function ocultar() {
    const a = menu.anchor;
    hide(game.id);
    showToast(`«${game.title}» oculto`);
    closeContext();
    a?.focus({ preventScroll: true });
  }
  function eliminar() {
    openConfirm(game);
    closeContext();
  }
  async function addTo(g) {
    const a = menu.anchor;
    await toggleGameInGroup(g.id, game.id);
    showToast(`Añadido a «${g.name}»`);
    closeContext();
    a?.focus({ preventScroll: true });
  }
  async function removeFrom(g) {
    const a = menu.anchor;
    await toggleGameInGroup(g.id, game.id);
    showToast(`Quitado de «${g.name}»`);
    closeContext();
    a?.focus({ preventScroll: true });
  }
  async function nuevoGrupo() {
    const a = menu.anchor;
    const name = await openKeyboard("", "Nombre del grupo");
    if (name) {
      await createGroup(name, game.id);
      showToast(`Añadido a «${name}»`);
    }
    closeContext();
    a?.focus({ preventScroll: true });
  }
  function dismiss() {
    const a = menu.anchor;
    closeContext();
    a?.focus({ preventScroll: true });
  }
</script>

{#if game}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={dismiss} role="presentation"></div>
  <div class="menu" bind:this={el} style="left:{pos.left}px; top:{pos.top}px" role="menu">
    {#if !sub}
      <button class="mi" data-focusable data-focus-default tabindex="-1" on:click={play}>
        {isApp ? "Ejecutar" : "Jugar"}
      </button>
      <button class="mi" data-focusable tabindex="-1" on:click={detail}>Detalles</button>
      <div class="sep"></div>
      <button class="mi" data-focusable tabindex="-1" on:click={() => setContextSub("add")}>
        Agregar a grupo ›
      </button>
      <button
        class="mi"
        class:disabled={inGroups.length === 0}
        data-focusable={inGroups.length > 0 ? "" : undefined}
        aria-disabled={inGroups.length === 0}
        tabindex="-1"
        on:click={() => inGroups.length && setContextSub("remove")}
      >
        Retirar de grupo ›
      </button>
      <div class="sep"></div>
      <button class="mi" data-focusable tabindex="-1" on:click={ocultar}>Ocultar</button>
      <button class="mi danger" data-focusable tabindex="-1" on:click={eliminar}>Eliminar</button>
    {:else if sub === "add"}
      <button class="mi back" data-focusable data-focus-default tabindex="-1" on:click={() => setContextSub(null)}>‹ Volver</button>
      {#each notInGroups as g (g.id)}
        <button class="mi" data-focusable tabindex="-1" on:click={() => addTo(g)}>{g.name}</button>
      {/each}
      <button class="mi" data-focusable tabindex="-1" on:click={nuevoGrupo}>+ Nuevo grupo…</button>
    {:else if sub === "remove"}
      <button class="mi back" data-focusable data-focus-default tabindex="-1" on:click={() => setContextSub(null)}>‹ Volver</button>
      {#each inGroups as g (g.id)}
        <button class="mi" data-focusable tabindex="-1" on:click={() => removeFrom(g)}>{g.name}</button>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 54;
  }
  .menu {
    position: fixed;
    z-index: 55;
    min-width: 232px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 6px;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .mi {
    cursor: pointer;
    text-align: left;
    padding: 11px 14px;
    border-radius: 10px;
    color: var(--gm-text);
    font-weight: 600;
    white-space: nowrap;
  }
  .mi:focus {
    background: var(--gm-surface-2);
    box-shadow: var(--gm-focus-ring);
  }
  .mi.danger {
    color: var(--gm-danger);
  }
  .mi.disabled {
    color: var(--gm-text-dim);
    opacity: 0.5;
    cursor: default;
  }
  .mi.back {
    color: var(--gm-text-dim);
  }
  /* Separador más marcado + más espaciado que los items */
  .sep {
    height: 2px;
    margin: 8px 6px;
    background: var(--gm-surface-2);
    border-radius: 2px;
  }
</style>
