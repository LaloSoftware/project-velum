<script>
  import { closeDetail, detailAnchor, showToast, detailExpanded, detailSection, openAchievements } from "../stores/ui.js";
  import { startPlay } from "../stores/playsession.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { groups, createGroup, toggleGameInGroup } from "../stores/groups.js";
  import { imageUrl } from "../util/asset.js";
  import { overrides, effectiveArt } from "../stores/artoverrides.js";
  import { gameView, GAME_VIEW_FIELDS, setGameViewField } from "../stores/uiprefs.js";
  import ArtEditor from "./ArtEditor.svelte";
  import SoundtrackEditor from "./SoundtrackEditor.svelte";
  import { steamAccount, steamSyncing, loadAchievements } from "../stores/steamAccount.js";
  import { steamLibraryCache } from "../ipc/index.js";

  export let game;

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", ea: "EA", ubisoft: "Ubisoft", other: "App" };

  // Logros/horas jugadas de la cuenta de Steam vinculada (Fase 9), solo si
  // este juego es de Steam y hay una cuenta vinculada con datos cacheados.
  $: steamAppid = game?.store === "steam" ? Number(game.id.split(":")[1]) : null;
  let steamAchievementsList = [];
  let steamPlaytimeMinutes = null;
  let steamStatsFor = null;
  $: if ($steamAccount && steamAppid && steamStatsFor !== `${$steamAccount.steamid}:${steamAppid}`) {
    steamStatsFor = `${$steamAccount.steamid}:${steamAppid}`;
    loadAchievements(steamAppid).then((list) => (steamAchievementsList = list));
    steamLibraryCache($steamAccount.steamid)
      .then((entries) => {
        const entry = entries.find((e) => e.appid === steamAppid);
        steamPlaytimeMinutes = entry?.playtimeForever ?? null;
      })
      .catch(() => {});
  }
  function formatPlaytime(minutes) {
    if (!minutes) return "Sin horas registradas";
    const hours = minutes / 60;
    return hours >= 1 ? `${hours.toFixed(1)} h jugadas` : `${minutes} min jugados`;
  }

  // Badge de logros (esquina inferior derecha): último obtenido, o si aún no
  // hay ninguno, el próximo por desbloquear (steamAchievementsList ya viene
  // ordenado achieved DESC, unlock_time DESC, con desempate determinista por
  // orden de esquema — ver steam_api/achievements.rs).
  $: unlockedCount = steamAchievementsList.filter((a) => a.achieved).length;
  $: badgeAchievement = unlockedCount > 0
    ? steamAchievementsList[0]
    : steamAchievementsList.find((a) => !a.achieved) || null;
  $: badgePct = steamAchievementsList.length
    ? Math.round((unlockedCount / steamAchievementsList.length) * 100)
    : 0;

  const inGroup = (g) => g.gameIds.includes(game.id);
  // Fondo = hero efectivo (override manual o el de la tienda).
  let heroUrl = null;
  let heroFor = null;
  $: heroSrc = effectiveArt(game, $overrides).hero;
  $: if (heroSrc !== heroFor) {
    heroFor = heroSrc;
    heroUrl = null;
    imageUrl(heroSrc).then((u) => {
      if (heroSrc === heroFor) heroUrl = u;
    });
  }

  // Carátula expandida (wide) para el lado derecho del menú, si está disponible.
  let wideUrl = null;
  let wideFor = null;
  $: wideSrc = effectiveArt(game, $overrides).wide;
  $: if (wideSrc !== wideFor) {
    wideFor = wideSrc;
    wideUrl = null;
    if (wideSrc)
      imageUrl(wideSrc).then((u) => {
        if (wideSrc === wideFor) wideUrl = u;
      });
  }

  // Logo sobre el hero (posición por preset 3×3, ver ArtEditor).
  let logoUrl = null;
  let logoFor = null;
  $: logoSrc = effectiveArt(game, $overrides).logo;
  $: logoPos = effectiveArt(game, $overrides).logoPos;
  $: if (logoSrc !== logoFor) {
    logoFor = logoSrc;
    logoUrl = null;
    if (logoSrc)
      imageUrl(logoSrc).then((u) => {
        if (logoSrc === logoFor) logoUrl = u;
      });
  }
  // Códigos "tl tc tr / ml mc mr / bl bc br": 1ª letra = vertical, 2ª = horizontal.
  const V_ALIGN = { t: "flex-start", m: "center", b: "flex-end" };
  const H_ALIGN = { l: "flex-start", c: "center", r: "flex-end" };
  $: logoAlignItems = V_ALIGN[logoPos?.[0]] || "flex-start";
  $: logoJustify = H_ALIGN[logoPos?.[1]] || "flex-end";

  function back() {
    const a = $detailAnchor;
    closeDetail();
    a?.focus({ preventScroll: true });
  }

  async function newGroup() {
    const name = await openKeyboard("", "Nombre del grupo");
    if (name) {
      await createGroup(name, game.id);
      showToast(`Añadido a «${name}»`);
    }
  }

  function hue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }
  $: h = hue(game.title);

  function fmtLast(ts) {
    if (!ts) return "Nunca jugado";
    const d = new Date(ts * 1000);
    return "Última vez: " + d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  }

  async function play() {
    await startPlay(game);
  }
