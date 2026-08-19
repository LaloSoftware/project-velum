<script>
  import { onMount, onDestroy } from "svelte";
  import {
    overrides,
    effectiveArt,
    setOverride,
    clearOverride,
    setLogoPos,
  } from "../stores/artoverrides.js";
  import { imageUrl } from "../util/asset.js";
  import { showToast } from "../stores/ui.js";
  import { isTauri } from "../ipc/index.js";
  import { t, tr } from "../i18n/index.js";

  export let game;

  // Las 4 imágenes personalizables, con sus medidas sugeridas (SteamGridDB).
  const SLOTS = [
    { kind: "cover", labelKey: "art.slots.cover.label", dimsKey: "art.slots.cover.dims" },
    { kind: "wide", labelKey: "art.slots.wide.label", dimsKey: "art.slots.wide.dims" },
    { kind: "hero", labelKey: "art.slots.hero.label", dimsKey: "art.slots.hero.dims" },
    { kind: "logo", labelKey: "art.slots.logo.label", dimsKey: "art.slots.logo.dims" },
  ];
  const IMG_EXT = ["png", "jpg", "jpeg", "webp", "bmp", "gif"];

  // Preset 3×3 de posición del logo sobre el hero (fila por fila) — reusa las
  // claves de alineación comunes (F1), salvo el centro puro que ya vive en
  // common.align.center.
  const LOGO_POSITIONS = [
    { code: "tl", labelKey: "common.pos.tl" },
    { code: "tc", labelKey: "common.pos.tc" },
    { code: "tr", labelKey: "common.pos.tr" },
    { code: "ml", labelKey: "common.pos.ml" },
    { code: "mc", labelKey: "common.align.center" },
    { code: "mr", labelKey: "common.pos.mr" },
    { code: "bl", labelKey: "common.pos.bl" },
    { code: "bc", labelKey: "common.pos.bc" },
    { code: "br", labelKey: "common.pos.br" },
  ];

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
    if (!isTauri) return showToast(tr("common.filesOnlyInApp"));
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        multiple: false,
        filters: [{ name: tr("detail.sections.images"), extensions: IMG_EXT }],
      });
      if (path) {
        await setOverride(game.id, kind, path);
        showToast(tr("art.toast.updated"));
      }
    } catch {
      showToast(tr("common.pickerError"));
    }
  }

  async function clear(kind) {
    await clearOverride(game.id, kind);
    showToast(tr("art.toast.cleared"));
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
            setOverride(game.id, s.kind, paths[0]).then(() => showToast(tr("art.toast.updated")));
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
  <div class="head">{$t("detail.sections.images")}</div>
  <div class="slots-row">
    {#each SLOTS as s (s.kind)}
      <div class="slot" bind:this={slotEls[s.kind]}>
        <div class="thumb" class:wide={s.kind !== "cover" && s.kind !== "logo"} class:logo={s.kind === "logo"}>
          {#if previews[s.kind]}
            <img src={previews[s.kind]} alt="" />
          {:else}
            <span class="ph">{$t("art.noImage")}</span>
          {/if}
        </div>
        <div class="name">{$t(s.labelKey)}</div>
        <div class="dims">{$t(s.dimsKey)}</div>
        <div class="btns">
          <button class="pick" data-focusable tabindex="-1" on:click={() => pick(s.kind)}>
            {$t("common.choose")}
          </button>
          {#if ov[s.kind]}
            <button class="rm" data-focusable tabindex="-1" on:click={() => clear(s.kind)}>
              {$t("common.remove")}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if art.logo}
    <div class="logo-pos">
      <div class="logo-pos-label">{$t("art.logoPosition")}</div>
      <div class="logo-pos-grid">
        {#each LOGO_POSITIONS as p (p.code)}
          <button
            class="pos-btn"
            class:sel={art.logoPos === p.code}
            data-focusable
            tabindex="-1"
            aria-label={$t(p.labelKey)}
            on:click={() => setLogoPos(game.id, p.code)}
          ></button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="hint">{$t("art.dragHint", { choose: $t("common.choose") })}</div>
</div>

<style>
  .art-editor {
    width: 100%;
    max-width: 820px;
    /* --gm-bg-overlay es un scrim fijo y oscuro (para detrás de modales), no
       tematizable por perfil/tema — dejaba esta sección oscura incluso con
       temas claros. --gm-surface sí varía por tema; se usa translúcida para
       conservar el efecto de vidrio esmerilado con el blur. */
    background: color-mix(in srgb, var(--gm-surface) 82%, transparent);
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
  /* Slots en renglón (antes en columna): cada uno es una mini-tarjeta vertical
     que se envuelve (wrap) si el espacio disponible se estrecha. */
  .slots-row {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }
  .slot {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1 1 160px;
    min-width: 140px;
  }
  .thumb {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 8px;
    overflow: hidden;
    background: var(--gm-surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .thumb.wide {
    aspect-ratio: 16 / 9;
  }
  .thumb.logo {
    aspect-ratio: 16 / 9;
    padding: 8px;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .thumb.logo img {
    object-fit: contain;
  }
  .ph {
    color: var(--gm-text-dim);
    font-size: 0.62rem;
    text-align: center;
  }
  .name {
    font-weight: 700;
    font-size: 0.92rem;
  }
  .dims {
    color: var(--gm-text-dim);
    font-size: 0.75rem;
  }
  .btns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 2px;
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
  /* Selector de posición del logo: preset 3×3 sobre el hero. */
  .logo-pos-label {
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .logo-pos-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    width: 132px;
  }
  .pos-btn {
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 8px;
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
  .hint {
    color: var(--gm-text-dim);
    font-size: 0.75rem;
  }
</style>
