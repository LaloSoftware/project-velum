<script>
  /*
   * Una miniatura, con su propio estado local (visibilidad + carga) — a
   * propósito NO comparte un objeto/mapa reactivo con las demás miniaturas
   * del álbum: eso fue justo lo que hacía que carpetas con muchas imágenes
   * tardaran muchísimo (cada carga reasignaba un objeto compartido y Svelte
   * re-evaluaba las N miniaturas por cada una que terminaba, cuadrático).
   * Aislado en su propio componente, cada instancia reacciona sola.
   *
   * Además, solo pide la imagen real cuando la celda entra (o está por
   * entrar) en el viewport (lazyVisible) — con muchas imágenes, evita pedir
   * las 200 de una si solo se ven 15.
   */
  import { imageUrl } from "../util/asset.js";
  import { lazyVisible } from "../util/lazyVisible.js";

  export let path;
  export let name = "";

  let visible = false;
</script>

<div class="thumb-box" use:lazyVisible={() => (visible = true)}>
  {#if visible}
    {#await imageUrl(path) then src}
      {#if src}
        <img {src} alt={name} loading="lazy" />
      {/if}
    {/await}
  {/if}
</div>

<style>
  .thumb-box {
    width: 100%;
    height: 100%;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
