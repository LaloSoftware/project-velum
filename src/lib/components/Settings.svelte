<script>
  import { onMount } from "svelte";
  import {
    profiles,
    activeProfileId,
    setActive,
    createProfile,
    updateActive,
    deleteProfile,
  } from "../stores/profiles.js";
  import { themeOptions } from "../theming/index.js";
  import { BUILTIN_THEMES, EXAMPLE_EXTERNAL_CSS, FONT_OPTIONS } from "../theming/themes.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import { showToast, openColorPicker } from "../stores/ui.js";
  import { isTauri } from "../ipc/index.js";
  import { imageUrl } from "../util/asset.js";
  import velumSymbol from "../../assets/velum-symbol.svg";

  // "Acerca de VELUM" (pie de Apariencia) — versión real vía Tauri, con
  // fallback en modo web/dev sin backend nativo (mismo criterio try/catch
  // que ipc/index.js).
  let appVersion = "0.1.0";
  onMount(async () => {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      appVersion = await getVersion();
    } catch {
      // modo web: se queda el fallback de arriba
    }
  });
  import {
    hideCardText,
    hideLibraryButton,
    hideFooter,
    setHideCardText,
    setHideLibraryButton,
    setHideFooter,
    gameView,
    GAME_VIEW_FIELDS,
    setGameViewField,
    metaBgVisible,
    metaBgOpacity,
    META_BG_OPACITY_MIN,
    META_BG_OPACITY_MAX,
    setMetaBgVisible,
    setMetaBgOpacity,
    homeBgFade,
    HOME_BG_FADE_MIN,
    HOME_BG_FADE_MAX,
    setHomeBgFade,
    homeWallpaperPath,
    setHomeWallpaper,
    clearHomeWallpaper,
    completedBadgeEnabled,
    completedGlowEnabled,
    setCompletedBadgeEnabled,
    setCompletedGlowEnabled,
    uiScale,
    UI_SCALE_MIN,
    UI_SCALE_MAX,
    UI_SCALE_STEP,
    setUiScale,
    homeCardCount,
    HOME_CARD_COUNT_MIN,
    HOME_CARD_COUNT_MAX,
    setHomeCardCount,
    homeTexts,
    HOME_TEXT_FIELDS,
    setHomeTextHidden,
    setHomeTextValue,
    setHomeTextMode,
    homeOrientation,
    HOME_ORIENTATION_OPTIONS,
    setHomeOrientation,
    homeScrollMode,
    HOME_SCROLL_MODE_OPTIONS,
    setHomeScrollMode,
    homeReading,
    HOME_READING_OPTIONS,
    setHomeReading,
    homePosition,
    homePositionOptions,
    setHomePosition,
    homeCardAlign,
    setHomeCardAlign,
    tabsAlign,
    TABS_ALIGN_OPTIONS,
    setTabsAlign,
    clockPosition,
    CLOCK_POSITION_OPTIONS,
    setClockPosition,
  } from "../stores/uiprefs.js";
  import Select from "./Select.svelte";

  const themes = themeOptions();
  const ACCENT_DEFAULT = "#4c8dff";
  const CARD_W_DEFAULT = 190;
  const COMPLETE_DEFAULT = "#52d69a";

  $: active = $profiles.find((p) => p.id === $activeProfileId) || $profiles[0];
  $: cardW = parseInt(active?.tokenOverrides?.["--gm-card-w"]) || CARD_W_DEFAULT;
  $: cardWHome = parseInt(active?.tokenOverrides?.["--gm-card-w-home"]) || CARD_W_DEFAULT;
  $: accentColor = active?.tokenOverrides?.["--gm-accent"] || ACCENT_DEFAULT;
  $: baseThemeTokens = BUILTIN_THEMES[active?.baseTheme]?.tokens || {};
  $: textColor = active?.tokenOverrides?.["--gm-text"] || baseThemeTokens["--gm-text"] || "#e8edf3";
  $: fontValue = active?.tokenOverrides?.["--gm-font"] || FONT_OPTIONS[0].value;
  $: completeColor = active?.tokenOverrides?.["--gm-complete"] || COMPLETE_DEFAULT;

  function openAccentPicker() {
    openColorPicker({ value: accentColor, title: "Color de acento", onApply: pickAccent });
  }
  function openTextPicker() {
    openColorPicker({ value: textColor, title: "Color de texto", onApply: pickText });
  }
  function openCompletePicker() {
    openColorPicker({
      value: completeColor,
      title: "Color de 100% completado",
      onApply: pickCompleteColor,
    });
  }

  async function newProfile() {
    const name = await openKeyboard("", "Nombre del perfil");
    if (name) {
      await createProfile(name);
      showToast(`Perfil "${name}" creado y activado`);
    }
  }

  async function pickTheme(id) {
    // Al pasar de un tema oscuro a uno claro, se descarta un --gm-text
    // personalizado previo (probablemente pensado para fondo oscuro) para que
    // el texto no desaparezca — el tema claro ya trae su propio texto oscuro
    // por defecto. El usuario puede volver a personalizarlo con el control de
    // "Color de texto". No se toca si ya se estaba en un tema claro.
    const prevKind = BUILTIN_THEMES[active.baseTheme]?.kind || "dark";
    const nextKind = BUILTIN_THEMES[id]?.kind || "dark";
    const patch = { baseTheme: id };
    if (nextKind === "light" && prevKind !== "light" && active.tokenOverrides?.["--gm-text"]) {
      const { "--gm-text": _drop, ...rest } = active.tokenOverrides;
      patch.tokenOverrides = rest;
    }
    await updateActive(patch);
  }
  async function pickAccent(color) {
    await updateActive({
      tokenOverrides: { ...active.tokenOverrides, "--gm-accent": color },
    });
  }
  async function pickText(color) {
    await updateActive({
      tokenOverrides: { ...active.tokenOverrides, "--gm-text": color },
    });
  }
  async function pickCompleteColor(color) {
    await updateActive({
      tokenOverrides: { ...active.tokenOverrides, "--gm-complete": color },
    });
  }
  async function pickFont(value) {
    await updateActive({
      tokenOverrides: { ...active.tokenOverrides, "--gm-font": value },
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

  // Wallpaper general de Inicio — mismo patrón de diálogo nativo que
  // ArtEditor.svelte::pick() (ruta absoluta, nunca se copia el archivo).
  const WALLPAPER_IMG_EXT = ["png", "jpg", "jpeg", "webp", "bmp", "gif"];
  async function pickHomeWallpaper() {
    if (!isTauri) return showToast("Selección de archivos solo en la app");
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ multiple: false, filters: [{ name: "Imágenes", extensions: WALLPAPER_IMG_EXT }] });
    if (path) {
      await setHomeWallpaper(path);
      showToast("Wallpaper de Inicio actualizado");
    }
  }
  async function removeHomeWallpaper() {
    await clearHomeWallpaper();
    showToast("Wallpaper de Inicio quitado");
  }

  // Vista previa del wallpaper (data URI, se recarga si cambia la ruta) —
  // mismo mecanismo que las miniaturas de ArtEditor.svelte.
  let wallpaperPreview = null;
  let wallpaperPreviewFor = null;
  $: if ($homeWallpaperPath !== wallpaperPreviewFor) {
    wallpaperPreviewFor = $homeWallpaperPath;
    wallpaperPreview = null;
    if ($homeWallpaperPath) {
      const path = $homeWallpaperPath;
      imageUrl(path).then((u) => {
        if (path === wallpaperPreviewFor) wallpaperPreview = u;
      });
    }
  }
  async function removeProfile() {
    if ($profiles.length <= 1) return showToast("No puedes borrar el único perfil");
    const name = active.name;
    await deleteProfile(active.id);
    showToast(`Perfil "${name}" eliminado`);
  }
  function exportProfileCss() {
    showToast("Exportar perfil CSS: próximamente");
  }
</script>

<section class="settings">
  <h1>Ajustes · Apariencia</h1>

  <h2>Perfil activo</h2>
  <div class="profile-block">
    <Select
      value={$activeProfileId}
      options={$profiles.map((p) => ({ value: p.id, label: p.name }))}
      onChange={setActive}
    />
    <div class="profile-actions">
      <button class="chip add" data-focusable tabindex="-1" on:click={newProfile}>+ Nuevo perfil</button>
      <button class="chip danger" data-focusable tabindex="-1" on:click={removeProfile}>Borrar perfil</button>
    </div>
  </div>

  {#if active}
    <h2>Tema base del perfil «{active.name}»</h2>
    <Select
      value={active.baseTheme}
      options={themes.map((t) => ({ value: t.id, label: t.name + (t.kind === "light" ? " (claro)" : "") }))}
      onChange={pickTheme}
    />

    <h2>Color de acento</h2>
    <button class="colorfield" data-focusable tabindex="-1" on:click={openAccentPicker}>
      <span class="swatch-sm" style="background: {accentColor}"></span>
      <span class="cf-val">{accentColor.toUpperCase()}</span>
      <span class="cf-cta">Personalizar</span>
    </button>

    <h2>Color de texto</h2>
    <p class="dim">
      Al cambiar a un tema de fondo claro, el texto se reinicia automáticamente a un
      tono oscuro legible; puedes volver a personalizarlo aquí.
    </p>
    <button class="colorfield" data-focusable tabindex="-1" on:click={openTextPicker}>
      <span class="swatch-sm" style="background: {textColor}"></span>
      <span class="cf-val">{textColor.toUpperCase()}</span>
      <span class="cf-cta">Personalizar</span>
    </button>

    <h2>Tipografía</h2>
    <Select
      value={fontValue}
      options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
      onChange={pickFont}
    />

    <h2>Escala de interfaz</h2>
    <div class="sizerow">
      <input
        type="range"
        class="size-slider"
        data-focusable
        tabindex="-1"
        min={UI_SCALE_MIN}
        max={UI_SCALE_MAX}
        step={UI_SCALE_STEP}
        value={$uiScale}
        on:input={(e) => setUiScale(e.target.value)}
      />
      <span class="sizeval">{$uiScale.toFixed(2)}x</span>
    </div>

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
      <div class="row">
        <span class="rlabel">Ocultar pie con guías de botones</span>
        <button
          class="toggle"
          class:on={$hideFooter}
          data-focusable
          tabindex="-1"
          on:click={() => setHideFooter(!$hideFooter)}
        >
          {$hideFooter ? "ON" : "OFF"}
        </button>
      </div>
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

    <h2>Fondo de metadatos (Detalle)</h2>
    <p class="dim">
      Fondo detrás del título/plataforma/meta del Detalle, para que se lea mejor sobre
      el hero — se adapta al tema/perfil activo (no es un negro fijo).
    </p>
    <div class="rows">
      <div class="row">
        <span class="rlabel">Visible</span>
        <button
          class="toggle"
          class:on={$metaBgVisible}
          data-focusable
          tabindex="-1"
          on:click={() => setMetaBgVisible(!$metaBgVisible)}
        >
          {$metaBgVisible ? "ON" : "OFF"}
        </button>
      </div>
      <div class="row">
        <span class="rlabel">Opacidad</span>
        <div class="sizerow">
          <input
            type="range"
            class="size-slider"
            data-focusable
            tabindex="-1"
            min={META_BG_OPACITY_MIN}
            max={META_BG_OPACITY_MAX}
            step="5"
            value={$metaBgOpacity}
            on:input={(e) => setMetaBgOpacity(e.target.value)}
          />
          <span class="sizeval">{$metaBgOpacity}%</span>
        </div>
      </div>
    </div>

    <h2>Difuminado de fondo (Inicio)</h2>
    <p class="dim">
      Qué tan visible se ve la foto de fondo de Inicio antes de desvanecerse hacia el
      wallpaper del tema — más bajo, más difuminado/tenue.
    </p>
    <div class="rows">
      <div class="row">
        <span class="rlabel">Difuminado</span>
        <div class="sizerow">
          <input
            type="range"
            class="size-slider"
            data-focusable
            tabindex="-1"
            min={HOME_BG_FADE_MIN}
            max={HOME_BG_FADE_MAX}
            step="5"
            value={$homeBgFade}
            on:input={(e) => setHomeBgFade(e.target.value)}
          />
          <span class="sizeval">{$homeBgFade}%</span>
        </div>
      </div>
    </div>

    <h2>Wallpaper de Inicio</h2>
    <p class="dim">
      Reemplaza el fondo de Inicio (la foto que cambia según el juego enfocado en la
      tira) por una imagen fija para todos los juegos. No afecta las carátulas de las
      tarjetas ni el Detalle de cada juego.
    </p>
    <div class="rows">
      <div class="row">
        <span class="rlabel">Imagen</span>
        <div class="wallpaper-actions">
          {#if wallpaperPreview}
            <img class="wallpaper-preview" src={wallpaperPreview} alt="" />
          {/if}
          <button class="chip" data-focusable tabindex="-1" on:click={pickHomeWallpaper}>
            {$homeWallpaperPath ? "Cambiar imagen…" : "Elegir imagen…"}
          </button>
          {#if $homeWallpaperPath}
            <button class="chip danger" data-focusable tabindex="-1" on:click={removeHomeWallpaper}>
              Quitar
            </button>
          {/if}
        </div>
      </div>
    </div>

    <h2>Resaltado de 100% completado (logros)</h2>
    <p class="dim">
      Marca los juegos con todos los logros desbloqueados (tarjeta y badge de logros
      del Detalle) con este color — cámbialo si choca con el color de acento de tu
      perfil. Aplica a la insignia de texto y al brillo de abajo, cada uno con su
      propio interruptor.
    </p>
    <button class="colorfield" data-focusable tabindex="-1" on:click={openCompletePicker}>
      <span class="swatch-sm" style="background: {completeColor}"></span>
      <span class="cf-val">{completeColor.toUpperCase()}</span>
      <span class="cf-cta">Personalizar</span>
    </button>
    <div class="rows spaced">
      <div class="row">
        <span class="rlabel">Insignia "100%"</span>
        <button
          class="toggle"
          class:on={$completedBadgeEnabled}
          data-focusable
          tabindex="-1"
          on:click={() => setCompletedBadgeEnabled(!$completedBadgeEnabled)}
        >
          {$completedBadgeEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <div class="row">
        <span class="rlabel">Brillo</span>
        <button
          class="toggle"
          class:on={$completedGlowEnabled}
          data-focusable
          tabindex="-1"
          on:click={() => setCompletedGlowEnabled(!$completedGlowEnabled)}
        >
          {$completedGlowEnabled ? "ON" : "OFF"}
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
          <button
            class="chip"
            data-focusable
            tabindex="-1"
            on:click={() =>
              setHomeTextMode(f.key, $homeTexts[f.key]?.mode === "focus" ? "custom" : "focus")}
          >
            {$homeTexts[f.key]?.mode === "focus" ? "Juego en foco" : "Personalizado"}
          </button>
          {#if $homeTexts[f.key]?.mode !== "focus"}
            <button class="chip" data-focusable tabindex="-1" on:click={() => editHomeText(f)}>
              Editar texto
            </button>
          {/if}
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

    <h2>Orientación de la tira (Inicio)</h2>
    <Select
      value={$homeOrientation}
      options={HOME_ORIENTATION_OPTIONS}
      onChange={setHomeOrientation}
    />

    <h2>Modo de recorrido (Inicio)</h2>
    <Select
      value={$homeScrollMode}
      options={HOME_SCROLL_MODE_OPTIONS}
      onChange={setHomeScrollMode}
    />

    <h2>Comportamiento de lectura (Inicio)</h2>
    <Select
      value={$homeReading}
      options={HOME_READING_OPTIONS}
      onChange={setHomeReading}
    />

    <h2>Posición del bloque (Inicio)</h2>
    <Select
      value={$homePosition}
      options={homePositionOptions($homeOrientation)}
      onChange={setHomePosition}
    />

    <h2>Alineación de tarjetas (lista de Inicio)</h2>
    <Select
      value={$homeCardAlign}
      options={homePositionOptions($homeOrientation)}
      onChange={setHomeCardAlign}
    />

    <h2>Alineación de pestañas (barra superior)</h2>
    <Select
      value={$tabsAlign}
      options={TABS_ALIGN_OPTIONS}
      onChange={setTabsAlign}
    />

    <h2>Posición del reloj (barra superior)</h2>
    <Select
      value={$clockPosition}
      options={CLOCK_POSITION_OPTIONS}
      onChange={setClockPosition}
    />

    <h2>Avanzado</h2>
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
      <button class="chip" data-focusable tabindex="-1" on:click={exportProfileCss}>
        Exportar perfil CSS
      </button>
    </div>

    <div class="about">
      <img class="about-symbol" src={velumSymbol} alt="" />
      <div class="about-text">
        <span class="about-name">VELUM</span>
        <span class="about-version dim">v{appVersion}</span>
      </div>
    </div>
  {/if}
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
  /* Mismo criterio que .sizerow (abajo): width:100% para que el contenedor
     ocupe casi toda la fila. Pero eso solo alinea el CONTENEDOR — la
     navegación por geometría usa el rectángulo del botón enfocable en sí, y
     con justify-content por defecto (flex-start) los botones quedaban
     agrupados pegados a la izquierda, lejos del centro del slider vecino
     (su <input> sí ocupa casi todo el ancho, flex:1) — ese desalineamiento
     horizontal seguía haciendo que "arriba"/"abajo" saltara la fila.
     flex-end los pega al borde derecho, igual que .sizeval/.toggle/
     .colorfield en las filas de alrededor, consistente entre todas. */
  .wallpaper-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    width: 100%;
  }
  .wallpaper-preview {
    width: 120px;
    height: 68px;
    object-fit: cover;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    flex-shrink: 0;
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
  .profile-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px;
    /* Aire extra antes del siguiente control: sin esto, "abajo" desde el
       Select de arriba compite en geometría contra el próximo Select (más
       lejos pero perfectamente alineado en X) y se salta estos botones. */
    margin-bottom: 64px;
  }
  .profile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
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
  /* Separación de un control (colorfield, slider) inmediatamente arriba —
     sin esto quedan pegados (visualmente y para la navegación por foco). */
  .rows.spaced {
    margin-top: 10px;
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
  .about {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 34px;
    padding-top: 22px;
    border-top: 1px solid var(--gm-surface);
  }
  .about-symbol {
    width: 28px;
    height: 28px;
  }
  .about-text {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .about-name {
    font-weight: 800;
    letter-spacing: 0.06em;
  }
  .about-version {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
</style>
