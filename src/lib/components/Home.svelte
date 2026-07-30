<script>
  import { tick } from "svelte";
  import { recentGames, onlyGames } from "../stores/games.js";
  import { goto } from "../stores/ui.js";
  import {
    hideLibraryButton,
    homeCardCount,
    homeTexts,
    HOME_TEXT_FIELDS,
    homePosition,
    homeOrientation,
    homeScrollMode,
    homeReading,
    homeCardAlign,
  } from "../stores/uiprefs.js";
  import { imageUrl } from "../util/asset.js";
  import { overrides, effectiveArt } from "../stores/artoverrides.js";
  import GameCard from "./GameCard.svelte";

  // Juego destacado = el enfocado en la tira (por defecto el primero). Su hero se
  // muestra de fondo a pantalla completa, con difuminado arriba/abajo (según tema).
  let featured = null;
  $: if (!featured && $recentGames.length) featured = $recentGames[0];
  // Si cambia la lista y el destacado ya no está, recolocar al primero.
  $: if (featured && !$recentGames.some((g) => g.id === featured.id)) {
    featured = $recentGames[0] || null;
  }

  let bgUrl = null;
  let bgFor = null;
  $: bgSrc = featured ? effectiveArt(featured, $overrides).hero || effectiveArt(featured, $overrides).cover : null;
  $: if (bgSrc !== bgFor) {
    bgFor = bgSrc;
    bgUrl = null;
    imageUrl(bgSrc).then((u) => {
      if (bgSrc === bgFor) bgUrl = u;
    });
  }

  // Texto efectivo de un campo de Inicio: el personalizado, o el de por defecto.
  const HOME_TEXT_DEFAULT = Object.fromEntries(HOME_TEXT_FIELDS.map((f) => [f.key, f.default]));
  $: textOf = (key) => $homeTexts[key]?.text || HOME_TEXT_DEFAULT[key];
  $: hidden = (key) => !!$homeTexts[key]?.hidden;

  $: isVertical = $homeOrientation === "vertical";
  // Posición del bloque: eje contrario al de la orientación de la tira.
  $: blockJustify = { start: "flex-start", center: "center", end: "flex-end" }[$homePosition] || "flex-start";
  // Alineación de las tarjetas en el eje transversal de la lista (independiente
  // del bloque): evita que la tarjeta enfocada, al crecer, siempre parezca
  // expandirse hacia el mismo lado.
  $: cardAlign = { start: "flex-start", center: "center", end: "flex-end" }[$homeCardAlign] || "flex-start";
  $: wrapAxis = $homeScrollMode === "infinito" ? (isVertical ? "vertical" : "horizontal") : undefined;

  // Modo "centrado": la tarjeta enfocada queda fija al centro del viewport de la
  // tira; es el track el que se desliza detrás de ella vía transform.
  let stripEl;
  let trackEl;
  let translatePx = 0;

  // Traslación actualmente PINTADA del track (según la matriz calculada, no la
  // variable JS `translatePx`): durante una transición CSS en curso, el navegador
  // interpola el valor real por debajo del que acabamos de fijar, así que leer
  // `translatePx` en ese momento estaría desfasado del render real.
  function currentTranslate(el, axis) {
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    const m = new DOMMatrixReadOnly(t);
    return axis === "y" ? m.m42 : m.m41;
  }

  async function centerOnFocused() {
    if ($homeReading !== "centrado") return;
    await tick();
    requestAnimationFrame(() => {
      if (!stripEl || !trackEl) return;
      // `.strip` sigue siendo un contenedor de scroll válido aunque tenga
      // overflow:hidden (navigation.js llama scrollIntoView al enfocar); en modo
      // centrado el posicionamiento lo controla solo el transform, así que se
      // anula cualquier scroll nativo que haya podido colarse.
      stripEl.scrollTop = 0;
      stripEl.scrollLeft = 0;
      const cardEl = document.activeElement;
      if (!cardEl || !stripEl.contains(cardEl)) return;
      // getBoundingClientRect ya refleja el transform actualmente pintado (aunque
      // esté a mitad de una transición); se descuenta ese transform para obtener
      // la posición "natural" de la tarjeta y así recalcular siempre un valor
      // ABSOLUTO (nunca acumulado, evita que el cálculo derive con foco repetido).
      const vp = stripEl.getBoundingClientRect();
      const cr = cardEl.getBoundingClientRect();
      const current = currentTranslate(trackEl, isVertical ? "y" : "x");
      const naturalCenter = isVertical
        ? cr.top + cr.height / 2 - current
        : cr.left + cr.width / 2 - current;
      const vpCenter = isVertical ? vp.top + vp.height / 2 : vp.left + vp.width / 2;
      translatePx = vpCenter - naturalCenter;
    });
  }

  const onCardFocus = (g) => {
    featured = g;
    centerOnFocused();
  };

  function onTrackTransitionEnd(e) {
    // La tarjeta enfocada termina de ensancharse (heroOnFocus, ver GameCard.svelte):
    // recalcular el offset final del carrusel centrado tras el ensanchado.
    if (e.propertyName === "width" && $homeReading === "centrado") centerOnFocused();
  }

  // Al cambiar de eje o de modo de lectura, el offset anterior ya no aplica.
  $: {
    $homeOrientation;
    $homeReading;
    translatePx = 0;
    centerOnFocused();
  }

  $: trackStyle =
    $homeReading === "centrado"
      ? `transform: ${isVertical ? `translateY(${translatePx}px)` : `translateX(${translatePx}px)`};`
      : "";
