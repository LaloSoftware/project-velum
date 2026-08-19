// Cambia la versión del proyecto en un solo comando:
//
//   npm run version:set -- 0.2.0-beta.1
//
// `package.json` es la fuente de verdad — `src-tauri/tauri.conf.json` la lee de
// ahí ("version": "../package.json"), así que no puede desincronizarse. Este
// script existe por `src-tauri/Cargo.toml`, que sí lleva su propio número: ya no
// influye en el bundle ni en el updater, pero dejarlo desfasado confunde.
//
// No commitea ni crea el tag: los pushes a `release` van con permiso explícito
// (ver docs/development.md).

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, run } from "./ensure.mjs";

const version = process.argv[2];

if (!version) {
  console.error("\n✖ Falta la versión.  Uso: npm run version:set -- 0.2.0-beta.1\n");
  process.exit(1);
}

// Semver con prerelease opcional. El build metadata (+algo) se rechaza a
// propósito: el bundler de Tauri exige que sea numérico y falla el empaquetado
// con cosas como 0.2.0+abc (tauri-apps/tauri#8038).
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
if (!SEMVER.test(version)) {
  console.error(`\n✖ "${version}" no es una versión válida.`);
  console.error("   Formato: MAJOR.MINOR.PATCH con prerelease opcional (0.2.0, 0.2.0-beta.1).");
  if (version.includes("+")) {
    console.error("   El build metadata (+algo) no sirve: el bundler de Tauri lo rechaza.\n");
  }
  process.exit(1);
}

// 1) package.json (fuente de verdad)
const pkgPath = join(ROOT, "package.json");
const pkg = readFileSync(pkgPath, "utf8");
const VERSION_FIELD = /("version"\s*:\s*)"[^"]*"/;
if (!VERSION_FIELD.test(pkg)) {
  console.error("\n✖ No se encontró el campo version en package.json\n");
  process.exit(1);
}
writeFileSync(pkgPath, pkg.replace(VERSION_FIELD, `$1"${version}"`));

// 2) Cargo.toml — solo la primera `version = "..."` (la del bloque [package]).
const cargoPath = join(ROOT, "src-tauri", "Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8");
writeFileSync(cargoPath, cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`));

// 3) package-lock.json (solo el número, sin tocar node_modules)
run("npm install --package-lock-only");

// 4) Cargo.lock — lleva su propia copia de la versión del paquete `gm`. Se
// regenera con `cargo metadata` (resuelve el grafo, no compila). Si no hay
// cargo a mano solo se avisa: el build lo actualiza igual, pero el lock
// commiteado quedaría desfasado y ensuciaría el siguiente diff.
const meta = spawnSync(
  "cargo metadata --format-version 1 --manifest-path src-tauri/Cargo.toml",
  { shell: true, cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] },
);
if (meta.status !== 0) {
  console.warn("\n⚠ No se pudo actualizar src-tauri/Cargo.lock (¿falta cargo?).");
  console.warn("   Corre `cargo metadata --manifest-path src-tauri/Cargo.toml` antes de commitear.");
}

const tag = `v${version}`;
const canal = version.includes("-") ? "beta" : "estable";
console.log(`\n✔ Versión ${version} escrita (canal ${canal} al publicar).`);
console.log("\n  Para publicarla, en orden y con permiso para el push:");
console.log("    git add -A && git commit -m \"chore: version " + version + '"');
console.log("    git switch release && git merge --no-ff develop");
console.log(`    git tag -a ${tag} -m "<notas>" && git push origin release --tags\n`);
