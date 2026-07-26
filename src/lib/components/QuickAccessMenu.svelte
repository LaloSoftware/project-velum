<script>
  import { onMount } from "svelte";
  import {
    systemGetState,
    systemSetVolume,
    systemSetOutputDevice,
    systemSetWifi,
    systemSetBluetooth,
  } from "../ipc/index.js";

  let s = null;

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
    <div class="block">
      <div class="row">
        <span class="ico">📶</span>
        <div class="grow">
          <div class="label">Wi-Fi</div>
          <div class="sub dim">
            {s.wifiEnabled ? s.currentNetwork || "Sin conexión" : "Desactivado"}
          </div>
        </div>
        <button class="toggle" class:on={s.wifiEnabled} data-focusable data-focus-default tabindex="-1" on:click={toggleWifi}>
          {s.wifiEnabled ? "ON" : "OFF"}
        </button>
      </div>
      {#if s.wifiEnabled}
        <div class="chips">
          {#each s.networks as n}
            <button
              class="chip"
              class:sel={s.currentNetwork === n}
              data-focusable
              tabindex="-1"
              on:click={() => (s = { ...s, currentNetwork: n })}
            >
              {n}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Bluetooth -->
    <div class="block">
      <div class="row">
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
    </div>

    <!-- Volumen -->
    <div class="block">
      <div class="row">
        <span class="ico">🔊</span>
        <div class="grow">
          <div class="label">Volumen</div>
          <div class="bar"><div class="fill" style="width: {s.volume}%"></div></div>
        </div>
        <button class="step" data-focusable tabindex="-1" on:click={() => setVol(-5)}>–</button>
        <span class="pct">{s.volume}</span>
        <button class="step" data-focusable tabindex="-1" on:click={() => setVol(5)}>+</button>
      </div>
    </div>

    <!-- Salida de audio -->
    <div class="block">
      <div class="row">
        <span class="ico">🎧</span>
        <div class="grow"><div class="label">Salida de audio</div></div>
      </div>
      <div class="chips">
        {#each s.outputDevices as d}
          <button
            class="chip"
            class:sel={s.currentOutput === d.id}
            data-focusable
            tabindex="-1"
            on:click={() => pickOutput(d.id)}
          >
            {d.name}
          </button>
        {/each}
      </div>
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
    gap: 14px;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 1.6rem;
    font-weight: var(--gm-title-weight);
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .block {
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 16px;
  }
  .row {
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
  .toggle:focus,
  .step:focus,
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
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
    margin-top: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--gm-accent);
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
  .chip.sel {
    background: var(--gm-accent);
    color: #06101f;
  }
</style>
