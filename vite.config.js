import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Puerto fijo: Tauri lo espera en tauri.conf.json (devUrl).
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [svelte()],
  // Evita que Vite limpie la consola y oculte los logs de Tauri/Rust.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      // src-tauri lo vigila Cargo, no Vite.
      ignored: ["**/src-tauri/**"],
    },
  },
});
