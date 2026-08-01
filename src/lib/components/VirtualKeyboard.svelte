<script>
  import { vk, vkType, vkBackspace, vkToggleShift, vkDone } from "../stores/keyboard.js";
  import ButtonPrompt from "./ButtonPrompt.svelte";

  const ROWS = [
    "1234567890".split(""),
    "qwertyuiop".split(""),
    "asdfghjkl".split(""),
    "zxcvbnm".split(""),
  ];

  function press(ch) {
    vkType($vk.shift ? ch.toUpperCase() : ch);
  }
</script>

<div class="vk">
  <div class="panel">
    <div class="title">{$vk.title}</div>
    <div class="value">
      {$vk.value || " "}<span class="caret">|</span>
    </div>

    <div class="kb-main">
      <button
        class="key side"
        class:on={$vk.shift}
        data-focusable
        tabindex="-1"
        on:click={vkToggleShift}
      >
        ⇧<br />Mayús
      </button>
      <div class="kb-grid">
        {#each ROWS as row}
          <div class="krow">
            {#each row as ch}
              <button class="key" data-focusable tabindex="-1" on:click={() => press(ch)}>
                {$vk.shift ? ch.toUpperCase() : ch}
              </button>
            {/each}
          </div>
        {/each}
      </div>
      <button class="key side" data-focusable tabindex="-1" on:click={vkBackspace}>
        ⌫<br />Borrar
      </button>
    </div>

    <div class="krow bottom">
      <button class="key cancel" data-focusable tabindex="-1" on:click={() => vkDone(true)}>✕ Cancelar</button>
      <button class="key space" data-focusable data-focus-default tabindex="-1" on:click={() => vkType(" ")}>Espacio</button>
      <button class="key done" data-focusable tabindex="-1" on:click={() => vkDone(false)}>✓ Aceptar</button>
    </div>

    <!-- Pistas de atajos de mando -->
    <div class="kb-hints">
      <span><ButtonPrompt token="A" button="south" action="accept" /> Escribir</span>
      <span><ButtonPrompt token="Y/△" button="north" action="north" /> Espacio</span>
      <span><ButtonPrompt token="X/□" button="west" action="west" /> Borrar</span>
      <span><ButtonPrompt token="LB" button="l1" action="tabLeft" />/<ButtonPrompt token="RB" button="r1" action="tabRight" /> Mayús</span>
      <span><ButtonPrompt token="B" button="east" action="back" /> Cancelar</span>
      <span><ButtonPrompt token="RT" button="rt" action="filterNext" /> Enviar</span>
    </div>
  </div>
</div>

<style>
  .vk {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: var(--gm-bg-overlay);
    z-index: 60;
  }
  .panel {
    width: min(760px, 94vw);
    margin-bottom: 4vh;
    background: var(--gm-bg-elev);
    border-radius: var(--gm-radius-lg);
    padding: 22px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .title {
    color: var(--gm-text-dim);
    font-size: 0.9rem;
  }
  .value {
    font-size: 1.6rem;
    font-weight: 700;
    padding: 10px 4px 16px;
    min-height: 1.6em;
    word-break: break-all;
  }
  .caret {
    color: var(--gm-accent);
    animation: blink 1s steps(2) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .kb-main {
    display: flex;
    align-items: stretch;
    gap: 8px;
    margin-top: 8px;
  }
  .kb-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .krow {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .krow.bottom {
    margin-top: 8px;
  }
  .key {
    cursor: pointer;
    min-width: 52px;
    height: 52px;
    padding: 0 12px;
    border-radius: 12px;
    background: var(--gm-surface);
    color: var(--gm-text);
    font-size: 1.1rem;
    font-weight: 700;
  }
  .key:focus {
    box-shadow: var(--gm-focus-ring);
    transform: scale(1.08);
  }
  .key.on {
    background: var(--gm-accent);
    color: #06101f;
  }
  .key.side {
    flex: 0 0 64px;
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 0.85rem;
    line-height: 1.3;
  }
  .space {
    flex: 2;
  }
  .done {
    background: var(--gm-accent);
    color: #06101f;
    flex: 1;
  }
  .cancel {
    background: var(--gm-surface);
    flex: 1;
  }
  .kb-hints {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 18px;
    margin-top: 14px;
    color: var(--gm-text-dim);
    font-size: 0.82rem;
  }
  .kb-hints span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
</style>
