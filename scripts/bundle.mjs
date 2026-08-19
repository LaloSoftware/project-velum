// Empaqueta el repo (con historial) en un solo archivo para llevarlo a Windows
// sin remoto: `npm run bundle`  ->  genera gm.bundle
// En Windows:  git clone gm.bundle GM  &&  cd GM  &&  git checkout dev  &&  npm run go

import { spawnSync } from "node:child_process";

const OUT = "gm.bundle";
const r = spawnSync("git", ["bundle", "create", OUT, "--all"], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);

console.log(`\n✔ Creado ${OUT}`);
console.log("Cópialo al PC Windows y allí ejecuta:");
console.log(`  git clone ${OUT} GM`);
console.log("  cd GM");
console.log("  git checkout dev");
console.log("  npm run go");
