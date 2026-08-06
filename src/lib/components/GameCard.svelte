<script>
  import { openDetail, openContext, contextMenu, reportError, showToast } from "../stores/ui.js";
  import { startPlay } from "../stores/playsession.js";
  import { imageUrl } from "../util/asset.js";
  import { overrides, effectiveArt } from "../stores/artoverrides.js";
  import { hideCardText } from "../stores/uiprefs.js";
  import { steamAchievementSummaries } from "../stores/steamAccount.js";
  import { completedHighlightEnabled } from "../stores/uiprefs.js";

  export let game;
  export let focusDefault = false;
  // Modo "Inicio": al enfocar, la tarjeta se ensancha y muestra la CARÁTULA
  // EXPANDIDA (header apaisado). Fuera de Inicio (grids) se mantiene la carátula.
  export let heroOnFocus = false;
  export let onFocus = null; // callback(game) al enfocar (Inicio usa el hero de fondo)

  let el; // ref del div (para posicionar el menú contextual junto a la tarjeta)
  let focused = false;
  // Mientras el menú contextual de ESTA tarjeta está abierto, el foco del DOM
  // se mueve al menú (dispara blur) — se mantiene el aspecto "enfocado" para
  // no perder la animación ni desplazar el ancla que usa el menú para ubicarse.
  $: pinned = $contextMenu?.game === game;

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", ea: "EA", ubisoft: "Ubisoft", other: "App" };
  // Juego de una cuenta vinculada (Fase 9) que no está instalado en esta PC —
  // `installed` no existe en el resto de fuentes (Steam/GOG/EA/Ubisoft/Apps
  // locales), así que por defecto se considera instalado.
  $: notInstalled = game?.installed === false;
  $: title = game?.title || "";
  $: art = effectiveArt(game, $overrides);

  // Juego con logros 100% completados (Steam) — marca discreta en la tarjeta,
  // sin abrir el Detalle (ver stores/steamAccount.js::steamAchievementSummaries,
  // resumen unlocked/total por appid poblado tras cada sync).
  $: steamAppid = game?.store === "steam" ? Number(game.id.split(":")[1]) : null;
  $: achSummary = steamAppid ? $steamAchievementSummaries.get(steamAppid) : null;
  $: complete =
    $completedHighlightEnabled &&
    !!achSummary &&
    achSummary.total > 0 &&
    achSummary.unlocked === achSummary.total;

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
  $: expanded = heroOnFocus && (focused || pinned);
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
  // Un juego de una cuenta vinculada sin instalar localmente no se lanza —
  // solo avisa dónde instalarlo (ver `notInstalled` arriba).
  async function play() {
    if (notInstalled) {
      showToast(`Instala "${title}" desde ${STORE_LABEL[game.store] || game.store} para poder jugarlo`);
      return;
    }
    try {
      await startPlay(game);
    } catch (e) {
      reportError(e, "GameCard:play");
    }
  }
  function detail() {
    openDetail(game, el);
  }
  function ctx() {
    try {
      openContext(game, el.getBoundingClientRect(), el);
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
  class:ctx-open={pinned}
  class:not-installed={notInstalled}
  class:complete={complete}
  data-focusable
  data-focus-default={focusDefault ? "" : undefined}
  tabindex="-1"
  role="button"
  aria-label={title}
  title={notInstalled ? `No instalado — instálalo desde ${STORE_LABEL[game.store] || game.store}` : undefined}
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
    {#if complete}
      <span class="complete-badge" title="Logros 100% completados">100%</span>
    {/if}
  </div>
  {#if !$hideCardText}
    <div class="title">{title}</div>
  {/if}
</div>

<style>
  .gm-card {
    width: var(--gm-card-w);
    cursor: pointer;
    transition: width 0.28s ease, transform 0.12s ease;
    outline: none;
    /* Redondea el anillo de foco (box-shadow) igual que la portada. */
    border-radius: var(--gm-radius);
  }
  /* .ctx-open: mismo aspecto que :focus, mantenido mientras el menú contextual
     de esta tarjeta está abierto (el foco real del DOM se mueve al menú). */
  .gm-card:focus,
  .gm-card.ctx-open {
    transform: scale(var(--gm-focus-scale));
    z-index: 2;
  }
  /* Foco de tarjeta con su propio token (más difuso). Especificidad extra
     ([data-focusable]) para ganar al anillo global de app.css. */
  .gm-card[data-focusable]:focus,
  .gm-card[data-focusable].ctx-open {
    box-shadow: var(--gm-focus-ring-card);
  }
  /* En modo "Inicio" el crecimiento es de ancho (ver .hero-mode), no de escala. */
  .gm-card.no-grow:focus,
  .gm-card.no-grow.ctx-open {
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
    /* Fijo, no var(--gm-text): el chip flota sobre la carátula con fondo oscuro
       fijo (no tematizado), así que su texto tampoco debe seguir el tema —
       en temas claros --gm-text se vuelve oscuro y quedaría ilegible aquí. */
    color: #fff;
  }
  .not-installed .cover {
    opacity: 0.55;
  }
  .not-installed .badge {
    background: rgba(8, 10, 14, 0.85);
  }
  .not-installed .badge::after {
    content: " · no instalado";
  }
  .complete-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 0.66rem;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 999px;
    /* --gm-complete (Ajustes → "Resaltado de 100% completado"), no
       --gm-success directo: un perfil puede recolorear este resaltado sin
       afectar el color de cualquier toggle ON de la app. */
    background: color-mix(in srgb, var(--gm-complete) 85%, black);
    color: #04140d;
  }
  /* Mismo criterio de "glow" que el anillo de edición de un
     <input type="range"> (Settings.svelte) — remarca de un vistazo, sin
     imagen dorada de logro más raro (no hay ese dato hoy). */
  .gm-card.complete .cover {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 0 2px var(--gm-complete),
      0 0 18px 3px color-mix(in srgb, var(--gm-complete) 55%, transparent);
  }
  .title {
    margin-top: 8px;
    font-size: 0.9rem;
    color: var(--gm-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gm-card:focus .title,
  .gm-card.ctx-open .title {
    color: var(--gm-text);
  }
</style>
