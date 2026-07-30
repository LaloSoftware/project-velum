<script>
  import {
    profiles,
    activeProfileId,
    setActive,
    createProfile,
    updateActive,
    deleteProfile,
  } from "../stores/profiles.js";
  import { themeOptions } from "../theming/index.js";
  import { EXAMPLE_EXTERNAL_CSS } from "../theming/themes.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { showToast, openColorPicker } from "../stores/ui.js";
  import {
    hideCardText,
    hideLibraryButton,
    setHideCardText,
    setHideLibraryButton,
    gameView,
    GAME_VIEW_FIELDS,
    setGameViewField,
    uiScale,
    UI_SCALE_OPTIONS,
    setUiScale,
    homeCardCount,
    HOME_CARD_COUNT_MIN,
    HOME_CARD_COUNT_MAX,
    setHomeCardCount,
    homeTexts,
    HOME_TEXT_FIELDS,
    setHomeTextHidden,
    setHomeTextValue,
    homePosition,
    HOME_POSITION_OPTIONS,
    setHomePosition,
  } from "../stores/uiprefs.js";
  import Select from "./Select.svelte";

  const themes = themeOptions();
  const ACCENT_DEFAULT = "#4c8dff";
  const CARD_W_DEFAULT = 190;

  $: active = $profiles.find((p) => p.id === $activeProfileId) || $profiles[0];
  $: cardW = parseInt(active?.tokenOverrides?.["--gm-card-w"]) || CARD_W_DEFAULT;
  $: cardWHome = parseInt(active?.tokenOverrides?.["--gm-card-w-home"]) || CARD_W_DEFAULT;
  $: accentColor = active?.tokenOverrides?.["--gm-accent"] || ACCENT_DEFAULT;

  function openAccentPicker() {
    openColorPicker({ value: accentColor, title: "Color de acento", onApply: pickAccent });
  }

  async function newProfile() {
    const name = await openKeyboard("", "Nombre del perfil");
    if (name) {
      await createProfile(name);
      showToast(`Perfil "${name}" creado y activado`);
    }
  }

  async function pickTheme(id) {
    await updateActive({ baseTheme: id });
  }
  async function pickAccent(color) {
    await updateActive({
      tokenOverrides: { ...active.tokenOverrides, "--gm-accent": color },
    });
  }
  async function pickCardSize(e) {
    const px = e.target.value;
    await updateActive({
      tokenOverrides: { ...active.tokenOverrides, "--gm-card-w": `${px}px` },
    });
  }
  async function pickCardSizeHome(e) {
    const px = e.target.value;
    await updateActive({
      tokenOverrides: { ...active.tokenOverrides, "--gm-card-w-home": `${px}px` },
    });
  }
  async function pickHomeCardCount(e) {
    await setHomeCardCount(e.target.value);
  }
  async function loadExternalCss() {
    await updateActive({ extraCss: EXAMPLE_EXTERNAL_CSS });
    showToast("CSS externo de ejemplo aplicado");
  }
  async function clearCss() {
    await updateActive({ extraCss: "", tokenOverrides: {} });
    showToast("Personalización CSS limpiada");
  }
  async function editHomeText(field) {
    const current = $homeTexts[field.key]?.text || "";
    const text = await openKeyboard(current, field.label);
    if (text !== null) await setHomeTextValue(field.key, text);
  }
  async function removeProfile() {
    if ($profiles.length <= 1) return showToast("No puedes borrar el único perfil");
    const name = active.name;
    await deleteProfile(active.id);
    showToast(`Perfil "${name}" eliminado`);
  }
</script>

