<script>
  import { openDetail, openContext, reportError } from "../stores/ui.js";
  import { startPlay } from "../stores/playsession.js";
  import { imageUrl } from "../util/asset.js";
  import { overrides, effectiveArt } from "../stores/artoverrides.js";

  export let game;
  export let focusDefault = false;
  // Modo "Inicio": al enfocar, la tarjeta se ensancha y muestra la CARÁTULA
  // EXPANDIDA (header apaisado). Fuera de Inicio (grids) se mantiene la carátula.
  export let heroOnFocus = false;
  export let onFocus = null; // callback(game) al enfocar (Inicio usa el hero de fondo)

  let el; // ref del div (para posicionar el menú contextual junto a la tarjeta)
  let focused = false;

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", other: "App" };
  $: title = game?.title || "";
  $: art = effectiveArt(game, $overrides);

  // Portada placeholder determinista a partir del título (sin assets binarios).
  function hue(str) {
    try {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
      return h;
    } catch (e) {
      reportError(e, "GameCard:hue");
      return 0;
    }
  }
  $: h = hue(title);

  // Carga de imágenes (async, vía backend/data URI). La carátula siempre; la
  // carátula expandida (wide) solo al enfocar en Inicio. Se recarga si cambia la ruta.
  let coverUrl = null;
  let coverFor = null;
  $: if (art.cover !== coverFor) {
    coverFor = art.cover;
    coverUrl = null;
    imageUrl(art.cover).then((u) => {
      if (art.cover === coverFor) coverUrl = u;
    });
  }

  let wideUrl = null;
  let wideFor = null;
  $: wideSrc = art.wide || art.hero || art.cover; // fallback si no hay expandida
  $: if (heroOnFocus && focused && wideSrc !== wideFor) {
    wideFor = wideSrc;
    imageUrl(wideSrc).then((u) => {
      if (wideSrc === wideFor) wideUrl = u;
    });
  }

  // El ensanchado (modo Inicio) es una propiedad del foco, no de si hay imagen
  // real: sin arte (mock/sin Steam) se ensancha igual mostrando el degradado.
  $: expanded = heroOnFocus && focused;
  $: activeUrl = expanded ? wideUrl || coverUrl : coverUrl;
  $: hasImage = !!activeUrl;
  $: cover = hasImage
    ? `center / cover no-repeat url("${activeUrl}")`
    : `linear-gradient(150deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 22%))`;

  function handleFocus() {
    focused = true;
    onFocus?.(game);
  }

  // Aceptar (A/Cross) → lanzar directamente. North (Y/Triángulo) → abrir detalle.
  async function play() {
    try {
      await startPlay(game);
    } catch (e) {
      reportError(e, "GameCard:play");
    }
  }
  function detail() {
    openDetail(game);
  }
  function ctx() {
    try {
      openContext(game, el.getBoundingClientRect());
    } catch (e) {
      reportError(e, "GameCard:ctx");
    }
  }
</script>

<div
  bind:this={el}
  class="gm-card"
  class:hero-mode={expanded}
  class:no-grow={heroOnFocus}
  data-focusable
  data-focus-default={focusDefault ? "" : undefined}
  tabindex="-1"
  role="button"
  aria-label={title}
  on:click={play}
  on:gmdetail={detail}
  on:gmcontext={ctx}
  on:focus={handleFocus}
  on:blur={() => (focused = false)}
  on:keydown={(e) => (e.key === "Enter" || e.key === " ") && play()}
>
  <div class="cover" class:hero={expanded} style="background: {cover}">
    {#if !hasImage}
      <span class="cover-title">{title}</span>
    {/if}
    <span class="badge">{STORE_LABEL[game.store] || game.store}</span>
  </div>
  <div class="title">{title}</div>
</div>

<style>
  .gm-card {
    width: var(--gm-card-w);
    cursor: pointer;
    transition: width 0.28s ease, transform 0.12s ease;
    outline: none;
  }
  .gm-card:focus {
    transform: scale(var(--gm-focus-scale));
    z-index: 2;
  }
  /* En modo "Inicio" el crecimiento es de ancho (ver .hero-mode), no de escala. */
  .gm-card.no-grow:focus {
    transform: none;
  }
  .gm-card.hero-mode {
    width: calc(var(--gm-card-w) * 2.6);
    z-index: 2;
  }
  .cover {
    position: relative;
    width: 100%;
    aspect-ratio: var(--gm-card-ratio);
    border-radius: var(--gm-radius);
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: aspect-ratio 0.28s ease;
  }
  .cover.hero {
    aspect-ratio: 16 / 9;
  }
  .cover-title {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    text-align: center;
    font-weight: var(--gm-title-weight);
    font-size: 1.05rem;
    color: #fff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }
  .badge {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(8, 10, 14, 0.85);
    color: var(--gm-text);
  }
  .title {
    margin-top: 8px;
    font-size: 0.9rem;
    color: var(--gm-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gm-card:focus .title {
    color: var(--gm-text);
  }
</style>
