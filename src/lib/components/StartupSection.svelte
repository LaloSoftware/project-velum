<script>
  import { onMount } from "svelte";
  import { startup, updateStartup } from "../stores/startup.js";
  import { soundSettings, updateSounds } from "../stores/sounds.js";
  import { soundNames, soundFor } from "../theming/sounds.js";
  import { isTauri } from "../ipc/index.js";
  import { showToast, reportError } from "../stores/ui.js";
  import { t, tr } from "../i18n/index.js";
  import Select from "./Select.svelte";

  const VIEWS = [
    { id: "home", labelKey: "nav.home" },
    { id: "games", labelKey: "nav.games" },
    { id: "apps", labelKey: "nav.apps" },
  ];

  const STARTUP_SOUNDS = soundNames("startup");

  function previewStartupSound() {
    const url = soundFor("startup", $soundSettings.startupSound);
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = $soundSettings.startupVolume;
    audio.play().catch(() => {});
  }

  // Autoarranque con Windows (tauri-plugin-autostart) — el plugin es la
  // fuente de verdad (lee/escribe la entrada real del SO), no hay store
  // propio. Solo tiene efecto en la app instalada (apunta al .exe final).
  let autostartEnabled = false;
  onMount(async () => {
    if (!isTauri) return;
    try {
      const { isEnabled } = await import("@tauri-apps/plugin-autostart");
      autostartEnabled = await isEnabled();
    } catch (e) {
      reportError(e, "StartupSection:autostart-check");
    }
  });

  async function toggleAutostart() {
    if (!isTauri) return showToast(tr("startup.toast.autostartOnlyInApp"));
    try {
      const { enable, disable } = await import("@tauri-apps/plugin-autostart");
      if (autostartEnabled) await disable();
      else await enable();
      autostartEnabled = !autostartEnabled;
    } catch (e) {
      reportError(e, "StartupSection:autostart-toggle");
    }
  }
</script>

<section class="panel">
  <h1>{$t("settings.sections.startup")}</h1>

  <h2>{$t("startup.initialView.title")}</h2>
  <Select
    value={$startup.initialView}
    options={VIEWS.map((v) => ({ value: v.id, labelKey: v.labelKey }))}
    onChange={(v) => updateStartup({ initialView: v })}
  />

  <h2>{$t("startup.fullscreen.title")}</h2>
  <button
    class="toggle"
    class:on={$startup.fullscreen}
    data-focusable
    tabindex="-1"
    on:click={() => updateStartup({ fullscreen: !$startup.fullscreen })}
  >
    {$startup.fullscreen ? $t("common.on") : $t("common.off")}
  </button>

  <h2>{$t("startup.sound.title")}</h2>
  <button
    class="toggle"
    class:on={$soundSettings.startupEnabled}
    data-focusable
    tabindex="-1"
    on:click={() => updateSounds({ startupEnabled: !$soundSettings.startupEnabled })}
  >
    {$soundSettings.startupEnabled ? $t("common.on") : $t("common.off")}
  </button>

  {#if STARTUP_SOUNDS.length}
    <h2>{$t("startup.soundToPlay.title")}</h2>
    <Select
      value={$soundSettings.startupSound}
      options={STARTUP_SOUNDS.map((n) => ({ value: n, label: n }))}
      onChange={(v) => updateSounds({ startupSound: v })}
    />
    <button class="chip wide" data-focusable tabindex="-1" on:click={previewStartupSound}>
      {$t("startup.testSound")}
    </button>

    <h2>{$t("startup.soundVolume.title")}</h2>
    <div class="sizerow">
      <input
        type="range"
        class="size-slider"
        data-focusable
        tabindex="-1"
        min="0"
        max="100"
        step="5"
        value={Math.round($soundSettings.startupVolume * 100)}
        on:input={(e) => updateSounds({ startupVolume: e.target.value / 100 })}
      />
      <span class="sizeval">{Math.round($soundSettings.startupVolume * 100)}%</span>
    </div>
  {/if}

  <h2>{$t("startup.autostart.title")}</h2>
  <p class="dim">
    {$t("startup.autostart.desc")}
  </p>
  <button class="toggle" class:on={autostartEnabled} data-focusable tabindex="-1" on:click={toggleAutostart}>
    {autostartEnabled ? $t("common.on") : $t("common.off")}
  </button>
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
    margin: 0 0 18px;
  }
  h2 {
    font-size: 1.1rem;
    margin: 24px 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
    margin-top: 28px;
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
  .chip {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .chip.wide {
    display: block;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    margin-top: 10px;
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .sizerow {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
  }
  .size-slider {
    flex: 1;
    accent-color: var(--gm-accent);
    cursor: pointer;
  }
  .size-slider:focus {
    outline: none;
    box-shadow: var(--gm-focus-ring);
    border-radius: 999px;
  }
  .sizeval {
    min-width: 52px;
    text-align: right;
    color: var(--gm-text-dim);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
