// `npm run go` — un solo comando para probar la app en Mac o Windows:
// verifica el entorno, instala deps de Node si faltan, y levanta la app nativa.
// (Para descargar además los crates de Rust por adelantado, usa `npm run setup`.)

import { ensureReady, run } from "./ensure.mjs";

ensureReady();

console.log("\n› Levantando GM (Vite + Tauri). La 1ª compilación de Rust tarda un poco…\n");
run("npm run tauri dev");
