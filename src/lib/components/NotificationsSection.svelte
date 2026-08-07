<script>
  import { notifyPosition, NOTIFY_POSITIONS, setNotifyPosition } from "../stores/uiprefs.js";

  // Grid 3×3 con el centro-centro vacío (taparía contenido) — mismo patrón
  // visual que el preset de posición del logo en ArtEditor.svelte, pero acá
  // el código "mc" no existe en NOTIFY_POSITIONS: se deja un hueco no
  // interactivo en su lugar para conservar la forma del grid.
  const GRID = ["tl", "tc", "tr", "ml", null, "mr", "bl", "bc", "br"];
  const labelOf = (code) => NOTIFY_POSITIONS.find((p) => p.code === code)?.label ?? "";
</script>

<section class="panel">
  <h1>Notificaciones</h1>
  <p class="dim">
    Dónde aparecen en pantalla los avisos flotantes (por ahora: mando conectado/
    desconectado). Se ven afectados por la escala de interfaz y por el tema/perfil
    activo, igual que el resto de la app.
  </p>

  <h2>Posición</h2>
  <div class="pos-grid">
    {#each GRID as code, i (i)}
      {#if code}
        <button
          class="pos-btn"
          class:sel={$notifyPosition === code}
          data-focusable
          tabindex="-1"
          aria-label={labelOf(code)}
          on:click={() => setNotifyPosition(code)}
        ></button>
      {:else}
        <div class="pos-empty" aria-hidden="true"></div>
      {/if}
    {/each}
  </div>
  <p class="pos-current dim">{labelOf($notifyPosition)}</p>
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
    margin: 0 0 12px;
  }
  h2 {
    margin: 22px 0 10px;
    font-size: 1.1rem;
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .pos-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    width: 168px;
  }
  .pos-btn,
  .pos-empty {
    width: 52px;
    height: 52px;
    border-radius: 8px;
  }
  .pos-btn {
    cursor: pointer;
    background: var(--gm-surface);
    border: 2px solid transparent;
  }
  .pos-btn.sel {
    background: var(--gm-accent);
    border-color: var(--gm-accent-2);
  }
  .pos-btn:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .pos-current {
    margin-top: 10px;
    font-size: 0.85rem;
  }
</style>
