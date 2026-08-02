<script>
  // El sonido de inicio se configura en Ajustes > Configuración de inicio
  // (StartupSection.svelte), junto al resto de lo que pasa al arrancar.
  import { soundSettings, updateSounds } from "../stores/sounds.js";
</script>

<section class="panel">
  <h1>Sonidos</h1>
  <p class="dim">
    El sonido de inicio se configura en Ajustes &gt; Configuración de inicio.
  </p>

  <h2>Navegación</h2>
  <p class="dim">
    Moverse entre tarjetas/menús, aceptar, cambiar de pestaña, y cancelar/retroceder.
  </p>
  <button
    class="toggle"
    class:on={$soundSettings.navigationEnabled}
    data-focusable
    tabindex="-1"
    on:click={() => updateSounds({ navigationEnabled: !$soundSettings.navigationEnabled })}
  >
    {$soundSettings.navigationEnabled ? "ON" : "OFF"}
  </button>

  <h2>Volumen de navegación</h2>
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

  <h2>Notificaciones</h2>
  <p class="dim">
    Mensajes de error, y abrir/cerrar los menús de Configuración y Sistema.
  </p>
  <button
    class="toggle"
    class:on={$soundSettings.notificationsEnabled}
    data-focusable
    tabindex="-1"
    on:click={() => updateSounds({ notificationsEnabled: !$soundSettings.notificationsEnabled })}
  >
    {$soundSettings.notificationsEnabled ? "ON" : "OFF"}
  </button>

  <h2>Volumen de notificaciones</h2>
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
