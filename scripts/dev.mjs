// Un solo comando para probar la app: `npm run go`
// - Instala dependencias si es la primera vez (o si borraste node_modules).
// - Levanta la app nativa (Vite + Tauri).
// Funciona igual en macOS y Windows.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.error) {
    console.error(`\n✖ No se pudo ejecutar "${cmd}". ¿Está instalado?`);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const nodeModules = new URL("../node_modules", import.meta.url);
if (!existsSync(nodeModules)) {
  console.log("› Primera vez: instalando dependencias del frontend…\n");
  run(npm, ["install"]);
}

console.log("› Levantando GM (Vite + Tauri). La 1ª compilación de Rust tarda un poco…\n");
run(npm, ["run", "tauri", "dev"]);