</script>

<section class="home" style="justify-content: {isVertical ? blockJustify : 'flex-start'}">
  {#if bgUrl}
    <div class="bg" style="background-image: url('{bgUrl}')"></div>
  {/if}

  <div
    class="content"
    class:narrow={isVertical}
    style="justify-content: {isVertical ? 'flex-start' : blockJustify}"
  >
    {#if !hidden("title") || !hidden("subtitle")}
      <header class="hero">
        {#if !hidden("title")}<h1>{textOf("title")}</h1>{/if}
        {#if !hidden("subtitle")}<p>{textOf("subtitle")}</p>{/if}
      </header>
    {/if}

    {#if !hidden("recent")}<h2 class="section-title">{textOf("recent")}</h2>{/if}
    <div
      class="strip"
      class:horizontal={!isVertical}
      class:vertical={isVertical}
      class:centered={$homeReading === "centrado"}
      data-focus-group="home-strip"
      data-focus-wrap={wrapAxis}
      bind:this={stripEl}
    >
      <div
        class="strip-track"
        class:reverse={$homeReading === "invertido"}
        style="align-items: {cardAlign}; {trackStyle}"
        on:transitionend={onTrackTransitionEnd}
        bind:this={trackEl}
      >
        {#each $recentGames.slice(0, $homeCardCount) as g, i (g.id)}
          <GameCard game={g} focusDefault={i === 0} heroOnFocus={true} onFocus={onCardFocus} />
        {/each}
        {#if $recentGames.length === 0}
          <p class="empty">Aún no has jugado nada. Abre la biblioteca (botón Menú).</p>
        {/if}
      </div>
    </div>

    {#if !$hideLibraryButton}
      <div class="library-cta">
        <button class="cta" data-focusable tabindex="-1" on:click={() => goto("games")}>
          Ver biblioteca completa ({$onlyGames.length}) →
        </button>
      </div>
    {/if}
  </div>
</section>

<style>
  .home {
    position: relative;
    height: 100%;
    padding: var(--gm-pad);
    overflow: hidden;
    display: flex;
    /* justify-content: posiciona .content en horizontal cuando la tira es vertical
       (posición del bloque izquierda/centro/derecha). */
  }
  /* Fondo hero a pantalla completa, difuminado arriba/abajo hacia el tema
     (la máscara lo desvanece a transparente y deja ver el wallpaper del tema). */
  .bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 22%;
    z-index: 0;
    opacity: 0.55;
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 20%,
      #000 60%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 20%,
      #000 60%,
      transparent 100%
    );
    transition: opacity 0.3s ease;
  }
  /* Velo hacia el color de fondo del tema para legibilidad del texto. */
  .bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      var(--gm-bg) 0%,
      transparent 30%,
      transparent 55%,
      var(--gm-bg) 100%
    );
    opacity: 0.55;
  }
  .content {
    position: relative;
    z-index: 1;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    /* justify-content viene de la posición configurable del bloque. */
  }
  /* Orientación vertical: el bloque no se estira a todo el ancho, para que la
     posición izquierda/centro/derecha tenga efecto visible. */
  .content.narrow {
    width: fit-content;
    max-width: 100%;
  }
  .hero h1 {
    font-size: 2.6rem;
    font-weight: var(--gm-title-weight);
    margin: 0;
  }
  .hero p {
    color: var(--gm-text-dim);
    margin: 6px 0 26px;
  }
  .section-title {
    font-size: 1.15rem;
    margin: 0 0 14px;
  }
  .strip {
    /* Aire simétrico para que el anillo de foco no se recorte por ningún lado
       (antes el top tenía menos padding y el glow se veía cortado arriba). */
    padding: var(--gm-focus-space);
    margin: 0 -12px;
    scrollbar-width: none;
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  .strip.horizontal {
    overflow-x: auto;
    overflow-y: hidden;
    scroll-padding-inline: var(--gm-focus-space);
  }
  .strip.vertical {
    overflow-y: auto;
    overflow-x: hidden;
    scroll-padding-block: var(--gm-focus-space);
    /* Ocupa el alto restante del bloque (título/subtítulo ya consumieron el resto). */
    flex: 1 1 auto;
    min-height: 0;
  }
  /* El carrusel centrado mueve el track con transform, no con scroll nativo. */
  .strip.centered {
    overflow: hidden;
  }
  .strip-track {
    display: flex;
    gap: var(--gm-gap);
    /* Tamaño de tarjeta propio de Inicio, independiente del de la biblioteca. */
    --gm-card-w: var(--gm-card-w-home);
    transition: transform 0.3s ease;
  }
  .strip.horizontal .strip-track {
    flex-direction: row;
  }
  .strip.horizontal .strip-track.reverse {
    flex-direction: row-reverse;
  }
  .strip.vertical .strip-track {
    flex-direction: column;
  }
  .strip.vertical .strip-track.reverse {
    flex-direction: column-reverse;
  }
  .strip-track > :global(.gm-card) {
    flex: 0 0 auto;
  }
  .empty {
    color: var(--gm-text-dim);
  }
  .library-cta {
    margin-top: 18px;
  }
  .cta {
    cursor: pointer;
    padding: 14px 22px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 700;
  }
  .cta:focus {
    background: var(--gm-surface-2);
  }
</style>
