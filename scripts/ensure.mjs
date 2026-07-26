// Verifica el entorno y prepara el proyecto para poder probar.
// Reutilizado por `npm run setup` y `npm run go`. Multiplataforma (Mac/Windows).

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ¿Existe la herramienta? (usa shell para resolver .cmd/.exe en Windows)
function has(cmd) {
  return spawnSync(`${cmd} --version`, { stdio: "ignore", shell: true }).status === 0;
}

// Ejecuta mostrando la salida; aborta si falla.
export function run(cmdline, opts = {}) {
  const r = spawnSync(cmdline, { stdio: "inherit", shell: true, cwd: ROOT, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

export function ensureReady({ fetchCrates = false } = {}) {
  // 1) Herramientas base: NO se instalan (son del sistema); solo guiamos si faltan.
  const missing = [];
  if (!has("node")) missing.push(["Node.js", "https://nodejs.org"]);
  if (!has("npm")) missing.push(["npm (viene con Node.js)", "https://nodejs.org"]);
  if (!has("cargo")) missing.push(["Rust / cargo", "https://rustup.rs"]);
  if (missing.length) {
    console.error("\n✖ Faltan herramientas base para compilar la app:");
    for (const [name, url] of missing) console.error(`   - ${name}  →  ${url}`);
    console.error(
      "\nInstálalas (en Windows, Rust necesita además las C++ Build Tools de MSVC)\n" +
        "y vuelve a ejecutar este comando.\n"
    );
    process.exit(1);
  }
  console.log("✔ Node y Rust detectados.");

  // 2) Dependencias del proyecto: esto sí lo instalamos/actualizamos.
  if (!existsSync(join(ROOT, "node_modules"))) {
    console.log("› Instalando dependencias de Node (npm install)…\n");
    run("npm install");
  } else {
    console.log("✔ Dependencias de Node ya presentes.");
  }

  if (fetchCrates) {
    console.log("› Descargando dependencias de Rust (cargo fetch)…\n");
    run("cargo fetch", { cwd: join(ROOT, "src-tauri") });
  }
}
