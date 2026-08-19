<script>
  import { onMount } from "svelte";
  import Select from "./Select.svelte";
  import { isTauri } from "../ipc/index.js";
  import {
    updatePrefs,
    setUpdatePrefs,
    updateState,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
  } from "../stores/updates.js";
  import { t, fmt } from "../i18n/index.js";

  // Ids persistidos: no se traducen ni se renombran (ver docs/i18n.md).
  const CHANNELS = [
    { value: "stable", labelKey: "updates.channel.options.stable" },
    { value: "beta", labelKey: "updates.channel.options.beta" },
  ];

  let appVersion = "0.1.0";
  onMount(async () => {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      appVersion = await getVersion();
    } catch {
      // modo web: se queda el fallback
    }
  });

  $: st = $updateState;
  $: busy = st.status === "checking";
  $: pct =
    st.progress && st.progress.total
      ? Math.round((st.progress.downloaded / st.progress.total) * 100)
      : null;
  $: pubDate = st.info?.pubDate ? new Date(st.info.pubDate) : null;
</script>

<section class="panel">
  <h1>{$t("settings.sections.updates")}</h1>
  <p class="dim">{$t("updates.current", { version: appVersion })}</p>

  <h2>{$t("updates.channel.title")}</h2>
  <Select
    value={$updatePrefs.channel}
    options={CHANNELS}
    onChange={(v) => setUpdatePrefs({ channel: v })}
  />
  <p class="dim small">{$t("updates.channel.desc")}</p>
  {#if $updatePrefs.channel === "stable"}
    <p class="dim small">{$t("updates.channel.stableEmpty")}</p>
  {/if}

  <h2>{$t("updates.checkOnStart.title")}</h2>
  <button
    class="toggle"
    class:on={$updatePrefs.checkOnStart}
    data-focusable
    tabindex="-1"
    on:click={() => setUpdatePrefs({ checkOnStart: !$updatePrefs.checkOnStart })}
  >
    {$updatePrefs.checkOnStart ? $t("common.on") : $t("common.off")}
  </button>
  <p class="dim small">{$t("updates.checkOnStart.desc")}</p>

  <h2>{$t("updates.status.title")}</h2>
  <!-- Una sola región viva para todos los estados: los lectores de pantalla
       anuncian el cambio sin que haya varios aria-live compitiendo. -->
  <div class="status" role="status" aria-live="polite">
    {#if st.status === "checking"}
      <span class="dot"></span><span>{$t("updates.status.checking")}</span>
    {:else if st.status === "uptodate"}
      <span>{$t("updates.status.uptodate")}</span>
    {:else if st.status === "available"}
      <span class="ver">{$t("updates.available.title", { version: st.info.version })}</span>
      {#if pubDate}
        <span class="dim small">{$t("updates.published", { date: $fmt.dateTime(pubDate) })}</span>
      {/if}
    {:else if st.status === "downloading"}
      <span>
        {pct !== null
          ? $t("updates.progress", { pct })
          : $t("updates.progress.unknown")}
      </span>
      <div class="bar" aria-label={$t("updates.aria.progress")}>
        <div class="fill" class:indeterminate={pct === null} style="width: {pct ?? 100}%"></div>
      </div>
    {:else if st.status === "ready"}
      <span>{$t("updates.status.ready")}</span>
      <span class="dim small">{$t("updates.restartHint")}</span>
    {:else if st.status === "installing"}
      <span class="dot"></span><span>{$t("updates.status.installing")}</span>
      <span class="dim small">{$t("updates.installHint")}</span>
    {:else if st.status === "error"}
      <span class="err">{st.error}</span>
    {:else}
      <span class="dim">{$t("updates.status.idle")}</span>
    {/if}
  </div>

  {#if st.status === "available" && st.info?.notes}
    <h2>{$t("updates.notes.title")}</h2>
    <!-- TEXTO PLANO a propósito: las notas vienen del cuerpo del release de
         GitHub; con {@html} serían XSS con permisos de WebView. -->
    <pre class="notes">{st.info.notes}</pre>
  {/if}

  <!--
    Bloque de acciones. Dos reglas del sistema de foco, ambas obligatorias:
    1) Nada de `disabled` nativo mientras corre una tarea async — el botón
       enfocado perdería el foco y la navegación con mando quedaría muerta
       (misma razón que en AccountsSection.svelte). Se usa `class:busy` y la
       guarda vive en las acciones del store.
    2) Ningún estado puede dejar el bloque sin un solo focusable: por eso
       "Después" acompaña también a `downloading` e `installing`.
  -->
  <div class="actions">
    {#if st.status === "available"}
      <button class="chip primary" data-focusable tabindex="-1" on:click={downloadUpdate}>
        {$t("updates.download.action")}
      </button>
      <button class="chip" data-focusable tabindex="-1" on:click={dismissUpdate}>
        {$t("updates.later.action")}
      </button>
    {:else if st.status === "downloading"}
      <button class="chip" data-focusable tabindex="-1" on:click={dismissUpdate}>
        {$t("updates.later.action")}
      </button>
    {:else if st.status === "ready"}
      <button class="chip primary" data-focusable tabindex="-1" on:click={installUpdate}>
        {$t("updates.install.action")}
      </button>
      <button class="chip" data-focusable tabindex="-1" on:click={dismissUpdate}>
        {$t("updates.later.action")}
      </button>
    {:else if st.status === "installing"}
      <button class="chip" data-focusable tabindex="-1" on:click={dismissUpdate}>
        {$t("updates.later.action")}
      </button>
    {:else if st.status === "error"}
      <button class="chip primary" data-focusable tabindex="-1" on:click={() => checkForUpdates()}>
        {$t("updates.retry.action")}
      </button>
    {:else}
      <button
        class="chip primary"
        class:busy
        data-focusable
        tabindex="-1"
        on:click={() => checkForUpdates()}
      >
        {busy ? $t("updates.check.checking") : $t("updates.check.action")}
      </button>
    {/if}
  </div>

  {#if !isTauri}
    <p class="dim small">{$t("updates.webOnly")}</p>
  {/if}
</section>

<style>
  .panel {
    padding: var(--gm-pad);
    height: 100%;
    overflow-y: auto;
    max-width: 640px;
  }
  h1 {
    font-size: 2rem;
    font-weight: var(--gm-title-weight);
    margin: 0 0 12px;
  }
  h2 {
    font-size: 1.1rem;
    margin: 24px 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .small {
    font-size: 0.85rem;
    margin-top: 8px;
  }
  .toggle {
    display: block;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    padding: 12px 0;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 800;
    text-align: center;
  }
  .toggle.on {
    background: var(--gm-success);
    color: #04140d;
  }
  .toggle:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .status {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    min-height: 24px;
  }
  .ver {
    font-weight: 800;
  }
  .err {
    color: var(--gm-danger);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gm-accent);
    animation: pulse 1.2s ease-in-out infinite;
  }
  .bar {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--gm-accent);
    transition: width 0.2s ease;
  }
  /* Sin Content-Length no hay porcentaje: la barra late en vez de mentir. */
  .fill.indeterminate {
    animation: pulse 1.2s ease-in-out infinite;
  }
  .notes {
    margin: 0;
    padding: 14px 16px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-family: var(--gm-font);
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 220px;
    overflow-y: auto;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }
  .chip {
    cursor: pointer;
    flex: 1;
    padding: 12px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 800;
    text-align: center;
  }
  .chip.primary {
    background: var(--gm-accent);
    color: var(--gm-text);
  }
  /* Ocupado: se ve apagado pero SIGUE siendo focusable (ver comentario arriba). */
  .chip.busy {
    opacity: 0.5;
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
</style>
