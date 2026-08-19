<script>
  import {
    soundtrack,
    setSoundtrackPath,
    setSoundtrackVolume,
  } from "../stores/soundtrackOverrides.js";
  import { showToast } from "../stores/ui.js";
  import { isTauri } from "../ipc/index.js";
  import { t, tr } from "../i18n/index.js";

  export let game;

  const AUDIO_EXT = ["mp3", "ogg", "wav", "flac", "m4a", "aac"];

  $: entry = ($soundtrack && game && $soundtrack[game.id]) || {};
  $: volume = entry.volume ?? 1;
  $: fileName = entry.path ? entry.path.split(/[\\/]/).pop() : "";

  async function pick() {
    if (!isTauri) return showToast(tr("common.filesOnlyInApp"));
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        multiple: false,
        filters: [{ name: tr("soundtrack.filterName"), extensions: AUDIO_EXT }],
      });
      if (path) {
        await setSoundtrackPath(game.id, path);
        showToast(tr("soundtrack.toast.updated"));
      }
    } catch {
      showToast(tr("common.pickerError"));
    }
  }

  async function clear() {
    await setSoundtrackPath(game.id, null);
    showToast(tr("soundtrack.toast.cleared"));
  }
</script>

<div class="soundtrack-editor">
  <div class="head">{$t("soundtrack.head")}</div>
  <div class="btns">
    <button class="pick" data-focusable tabindex="-1" on:click={pick}>
      {entry.path ? $t("soundtrack.change") : $t("soundtrack.choose")}
    </button>
    {#if entry.path}
      <button class="rm" data-focusable tabindex="-1" on:click={clear}>{$t("common.remove")}</button>
    {/if}
  </div>

  <p class="warn">
    ⚠ {$t("soundtrack.warn")}
  </p>

  {#if entry.path}
    <div class="filename">{fileName}</div>
    <div class="sizerow">
      <input
        type="range"
        class="size-slider"
        data-focusable
        tabindex="-1"
        min="0"
        max="100"
        step="5"
        value={Math.round(volume * 100)}
        on:input={(e) => setSoundtrackVolume(game.id, e.target.value / 100)}
      />
      <span class="sizeval">{Math.round(volume * 100)}%</span>
    </div>
  {/if}

  <p class="hint">
    {$t("soundtrack.hint")}
  </p>
</div>

<style>
  .soundtrack-editor {
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .head {
    font-weight: 800;
    font-size: 1.05rem;
  }
  .btns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pick,
  .rm {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-weight: 700;
  }
  .rm {
    color: var(--gm-danger);
  }
  .pick:focus,
  .rm:focus {
    box-shadow: var(--gm-focus-ring);
    background: var(--gm-surface-2);
  }
  .filename {
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    word-break: break-all;
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
  .hint {
    color: var(--gm-text-dim);
    font-size: 0.75rem;
  }
  .warn {
    color: var(--gm-danger);
    font-size: 0.8rem;
  }
</style>