</script>

<div class="detail" class:expanded={$detailExpanded} style="--hue: {h}">
  <!-- Escenario (hero): a pantalla completa; al desplegar el menú baja a la mitad -->
  <div class="stage">
    <div
      class="art"
      class:photo={!!heroUrl}
      style={heroUrl ? `background-image: url("${heroUrl}")` : ""}
    ></div>
    {#if logoUrl}
      <div class="hero-logo" style="align-items:{logoAlignItems}; justify-content:{logoJustify}">
        <img src={logoUrl} alt="" on:error={() => (logoUrl = null)} />
      </div>
    {/if}
    <div class="content">
      {#if $gameView.platform}<span class="store">{STORE_LABEL[game.store] || game.store}</span>{/if}
      {#if $gameView.title}<h1>{game.title}</h1>{/if}
      {#if $gameView.lastPlayed}<p class="meta">{fmtLast(game.lastPlayed)}</p>{/if}
      {#if $gameView.installDir && game.installDir}<p class="meta dim">{game.installDir}</p>{/if}
      {#if $gameView.playtime && steamAppid && $steamAccount}<p class="meta dim">{formatPlaytime(steamPlaytimeMinutes)}</p>{/if}

      <div class="actions">
        <button
          class="play"
          data-focusable={!$detailExpanded ? "" : undefined}
          data-focus-default
          tabindex="-1"
          on:click={play}
        >
          ▶ Jugar
        </button>
        <button
          class="back"
          data-focusable={!$detailExpanded ? "" : undefined}
          tabindex="-1"
          on:click={back}
        >
          Volver
        </button>
      </div>
    </div>
  </div>

  <!-- Badge de logros (esquina inferior derecha): último obtenido o próximo a
       desbloquear + progreso. Sube si hay una sync en curso para no solaparse
       con SteamSyncIndicator (misma esquina, fixed a nivel de toda la app). -->
  {#if $gameView.achievements && $steamAccount && steamAppid && steamAchievementsList.length}
    <button
      class="ach-badge"
      class:raised={$steamSyncing}
      data-focusable
      tabindex="-1"
      on:click={() => openAchievements(steamAppid, game.title)}
    >
      {#if badgeAchievement?.iconUrl}<img class="ach-badge-icon" src={badgeAchievement.iconUrl} alt="" />{/if}
      <div class="ach-badge-text">
        <div class="ach-badge-name">{badgeAchievement?.displayName || badgeAchievement?.apiname}</div>
        <div class="ach-badge-progress">{unlockedCount}/{steamAchievementsList.length} · {badgePct}%</div>
      </div>
    </button>
  {/if}

  <!-- Menú inferior (aparece al pulsar abajo): una sección a la vez (paginado) -->
  {#if $detailExpanded}
    <div class="menu">
      <!-- Mitad izquierda: indicador de sección + la sección activa -->
      <div class="menu-main">
        <!-- Indicador vertical de posición (arriba/abajo = otras secciones) -->
        <div class="section-dots" aria-hidden="true">
          {#each ["Grupos", "Imágenes", "Soundtrack", "Vista de juego"] as _, i}
            <span class="dot" class:active={$detailSection === i}></span>
          {/each}
        </div>

        <div class="section-body">
          {#if $detailSection === 0}
            <section class="msection" data-focus-group="grupos" data-detail-top>
              <h3>Grupos</h3>
              <div class="groups">
                {#each $groups as g (g.id)}
                  <button
                    class="chip"
                    class:on={inGroup(g)}
                    data-focusable
                    tabindex="-1"
                    on:click={() => toggleGameInGroup(g.id, game.id)}
                  >
                    {inGroup(g) ? "✓ " : "+ "}{g.name}
                  </button>
                {/each}
                <button class="chip new" data-focusable tabindex="-1" on:click={newGroup}>
                  + Nuevo grupo
                </button>
              </div>
            </section>
          {:else if $detailSection === 1}
            <section class="msection" data-focus-group="imagenes" data-detail-top>
              <h3>Imágenes</h3>
              <ArtEditor {game} />
            </section>
          {:else if $detailSection === 2}
            <section class="msection" data-focus-group="soundtrack" data-detail-top>
              <h3>Soundtrack</h3>
              <SoundtrackEditor {game} />
            </section>
          {:else}
            <section class="msection" data-focus-group="vista-juego" data-detail-top>
              <h3>Vista de juego</h3>
              <div class="rows">
                {#each GAME_VIEW_FIELDS as f (f.key)}
                  <div class="row">
                    <span class="rlabel">{f.label}</span>
                    <button
                      class="toggle"
                      class:on={$gameView[f.key]}
                      data-focusable
                      tabindex="-1"
                      on:click={() => setGameViewField(f.key, !$gameView[f.key])}
                    >
                      {$gameView[f.key] ? "ON" : "OFF"}
                    </button>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        </div>
      </div>

      <!-- Mitad derecha: carátula expandida con difuminado a la izquierda -->
      {#if wideUrl}
        <div class="menu-art" style="background-image: url('{wideUrl}')"></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .detail {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--gm-wallpaper);
  }
  .stage {
    position: relative;
    display: flex;
    align-items: flex-end;
    padding: var(--gm-pad);
    overflow: hidden;
    /* flex-basis (no height%) para que el tamaño resuelva bien dentro del flex.
       Colapsado ocupa todo; expandido, la mitad, con transición suave. */
    flex: 0 0 100%;
    transition: flex-basis 0.3s ease;
  }
  .detail.expanded .stage {
    flex-basis: 50%;
  }
  .art {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      hsl(var(--hue) 55% 30%),
      hsl(calc(var(--hue) + 40) 60% 14%)
    );
    z-index: 0;
  }
  .art.photo {
    background-color: hsl(var(--hue) 55% 12%);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .art::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.72));
  }
  .content {
    position: relative;
    z-index: 1;
    max-width: 720px;
  }
  /* Logo superpuesto al hero, posicionado por preset 3×3 (ver ArtEditor). */
  .hero-logo {
    position: absolute;
    inset: 0;
    display: flex;
    padding: var(--gm-pad);
    z-index: 1;
    pointer-events: none;
  }
  .hero-logo img {
    max-width: 40%;
    max-height: 45%;
    object-fit: contain;
  }
  .store {
    font-weight: 700;
    color: var(--gm-accent-2);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 0.85rem;
  }
  h1 {
    font-size: 3rem;
    margin: 6px 0 12px;
    font-weight: var(--gm-title-weight);
  }
  .meta {
    margin: 2px 0;
    color: var(--gm-text);
  }
  .meta.dim {
    color: var(--gm-text-dim);
    font-size: 0.9rem;
  }
  .actions {
    margin-top: 26px;
    display: flex;
    gap: 14px;
  }
  .play,
  .back {
    cursor: pointer;
    padding: 16px 34px;
    border-radius: var(--gm-radius);
    font-weight: 800;
    font-size: 1.05rem;
  }
  .play {
    background: var(--gm-accent);
    color: #06101f;
  }
  .back {
    background: var(--gm-surface);
    color: var(--gm-text);
  }
  .play:focus,
  .back:focus {
    box-shadow: var(--gm-focus-ring);
    transform: scale(1.04);
  }

  /* Menú inferior a dos columnas: opciones (izq) + carátula expandida (der) */
  .menu {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    display: flex;
    flex-direction: row;
  }
  /* Mitad izquierda: indicador de sección (izq) + la sección activa (paginado) */
  .menu-main {
    flex: 1 1 50%;
    min-width: 0;
    min-height: 0;
    padding: var(--gm-pad);
    display: flex;
    flex-direction: row;
    gap: 16px;
  }
  /* Indicador vertical: un punto por sección; la activa se alarga (píldora). */
  .section-dots {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: 6px; /* alinea el primer punto con el encabezado de la sección */
    gap: 10px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    transition: height 0.2s ease, background 0.2s ease;
  }
  .dot.active {
    height: 24px;
    background: var(--gm-accent);
  }
  .section-body {
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
  }
  /* Mitad derecha: carátula expandida, difuminada hacia la izquierda para
     fundirse con las opciones. */
  .menu-art {
    flex: 1 1 50%;
    align-self: stretch;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 38%);
    mask-image: linear-gradient(to right, transparent 0%, #000 38%);
  }
  .msection h3 {
    margin: 0 0 12px;
    font-size: 1.15rem;
    color: var(--gm-text-dim);
  }
  .groups {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .groups .chip {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 600;
  }
  .groups .chip.on {
    background: var(--gm-accent);
    color: #06101f;
  }
  .groups .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }

  /* Toggles de "Vista de juego" (mismo patrón que Ajustes > Apariencia). */
  .rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .rlabel {
    flex: 1;
    font-weight: 600;
  }
  .toggle {
    cursor: pointer;
    min-width: 66px;
    padding: 10px 0;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 800;
  }
  .toggle.on {
    background: var(--gm-success);
    color: #04140d;
  }
  .toggle:focus {
    box-shadow: var(--gm-focus-ring);
  }

  /* Badge de logros (Fase 9f): esquina inferior derecha del Detalle, mismo
     estilo "chip" que el resto de la app. Sube (.raised) si hay una sync en
     curso, para no solaparse con SteamSyncIndicator (misma esquina, pero
     fixed a nivel de toda la app, z-index 90). */
  .ach-badge {
    position: absolute;
    right: var(--gm-pad);
    bottom: 18px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 320px;
    cursor: pointer;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 10px 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    /* transform, no "bottom": anima solo compositing (sin layout thrash). */
    transition: transform 0.2s ease;
  }
  .ach-badge.raised {
    transform: translateY(-52px);
  }
  .ach-badge:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .ach-badge-icon {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .ach-badge-text {
    min-width: 0;
    text-align: left;
  }
  .ach-badge-name {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--gm-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ach-badge-progress {
    font-size: 0.78rem;
    color: var(--gm-text-dim);
  }
</style>
