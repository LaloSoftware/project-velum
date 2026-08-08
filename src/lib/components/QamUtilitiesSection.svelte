<script>
  import { openUrl } from "../ipc/index.js";

  // Accesos directos fijos a Steam (protocolo steam://, resuelto por el SO —
  // ver launch.rs::open_url). Mismo mecanismo que ya usa steam_open_install
  // (GameDetail.svelte, "Descargar desde Steam"), generalizado a un comando
  // genérico en vez de uno específico por destino.
  const STEAM_UTILITIES = [
    { icon: "📚", label: "Biblioteca", target: "steam://open/games" },
    { icon: "🛒", label: "Tienda", target: "steam://store" },
    { icon: "👤", label: "Mi perfil", target: "steam://url/SteamIDMyProfile" },
    { icon: "🧑‍🤝‍🧑", label: "Amigos", target: "steam://open/friends" },
    { icon: "⬇️", label: "Descargas", target: "steam://open/downloads" },
    { icon: "🖼️", label: "Capturas de pantalla", target: "steam://open/screenshots" },
    { icon: "🔑", label: "Activar un producto", target: "steam://open/activateproduct" },
    { icon: "⚙️", label: "Configuración de Steam", target: "steam://open/settings" },
  ];
</script>

<div class="qam">
  <h2>Utilidades</h2>

  <div class="cat" data-focus-group="steam">
    <div class="head">
      <span class="ico">🎮</span>
      <div class="grow">
        <div class="label">Steam</div>
        <div class="sub dim">Accesos directos</div>
      </div>
    </div>
    <div class="chips">
      {#each STEAM_UTILITIES as u, i (u.target)}
        <button
          class="chip"
          data-focusable
          data-focus-default={i === 0 ? "" : undefined}
          tabindex="-1"
          on:click={() => openUrl(u.target)}
        >
          {u.icon} {u.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- GOG: vacía a propósito, se llena cuando haya accesos directos equivalentes
       (steam:// tiene protocolo propio bien documentado; GOG Galaxy no tiene uno
       tan estandarizado — queda pendiente investigarlo). -->
  <div class="cat" data-focus-group="gog">
    <div class="head">
      <span class="ico">🎮</span>
      <div class="grow">
        <div class="label">GOG</div>
        <div class="sub dim">Próximamente</div>
      </div>
    </div>
    <p class="dim empty-hint">Todavía no hay accesos directos de GOG.</p>
  </div>
</div>

<style>
  .qam {
    height: 100%;
    padding: var(--gm-pad);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 1.6rem;
    font-weight: var(--gm-title-weight);
  }
  .dim {
    color: var(--gm-text-dim);
  }
  .cat {
    background: var(--gm-surface);
    border-radius: var(--gm-radius);
    padding: 14px 16px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ico {
    font-size: 1.4rem;
  }
  .grow {
    flex: 1;
  }
  .label {
    font-weight: 700;
  }
  .sub {
    font-size: 0.85rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .chip {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--gm-surface-2);
    color: var(--gm-text-dim);
    font-weight: 600;
  }
  .chip:focus {
    box-shadow: var(--gm-focus-ring);
    color: var(--gm-text);
  }
  .empty-hint {
    margin-top: 12px;
    font-size: 0.85rem;
  }
</style>
