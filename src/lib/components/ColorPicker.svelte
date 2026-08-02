<script>
  import { colorPicker, closeColorPicker } from "../stores/ui.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { normalizeHex, hexToRgb, rgbToHex, hexToHsv, hsvToHex } from "../util/color.js";

  $: cfg = $colorPicker;

  // Color de trabajo (hex, fuente de verdad). Se inicializa al abrir.
  let working = "#4c8dff";
  let lastCfg = null;
  $: if (cfg !== lastCfg) {
    lastCfg = cfg;
    working = normalizeHex(cfg?.value) || "#4c8dff";
  }

  $: rgb = hexToRgb(working) || { r: 0, g: 0, b: 0 };
  $: hsv = hexToHsv(working) || { h: 0, s: 0, v: 0 };

  // Grupos de colores predefinidos.
  const PALETTE_GROUPS = [
    { name: "Azules", colors: ["#4c8dff", "#3a7bd5", "#5aa9e6", "#7aa7ff", "#2668bf", "#00b4d8"] },
    { name: "Verdes / Teal", colors: ["#37e6b4", "#52d69a", "#2ecc71", "#14b8a6", "#3ddc97", "#8ee7c1"] },
    { name: "Cálidos", colors: ["#ff7a59", "#ffd166", "#ff9f1c", "#f4a261", "#ffb27a", "#ff5d5d"] },
    { name: "Rosas / Morados", colors: ["#c77dff", "#ff5d8f", "#a06cd5", "#e0aaff", "#ff8fab", "#9d4edd"] },
    { name: "Neutros", colors: ["#e8edf3", "#9aa6b4", "#6b7280", "#3a4453", "#1d232c", "#0e1116"] },
  ];

  let showWheel = false;
  let wheelEl;
  let dragging = false;
  const R = 95; // radio de la rueda (px)

  function setRgb(part, val) {
    const v = Math.max(0, Math.min(255, +val));
    const next = { ...rgb, [part]: v };
    working = rgbToHex(next.r, next.g, next.b);
  }

  async function editHex() {
    const q = await openKeyboard(working.replace(/^#/, ""), "Color hex (RRGGBB)");
    if (q === null) return;
    const norm = normalizeHex(q);
    if (norm) working = norm;
  }

  function setV(val) {
    working = hsvToHex(hsv.h, hsv.s, Math.max(0, Math.min(100, +val)));
  }

  // Posición del thumb en la rueda a partir de (h, s).
  $: thumb = (() => {
    const dist = (hsv.s / 100) * R;
    const a = ((hsv.h - 90) * Math.PI) / 180;
    return { x: R + dist * Math.cos(a), y: R + dist * Math.sin(a) };
  })();

  function wheelFromPoint(clientX, clientY) {
    if (!wheelEl) return;
    const rect = wheelEl.getBoundingClientRect();
    const dx = clientX - (rect.left + R);
    const dy = clientY - (rect.top + R);
    const dist = Math.min(Math.hypot(dx, dy), R);
    const s = Math.round((dist / R) * 100);
    let h = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    h = ((h % 360) + 360) % 360;
    working = hsvToHex(Math.round(h), s, hsv.v || 100);
  }

  function onWheelDown(e) {
    dragging = true;
    wheelFromPoint(e.clientX, e.clientY);
    window.addEventListener("pointermove", onWheelMove);
    window.addEventListener("pointerup", onWheelUp);
  }
  function onWheelMove(e) {
    if (dragging) wheelFromPoint(e.clientX, e.clientY);
  }
  function onWheelUp() {
    dragging = false;
    window.removeEventListener("pointermove", onWheelMove);
    window.removeEventListener("pointerup", onWheelUp);
  }

  function apply() {
    cfg?.onApply?.(working);
    closeColorPicker();
  }
</script>

{#if cfg}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" on:click={closeColorPicker} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label={cfg.title || "Color"}>
    <header class="head">
      <h2>{cfg.title || "Elegir color"}</h2>
      <div class="preview" style="background: {working}"></div>
      <span class="hexval">{working.toUpperCase()}</span>
    </header>

    <div class="body">
      <div class="col">
        {#each PALETTE_GROUPS as grp}
          <div class="group">
            <div class="gname">{grp.name}</div>
            <div class="swatches">
              {#each grp.colors as c}
                <button
                  class="swatch"
                  class:sel={working.toLowerCase() === c.toLowerCase()}
                  style="background: {c}"
                  data-focusable
                  data-focus-default={grp === PALETTE_GROUPS[0] && c === grp.colors[0] ? "" : undefined}
                  tabindex="-1"
                  aria-label={c}
                  on:click={() => (working = c)}
                ></button>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="col">
        <button class="field hexbtn" data-focusable tabindex="-1" on:click={editHex}>
          <span class="flbl">Hex</span>
          <span class="fval">{working.toUpperCase()}</span>
          <span class="edit">✎</span>
        </button>

        <div class="rgb">
          {#each [["r", "R"], ["g", "G"], ["b", "B"]] as [key, lbl]}
            <div class="sliderrow">
              <span class="slbl">{lbl}</span>
              <input
                type="range"
                class="slider"
                data-focusable
                tabindex="-1"
                min="0"
                max="255"
                step="1"
                value={rgb[key]}
                on:input={(e) => setRgb(key, e.target.value)}
              />
              <span class="sval">{rgb[key]}</span>
            </div>
          {/each}
        </div>

        <button class="wheeltoggle" data-focusable tabindex="-1" on:click={() => (showWheel = !showWheel)}>
          {showWheel ? "Ocultar rueda" : "Mostrar rueda de colores"}
        </button>

        {#if showWheel}
          <div class="wheelwrap">
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div
              class="wheel"
              bind:this={wheelEl}
              on:pointerdown={onWheelDown}
              role="slider"
              aria-label="Rueda de color"
              aria-valuenow={hsv.h}
              tabindex="-1"
            >
              <div class="wheel-value" style="opacity: {1 - hsv.v / 100}"></div>
              <div class="thumb" style="left: {thumb.x}px; top: {thumb.y}px"></div>
            </div>
            <div class="sliderrow vrow">
              <span class="slbl">Brillo</span>
              <input
                type="range"
                class="slider"
                data-focusable
                tabindex="-1"
                min="0"
                max="100"
                step="1"
                value={hsv.v}
                on:input={(e) => setV(e.target.value)}
              />
              <span class="sval">{hsv.v}</span>
            </div>
            <p class="hint">Arrastra en la rueda con el puntero, o usa los sliders con el mando.</p>
          </div>
        {/if}
      </div>
    </div>

    <footer class="actions">
      <button class="btn apply" data-focusable tabindex="-1" on:click={apply}>✓ Aplicar</button>
      <button class="btn cancel" data-focusable tabindex="-1" on:click={closeColorPicker}>✕ Cancelar</button>
    </footer>
  </div>
{/if}

<style>
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--gm-bg-overlay);
    z-index: 62;
  }
  .modal {
    position: absolute;
    z-index: 63;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(760px, 94vw);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 24px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .head h2 {
    flex: 1;
    margin: 0;
    font-size: 1.4rem;
    font-weight: var(--gm-title-weight);
  }
  .preview {
    width: 42px;
    height: 42px;
    border-radius: var(--gm-radius);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.15);
  }
  .hexval {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--gm-text-dim);
    min-width: 84px;
  }
  .body {
    display: flex;
    gap: 24px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  .col {
    flex: 1;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .group .gname {
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .swatch {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    cursor: pointer;
    border: 3px solid transparent;
  }
  .swatch.sel {
    border-color: var(--gm-text);
  }
  .swatch:focus {
    box-shadow: var(--gm-focus-ring);
    transform: scale(1.1);
  }
  .field {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
    cursor: pointer;
  }
  .flbl {
    color: var(--gm-text-dim);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .fval {
    flex: 1;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  .edit {
    color: var(--gm-text-dim);
  }
  .field:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .rgb {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sliderrow {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .slbl {
    min-width: 42px;
    color: var(--gm-text-dim);
    font-weight: 700;
    font-size: 0.85rem;
  }
  .slider {
    flex: 1;
    accent-color: var(--gm-accent);
    cursor: pointer;
  }
  .slider:focus {
    outline: none;
    box-shadow: var(--gm-focus-ring);
    border-radius: 999px;
  }
  .sval {
    min-width: 34px;
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .wheeltoggle {
    cursor: pointer;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 700;
    align-self: flex-start;
  }
  .wheeltoggle:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .wheelwrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }
  .wheel {
    position: relative;
    width: 190px;
    height: 190px;
    border-radius: 50%;
    cursor: crosshair;
    touch-action: none;
    background:
      radial-gradient(circle at center, #fff 0%, rgba(255, 255, 255, 0) 70%),
      conic-gradient(
        from 0deg,
        hsl(0, 100%, 50%),
        hsl(60, 100%, 50%),
        hsl(120, 100%, 50%),
        hsl(180, 100%, 50%),
        hsl(240, 100%, 50%),
        hsl(300, 100%, 50%),
        hsl(360, 100%, 50%)
      );
  }
  .wheel-value {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: #000;
    pointer-events: none;
  }
  .thumb {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
  .vrow {
    width: 190px;
  }
  .hint {
    color: var(--gm-text-dim);
    font-size: 0.8rem;
    margin: 0;
    text-align: center;
    max-width: 220px;
  }
  .actions {
    display: flex;
    gap: 12px;
    margin-top: 22px;
  }
  .btn {
    cursor: pointer;
    flex: 1;
    padding: 13px 0;
    border-radius: 999px;
    font-weight: 800;
  }
  .btn:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .apply {
    background: var(--gm-accent);
    color: #06101f;
  }
  .cancel {
    background: var(--gm-surface);
    color: var(--gm-text);
  }
</style>
