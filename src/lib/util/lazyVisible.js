// Acción de Svelte: dispara `callback` una sola vez cuando `node` entra (o
// está por entrar) en el viewport, y se desconecta — para diferir cargas
// pesadas (miniaturas) hasta que hagan falta en vez de pedir de una toda una
// carpeta con muchas imágenes. `rootMargin` precarga un poco antes de que la
// celda sea visible, para que ya esté lista al llegar scrolleando.
export function lazyVisible(node, callback) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          callback();
          io.disconnect();
        }
      }
    },
    { rootMargin: "200px" }
  );
  io.observe(node);
  return {
    destroy() {
      io.disconnect();
    },
  };
}
