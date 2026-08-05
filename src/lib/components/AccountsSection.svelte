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
  } from "../stores/steamAccount.js";
  import Select from "./Select.svelte";

  let profileInput = "";
  let apiKey = "";
  let linking = false;

  async function editProfileInput() {
    const v = await openKeyboard(profileInput, "Steam ID (SteamID64 o nombre de perfil)");
    if (v !== null) profileInput = v;
  }
  async function editApiKey() {
    const v = await openKeyboard(apiKey, "API key de steamcommunity.com/dev/apikey");
    if (v !== null) apiKey = v;
  }

  async function doLink() {
    if (!profileInput.trim() || !apiKey.trim()) {
      showToast("Falta el perfil de Steam o la API key");
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
</script>

<section class="panel">
  <h1>Cuentas</h1>

  <h2>Steam</h2>
  <p class="dim">
    Trae tu biblioteca completa (instalados y no instalados) y tus logros. Cada
    persona usa su propia API key personal — se guarda cifrada en el almacén de
    credenciales del sistema, nunca en texto plano. Generarla en
    steamcommunity.com/dev/apikey.
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
      <span class="rlabel wide">Mostrar Steam ID</span>
      <button
        class="toggle"
        class:on={$showSteamId}
        data-focusable
        tabindex="-1"
        on:click={() => setShowSteamId(!$showSteamId)}
      >
        {$showSteamId ? "ON" : "OFF"}
      </button>
    </div>

    {#if $steamSyncing}
      <p class="dim">
        Sincronizando…
        {#if $steamSyncProgress}
          logros {$steamSyncProgress.done}/{$steamSyncProgress.total} (appid {$steamSyncProgress.appid})
        {/if}
      </p>
    {/if}

    <h2>Opciones de sincronización</h2>
    <div class="rows">
      <div class="row">
        <span class="rlabel wide">Incluir juegos gratuitos jugados</span>
        <button
          class="toggle"
          class:on={$steamSyncOptions.includePlayedFreeGames}
          data-focusable
          tabindex="-1"
          on:click={toggleIncludeFreeGames}
        >
          {$steamSyncOptions.includePlayedFreeGames ? "ON" : "OFF"}
        </button>
      </div>
      <div class="row">
        <span class="rlabel wide">Actualizar % global de logros</span>
        <Select
          value={$steamSyncOptions.globalPctInterval}
          options={GLOBAL_PCT_INTERVALS}
          onChange={pickGlobalPctInterval}
        />
      </div>
    </div>

    <div class="actions">
      <button
        class="btn"
        data-focusable
        tabindex="-1"
        disabled={$steamSyncing}
        on:click={() => syncNow({ full: true })}
      >
        {$steamSyncing ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      <button class="btn danger" data-focusable tabindex="-1" on:click={openConfirmUnlinkSteam}>
        Desvincular
      </button>
    </div>
  {:else}
    <div class="rows">
      <div class="row">
        <span class="rlabel">Steam ID</span>
        <button class="field" data-focusable tabindex="-1" on:click={editProfileInput}>
          {profileInput || "Editar"}
        </button>
      </div>
      <div class="row">
        <span class="rlabel">API key</span>
        <button class="field" data-focusable tabindex="-1" on:click={editApiKey}>
          {apiKey ? "•".repeat(Math.min(apiKey.length, 24)) : "Editar"}
        </button>
      </div>
    </div>
    <button class="btn" data-focusable tabindex="-1" disabled={linking} on:click={doLink}>
      {linking ? "Vinculando…" : "Vincular cuenta"}
    </button>
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
  .btn:disabled {
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
</style>
