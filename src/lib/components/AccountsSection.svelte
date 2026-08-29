<script>
  import { openKeyboard } from "../stores/keyboard.js";
  import { showToast, reportError, openConfirmUnlinkSteam } from "../stores/ui.js";
  import {
    steamAccount,
    steamSyncing,
    steamSyncProgress,
    steamSyncOptions,
    GLOBAL_PCT_INTERVALS,
    setSteamSyncOption,
    showSteamId,
    setShowSteamId,
    linkAccount,
    syncNow,
    steamLangPref,
    effectiveSteamLang,
    setSteamLangPref,
  } from "../stores/steamAccount.js";
  import { STEAM_LANGUAGES, steamLanguageLabel } from "../i18n/steamLanguages.js";
  import { griddbKeyLinked, setGriddbKeyValue, clearGriddbKeyValue } from "../stores/griddb.js";
  import { openUrl } from "../ipc/index.js";
  import { errorMessage } from "../i18n/errors.js";
  import { t, tr } from "../i18n/index.js";
  import Select from "./Select.svelte";

  let profileInput = "";
  let apiKey = "";
  let linking = false;

  let griddbKeyInput = "";
  let griddbLinking = false;
  async function editGriddbKey() {
    const v = await openKeyboard(griddbKeyInput, tr("griddb.account.keyPlaceholder"));
    if (v !== null) griddbKeyInput = v;
  }
  async function doLinkGriddb() {
    if (!griddbKeyInput.trim() || griddbLinking) return;
    griddbLinking = true;
    try {
      await setGriddbKeyValue(griddbKeyInput);
      griddbKeyInput = "";
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      griddbLinking = false;
    }
  }
  async function doUnlinkGriddb() {
    try {
      await clearGriddbKeyValue();
    } catch (e) {
      reportError(e, "AccountsSection:unlinkGriddb");
    }
  }

  async function editProfileInput() {
    const v = await openKeyboard(profileInput, tr("keyboard.title.steamId"));
    if (v !== null) profileInput = v;
  }
  async function editApiKey() {
    const v = await openKeyboard(apiKey, tr("keyboard.title.steamApiKey"));
    if (v !== null) apiKey = v;
  }

  async function doLink() {
    if (!profileInput.trim() || !apiKey.trim()) {
      showToast(tr("accounts.toast.missingFields"));
      return;
    }
    linking = true;
    try {
      await linkAccount(profileInput, apiKey);
      profileInput = "";
      apiKey = "";
    } catch (e) {
      reportError(e, "AccountsSection:link");
    } finally {
      linking = false;
    }
  }

  function toggleIncludeFreeGames() {
    setSteamSyncOption("includePlayedFreeGames", !$steamSyncOptions.includePlayedFreeGames);
  }
  function pickGlobalPctInterval(value) {
    setSteamSyncOption("globalPctInterval", value);
  }

  // "auto" primero: sigue al idioma de la interfaz (lo que preselecciona la
  // configuración inicial). El resto son autónimos, no se traducen.
  $: steamLangOptions = [
    { value: "auto", label: $t("steam.lang.auto", { value: steamLanguageLabel($effectiveSteamLang) }) },
    ...STEAM_LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
  ];
</script>

