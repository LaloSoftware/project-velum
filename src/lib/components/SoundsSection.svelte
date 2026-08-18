<script>
  // El sonido de inicio se configura en Ajustes > Configuración de inicio
  // (StartupSection.svelte), junto al resto de lo que pasa al arrancar.
  import { soundSettings, updateSounds } from "../stores/sounds.js";
  import { t } from "../i18n/index.js";
</script>

<section class="panel">
  <h1>{$t("settings.sections.sounds")}</h1>
  <p class="dim">
    {$t("sounds.startupHint")}
  </p>

  <h2>{$t("sounds.nav.title")}</h2>
  <p class="dim">
    {$t("sounds.nav.desc")}
  </p>
  <button
    class="toggle"
    class:on={$soundSettings.navigationEnabled}
    data-focusable
    tabindex="-1"
    on:click={() => updateSounds({ navigationEnabled: !$soundSettings.navigationEnabled })}
  >
    {$soundSettings.navigationEnabled ? $t("common.on") : $t("common.off")}
  </button>

  <h2>{$t("sounds.nav.volume")}</h2>
  <div class="sizerow">
    <input
      type="range"
      class="size-slider"
      data-focusable
      tabindex="-1"
      min="0"
      max="100"
      step="5"
      value={Math.round($soundSettings.navigationVolume * 100)}
      on:input={(e) => updateSounds({ navigationVolume: e.target.value / 100 })}
    />
    <span class="sizeval">{Math.round($soundSettings.navigationVolume * 100)}%</span>
  </div>

  <h2>{$t("settings.sections.notifications")}</h2>
  <p class="dim">
    {$t("sounds.notifications.desc")}
  </p>
  <button
    class="toggle"
    class:on={$soundSettings.notificationsEnabled}
    data-focusable
    tabindex="-1"
    on:click={() => updateSounds({ notificationsEnabled: !$soundSettings.notificationsEnabled })}
  >
    {$soundSettings.notificationsEnabled ? $t("common.on") : $t("common.off")}
  </button>

  <h2>{$t("sounds.notifications.volume")}</h2>
  <div class="sizerow">
    <input
      type="range"
      class="size-slider"
      data-focusable
      tabindex="-1"
      min="0"
      max="100"
      step="5"
      value={Math.round($soundSettings.notificationsVolume * 100)}
      on:input={(e) => updateSounds({ notificationsVolume: e.target.value / 100 })}
    />
    <span class="sizeval">{Math.round($soundSettings.notificationsVolume * 100)}%</span>
  </div>

  <h2>{$t("sounds.musicPlayer.title")}</h2>
  <p class="dim">
    {$t("sounds.musicPlayer.desc")}
  </p>
  <div class="rows">
    <div class="row">
      <span class="rlabel">{$t("sounds.musicPlayer.stopOnGame")}</span>
      <button
        class="rowtoggle"
        class:on={$soundSettings.stopMusicOnGame}
        data-focusable
        tabindex="-1"
        on:click={() => updateSounds({ stopMusicOnGame: !$soundSettings.stopMusicOnGame })}
      >
        {$soundSettings.stopMusicOnGame ? $t("common.on") : $t("common.off")}
      </button>
    </div>
    <div class="row">
      <span class="rlabel">{$t("sounds.musicPlayer.stopOnApp")}</span>
      <button
        class="rowtoggle"
        class:on={$soundSettings.stopMusicOnApp}
        data-focusable
        tabindex="-1"
        on:click={() => updateSounds({ stopMusicOnApp: !$soundSettings.stopMusicOnApp })}
      >
        {$soundSettings.stopMusicOnApp ? $t("common.on") : $t("common.off")}
      </button>
    </div>
    <div class="row">
      <span class="rlabel">{$t("sounds.musicPlayer.muteNavDuringMusic")}</span>
      <button
        class="rowtoggle"
        class:on={$soundSettings.muteNavDuringMusic}
        data-focusable
        tabindex="-1"
        on:click={() => updateSounds({ muteNavDuringMusic: !$soundSettings.muteNavDuringMusic })}
      >
        {$soundSettings.muteNavDuringMusic ? $t("common.on") : $t("common.off")}
      </button>
    </div>
  </div>
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
    margin: 24px 0 10px;
  }
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
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
  .rowtoggle {
    cursor: pointer;
    min-width: 66px;
    padding: 10px 0;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 800;
    text-align: center;
  }
  .rowtoggle.on {
    background: var(--gm-success);
    color: #04140d;
  }
  .rowtoggle:focus {
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
