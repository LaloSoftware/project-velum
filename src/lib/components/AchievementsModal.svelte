<script>
  import { achievementsModal, closeAchievements } from "../stores/ui.js";
  import { loadAchievements, globalPctMaxAgeSecs } from "../stores/steamAccount.js";
  import { steamGlobalAchievementPercentages } from "../ipc/index.js";
  import {
    gameView,
    setGameViewField,
    completedBadgeEnabled,
    completedGlowEnabled,
  } from "../stores/uiprefs.js";

  $: appid = $achievementsModal?.appid;
  $: title = $achievementsModal?.title;

  let list = [];
  let listFor = null;
  $: if (appid && appid !== listFor) {
    listFor = appid;
    loadAchievements(appid).then((l) => (list = l));
  }

  $: unlockedCount = list.filter((a) => a.achieved).length;
  $: pct = list.length ? Math.round((unlockedCount / list.length) * 100) : 0;
  // Recolorea la barra de progreso si cualquiera de los dos interruptores de
  // "Resaltado de 100% completado" está activo (insignia o brillo) — acá no
  // hay insignia/brillo propios, solo un color que refleja el mismo resaltado.
  $: complete =
    ($completedBadgeEnabled || $completedGlowEnabled) && list.length > 0 && unlockedCount === list.length;

  // Logros "spoiler" (Steam los marca `hidden`): no revelar nombre/descripción
  // hasta desbloquearlos, igual que hace el cliente de Steam — salvo que el
  // jugador haya activado "Mostrar logros ocultos" (Vista de juego/Ajustes) o
  // "Ver % global": si ya está viendo estadísticas globales del logro, no
  // tiene sentido seguir ocultando su nombre/descripción.
  $: isSpoiler = (a) => a.hidden && !a.achieved && !$gameView.revealHiddenAchievements && !$gameView.showGlobalPct;
  const iconFor = (a) => (!a.achieved && a.iconGrayUrl) || a.iconUrl;
  // Solo atenuar si no hay ícono gris real — con uno real, ya se ve "apagado"
  // por sí mismo y oscurecerlo de más lo deja irreconocible.
  const dimIcon = (a) => !a.achieved && !a.iconGrayUrl;

  function fmtUnlockDate(ts) {
    if (!ts) return null;
    const d = new Date(ts * 1000);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  }

  // % global (rareza) — opcional, bajo demanda ("Ver % global"), persistente
  // (Vista de juego/Ajustes: "Mostrar % global de obtención") en vez de
  // resetearse cada vez que se abre el modal.
  let globalPct = {}; // apiname -> percent
  let globalFor = null;
  let loadingGlobal = false;
  $: if ($gameView.showGlobalPct && appid && appid !== globalFor) {
    globalFor = appid;
    loadingGlobal = true;
    steamGlobalAchievementPercentages(appid, globalPctMaxAgeSecs())
      .then((rows) => {
        globalPct = Object.fromEntries(rows.map((r) => [r.apiname, r.percent]));
      })
      .catch(() => {
        globalPct = {};
      })
      .finally(() => {
        loadingGlobal = false;
      });
  }
  function toggleGlobal() {
    setGameViewField("showGlobalPct", !$gameView.showGlobalPct);
  }

  // Orden de la lista — sesión del modal (se resetea cada vez que se abre,
  // $achievementsModal es un objeto nuevo cada vez que se llama
  // openAchievements()), no persistente. "date" es el orden que ya trae el
  // backend (desbloqueados primero, luego por fecha de desbloqueo desc — ver
  // `steam_achievements` en achievements.rs) y es el default. "global" ordena
  // por % de jugadores que lo tienen (más raro primero) — elegirlo activa
  // "Ver % global" si todavía no estaba, porque si no no hay con qué ordenar.
  let sortMode = "date"; // "date" | "global"
  $: if ($achievementsModal) sortMode = "date";
  function selectSort(mode) {
    sortMode = mode;
    if (mode === "global" && !$gameView.showGlobalPct) setGameViewField("showGlobalPct", true);
  }
  $: sortedList =
    sortMode === "global"
      ? [...list].sort((a, b) => {
          const pa = globalPct[a.apiname];
          const pb = globalPct[b.apiname];
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1; // sin % conocido todavía: al final
          if (pb == null) return -1;
          return pa - pb; // % más bajo (más raro) primero
        })
      : list;
</script>