<section class="panel">
  <h1>{$t("settings.sections.accounts")}</h1>

  <h2>Steam</h2>
  <p class="dim">
    {$t("accounts.steam.desc")}
  </p>

  {#if $steamAccount}
    <div class="account">
      {#if $steamAccount.avatarUrl}
        <img class="avatar" src={$steamAccount.avatarUrl} alt="" />
      {/if}
      <div class="account-info">
        <div class="name">{$steamAccount.personaName}</div>
        <div class="steamid dim">
          {$showSteamId ? $steamAccount.steamid : "•".repeat($steamAccount.steamid.length)}
        </div>
      </div>
    </div>
    <div class="row show-steamid-row">
      <span class="rlabel wide">{$t("accounts.showSteamId")}</span>
      <button
        class="toggle"
        class:on={$showSteamId}
        data-focusable
        tabindex="-1"
        on:click={() => setShowSteamId(!$showSteamId)}
      >
        {$showSteamId ? $t("common.on") : $t("common.off")}
      </button>
    </div>

    {#if $steamSyncing}
      <p class="dim">
        {$t("detail.sync.syncing")}
        {#if $steamSyncProgress}
          {$t("accounts.syncProgress", { done: $steamSyncProgress.done, total: $steamSyncProgress.total, appid: $steamSyncProgress.appid })}
        {/if}
      </p>
    {/if}

    <h2>{$t("accounts.syncOptions.title")}</h2>
    <div class="rows">
      <div class="row">
        <span class="rlabel wide">{$t("accounts.syncOptions.includeFreeGames")}</span>
        <button
          class="toggle"
          class:on={$steamSyncOptions.includePlayedFreeGames}
          data-focusable
          tabindex="-1"
          on:click={toggleIncludeFreeGames}
        >
          {$steamSyncOptions.includePlayedFreeGames ? $t("common.on") : $t("common.off")}
        </button>
      </div>
      <div class="row">
        <span class="rlabel wide">{$t("accounts.syncOptions.globalPctLabel")}</span>
        <Select
          value={$steamSyncOptions.globalPctInterval}
          options={GLOBAL_PCT_INTERVALS}
          onChange={pickGlobalPctInterval}
        />
      </div>
      <div class="row">
        <span class="rlabel wide">{$t("steam.lang.label")}</span>
        <Select value={$steamLangPref} options={steamLangOptions} onChange={setSteamLangPref} />
      </div>
    </div>
    <p class="dim">{$t("steam.lang.desc")}</p>

    <div class="actions">
      <!-- Sin `disabled` nativo mientras sincroniza: un botón enfocado que
           pasa a disabled pierde el foco del DOM (document.activeElement cae
           a <body>) y rompe la navegación por mando/Aceptar hasta el próximo
           movimiento direccional, y no se recupera solo al terminar la sync
           — syncNow ya se guarda contra reentradas por su cuenta. -->
      <button
        class="btn"
        class:syncing={$steamSyncing}
        data-focusable
        tabindex="-1"
        on:click={() => syncNow({ full: true })}
      >
        {$steamSyncing ? $t("detail.sync.syncing") : $t("accounts.syncNow")}
      </button>
      <button class="btn danger" data-focusable tabindex="-1" on:click={openConfirmUnlinkSteam}>
        {$t("steamAccount.unlink.confirm")}
      </button>
    </div>
  {:else}
    <div class="rows">
      <div class="row">
        <span class="rlabel">{$t("accounts.steamIdLabel")}</span>
        <button class="field" data-focusable tabindex="-1" on:click={editProfileInput}>
          {profileInput || $t("common.edit")}
        </button>
      </div>
      <div class="row">
        <span class="rlabel">{$t("accounts.apiKeyLabel")}</span>
        <button class="field" data-focusable tabindex="-1" on:click={editApiKey}>
          {apiKey ? "•".repeat(Math.min(apiKey.length, 24)) : $t("common.edit")}
        </button>
      </div>
      <!-- Visible ya al vincular: llega preseleccionado según el idioma
           elegido en el arranque inicial, y se puede desacoplar acá mismo sin
           tener que vincular primero y volver. -->
      <div class="row">
        <span class="rlabel">{$t("steam.lang.label")}</span>
        <Select value={$steamLangPref} options={steamLangOptions} onChange={setSteamLangPref} />
      </div>
    </div>
    <button class="btn" data-focusable tabindex="-1" disabled={linking} on:click={doLink}>
      {linking ? $t("accounts.linking") : $t("accounts.linkAccount")}
    </button>
  {/if}

  <h2>{$t("griddb.account.title")}</h2>
  <p class="dim">{$t("griddb.account.desc")}</p>

  {#if $griddbKeyLinked}
    <div class="row">
      <span class="rlabel wide">{$t("griddb.account.linked")}</span>
      <button class="btn danger" data-focusable tabindex="-1" on:click={doUnlinkGriddb}>
        {$t("griddb.account.unlink")}
      </button>
    </div>
  {:else}
    <div class="rows">
      <div class="row">
        <span class="rlabel">{$t("griddb.account.title")}</span>
        <button class="field" data-focusable tabindex="-1" on:click={editGriddbKey}>
          {griddbKeyInput ? "•".repeat(Math.min(griddbKeyInput.length, 24)) : $t("common.edit")}
        </button>
      </div>
    </div>
    <!-- Sin `disabled` nativo mientras valida — mismo motivo que el botón de
         sync de Steam más arriba: perdería el foco del DOM a mitad de la
         validación y rompería la navegación por mando. -->
    <button class="btn" class:syncing={griddbLinking} data-focusable tabindex="-1" on:click={doLinkGriddb}>
      {griddbLinking ? $t("griddb.account.linking") : $t("griddb.account.linkAction")}
    </button>
  {/if}
  <button
    class="link"
    data-focusable
    tabindex="-1"
    on:click={() => openUrl("https://www.steamgriddb.com/profile/preferences")}
  >
    {$t("griddb.account.getKey")} ↗
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
    max-width: 620px;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .rlabel {
    flex: 0 0 90px;
    font-weight: 600;
  }
  .rlabel.wide {
    flex: 1;
  }
  /* Toggle ON/OFF (mismo patrón que GameDetail > Vista de juego / Ajustes). */
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
  .field {
    flex: 1;
    cursor: pointer;
    text-align: left;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .field:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .btn {
    cursor: pointer;
    margin-top: 14px;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
  }
  .btn:disabled,
  .btn.syncing {
    opacity: 0.5;
    cursor: default;
  }
  .btn:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .btn.danger {
    color: var(--gm-danger);
    background: var(--gm-surface);
  }
  .actions {
    display: flex;
    gap: 10px;
  }
  .actions .btn {
    margin-top: 14px;
  }
  .account {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .show-steamid-row {
    margin-top: 8px;
  }
  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 8px;
  }
  .account-info .name {
    font-weight: 700;
  }
  .link {
    cursor: pointer;
    display: inline-block;
    margin-top: 10px;
    color: var(--gm-accent-2);
    font-weight: 700;
    font-size: 0.85rem;
  }
  .link:focus {
    box-shadow: var(--gm-focus-ring);
  }
</style>
