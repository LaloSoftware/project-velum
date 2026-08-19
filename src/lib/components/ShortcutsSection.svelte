<script>
  import { onDestroy, tick } from "svelte";
  import { focusFirstIn } from "../input/navigation.js";
  import {
    ACTIONS,
    BUTTON_LABELS,
    bindings,
    assignAction,
    resetBindings,
  } from "../stores/bindings.js";
  import {
    keyBindings,
    assignKeyAction,
    resetKeyBindings,
    tokenForAction,
    labelForToken,
  } from "../stores/keyBindings.js";
  import {
    setCapture,
    clearCapture,
    setKeyCapture,
    clearKeyCapture,
  } from "../input/index.js";
  import { showToast } from "../stores/ui.js";
  import { playConfig, updatePlayConfig } from "../stores/playsession.js";
  import { openKeyboard } from "../stores/keyboard.js";
  import {
    customShortcuts,
    displayLabel,
    createCustomShortcut,
    deleteCustomShortcut,
  } from "../stores/customShortcuts.js";
  import { QUICK_MENU_ACTIONS } from "../stores/systemActions.js";
  import {
    RADIAL_POSITIONS,
    radialSlots,
    radialCancelButton,
    setRadialSlot,
    setRadialCancelButton,
  } from "../stores/radialMenu.js";
  import { MUSIC_RADIAL_ACTIONS } from "../stores/musicPlayer.js";
  import { VK_ACTIONS, vkBindings, assignVkAction, resetVkBindings } from "../stores/vkBindings.js";
  import { t, tr } from "../i18n/index.js";
  import Select from "./Select.svelte";

  // Reactivo, no `const`: si no, las opciones quedan congeladas en el idioma
  // con el que arrancó la app. `labelKey` lo resuelve Select por su cuenta.
  $: RADIAL_ACTION_OPTS = [
    { value: "", labelKey: "common.none" },
    ...QUICK_MENU_ACTIONS.map((a) => ({ value: a.id, labelKey: a.labelKey })),
    ...MUSIC_RADIAL_ACTIONS.map((a) => ({ value: a.id, labelKey: a.labelKey })),
  ];

  // listening: { action, mode: "km" | "pad" | "vk" } | null
  let listening = null;
  let timer = null;
  let capturingReturn = false; // captura del botón de "volver al launcher"

  // Atajo personalizado en edición: { name, mods: {ctrl,alt,shift,meta}, code } | null.
  // Selector manual en vez de "pulsa la combinación en vivo": Windows no deja
  // que la app reciba Alt (mensajes "de sistema") ni Win+tecla (atajos globales
  // del shell) como una tecla normal, así que capturarlos en vivo no es fiable.
  let newShortcut = null;
  let newShortcutEl;

  const MODIFIER_OPTS = [
    { key: "ctrl", label: "Ctrl" },
    { key: "alt", label: "Alt" },
    { key: "shift", label: "Shift" },
    { key: "meta", label: "Win" },
  ];
  const KEY_OPTIONS = [
    ...Array.from({ length: 26 }, (_, i) => {
      const letter = String.fromCharCode(65 + i);
      return { value: `Key${letter}`, label: letter };
    }),
    ...Array.from({ length: 10 }, (_, i) => ({ value: `Digit${i}`, label: String(i) })),
    ...Array.from({ length: 12 }, (_, i) => ({ value: `F${i + 1}`, label: `F${i + 1}` })),
  ];

  const HOLD_OPTS = [
    { value: 500, label: "0.5 s" },
    { value: 800, label: "0.8 s" },
    { value: 1200, label: "1.2 s" },
    { value: 2000, label: "2 s" },
  ];

  function rebindReturn() {
    capturingReturn = true;
    setCapture((rawButton) => {
      updatePlayConfig({ returnButton: rawButton });
      capturingReturn = false;
      clearCapture();
    });
    clearTimeout(timer);
    timer = setTimeout(() => {
      capturingReturn = false;
      clearCapture();
    }, 6000);
  }

  // Botón de mando (etiqueta) asignado a una acción, reactivo a $bindings.
  $: labelFor = (action) => {
    const btn = Object.keys($bindings).find((b) => $bindings[b] === action);
    return btn ? $BUTTON_LABELS[btn] : "—";
  };

  // Tecla/botón de mouse (etiqueta) asignado a una acción, reactivo a $keyBindings.
  $: kmLabelFor = (action) => {
    $keyBindings; // dependencia reactiva explícita
    $t; // ídem: labelForToken() traduce internamente con tr()
    return labelForToken(tokenForAction(action));
  };

  // Botón de mando (etiqueta) asignado a una acción de teclado virtual,
  // reactivo a $vkBindings.
  $: vkLabelFor = (action) => {
    const btn = Object.keys($vkBindings).find((b) => $vkBindings[b] === action);
    return btn ? $BUTTON_LABELS[btn] : "—";
  };

  function stopListening() {
    listening = null;
    capturingReturn = false;
    clearCapture();
    clearKeyCapture();
    clearTimeout(timer);
  }

  function rebindPad(action) {
    listening = { action, mode: "pad" };
    setCapture((rawButton) => {
      assignAction(action, rawButton);
      stopListening();
      showToast(tr("shortcuts.toast.padAssigned"));
    });
    // Auto-cancela por si no se pulsa nada.
    clearTimeout(timer);
    timer = setTimeout(stopListening, 6000);
  }

  function rebindKeyMouse(action) {
    listening = { action, mode: "km" };
    setKeyCapture((token) => {
      assignKeyAction(action, token);
      stopListening();
      showToast(tr("shortcuts.toast.kmAssigned"));
    });
    clearTimeout(timer);
    timer = setTimeout(stopListening, 6000);
  }

  function rebindVk(action) {
    listening = { action, mode: "vk" };
    setCapture((rawButton) => {
      assignVkAction(action, rawButton);
      stopListening();
      showToast(tr("shortcuts.toast.vkAssigned"));
    });
    clearTimeout(timer);
    timer = setTimeout(stopListening, 6000);
  }

  async function resetVk() {
    await resetVkBindings();
    showToast(tr("shortcuts.toast.vkReset"));
  }

  async function reset() {
    await resetBindings();
    await resetKeyBindings();
    showToast(tr("shortcuts.toast.reset"));
  }

  async function addCustomShortcut() {
    const name = await openKeyboard("", tr("keyboard.title.shortcutName"));
    if (!name) return;
    newShortcut = {
      name,
      mods: { ctrl: false, alt: false, shift: false, meta: false },
      code: KEY_OPTIONS[0].value,
    };
    await tick();
    focusFirstIn(newShortcutEl);
  }

  function toggleShortcutMod(key) {
    newShortcut.mods[key] = !newShortcut.mods[key];
    newShortcut = newShortcut; // fuerza reactividad (mutación de objeto anidado)
  }

  async function confirmShortcut() {
    const modifiers = Object.keys(newShortcut.mods).filter((k) => newShortcut.mods[k]);
    await createCustomShortcut(newShortcut.name, modifiers, newShortcut.code);
    newShortcut = null;
    showToast(tr("shortcuts.toast.customCreated"));
  }

  function cancelShortcut() {
    newShortcut = null;
  }

  onDestroy(() => {
    stopListening();
    newShortcut = null;
  });
