<script>
  import { onMount, onDestroy } from "svelte";
  import {
    systemState,
    systemBusy,
    startSystemWatch,
    setVolume,
    toggleMute,
    setAudioDevice,
    toggleWifi,
    scanWifi,
    connectWifi,
    forgetWifi,
    toggleBluetooth,
    scanBt,
    pairBt,
    unpairBt,
    setBtConnected,
  } from "../stores/system.js";
  import { t } from "../i18n/index.js";
  import Select from "./Select.svelte";

  // Cuatro categorías: Red · Bluetooth · Salida · Entrada. Solo la que tiene el
  // foco despliega sus opciones (mismo criterio que antes: con mando, tener las
  // cuatro abiertas convierte la navegación vertical en un viaje).
  let active = "wifi";
  let stop = null;

  onMount(() => {
    stop = startSystemWatch();
  });
  onDestroy(() => stop?.());

  $: s = $systemState;
  $: busy = $systemBusy;

  // Redes: la activa primero, después las guardadas, después por señal.
  $: networks = s
    ? [...s.networks].sort(
        (a, b) => b.active - a.active || b.known - a.known || b.signal - a.signal,
      )
    : [];
  $: paired = s ? s.btDevices.filter((d) => d.paired) : [];
  $: available = s ? s.btDevices.filter((d) => !d.paired) : [];

  const BT_ICON = {
    gamepad: "🎮",
    audio: "🎧",
    input: "⌨️",
    phone: "📱",
    other: "🔵",
  };
  const btIcon = (kind) => BT_ICON[kind] || BT_ICON.other;

  // 4 barras de señal: 0-25-50-75.
  const bars = (signal) => [0, 1, 2, 3].map((i) => signal > i * 25);

  function volIcon(ch) {
    if (ch.muted) return "🔇";
    return ch.volume === 0 ? "🔈" : ch.volume < 50 ? "🔉" : "🔊";
  }
</script>

