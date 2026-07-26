<script>
  import { toast } from "../stores/ui.js";
</script>

{#if $toast}
  <div class="toast">{$toast}</div>
{/if}

<style>
  .toast {
    position: absolute;
    bottom: 88px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--gm-bg-elev);
    color: var(--gm-text);
    padding: 12px 22px;
    border-radius: 999px;
    font-weight: 600;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
    z-index: 80;
    pointer-events: none;
  }
</style>
