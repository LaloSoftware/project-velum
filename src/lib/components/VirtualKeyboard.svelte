<script>
  import { vk, vkType, vkBackspace, vkToggleShift, vkToggleReveal, vkDone } from "../stores/keyboard.js";
  import { t } from "../i18n/index.js";
  import ButtonPrompt from "./ButtonPrompt.svelte";

  // Fila de dígitos: se comparte entre ambos modos (letras/símbolos), solo
  // cambian las 3 filas de abajo — así el layout no "salta" al alternar.
  const DIGIT_ROW = "1234567890".split("");
  const LETTER_ROWS = [
    "qwertyuiop".split(""),
    "asdfghjkl".split(""),
    "zxcvbnm".split(""),
  ];
  const SYMBOL_ROWS = [
    "!@#$%^&*()".split(""),
    "-_=+[]{}\\|".split(""),
    ";:'\",.<>/?".split(""),
  ];

  let symbols = false;
  $: rows = [DIGIT_ROW, ...(symbols ? SYMBOL_ROWS : LETTER_ROWS)];

  function press(ch) {
    vkType($vk.shift ? ch.toUpperCase() : ch);
  }
  function toggleSymbols() {
    symbols = !symbols;
  }

  // Con `mask` el valor se pinta con puntos (claves de Wi-Fi en una tele de sala).
  $: shown = $vk.mask && !$vk.reveal ? "•".repeat($vk.value.length) : $vk.value;
</script>

<div class="vk">
  <div class="panel">
    <div class="title">{$vk.title}</div>
    <div class="valuerow">
      <div class="value">
        {shown || " "}<span class="caret">|</span>
      </div>
      {#if $vk.mask}
        <button class="reveal" data-focusable tabindex="-1" on:click={vkToggleReveal}>
          {$vk.reveal ? $t("vk.hidePassword") : $t("vk.showPassword")}
        </button>
      {/if}
    </div>

    <div class="kb-main">
      <div class="side-col">
        <button
          class="key side"
          class:on={$vk.shift}
          data-focusable
          tabindex="-1"
          on:click={vkToggleShift}
        >
          ⇧<br />{$t("vk.shift")}
        </button>
        <button
          class="key side"
          class:on={symbols}
          data-focusable
          tabindex="-1"
          on:click={toggleSymbols}
        >
          {symbols ? "ABC" : "?123"}
        </button>
      </div>
      <div class="kb-grid">
        {#each rows as row}
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
        ⌫<br />{$t("vk.backspace")}
      </button>
    </div>

    <div class="krow bottom">
      <button class="key cancel" data-focusable tabindex="-1" on:click={() => vkDone(true)}>✕ {$t("common.cancel")}</button>
      <button class="key space" data-focusable data-focus-default tabindex="-1" on:click={() => vkType(" ")}>{$t("vk.space")}</button>
      <button class="key done" data-focusable tabindex="-1" on:click={() => vkDone(false)}>✓ {$t("vk.accept")}</button>
    </div>

    <!-- Pistas de atajos de mando -->
    <div class="kb-hints">
      <span><ButtonPrompt token="A" button="south" action="accept" /> {$t("vk.write")}</span>
      <span><ButtonPrompt token="Y/△" button="north" action="north" /> {$t("vk.space")}</span>
      <span><ButtonPrompt token="X/□" button="west" action="west" /> {$t("vk.backspace")}</span>
      <span><ButtonPrompt token="LB" button="l1" action="tabLeft" />/<ButtonPrompt token="RB" button="r1" action="tabRight" /> {$t("vk.shift")}</span>
      <span><ButtonPrompt token="B" button="east" action="back" /> {$t("common.cancel")}</span>
      <span><ButtonPrompt token="RT" button="rt" action="filterNext" /> {$t("vk.submit")}</span>
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
  .valuerow {
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }
  .reveal {
    cursor: pointer;
    flex: 0 0 auto;
    margin-bottom: 14px;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-size: 0.85rem;
    font-weight: 600;
  }
  .reveal:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .value {
    flex: 1;
    min-width: 0;
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
  /* Columna izquierda: Mayús y el alternador ?123/ABC, apilados (mismo ancho
     fijo que antes ocupaba solo Mayús). */
  .side-col {
    flex: 0 0 56px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .side-col > .key.side {
    flex: 1;
  }
  .krow {
    display: flex;
    gap: 8px;
  }
  .krow.bottom {
    gap: 10px;
    margin-top: 8px;
  }
  /* Las teclas de letras/dígitos se reparten el ancho completo de la fila en
     partes iguales (en vez de un ancho fijo centrado): así el primer y último
     carácter de CUALQUIER fila —tenga 7, 9 o 10 teclas— tocan los bordes de
     kb-grid, quedando pegados a Mayús/Borrar sin importar el largo de la fila. */
  .krow:not(.bottom) > .key {
    flex: 1;
    min-width: 0;
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
    flex: 0 0 56px;
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 0.85rem;
    line-height: 1.3;
  }
  /* Fila inferior: botones más angostos y con menos "pop" al enfocar (el
     scale de .key:focus alcanza a empalmarse con el vecino cuando están tan
     juntos), para que no se superpongan entre sí. */
  .krow.bottom .key {
    height: 46px;
    font-size: 1rem;
    padding: 0 10px;
  }
  .krow.bottom .key:focus {
    transform: scale(1.03);
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