<div class="qam">
  <h2>{$t("qam.section.system")}</h2>
  {#if !s}
    <p class="dim">{$t("common.loading")}</p>
  {:else}
    <!-- ------------------------------ Red ------------------------------ -->
    <div class="cat" data-focus-group="wifi" on:focusin={() => (active = "wifi")}>
      <div class="head">
        <span class="ico">📶</span>
        <div class="grow">
          <div class="label">{$t("common.network")}</div>
          <div class="sub dim">
            {#if !s.wifiPresent}
              {$t("qam.system.noWifiAdapter")}
            {:else if !s.wifiEnabled}
              {$t("common.disabled")}
            {:else}
              {s.currentNetwork || $t("qam.system.noConnection")}
            {/if}
          </div>
        </div>
        {#if s.wifiPresent}
          <button
            class="toggle"
            class:on={s.wifiEnabled}
            data-focusable
            data-focus-default
            tabindex="-1"
            on:click={toggleWifi}
          >
            {s.wifiEnabled ? $t("common.on") : $t("common.off")}
          </button>
        {/if}
      </div>

      {#if s.ethernetConnected}
        <div class="line">
          <span class="ico small">🔌</span>
          <span class="grow">{$t("qam.system.ethernet")}</span>
          <span class="dim">{s.ethernetName || $t("qam.system.connected")}</span>
        </div>
      {/if}

      {#if active === "wifi" && s.wifiPresent && s.wifiEnabled}
        <div class="expand">
          <button class="wide" data-focusable tabindex="-1" on:click={scanWifi} disabled={s.wifiScanning}>
            {s.wifiScanning ? `⟳ ${$t("qam.system.scanning")}` : `⟳ ${$t("qam.system.wifiScan")}`}
          </button>

          {#if !networks.length}
            <p class="dim empty">
              {s.wifiScanning ? $t("qam.system.scanning") : $t("qam.system.noNetworks")}
            </p>
          {/if}

          <!--
            Lista de filas y no un `Select`: un popover de una línea no puede
            mostrar señal, candado ni si la red está guardada, que es justo lo
            que se necesita para elegir bien desde el sofá.
          -->
          {#each networks as n (n.ssid)}
            {@const state = busy[`wifi:${n.ssid}`]}
            <div class="row">
              <button
                class="rowmain"
                class:active={n.active}
                data-focusable
                tabindex="-1"
                disabled={!!state}
                on:click={() => connectWifi(n)}
              >
                <span class="check">{n.active ? "✓" : ""}</span>
                <span class="rowname">{n.ssid}</span>
                {#if n.secured}<span class="lock" title={$t("qam.system.secured")}>🔒</span>{/if}
                {#if state === "connecting"}
                  <span class="tag">{$t("qam.system.connecting")}</span>
                {:else if n.known && !n.active}
                  <span class="tag dim">{$t("qam.system.saved")}</span>
                {/if}
                <span class="bars" aria-label="{n.signal}%">
                  {#each bars(n.signal) as on}<i class:on></i>{/each}
                </span>
              </button>
              <!--
                "Olvidar" solo en la red conectada: en las guardadas la fila ya
                dice "Guardada", y meter ahí el botón dejaba el SSID truncado a
                tres letras en un panel de este ancho.
              -->
              {#if n.active}
                <button
                  class="rowaction"
                  data-focusable
                  tabindex="-1"
                  disabled={!!state}
                  on:click={() => forgetWifi(n.ssid)}
                >
                  {$t("qam.system.forget")}
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- --------------------------- Bluetooth --------------------------- -->
    <div class="cat" data-focus-group="bt" on:focusin={() => (active = "bt")}>
      <div class="head">
        <span class="ico">🔵</span>
        <div class="grow">
          <div class="label">Bluetooth</div>
          <div class="sub dim">
            {#if !s.bluetoothPresent}
              {$t("qam.system.noBtAdapter")}
            {:else if !s.bluetoothEnabled}
              {$t("common.disabled")}
            {:else}
              {$t("qam.system.deviceCount", { count: paired.length })}
            {/if}
          </div>
        </div>
        {#if s.bluetoothPresent}
          <button class="toggle" class:on={s.bluetoothEnabled} data-focusable tabindex="-1" on:click={toggleBluetooth}>
            {s.bluetoothEnabled ? $t("common.on") : $t("common.off")}
          </button>
        {/if}
      </div>

      {#if active === "bt" && s.bluetoothPresent && s.bluetoothEnabled}
        <div class="expand">
          <div class="sublabel dim">{$t("qam.system.btPaired")}</div>
          {#if !paired.length}
            <p class="dim empty">{$t("qam.system.noBtDevices")}</p>
          {/if}
          <!--
            Dos niveles (nombre arriba, acciones abajo) y no todo en una línea:
            con dos botones al lado, un nombre como "Auriculares BT" se quedaba
            en "Auric…" en un panel de este ancho.
          -->
          {#each paired as d (d.id)}
            {@const state = busy[`bt:${d.id}`]}
            <div class="devrow">
              <div class="devname">
                <span class="dot" class:on={d.connected}></span>
                <span class="ico small">{btIcon(d.kind)}</span>
                <span class="rowname">{d.name}</span>
                {#if state === "connecting"}
                  <span class="tag">{$t("qam.system.connecting")}</span>
                {:else if state === "disconnecting"}
                  <span class="tag">{$t("qam.system.disconnecting")}</span>
                {:else if state === "unpairing"}
                  <span class="tag">{$t("qam.system.unpairing")}</span>
                {:else if d.connected}
                  <span class="tag dim">{$t("qam.system.connected")}</span>
                {/if}
              </div>
              <div class="devactions">
                {#if d.canConnect}
                  <button
                    class="rowaction"
                    data-focusable
                    tabindex="-1"
                    disabled={!!state}
                    on:click={() => setBtConnected(d, !d.connected)}
                  >
                    {d.connected ? $t("common.disconnect") : $t("common.connect")}
                  </button>
                {/if}
                <button
                  class="rowaction"
                  data-focusable
                  tabindex="-1"
                  disabled={!!state}
                  on:click={() => unpairBt(d)}
                >
                  {$t("qam.system.btUnpair")}
                </button>
              </div>
            </div>
          {/each}

          <div class="sublabel dim">{$t("qam.system.btAvailable")}</div>
          <button class="wide" data-focusable tabindex="-1" on:click={scanBt} disabled={s.btScanning}>
            {s.btScanning ? `⟳ ${$t("qam.system.scanning")}` : `⟳ ${$t("qam.system.btScan")}`}
          </button>
          {#each available as d (d.id)}
            {@const state = busy[`bt:${d.id}`]}
            <div class="devrow">
              <div class="devname">
                <span class="ico small">{btIcon(d.kind)}</span>
                <span class="rowname">{d.name}</span>
                {#if state === "pairing"}<span class="tag">{$t("qam.system.pairing")}</span>{/if}
              </div>
              <div class="devactions">
                <button
                  class="rowaction"
                  data-focusable
                  tabindex="-1"
                  disabled={!!state}
                  on:click={() => pairBt(d)}
                >
                  {$t("qam.system.btPair")}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- ------------------------ Salida / Entrada ------------------------ -->
    {#each [{ ch: "output", labelKey: "qam.system.audioOutput", pickKey: "common.output" }, { ch: "input", labelKey: "qam.system.audioInput", pickKey: "common.input" }] as cat (cat.ch)}
      {@const c = s[cat.ch]}
      <div class="cat" data-focus-group={cat.ch} on:focusin={() => (active = cat.ch)}>
        <div class="head">
          <span class="ico">{cat.ch === "input" ? (c.muted ? "🔇" : "🎤") : volIcon(c)}</span>
          <div class="grow">
            <div class="label">{$t(cat.labelKey)}</div>
            <div class="sub dim">
              {c.muted ? $t("common.muted") : `${c.volume}% · ${c.devices.find((d) => d.id === c.current)?.name || "—"}`}
            </div>
          </div>
          <button
            class="toggle mute"
            class:on={!c.muted}
            data-focusable
            tabindex="-1"
            on:click={() => toggleMute(cat.ch)}
          >
            {c.muted ? "🔇" : cat.ch === "input" ? "🎤" : "🔊"}
          </button>
        </div>
        {#if active === cat.ch}
          <div class="volrow">
            <!--
              `input type="range"`: la navegación por mando ya lo trata como
              slider (Aceptar entra en modo edición, Izq/Der ajustan — ver
              input/navigation.js). Reimplementarlo a mano con role="slider"
              duplicaría ese comportamiento.
            -->
            <input
              type="range"
              class="slider"
              data-focusable
              tabindex="-1"
              min="0"
              max="100"
              step="5"
              aria-label={$t(cat.labelKey)}
              value={c.volume}
              on:input={(e) => setVolume(cat.ch, Number(e.target.value))}
            />
            <span class="pct">{c.volume}</span>
          </div>
          <div class="expand">
            <Select
              label={$t(cat.pickKey)}
              value={c.current}
              options={c.devices.map((d) => ({ value: d.id, label: d.name }))}
              onChange={(id) => setAudioDevice(cat.ch, id)}
            />
          </div>
        {/if}
      </div>
    {/each}
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
  .ico.small {
    font-size: 1rem;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .label {
    font-weight: 700;
  }
  .sub {
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  .wide:focus,
  .rowmain:focus,
  .rowaction:focus,
  .slider:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .line {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    padding: 8px 10px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    font-size: 0.85rem;
  }
  .expand {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sublabel {
    margin-top: 6px;
    font-size: 0.85rem;
  }
  .empty {
    margin: 4px 0;
    font-size: 0.85rem;
  }
  .wide {
    cursor: pointer;
    width: 100%;
    padding: 10px 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
    text-align: left;
  }
  .row {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }
  .rowmain {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    color: var(--gm-text);
    text-align: left;
  }
  button.rowmain {
    cursor: pointer;
  }
  .devrow {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
  }
  .devname {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .devactions {
    display: flex;
    gap: 8px;
  }
  .devactions .rowaction {
    flex: 1;
    padding: 8px 0;
    background: var(--gm-surface);
    text-align: center;
  }
  .rowmain.active {
    color: var(--gm-text);
    font-weight: 700;
  }
  .check {
    width: 1em;
    flex: 0 0 auto;
    color: var(--gm-success);
  }
  .rowname {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lock,
  .tag {
    flex: 0 0 auto;
    font-size: 0.66rem;
  }
  .rowaction {
    cursor: pointer;
    flex: 0 0 auto;
    padding: 0 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    font-weight: 600;
  }
  .dot {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gm-surface);
  }
  .dot.on {
    background: var(--gm-success);
  }
  .bars {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 14px;
  }
  .bars i {
    /* Marca gráfica de 3px de ancho, no una superficie: la escala de radios
       (14/22px) la convertiría en una píldora. Sin redondeo. */
    width: 3px;
    background: var(--gm-text-dim);
    opacity: 0.25;
  }
  .bars i:nth-child(1) {
    height: 25%;
  }
  .bars i:nth-child(2) {
    height: 50%;
  }
  .bars i:nth-child(3) {
    height: 75%;
  }
  .bars i:nth-child(4) {
    height: 100%;
  }
  .bars i.on {
    opacity: 1;
  }
  .volrow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
  }
  .slider {
    flex: 1;
  }
  .pct {
    min-width: 34px;
    text-align: center;
    font-weight: 700;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
