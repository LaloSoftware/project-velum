<script>
  import { onMount, onDestroy } from "svelte";
  import { overrides, effectiveArt, setOverride, clearOverride } from "../stores/artoverrides.js";
  import { imageUrl } from "../util/asset.js";
  import { showToast } from "../stores/ui.js";
  import { isTauri } from "../ipc/index.js";

  export let game;

  // Las 3 imágenes personalizables, con sus medidas sugeridas (SteamGridDB).
  const SLOTS = [
    { kind: "cover", label: "Carátula", dims: "600 × 900" },
    { kind: "wide", label: "Carátula expandida", dims: "920 × 430" },
    { kind: "hero", label: "Hero (fondo)", dims: "1920 × 620" },
  ];
  const IMG_EXT = ["png", "jpg", "jpeg", "webp", "bmp", "gif"];

  $: art = effectiveArt(game, $overrides);
  $: ov = (game && $overrides[game.id]) || {};

  // Vista previa de cada slot (data URI / URL). Se recarga si cambia la ruta.
  let previews = {};
  let previewFor = {};
  $: for (const s of SLOTS) {
    const src = art[s.kind];
    if (src !== previewFor[s.kind]) {
      previewFor[s.kind] = src;
      previews[s.kind] = null;
      const k = s.kind;
      imageUrl(src).then((u) => {
        if (previewFor[k] === src) {
          previews[k] = u;
          previews = previews;
        }
      });
    }
  }

  const slotEls = {};

  async function pick(kind) {
    if (!isTauri) return showToast("Selección de archivos solo en la app");
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        multiple: false,
        filters: [{ name: "Imágenes", extensions: IMG_EXT }],
      });
      if (path) {
        await setOverride(game.id, kind, path);
        showToast("Imagen actualizada");
      }
    } catch {
      showToast("No se pudo abrir el selector");
    }
  }

  async function clear(kind) {
    await clearOverride(game.id, kind);
    showToast("Personalización quitada");
  }

  // Arrastrar y soltar un archivo desde el explorador (Tauri): se asigna al slot
  // sobre el que se suelta (hit-test por posición).
  let unlisten = null;
  onMount(async () => {
    if (!isTauri) return;
    try {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type !== "drop") return;
        const paths = event.payload.paths || [];
        if (!paths.length) return;
        const ext = paths[0].split(".").pop().toLowerCase();
        if (!IMG_EXT.includes(ext)) return;
        const dpr = window.devicePixelRatio || 1;
        const px = event.payload.position.x / dpr;
        const py = event.payload.position.y / dpr;
        for (const s of SLOTS) {
          const el = slotEls[s.kind];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
            setOverride(game.id, s.kind, paths[0]).then(() => showToast("Imagen actualizada"));
            return;
          }
        }
      });
    } catch {
      /* sin drag-drop */
    }
  });
  onDestroy(() => unlisten && unlisten());
</script>

<div class="art-editor">
  <div class="head">Imágenes</div>
  {#each SLOTS as s (s.kind)}
    <div class="slot" bind:this={slotEls[s.kind]}>
      <div class="thumb" class:wide={s.kind !== "cover"}>
        {#if previews[s.kind]}
          <img src={previews[s.kind]} alt="" />
        {:else}
          <span class="ph">Sin imagen</span>
        {/if}
      </div>
      <div class="info">
        <div class="name">{s.label}</div>
        <div class="dims">Sugerido: {s.dims}</div>
        <div class="btns">
          <button class="pick" data-focusable tabindex="-1" on:click={() => pick(s.kind)}>
            Elegir…
          </button>
          {#if ov[s.kind]}
            <button class="rm" data-focusable tabindex="-1" on:click={() => clear(s.kind)}>
              Quitar
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/each}
  <div class="hint">Arrastra una imagen aquí o usa «Elegir…».</div>
</div>

<style>
  .art-editor {
    width: 320px;
    background: var(--gm-bg-overlay);
    backdrop-filter: blur(6px);
    border-radius: var(--gm-radius-lg);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .head {
    font-weight: 800;
    font-size: 1.05rem;
  }
  .slot {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .thumb {
    flex: 0 0 auto;
    width: 52px;
    height: 78px;
    border-radius: 8px;
    overflow: hidden;
    background: var(--gm-surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .thumb.wide {
    width: 92px;
    height: 52px;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .ph {
    color: var(--gm-text-dim);
    font-size: 0.62rem;
    text-align: center;
  }
  .info {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-weight: 700;
    font-size: 0.92rem;
  }
  .dims {
    color: var(--gm-text-dim);
    font-size: 0.75rem;
    margin: 2px 0 6px;
  }
  .btns {
    display: flex;
    gap: 8px;
  }
  .pick,
  .rm {
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 700;
    font-size: 0.78rem;
  }
  .rm {
    color: var(--gm-danger);
  }
  .pick:focus,
  .rm:focus {
    box-shadow: var(--gm-focus-ring);
    background: var(--gm-surface-2);
  }
  .hint {
    color: var(--gm-text-dim);
    font-size: 0.75rem;
  }
</style>
