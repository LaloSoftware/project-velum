<script>
  import { onMount } from "svelte";
  import {
    systemGetState,
    systemSetVolume,
    systemSetMuted,
    systemSetOutputDevice,
    systemSetWifi,
    systemSetBluetooth,
  } from "../ipc/index.js";
  import Select from "./Select.svelte";

  let s = null;
  // Categoría activa (la que tiene el foco): solo esa despliega sus opciones.
  let active = "wifi";

  onMount(async () => {
    s = await systemGetState();
  });

  async function toggleWifi() {
    await systemSetWifi(!s.wifiEnabled);
    s = { ...s, wifiEnabled: !s.wifiEnabled };
  }
  async function toggleBt() {
    await systemSetBluetooth(!s.bluetoothEnabled);
    s = { ...s, bluetoothEnabled: !s.bluetoothEnabled };
  }
  async function toggleMute() {
    await systemSetMuted(!s.muted);
    s = { ...s, muted: !s.muted };
  }
  async function setVol(delta) {
    const v = Math.max(0, Math.min(100, s.volume + delta));
    await systemSetVolume(v);
    s = { ...s, volume: v };
  }
  async function pickOutput(id) {
    await systemSetOutputDevice(id);
    s = { ...s, currentOutput: id };
  }
</script>

<div class="qam">
  <h2>Sistema</h2>
  {#if !s}
    <p class="dim">Cargando…</p>
  {:else}
    <!-- Wi-Fi -->
    <div class="cat" data-focus-group="wifi" on:focusin={() => (active = "wifi")}>
      <div class="head">
        <span class="ico">📶</span>
        <div class="grow">
          <div class="label">Wi-Fi</div>
          <div class="sub dim">
            {s.wifiEnabled ? s.currentNetwork || "Sin conexión" : "Desactivado"}
          </div>
        </div>
        <button
          class="toggle"
          class:on={s.wifiEnabled}
          data-focusable
          data-focus-default
          tabindex="-1"
          on:click={toggleWifi}
        >
          {s.wifiEnabled ? "ON" : "OFF"}
        </button>
      </div>
      {#if active === "wifi" && s.wifiEnabled}
        <div class="expand">
          <Select
            label="Red"
            value={s.currentNetwork}
            options={s.networks.map((n) => ({ value: n, label: n }))}
            onChange={(n) => (s = { ...s, currentNetwork: n })}
          />
        </div>
      {/if}
    </div>

    <!-- Bluetooth -->
    <div class="cat" data-focus-group="bt" on:focusin={() => (active = "bt")}>
      <div class="head">
        <span class="ico">🔵</span>
        <div class="grow">
          <div class="label">Bluetooth</div>
          <div class="sub dim">
            {s.bluetoothEnabled ? `${s.btDevices.length} dispositivos` : "Desactivado"}
          </div>
        </div>
        <button class="toggle" class:on={s.bluetoothEnabled} data-focusable tabindex="-1" on:click={toggleBt}>
          {s.bluetoothEnabled ? "ON" : "OFF"}
        </button>
      </div>
      {#if active === "bt" && s.bluetoothEnabled}
        <div class="chips">
          {#each s.btDevices as d}
            <button class="chip" data-focusable tabindex="-1">{d}</button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Volumen / Audio -->
    <div class="cat" data-focus-group="audio" on:focusin={() => (active = "audio")}>
      <div class="head">
        <span class="ico">{s.muted ? "🔇" : "🔊"}</span>
        <div class="grow">
          <div class="label">Volumen</div>
          <div class="sub dim">{s.muted ? "Silenciado" : `${s.volume}%`}</div>
        </div>
        <button class="toggle mute" class:on={!s.muted} data-focusable tabindex="-1" on:click={toggleMute}>
          {s.muted ? "🔇" : "🔊"}
        </button>
      </div>
      {#if active === "audio"}
        <div class="volrow">
          <button class="step" data-focusable tabindex="-1" on:click={() => setVol(-5)}>–</button>
          <div class="bar"><div class="fill" style="width: {s.volume}%"></div></div>
          <span class="pct">{s.volume}</span>
          <button class="step" data-focusable tabindex="-1" on:click={() => setVol(5)}>+</button>
        </div>
        <div class="sublabel dim">Salida de audio</div>
        <div class="expand">
          <Select
            label="Salida"
            value={s.currentOutput}
            options={s.outputDevices.map((d) => ({ value: d.id, label: d.name }))}
            onChange={pickOutput}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .qam {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 1.6rem;
    font-weight: var(--gm-title-weight);
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .cat {
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 14px 16px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ico {
    font-size: 1.4rem;
  }
  .grow {
    flex: 1;
  }
  .label {
    font-weight: 700;
  }
  .sub {
    font-size: 0.85rem;
  }
  .toggle {
    cursor: pointer;
    min-width: 62px;
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
  .toggle.mute {
    min-width: 52px;
    font-size: 1.1rem;
  }
  .toggle:focus,
  .step:focus,
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .volrow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
  }
  .step {
    cursor: pointer;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-size: 1.4rem;
    font-weight: 800;
  }
  .pct {
    min-width: 34px;
    text-align: center;
    font-weight: 700;
  }
  .bar {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--gm-accent);
  }
  .sublabel {
    margin-top: 14px;
    font-size: 0.85rem;
  }
  .expand {
    margin-top: 12px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .chip {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 600;
  }
</style>
