<script>
  import { tick } from "svelte";
  import QamSystemSection from "./QamSystemSection.svelte";
  import QamShortcutsSection from "./QamShortcutsSection.svelte";
  import QamUtilitiesSection from "./QamUtilitiesSection.svelte";
  import QamMusicSection from "./QamMusicSection.svelte";
  import { focusFirstIn } from "../input/navigation.js";
  import { steamAccount } from "../stores/steamAccount.js";
  import { t } from "../i18n/index.js";

  const BASE_SECTIONS = [
    { id: "system", icon: "⚙️", labelKey: "qam.section.system" },
    { id: "music", icon: "🎵", labelKey: "multimedia.section.music" },
    { id: "shortcuts", icon: "⌨️", labelKey: "qam.section.shortcuts" },
  ];
  // "Utilidades" (accesos directos de Steam/GOG) solo con cuenta de Steam
  // vinculada — hoy es la única fuente de accesos útiles ahí.
  $: SECTIONS = $steamAccount
    ? [...BASE_SECTIONS, { id: "utilities", icon: "🧰", labelKey: "qam.section.utilities" }]
    : BASE_SECTIONS;
  let section = "system";
  let contentEl;

  // Mismo criterio que ConfigMenu.svelte: enfocar una sección (arriba/abajo) la
  // previsualiza; "entrar" al panel es explícito con Aceptar o Derecha.
  async function enterSection(id) {
    section = id;
    await tick();
    focusFirstIn(contentEl);
  }
</script>

<div class="qam-shell">
  <aside class="side" data-focus-group="side">
    {#each SECTIONS as s, i}
      <button
        class="sec"
        class:active={section === s.id}
        data-focusable
        data-focus-default={i === 0 ? "" : undefined}
        tabindex="-1"
        aria-label={$t(s.labelKey)}
        on:focus={() => (section = s.id)}
        on:click={() => enterSection(s.id)}
      >
        {s.icon}
      </button>
    {/each}
  </aside>

  <div class="content" data-focus-group="panel" bind:this={contentEl}>
    {#if section === "system"}
      <QamSystemSection />
    {:else if section === "music"}
      <QamMusicSection />
    {:else if section === "utilities"}
      <QamUtilitiesSection />
    {:else}
      <QamShortcutsSection />
    {/if}
  </div>
</div>

<style>
  .qam-shell {
    display: flex;
    height: 100%;
  }
  .side {
    width: 68px;
    flex: 0 0 68px;
    background: var(--gm-bg-elev);
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    overflow-y: auto;
  }
  .sec {
    cursor: pointer;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--gm-radius);
    background: none;
    font-size: 1.3rem;
    color: var(--gm-text-dim);
  }
  .sec.active {
    background: var(--gm-surface);
    color: var(--gm-text);
  }
  .sec:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    position: relative;
  }
</style>