{#if $achievementsModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={closeAchievements} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Logros">
    <header class="head">
      <div class="head-top">
        <h2>Logros — {title}</h2>
        <button
          class="close"
          data-focusable
          tabindex="-1"
          aria-label="Cerrar"
          on:click={closeAchievements}
        >
          ✕
        </button>
      </div>
      <div class="progress-row">
        <span class="progress-count">{unlockedCount}/{list.length}</span>
        <div class="progress-bar">
          <div class="progress-fill" class:complete style="width: {pct}%"></div>
        </div>
        <span class="progress-pct">{pct}%</span>
      </div>
      <div class="stats-row">
        <button class="stats-toggle" data-focusable tabindex="-1" on:click={toggleGlobal}>
          {$gameView.showGlobalPct ? "Ocultar % global" : "Ver % global"}
        </button>
      </div>
      <div class="sort-row">
        <span class="sort-label">Ordenar:</span>
        <button
          class="stats-toggle"
          class:on={sortMode === "date"}
          data-focusable
          tabindex="-1"
          on:click={() => selectSort("date")}
        >
          Fecha de obtención
        </button>
        <button
          class="stats-toggle"
          class:on={sortMode === "global"}
          data-focusable
          tabindex="-1"
          on:click={() => selectSort("global")}
        >
          % global
        </button>
      </div>
    </header>

    <div class="body">
      {#each sortedList as a, i (a.apiname)}
        <button
          class="ach"
          class:locked={!a.achieved}
          data-focusable
          data-focus-default={i === 0 ? "" : undefined}
          tabindex="-1"
        >
          {#if iconFor(a)}
            <img class="ach-icon" class:dim={dimIcon(a)} src={iconFor(a)} alt="" />
          {/if}
          {#if isSpoiler(a)}
            <!-- Logro oculto (spoiler) sin desbloquear: solo ícono + placeholder,
                 nada de descripción/fecha/% global — se revela al desbloquearlo,
                 o con "Mostrar logros ocultos"/"Ver % global" (ver isSpoiler). -->
            <div class="ach-text">
              <div class="ach-name dim">Logro oculto</div>
            </div>
          {:else}
            <div class="ach-text">
              <div class="ach-name">{a.displayName || a.apiname}</div>
              {#if a.description}<div class="ach-desc dim">{a.description}</div>{/if}
              {#if a.achieved && a.unlockTime}
                <div class="ach-date dim">Desbloqueado: {fmtUnlockDate(a.unlockTime)}</div>
              {/if}
              {#if $gameView.showGlobalPct}
                <div class="ach-global dim">
                  {#if loadingGlobal}
                    cargando %…
                  {:else if globalPct[a.apiname] != null}
                    {globalPct[a.apiname].toFixed(1)}% de los jugadores lo tienen
                  {:else}
                    no se pudo obtener el % global
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </button>
      {:else}
        <p class="dim">Sin logros sincronizados todavía — sincroniza desde Configuración → Cuentas.</p>
      {/each}
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--gm-bg-overlay);
    z-index: 72;
  }
  .modal {
    position: absolute;
    z-index: 73;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* Tamaño fijo pensado para 1080p, NO proporcional a la resolución real —
       en una pantalla 4K el modal se ve proporcionalmente más chico en vez de
       crecer con la pantalla. Los vw/vh son solo un tope de seguridad para no
       desbordar en ventanas chicas. */
    width: 900px;
    max-width: 92vw;
    height: 700px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 28px 32px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  }
  .head {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .head-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .head-top h2 {
    flex: 1;
    margin: 0;
    font-size: 1.3rem;
    font-weight: var(--gm-title-weight);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .close {
    cursor: pointer;
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-size: 1rem;
    line-height: 1;
  }
  .close:hover {
    color: var(--gm-text);
  }
  .close:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .progress-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .progress-count {
    flex: 0 0 auto;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--gm-text-dim);
    min-width: 52px;
  }
  .progress-bar {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: var(--gm-surface);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--gm-accent);
    border-radius: inherit;
    transition: width 0.3s ease;
  }
  /* --gm-complete (Ajustes → "Resaltado de 100% completado"), no
     --gm-success directo — mismo criterio que GameCard/GameDetail. */
  .progress-fill.complete {
    background: var(--gm-complete);
  }
  .progress-pct {
    flex: 0 0 auto;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--gm-accent-2);
    min-width: 40px;
    text-align: right;
  }
  .stats-row,
  .sort-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sort-label {
    font-size: 0.82rem;
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .stats-toggle {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 0.82rem;
    white-space: nowrap;
  }
  /* Botón de orden activo (sort-row) — mismo color que otros "on" de la app
     (toggles de Vista de juego, chip de grupo activo). */
  .stats-toggle.on {
    background: var(--gm-accent);
    color: #06101f;
  }
  .stats-toggle:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  /* Único elemento con scroll: la lista de logros. Header queda fijo.
     Padding propio (no solo el del modal) para que ni el primer/último logro
     ni los laterales queden pegados al contenedor; gap mayor entre logros
     para que no se sientan amontonados. */
  .body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    margin-top: 20px;
    padding: 4px 4px 10px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .ach {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    text-align: left;
    cursor: default;
    background: var(--gm-surface);
    color: var(--gm-text);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
    flex-shrink: 0;
  }
  /* El ícono bloqueado tiene su propio dimming (.ach-icon.dim, más abajo,
     SOLO si no hay variante gris real que ya se vea "apagada" por sí sola) —
     aplicar TAMBIÉN opacity acá encima compondría los dos y quedaría
     demasiado oscuro. El texto sí se atenúa siempre en un logro bloqueado. */
  .ach.locked .ach-text {
    opacity: 0.7;
  }
  .ach:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .ach-icon {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .ach-icon.dim {
    opacity: 0.5;
  }
  .ach-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .ach-name {
    font-weight: 600;
    font-size: 0.92rem;
  }
  .ach-desc,
  .ach-global,
  .ach-date {
    font-size: 0.8rem;
  }
</style>
