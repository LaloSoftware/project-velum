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
  import { showToast } from "../stores/ui.js";
  import Select from "./Select.svelte";

  const themes = themeOptions();
  const ACCENTS = ["#4c8dff", "#37e6b4", "#ff7a59", "#ffd166", "#c77dff", "#ff5d8f"];

  $: active = $profiles.find((p) => p.id === $activeProfileId) || $profiles[0];

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
  async function loadExternalCss() {
    await updateActive({ extraCss: EXAMPLE_EXTERNAL_CSS });
    showToast("CSS externo de ejemplo aplicado");
  }
  async function clearCss() {
    await updateActive({ extraCss: "", tokenOverrides: {} });
    showToast("Personalización CSS limpiada");
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

  <h2>Perfiles</h2>
  <div class="chips">
    {#each $profiles as p, i (p.id)}
      <button
        class="chip"
        class:sel={p.id === $activeProfileId}
        data-focusable
        data-focus-default={i === 0 ? "" : undefined}
        tabindex="-1"
        on:click={() => setActive(p.id)}
      >
        {p.name}
      </button>
    {/each}
    <button class="chip add" data-focusable tabindex="-1" on:click={newProfile}>+ Nuevo</button>
  </div>

  {#if active}
    <h2>Tema base del perfil «{active.name}»</h2>
    <Select
      value={active.baseTheme}
      options={themes.map((t) => ({ value: t.id, label: t.name }))}
      onChange={pickTheme}
    />

    <h2>Color de acento</h2>
    <div class="swatches">
      {#each ACCENTS as c}
        <button
          class="swatch"
          style="background: {c}"
          class:sel={active.tokenOverrides?.["--gm-accent"] === c}
          data-focusable
          tabindex="-1"
          aria-label={c}
          on:click={() => pickAccent(c)}
        ></button>
      {/each}
    </div>

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
      <button class="chip danger" data-focusable tabindex="-1" on:click={removeProfile}>
        Borrar perfil
      </button>
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
  .chip.sel {
    background: var(--gm-accent);
    color: #06101f;
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
  .swatches {
    display: flex;
    gap: 12px;
  }
  .swatch {
    width: 46px;
    height: 46px;
    border-radius: 12px;
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
</style>
