<script>
  import { vk, vkType, vkBackspace, vkToggleShift, vkDone } from "../stores/keyboard.js";
  import { inputSource } from "../stores/inputSource.js";
  import { keyBindings, tokenForAction, labelForToken } from "../stores/keyBindings.js";

  // Mismo patrón que el footer de App.svelte: en modo mando se ve el texto de
  // siempre; con teclado/mouse activo, el atajo configurado para esa acción.
  $: hint = (padText, action) =>
    $inputSource === "gamepad" ? padText : ($keyBindings, labelForToken(tokenForAction(action)));

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

    {#each ROWS as row}
      <div class="krow">
        {#each row as ch}
          <button class="key" data-focusable tabindex="-1" on:click={() => press(ch)}>
            {$vk.shift ? ch.toUpperCase() : ch}
          </button>
        {/each}
      </div>
    {/each}

    <div class="krow">
      <button class="key wide" class:on={$vk.shift} data-focusable tabindex="-1" on:click={vkToggleShift}>⇧ Mayús</button>
      <button class="key space" data-focusable data-focus-default tabindex="-1" on:click={() => vkType(" ")}>Espacio</button>
      <button class="key wide" data-focusable tabindex="-1" on:click={vkBackspace}>⌫ Borrar</button>
    </div>

    <div class="krow">
      <button class="key done" data-focusable tabindex="-1" on:click={() => vkDone(false)}>✓ Aceptar</button>
      <button class="key cancel" data-focusable tabindex="-1" on:click={() => vkDone(true)}>✕ Cancelar</button>
    </div>

    <!-- Pistas de atajos de mando -->
    <div class="kb-hints">
      <span><b>{hint("A", "accept")}</b> Escribir</span>
      <span><b>{hint("Y/△", "north")}</b> Espacio</span>
      <span><b>{hint("X/□", "west")}</b> Borrar</span>
      <span><b>{hint("LB", "tabLeft")}/{hint("RB", "tabRight")}</b> Mayús</span>
      <span><b>{hint("B", "back")}</b> Cancelar</span>
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
  .krow {
    display: flex;
    gap: 8px;
    justify-content: center;
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
  .space {
    flex: 1;
    max-width: 320px;
  }
  .wide {
    min-width: 120px;
  }
  .done {
    background: var(--gm-success);
    color: #04140d;
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
  .kb-hints b {
    color: var(--gm-accent-2);
  }
</style>
