// `npm run go:fixtures` — arranca la app nativa con GM_FIXTURES_DIR apuntando a
// src-tauri/fixtures, para ver los juegos de ejemplo (Steam/GOG) parseados de
// archivos reales, incluso en macOS. Útil para validar el escaneo.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "src-tauri", "fixtures");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("› Fixtures:", fixtures, "\n");
const r = spawnSync(npm, ["run", "tauri", "dev"], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, GM_FIXTURES_DIR: fixtures },
});
process.exit(r.status ?? 0);