</script>

<section class="panel">
  <h1>{$t("settings.sections.shortcuts")}</h1>
  <p class="dim">
    {$t("shortcuts.desc")}
  </p>

  <div class="action-rows">
    <div class="action-row head">
      <span></span>
      <span class="col-title">{$t("shortcuts.colKeyboardMouse")}</span>
      <span class="col-title">{$t("shortcuts.colController")}</span>
    </div>
    {#each ACTIONS as a}
      <div class="action-row">
        <span class="label">{$t(a.labelKey)}</span>
        <div
          class="cell"
          class:unset={kmLabelFor(a.id) === "—"}
          class:listening={listening?.action === a.id && listening?.mode === "km"}
          data-focusable
          tabindex="-1"
          role="button"
          on:click={() => rebindKeyMouse(a.id)}
          on:keydown={(e) => (e.key === "Enter" || e.key === " ") && rebindKeyMouse(a.id)}
        >
          {kmLabelFor(a.id)}
        </div>
        <div
          class="cell"
          class:unset={labelFor(a.id) === "—"}
          class:listening={listening?.action === a.id && listening?.mode === "pad"}
          data-focusable
          tabindex="-1"
          role="button"
          on:click={() => rebindPad(a.id)}
          on:keydown={(e) => (e.key === "Enter" || e.key === " ") && rebindPad(a.id)}
        >
          {labelFor(a.id)}
        </div>
      </div>
    {/each}
  </div>

  <button class="reset" data-focusable tabindex="-1" on:click={reset}>
    {$t("common.resetDefault")}
  </button>

  <h2 class="subhead">{$t("shortcuts.vk.title")}</h2>
  <p class="dim">
    {$t("shortcuts.vk.desc")}
  </p>
  <div class="rows">
    {#each VK_ACTIONS as a (a.id)}
      <div class="row">
        <span class="label">{$t(a.labelKey)}</span>
        <span class="btn">{vkLabelFor(a.id)}</span>
        <button class="rebind" data-focusable tabindex="-1" on:click={() => rebindVk(a.id)}>
          {$t("common.reassign")}
        </button>
      </div>
    {/each}
  </div>
  <button class="reset" data-focusable tabindex="-1" on:click={resetVk}>
    {$t("common.resetDefault")}
  </button>

  <h2 class="subhead">{$t("shortcuts.functions.title")}</h2>

  <div class="minihead">{$t("shortcuts.returnToLauncher.title")}</div>
  <p class="dim">
    {$t("shortcuts.returnToLauncher.desc")}
  </p>
  <div class="rows">
    <div class="row">
      <span class="label">{$t("shortcuts.buttonLabel")}</span>
      <span class="btn">{$BUTTON_LABELS[$playConfig.returnButton] || "—"}</span>
      <button class="rebind" data-focusable tabindex="-1" on:click={rebindReturn}>
        {$t("common.reassign")}
      </button>
    </div>
    <div class="row">
      <span class="label">{$t("common.mode")}</span>
      <div class="ctrl">
        <Select
          value={$playConfig.returnMode}
          options={[
            { value: "press", labelKey: "shortcuts.mode.press" },
            { value: "hold", labelKey: "shortcuts.mode.hold" },
          ]}
          onChange={(v) => updatePlayConfig({ returnMode: v })}
        />
      </div>
    </div>
    {#if $playConfig.returnMode === "hold"}
      <div class="row">
        <span class="label">{$t("common.duration")}</span>
        <div class="ctrl">
          <Select
            value={$playConfig.holdMs}
            options={HOLD_OPTS}
            onChange={(v) => updatePlayConfig({ holdMs: v })}
          />
        </div>
      </div>
    {/if}
  </div>

  <div class="minihead">{$t("shortcuts.radialMenu.title")}</div>
  <p class="dim">
    {$t("shortcuts.radialMenu.desc")}
  </p>
  <div class="rows">
    {#each RADIAL_POSITIONS as pos (pos)}
      <div class="row">
        <span class="label">{$BUTTON_LABELS[pos]}</span>
        <div class="ctrl">
          <Select
            value={$radialSlots[pos] ?? ""}
            options={RADIAL_ACTION_OPTS}
            onChange={(v) => setRadialSlot(pos, v || null)}
          />
        </div>
      </div>
    {/each}
    <div class="row">
      <span class="label">{$t("shortcuts.radialMenu.cancelWith")}</span>
      <div class="ctrl">
        <Select
          value={$radialCancelButton ?? ""}
          options={[
            { value: "", labelKey: "shortcuts.radialMenu.releaseHome" },
            ...RADIAL_POSITIONS.map((p) => ({ value: p, label: $BUTTON_LABELS[p] })),
          ]}
          onChange={(v) => setRadialCancelButton(v || null)}
        />
      </div>
    </div>
  </div>

  <div class="minihead">{$t("shortcuts.systemMenuKm.title")}</div>
  <p class="dim">
    {$t("shortcuts.systemMenuKm.desc")}
  </p>
  <div class="rows">
    <div class="row">
      <span class="label">{$t("shortcuts.systemMenuKm.openLabel")}</span>
      <span class="btn">{kmLabelFor("openSystemMenu")}</span>
      <button
        class="rebind"
        data-focusable
        tabindex="-1"
        on:click={() => rebindKeyMouse("openSystemMenu")}
      >
        {$t("common.reassign")}
      </button>
    </div>
  </div>

  <h2 class="subhead">{$t("shortcuts.custom.title")}</h2>
  <p class="dim">
    {$t("shortcuts.custom.desc")}
  </p>
  <div class="rows">
    {#each $customShortcuts as s (s.id)}
      <div class="row">
        <span class="label">{s.label}</span>
        <span class="btn">{displayLabel(s)}</span>
        <button
          class="rebind danger"
          data-focusable
          tabindex="-1"
          on:click={() => deleteCustomShortcut(s.id)}
        >
          {$t("shortcuts.custom.delete")}
        </button>
      </div>
    {/each}
    <button class="add" data-focusable tabindex="-1" on:click={addCustomShortcut}>
      + {$t("shortcuts.custom.add")}
    </button>
  </div>
</section>

{#if listening || capturingReturn}
  <div class="capture">
    <div class="box">
      <div class="big">
        {capturingReturn || listening.mode === "pad" || listening.mode === "vk"
          ? $t("shortcuts.capture.pressButton")
          : $t("shortcuts.capture.pressKey")}
      </div>
      <div class="dim">
        {$t("shortcuts.capture.for", {
          label: capturingReturn
            ? $t("shortcuts.returnToLauncher.shortLabel")
            : listening.action === "openSystemMenu"
              ? $t("footer.systemMenu")
              : listening.mode === "vk"
                ? $t(VK_ACTIONS.find((a) => a.id === listening.action)?.labelKey ?? "")
                : $t(ACTIONS.find((a) => a.id === listening.action)?.labelKey ?? ""),
        })}
      </div>
    </div>
  </div>
{/if}

{#if newShortcut}
  <div class="capture">
    <div class="box editor" data-focus-group="new-shortcut" bind:this={newShortcutEl}>
      <div class="big">{$t("shortcuts.custom.editorTitle", { name: newShortcut.name })}</div>
      <div class="dim">{$t("shortcuts.custom.editorDesc")}</div>
      <div class="mods">
        {#each MODIFIER_OPTS as m (m.key)}
          <button
            class="chip"
            class:on={newShortcut.mods[m.key]}
            data-focusable
            tabindex="-1"
            on:click={() => toggleShortcutMod(m.key)}
          >
            {m.label}
          </button>
        {/each}
      </div>
      <div class="key-select">
        <Select
          value={newShortcut.code}
          options={KEY_OPTIONS}
          onChange={(v) => (newShortcut.code = v)}
        />
      </div>
      <div class="editor-actions">
        <button class="rebind" data-focusable tabindex="-1" on:click={cancelShortcut}>
          {$t("common.cancel")}
        </button>
        <button class="rebind primary" data-focusable tabindex="-1" on:click={confirmShortcut}>
          {$t("shortcuts.custom.save")}
        </button>
      </div>
    </div>
  </div>
{/if}

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
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
  }
  .subhead {
    font-size: 1.1rem;
    margin: 30px 0 10px;
  }
  .minihead {
    font-weight: 700;
    margin: 18px 0 8px;
  }
  .ctrl {
    min-width: 180px;
  }
  .rows {
    margin: 22px 0;
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
  .label {
    flex: 1;
    font-weight: 600;
  }
  .btn {
    min-width: 130px;
    color: var(--gm-accent-2);
    font-weight: 800;
  }
  .rebind {
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text);
    font-weight: 700;
  }
  .rebind:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .rebind.danger {
    color: var(--gm-danger);
  }
  .add {
    cursor: pointer;
    padding: 12px 16px;
    border-radius: var(--gm-radius);
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
    text-align: center;
  }
  .add:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .action-rows {
    margin: 22px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .action-row {
    display: grid;
    grid-template-columns: 1fr 170px 170px;
    align-items: center;
    gap: 14px;
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 12px 16px;
  }
  .action-row.head {
    background: none;
    padding: 0 16px;
  }
  .col-title {
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    text-align: center;
  }
  .cell {
    cursor: pointer;
    text-align: center;
    padding: 8px 12px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-accent-2);
    font-weight: 800;
    outline: none;
  }
  .cell.unset {
    color: var(--gm-text-dim);
    font-weight: 600;
  }
  .cell.listening,
  .cell:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .reset {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-danger);
    font-weight: 700;
  }
  .reset:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .capture {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gm-bg-overlay);
    z-index: 70;
  }
  .box {
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 30px 44px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .big {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 8px;
  }
  .box.editor {
    width: min(420px, 90vw);
  }
  .box.editor .dim {
    margin: 0 0 18px;
  }
  .mods {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }
  .chip {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--gm-surface);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .chip.on {
    background: var(--gm-accent);
    color: #06101f;
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
  }
  .key-select {
    margin-bottom: 20px;
  }
  .editor-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
  .rebind.primary {
    background: var(--gm-accent);
    color: #06101f;
  }
</style>