<section class="settings">
  <h1>Ajustes · Apariencia</h1>

  <h2>Perfil activo</h2>
  <Select
    value={$activeProfileId}
    options={$profiles.map((p) => ({ value: p.id, label: p.name }))}
    onChange={setActive}
  />
  <div class="profile-actions">
    <button class="chip add" data-focusable tabindex="-1" on:click={newProfile}>+ Nuevo perfil</button>
    <button class="chip danger" data-focusable tabindex="-1" on:click={removeProfile}>Borrar perfil</button>
  </div>

  {#if active}
    <h2>Tema base del perfil «{active.name}»</h2>
    <Select
      value={active.baseTheme}
      options={themes.map((t) => ({ value: t.id, label: t.name }))}
      onChange={pickTheme}
    />

    <h2>Color de acento</h2>
    <button class="colorfield" data-focusable tabindex="-1" on:click={openAccentPicker}>
      <span class="swatch-sm" style="background: {accentColor}"></span>
      <span class="cf-val">{accentColor.toUpperCase()}</span>
      <span class="cf-cta">Personalizar</span>
    </button>

    <h2>Tamaño de tarjeta (biblioteca)</h2>
    <div class="sizerow">
      <input
        type="range"
        class="size-slider"
        data-focusable
        tabindex="-1"
        min="130"
        max="260"
        step="10"
        value={cardW}
        on:input={pickCardSize}
      />
      <span class="sizeval">{cardW}px</span>
    </div>

    <h2>Tamaño de tarjeta (Inicio)</h2>
    <div class="sizerow">
      <input
        type="range"
        class="size-slider"
        data-focusable
        tabindex="-1"
        min="130"
        max="260"
        step="10"
        value={cardWHome}
        on:input={pickCardSizeHome}
      />
      <span class="sizeval">{cardWHome}px</span>
    </div>

    <h2>Cantidad de tarjetas (Inicio)</h2>
    <div class="sizerow">
      <input
        type="range"
        class="size-slider"
        data-focusable
        tabindex="-1"
        min={HOME_CARD_COUNT_MIN}
        max={HOME_CARD_COUNT_MAX}
        step="1"
        value={$homeCardCount}
        on:input={pickHomeCardCount}
      />
      <span class="sizeval">{$homeCardCount}</span>
    </div>

    <h2>Posición del contenido (Inicio)</h2>
    <Select
      value={$homePosition}
      options={HOME_POSITION_OPTIONS}
      onChange={setHomePosition}
    />

    <h2>Escala de interfaz</h2>
    <Select
      value={$uiScale}
      options={UI_SCALE_OPTIONS}
      onChange={setUiScale}
    />

    <h2>CSS externo (perfil)</h2>
    <p class="dim">
      Prueba de carga de CSS en runtime. En la app real cargarías un archivo .css;
      aquí se aplica un ejemplo que redefine tokens --gm-*.
    </p>
    <div class="chips">
      <button class="chip" data-focusable tabindex="-1" on:click={loadExternalCss}>
        Aplicar CSS de ejemplo
      </button>
      <button class="chip" data-focusable tabindex="-1" on:click={clearCss}>
        Limpiar personalización
      </button>
    </div>
  {/if}

  <h2>Interfaz</h2>
  <div class="rows">
    <div class="row">
      <span class="rlabel">Ocultar textos de las tarjetas</span>
      <button
        class="toggle"
        class:on={$hideCardText}
        data-focusable
        tabindex="-1"
        on:click={() => setHideCardText(!$hideCardText)}
      >
        {$hideCardText ? "ON" : "OFF"}
      </button>
    </div>
    <div class="row">
      <span class="rlabel">Ocultar botón «Ver biblioteca» (Inicio)</span>
      <button
        class="toggle"
        class:on={$hideLibraryButton}
        data-focusable
        tabindex="-1"
        on:click={() => setHideLibraryButton(!$hideLibraryButton)}
      >
        {$hideLibraryButton ? "ON" : "OFF"}
      </button>
    </div>
  </div>

  <h2>Inicio · Bienvenida</h2>
  <p class="dim">
    Título, subtítulo y encabezado "Reciente" de la pantalla de Inicio: cada uno se
    puede ocultar o reemplazar por texto personalizado (texto vacío = por defecto).
  </p>
  <div class="rows">
    {#each HOME_TEXT_FIELDS as f (f.key)}
      <div class="row">
        <span class="rlabel">{f.label}</span>
        <button class="chip" data-focusable tabindex="-1" on:click={() => editHomeText(f)}>
          Editar texto
        </button>
        <button
          class="toggle"
          class:on={!$homeTexts[f.key]?.hidden}
          data-focusable
          tabindex="-1"
          on:click={() => setHomeTextHidden(f.key, !$homeTexts[f.key]?.hidden)}
        >
          {$homeTexts[f.key]?.hidden ? "OFF" : "ON"}
        </button>
      </div>
    {/each}
  </div>

  <h2>Vista de juego</h2>
  <p class="dim">Datos del juego que se muestran en el detalle (Jugar/Volver siempre visibles).</p>
  <div class="rows">
    {#each GAME_VIEW_FIELDS as f (f.key)}
      <div class="row">
        <span class="rlabel">{f.label}</span>
        <button
          class="toggle"
          class:on={$gameView[f.key]}
          data-focusable
          tabindex="-1"
          on:click={() => setGameViewField(f.key, !$gameView[f.key])}
        >
          {$gameView[f.key] ? "ON" : "OFF"}
        </button>
      </div>
    {/each}
  </div>
</section>

<style>
  .settings {
    padding: var(--gm-pad);
    overflow-y: auto;
    height: 100%;
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
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .chip {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .chip.add {
    background: var(--gm-surface-2);
    color: var(--gm-text);
  }
  .chip.danger {
    color: var(--gm-danger);
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .sizerow {
    display: flex;
    align-items: center;
    gap: 16px;
    /* Ancho completo del panel (alineado con los Select) para que la navegación
       vertical con el mando caiga en el slider y no lo salte. */
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
  .profile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }
  .colorfield {
    display: flex;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
    cursor: pointer;
  }
  .colorfield:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .swatch-sm {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.15);
  }
  .cf-val {
    flex: 1;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  .cf-cta {
    color: var(--gm-text-dim);
    font-weight: 600;
    font-size: 0.9rem;
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
</style>
