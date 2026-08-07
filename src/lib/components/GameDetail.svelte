<script>
  import { fade } from "svelte/transition";
  import {
    closeDetail,
    detailAnchor,
    showToast,
    detailExpanded,
    detailSection,
    setDetailSection,
    setDetailSections,
    openAchievements,
  } from "../stores/ui.js";
  import { startPlay, startSteamDownload } from "../stores/playsession.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { groups, createGroup, toggleGameInGroup } from "../stores/groups.js";
  import { imageUrl } from "../util/asset.js";
  import { overrides, effectiveArt } from "../stores/artoverrides.js";
  import {
    gameView,
    GAME_VIEW_FIELDS,
    setGameViewField,
    metaBgVisible,
    metaBgOpacity,
    completedBadgeEnabled,
    completedGlowEnabled,
  } from "../stores/uiprefs.js";
  import ArtEditor from "./ArtEditor.svelte";
  import SoundtrackEditor from "./SoundtrackEditor.svelte";
  import { steamAccount, steamSyncing, steamSyncSummary, loadAchievements } from "../stores/steamAccount.js";
  import { steamLibraryCache } from "../ipc/index.js";

  export let game;

  const STORE_LABEL = { steam: "Steam", gog: "GOG", epic: "Epic", ea: "EA", ubisoft: "Ubisoft", other: "App" };

  // Logros/horas jugadas de la cuenta de Steam vinculada (Fase 9), solo si
  // este juego es de Steam y hay una cuenta vinculada con datos cacheados.
  $: steamAppid = game?.store === "steam" ? Number(game.id.split(":")[1]) : null;
  let steamAchievementsList = [];
  let steamPlaytimeMinutes = null;
  let steamPlaytime2weeksMinutes = null;
  let steamLastPlayedAt = null; // epoch (segundos) según Steam, no local
  let steamStatsFor = null;
  $: if ($steamAccount && steamAppid && steamStatsFor !== `${$steamAccount.steamid}:${steamAppid}`) {
    steamStatsFor = `${$steamAccount.steamid}:${steamAppid}`;
    loadAchievements(steamAppid).then((list) => (steamAchievementsList = list));
    steamLibraryCache($steamAccount.steamid)
      .then((entries) => {
        const entry = entries.find((e) => e.appid === steamAppid);
        steamPlaytimeMinutes = entry?.playtimeForever ?? null;
        steamPlaytime2weeksMinutes = entry?.playtime2weeks ?? null;
        steamLastPlayedAt = entry?.rtimeLastPlayed ?? null;
      })
      .catch(() => {});
  }
  function formatPlaytime(minutes) {
    if (!minutes) return "Sin horas registradas";
    const hours = minutes / 60;
    return hours >= 1 ? `${hours.toFixed(1)} h jugadas` : `${minutes} min jugados`;
  }
  function formatRecentPlaytime(minutes) {
    if (!minutes) return "Sin horas en las últimas 2 semanas";
    const hours = minutes / 60;
    return hours >= 1
      ? `${hours.toFixed(1)} h jugadas (2 semanas)`
      : `${minutes} min jugados (2 semanas)`;
  }
  function formatSteamLastPlayed(ts) {
    if (!ts) return "Sin registro de Steam";
    const d = new Date(ts * 1000);
    return "Última vez (Steam): " + d.toLocaleDateString();
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
  // El "próximo a desbloquear" puede ser un logro spoiler (`hidden`) — no
  // reventar el nombre/ícono real en el badge/sección, mismo criterio que
  // AchievementsModal (salvo que el jugador haya activado "Mostrar logros
  // ocultos").
  $: badgeIsSpoiler = !!(
    badgeAchievement &&
    badgeAchievement.hidden &&
    !badgeAchievement.achieved &&
    !$gameView.revealHiddenAchievements
  );
  $: badgeName = badgeIsSpoiler ? "Logro oculto" : badgeAchievement?.displayName || badgeAchievement?.apiname;
  $: badgeIcon = badgeIsSpoiler
    ? null
    : (!badgeAchievement?.achieved && badgeAchievement?.iconGrayUrl) || badgeAchievement?.iconUrl;
  $: hasAchievementsData = !!($steamAccount && steamAppid && steamAchievementsList.length);
  // "Logros" es o un badge flotante, o (si se desmarca) una sección más del
  // menú paginado — nunca las dos a la vez, y solo si de verdad hay datos.
  $: showAchievementsBadge = $gameView.achievements && hasAchievementsData;
  $: showAchievementsSection = !$gameView.achievements && hasAchievementsData;
  // 100% completado — insignia de texto y brillo son interruptores
  // independientes (mismos tokens/criterio que GameCard.svelte).
  $: achievementsComplete = steamAchievementsList.length > 0 && unlockedCount === steamAchievementsList.length;
  $: showAchBadgeComplete = achievementsComplete && $completedBadgeEnabled;
  $: showAchGlowComplete = achievementsComplete && $completedGlowEnabled;
  // Últimos 3 logros desbloqueados, para la variante "sección" (más espacio
  // disponible ahí que en el badge flotante — ver showAchievementsSection).
  $: recentUnlocked = steamAchievementsList.filter((a) => a.achieved).slice(0, 3);

  // Secciones del menú paginado: "logros" se antepone a las fijas cuando
  // corresponde mostrarla (ver showAchievementsSection). Se expone vía store
  // (DETAIL_SECTIONS) porque App.svelte necesita el conteo para saber cuándo
  // "abajo" debe pasar a la siguiente sección (detailDown()).
  const BASE_SECTIONS = ["grupos", "imagenes", "soundtrack", "vista"];
  $: sections = showAchievementsSection ? ["logros", ...BASE_SECTIONS] : BASE_SECTIONS;
  $: setDetailSections(sections);

  // `sections` puede cambiar de composición mientras el usuario ya está
  // viendo una (toggle "Logros como badge/sección" desde "Vista de juego", o
  // los logros terminan de cargar de forma asíncrona mientras el menú ya
  // estaba desplegado en otra sección) — si eso antepone/quita "logros", el
  // mismo índice pasa a apuntar a OTRA sección distinta a la que se veía.
  // Se seguía la sección por NOMBRE en vez de por índice para que no cambie
  // de golpe bajo los pies del usuario.
  // OJO: no inicializar con "= sections" — en Svelte 5, `$: sections = ...`
  // se compila como un efecto que corre DESPUÉS del script síncrono inicial,
  // así que en ese momento `sections` todavía es `undefined` y quedaría
  // capturado así para siempre. `null` no depende de ese timing; la primera
  // vez que corre el bloque de abajo no hay nada que comparar (se salta la
  // reubicación) y ahí sí se guarda el `sections` ya resuelto.
  let prevSections = null;
  $: {
    if (prevSections) {
      const current = prevSections[$detailSection];
      if (current && sections[$detailSection] !== current) {
        const newIndex = sections.indexOf(current);
        if (newIndex >= 0) setDetailSection(newIndex);
      }
    }
    prevSections = sections;
  }

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

  $: notInstalled = game?.installed === false;
  // Juego de Steam de la cuenta vinculada, no instalado local: en vez del
  // botón "Jugar" desactivado, uno que abre Steam en la página de este juego
  // para instalarlo (steam://install/<appid>, ver launch.rs).
  $: canDownloadFromSteam = notInstalled && game?.store === "steam" && !!$steamAccount;

  async function play() {
    if (notInstalled) return;
    await startPlay(game);
  }

  // Misma suspensión que un juego real (overlay + bloqueo de input) — ver
  // stores/playsession.js::startSteamDownload para el porqué (si no, el poll
  // de XInput suplementario sigue leyendo el mando en segundo plano mientras
  // Steam tiene el foco, y confirmar la instalación con el control reabría
  // esta misma acción).
  async function downloadFromSteam() {
    await startSteamDownload(game, steamAppid);
  }
</script>

{#snippet achievementBadge()}
  <!-- Badge de logros: encabezado, progreso y (abajo) el último obtenido o
       próximo a desbloquear. Sube si hay una sync en curso para no solaparse
       con SteamSyncIndicator (misma esquina, fixed a nivel de toda la app).
       Al 100%: insignia de texto y brillo son interruptores independientes
       (Ajustes → Apariencia → "Resaltado de 100% completado"), mismo color
       compartido que la tarjeta (GameCard.svelte). -->
  <button
    class="ach-badge"
    class:raised={$steamSyncing || !!$steamSyncSummary}
    class:complete={showAchGlowComplete}
    data-focusable
    tabindex="-1"
    on:click={() => openAchievements(steamAppid, game.title)}
  >
    {#if showAchBadgeComplete}
      <span class="ach-badge-tag" title="Logros 100% completados">100%</span>
    {/if}
    <div class="ach-badge-title">Logros de {STORE_LABEL[game.store] || game.store}</div>
    <div class="ach-badge-progress">{unlockedCount}/{steamAchievementsList.length} · {badgePct}%</div>
    <div class="ach-badge-last">
      {#if badgeIcon}<img class="ach-badge-icon" src={badgeIcon} alt="" />{/if}
      <div class="ach-badge-name">{badgeName}</div>
    </div>
  </button>
{/snippet}

<div class="detail" class:expanded={$detailExpanded} style="--hue: {h}">
  <!-- Escenario (hero): a pantalla completa; al desplegar el menú baja a la mitad -->
  <div class="stage">
    <div class="art">
      <!-- Capa de la foto SEPARADA del degradado base: background-image no
           anima de forma fiable con CSS, así que el fade-in va sobre esta capa
           en opacity (svelte/transition) en vez de sobre el color de fondo. -->
      {#if heroUrl}
        <div
          class="art-photo"
          style="background-image: url('{heroUrl}')"
          transition:fade={{ duration: 280 }}
        ></div>
      {/if}
    </div>
    {#if logoUrl}
      <div class="hero-logo" style="align-items:{logoAlignItems}; justify-content:{logoJustify}">
        <img src={logoUrl} alt="" on:error={() => (logoUrl = null)} />
      </div>
    {/if}
    {#if showAchievementsBadge && !$gameView.achievementsBadgeFixed}
      {@render achievementBadge()}
    {/if}
    <div class="content" style="--meta-bg-opacity: {$metaBgVisible ? $metaBgOpacity : 0}">
      {#if $gameView.platform}<span class="store">{STORE_LABEL[game.store] || game.store}</span>{/if}
      {#if $gameView.title}<h1>{game.title}</h1>{/if}
      {#if $gameView.lastPlayed}<p class="meta">{fmtLast(game.lastPlayed)}</p>{/if}
      {#if $gameView.installDir && game.installDir}<p class="meta dim">{game.installDir}</p>{/if}
      {#if $gameView.playtime && steamAppid && $steamAccount}<p class="meta dim">{formatPlaytime(steamPlaytimeMinutes)}</p>{/if}
      {#if $gameView.recentPlaytime && steamAppid && $steamAccount}<p class="meta dim">{formatRecentPlaytime(steamPlaytime2weeksMinutes)}</p>{/if}
      {#if $gameView.steamLastPlayed && steamAppid && $steamAccount}<p class="meta dim">{formatSteamLastPlayed(steamLastPlayedAt)}</p>{/if}

      <div class="actions">
        {#if canDownloadFromSteam}
          <button
            class="play"
            data-focusable={!$detailExpanded ? "" : undefined}
            data-focus-default
            tabindex="-1"
            on:click={downloadFromSteam}
          >
            ⬇ Descargar desde Steam
          </button>
        {:else}
          <button
            class="play"
            class:disabled={notInstalled}
            data-focusable={!$detailExpanded && !notInstalled ? "" : undefined}
            data-focus-default={!notInstalled}
            tabindex="-1"
            title={notInstalled ? `Instálalo desde ${STORE_LABEL[game.store] || game.store} para poder jugarlo` : undefined}
            on:click={play}
          >
            ▶ Jugar
          </button>
        {/if}
        <button
          class="back"
          data-focusable={!$detailExpanded ? "" : undefined}
          data-focus-default={notInstalled && !canDownloadFromSteam ? "" : undefined}
          tabindex="-1"
          on:click={back}
        >
          Volver
        </button>
      </div>
      {#if canDownloadFromSteam}
        <p class="install-hint">Se abre Steam en la página de este juego para instalarlo.</p>
      {:else if notInstalled}
        <p class="install-hint">
          Instálalo desde {STORE_LABEL[game.store] || game.store} para poder jugarlo.
        </p>
      {/if}
    </div>
  </div>

  {#if showAchievementsBadge && $gameView.achievementsBadgeFixed}
    {@render achievementBadge()}
  {/if}

  <!-- Menú inferior (aparece al pulsar abajo): una sección a la vez (paginado) -->
  {#if $detailExpanded}
    <div class="menu">
      <!-- Mitad izquierda: indicador de sección + la sección activa -->
      <div class="menu-main">
        <!-- Indicador vertical de posición (arriba/abajo = otras secciones) -->
        <div class="section-dots" aria-hidden="true">
          {#each sections as _, i}
            <span class="dot" class:active={$detailSection === i}></span>
          {/each}
        </div>

        <div class="section-body">
          {#if sections[$detailSection] === "logros"}
            <section class="msection" data-focus-group="logros" data-detail-top>
              <h3>Logros de {STORE_LABEL[game.store] || game.store}</h3>
              <!-- Más espacio disponible acá que en el badge flotante — se
                   muestran hasta 3 desbloqueados en vez de solo el último.
                   Si todavía no hay ninguno, se cae al próximo a desbloquear
                   (badgeAchievement), igual que antes. -->
              {#if recentUnlocked.length}
                {#each recentUnlocked as a (a.apiname)}
                  <div class="ach-inline">
                    {#if (!a.achieved && a.iconGrayUrl) || a.iconUrl}
                      <img class="ach-inline-icon" src={(!a.achieved && a.iconGrayUrl) || a.iconUrl} alt="" />
                    {/if}
                    <div>
                      <div class="ach-inline-name">{a.displayName || a.apiname}</div>
                      <div class="ach-inline-progress">{unlockedCount}/{steamAchievementsList.length} · {badgePct}%</div>
                    </div>
                  </div>
                {/each}
              {:else if badgeAchievement}
                <div class="ach-inline">
                  {#if badgeIcon}<img class="ach-inline-icon" src={badgeIcon} alt="" />{/if}
                  <div>
                    <div class="ach-inline-name">{badgeName}</div>
                    <div class="ach-inline-progress">{unlockedCount}/{steamAchievementsList.length} · {badgePct}%</div>
                  </div>
                </div>
              {/if}
              <button
                class="chip"
                data-focusable
                tabindex="-1"
                on:click={() => openAchievements(steamAppid, game.title)}
              >
                Ver todos los logros
              </button>
            </section>
          {:else if sections[$detailSection] === "grupos"}
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
          {:else if sections[$detailSection] === "imagenes"}
            <section class="msection" data-focus-group="imagenes" data-detail-top>
              <h3>Imágenes</h3>
              <ArtEditor {game} />
            </section>
          {:else if sections[$detailSection] === "soundtrack"}
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
        <div class="menu-art" style="background-image: url('{wideUrl}')" transition:fade={{ duration: 280 }}></div>
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
  /* Capa de la foto, superpuesta al degradado — separada para poder animar su
     opacity (fade-in) sin depender de transiciones de background-image. */
  .art-photo {
    position: absolute;
    inset: 0;
    background-color: hsl(var(--hue) 55% 12%);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .art::after {
    content: "";
    position: absolute;
    inset: 0;
    /* Antes rgba(0,0,0,0.72) fijo: en temas claros el texto pasa a oscuro
       (--gm-text) pero este degradado seguía siendo negro, quedando texto
       oscuro sobre un velo oscuro — mala lectura sin importar el fondo de
       metadatos. --gm-bg (ya tematizado, oscuro o claro) resuelve el
       contraste de raíz en vez de compensar solo con la opacidad del fondo
       configurable. */
    background: linear-gradient(
      180deg,
      transparent 30%,
      color-mix(in srgb, var(--gm-bg) 82%, transparent)
    );
  }
  .content {
    position: relative;
    z-index: 1;
    max-width: 720px;
    padding: 20px 24px;
    border-radius: var(--gm-radius-lg);
    /* Fondo configurable (Ajustes → "Fondo de metadatos"): --meta-bg-opacity
       es un número 0-100 fijado inline desde $metaBgOpacity (0 si
       $metaBgVisible está apagado) — se adapta al tema/perfil activo en vez
       de un negro fijo, igual que el resto de superficies elevadas. */
    background: color-mix(in srgb, var(--gm-bg-elev) calc(var(--meta-bg-opacity, 0) * 1%), transparent);
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
    font-size: 1rem;
  }
  h1 {
    font-size: 3rem;
    margin: 6px 0 12px;
    font-weight: var(--gm-title-weight);
  }
  .meta {
    margin: 4px 0;
    font-size: 1.15rem;
    color: var(--gm-text);
  }
  .meta.dim {
    color: var(--gm-text-dim);
    font-size: 1.05rem;
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
  .play.disabled {
    cursor: default;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
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
  .install-hint {
    margin: 10px 0 0;
    color: var(--gm-text-dim);
    font-size: 0.85rem;
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

  /* Sección "Logros" (cuando el badge está en modo sección, no flotante). */
  .ach-inline {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  .ach-inline-icon {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .ach-inline-name {
    font-weight: 700;
  }
  .ach-inline-progress {
    color: var(--gm-text-dim);
    font-size: 0.85rem;
  }
  .msection .chip {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 600;
  }
  .msection .chip:focus {
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

  /* Badge de logros (Fase 9f, agrandado/reordenado en el ajuste de logros):
     esquina inferior derecha del Detalle, mismo estilo "chip" que el resto de
     la app. Orden: encabezado → progreso → último logro (icono+nombre) abajo.
     Sube (.raised) si hay una sync en curso, para no solaparse con
     SteamSyncIndicator (misma esquina, pero fixed a nivel de toda la app,
     z-index 90). Al 100%: insignia de texto (.ach-badge-tag, abajo) y brillo
     (.complete) son interruptores independientes, mismo color compartido que
     GameCard.svelte. */
  .ach-badge {
    position: absolute;
    right: var(--gm-pad);
    bottom: 18px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    text-align: left;
    max-width: 420px;
    cursor: pointer;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 18px 26px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    /* transform, no "bottom": anima solo compositing (sin layout thrash). */
    transition: transform 0.2s ease;
  }
  .ach-badge.raised {
    transform: translateY(-64px);
  }
  /* Brillo al 100% — interruptor independiente de la insignia de texto
     (Ajustes → Apariencia → "Resaltado de 100% completado"). */
  .ach-badge.complete {
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.35),
      0 0 0 2px var(--gm-complete),
      0 0 18px 3px color-mix(in srgb, var(--gm-complete) 55%, transparent);
  }
  .ach-badge:focus {
    box-shadow: var(--gm-focus-ring);
  }
  /* Insignia de texto al 100% — interruptor independiente del brillo de
     arriba, mismo estilo que el badge "100%" de GameCard.svelte. */
  .ach-badge-tag {
    position: absolute;
    top: -10px;
    right: -10px;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--gm-complete) 85%, black);
    color: #04140d;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
  .ach-badge-title {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: var(--gm-accent-2);
  }
  .ach-badge-progress {
    font-size: 1rem;
    font-weight: 700;
    color: var(--gm-text);
  }
  .ach-badge-last {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .ach-badge-icon {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .ach-badge-name {
    font-size: 0.95rem;
    color: var(--gm-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
