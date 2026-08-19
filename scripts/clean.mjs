// `npm run clean` — deja el build en limpio cuando algo se corrompe
// (p. ej. "failed to run custom build command for ..." tras cambiar de rama o
// interrumpir una compilación). Borra el target de Rust y la carpeta dist.
// Luego reconstruye con `npm run go` (o usa directamente `npm run rebuild`).

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOT, run } from "./ensure.mjs";

console.log("› Limpiando build de Rust (cargo clean)…\n");
run("cargo clean", { cwd: join(ROOT, "src-tauri") });

const dist = join(ROOT, "dist");
if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
  console.log("✔ dist/ borrado.");
}

console.log("\n✔ Build limpio. Reconstruye con:  npm run go");
