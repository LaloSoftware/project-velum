<script>
  import { tick } from "svelte";
  import MusicView from "./MusicView.svelte";
  import ComingSoonPanel from "./ComingSoonPanel.svelte";
  import { focusFirstIn } from "../input/navigation.js";

  const SECTIONS = [
    { id: "musica", icon: "🎵", label: "Música" },
    { id: "imagenes", icon: "🖼", label: "Imágenes" },
    { id: "videos", icon: "🎬", label: "Videos" },
  ];
  let section = "musica";
  let contentEl;

  // Mismo criterio que ConfigMenu.svelte: enfocar una sección (arriba/abajo)
  // la previsualiza; "entrar" al panel es explícito con Aceptar o Derecha.
  async function enterSection(id) {
    section = id;
    await tick();
    focusFirstIn(contentEl);
  }
</script>

<div class="multimedia">
  <div class="main">
    <aside class="side" data-focus-group="side">
      <h2>Multimedia</h2>
      {#each SECTIONS as s, i (s.id)}
        <button
          class="sec"
          class:active={section === s.id}
          data-focusable
          data-focus-default={i === 0 ? "" : undefined}
          tabindex="-1"
          on:focus={() => (section = s.id)}
          on:click={() => enterSection(s.id)}
        >
          <span class="ico">{s.icon}</span> {s.label}
        </button>
      {/each}
    </aside>

    <div class="content" data-focus-group="panel" bind:this={contentEl}>
      {#if section === "musica"}
        <MusicView />
      {:else if section === "imagenes"}
        <ComingSoonPanel label="Imágenes" />
      {:else}
        <ComingSoonPanel label="Videos" />
      {/if}
    </div>
  </div>
</div>

<style>
  .multimedia {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .main {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .side {
    width: 260px;
    flex: 0 0 260px;
    background: var(--gm-bg-elev);
    padding: var(--gm-pad) 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }
  .side h2 {
    margin: 0 0 14px;
    font-size: 1.4rem;
    font-weight: var(--gm-title-weight);
  }
  .sec {
    cursor: pointer;
    text-align: left;
    padding: 12px 16px;
    border-radius: var(--gm-radius);
    color: var(--gm-text-dim);
    font-weight: 700;
  }
  .sec .ico {
    margin-right: 6px;
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
