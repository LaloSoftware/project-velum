#!/usr/bin/env node
/*
 * `npm run win:check` — type-check de `src-tauri/src/system/windows/` contra la
 * API real de Windows, **desde macOS**.
 *
 * El problema que resuelve: ese módulo solo compila con `#[cfg(windows)]`, así
 * que desarrollando en Mac se escribe a ciegas y el primer error de tipos
 * aparece en el PC de la sala, con el ciclo de prueba más lento posible.
 *
 * `cargo check --target x86_64-pc-windows-msvc` sobre el proyecto entero NO
 * sirve: `ring` (vía el updater) y `rusqlite` compilan C y necesitan la
 * toolchain de MSVC, que no existe en Mac. Pero el crate `windows` es Rust puro
 * — así que se monta un crate desechable con SOLO ese crate y los archivos
 * reales de `system/windows/` incluidos por `#[path]`, y ese sí se comprueba.
 *
 * Los tipos del contrato (`SystemState`, `Channel`, el trait…) se EXTRAEN de
 * `system/mod.rs` en cada ejecución en vez de copiarse: si el contrato cambia y
 * el módulo de Windows se queda atrás, esto falla, que es justo lo que se
 * quiere.
 *
 * Requiere una sola vez:  rustup target add x86_64-pc-windows-msvc
 *
 * Lo que NO valida: nada de comportamiento en ejecución. Que `IPolicyConfig`
 * tenga la vtable correcta o que un micrófono acepte `SetMute` solo se sabe en
 * un PC Windows. Esto descarta los errores de tipos y de firmas, que son la
 * mayoría.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = "x86_64-pc-windows-msvc";
const SYSTEM_MOD = join(ROOT, "src-tauri/src/system/mod.rs");
// Módulos de `system/` que NO llevan cfg(windows) pero que usa el de Windows.
const SHARED_MODS = ["netsh_parse"];
const WINDOWS_MOD = join(ROOT, "src-tauri/src/system/windows/mod.rs");
const OUT = join(ROOT, "src-tauri/target/wincheck");

if (!existsSync(WINDOWS_MOD)) {
  console.error("[win:check] no existe src-tauri/src/system/windows/ — nada que comprobar");
  process.exit(0);
}

// ¿Está el target instalado? Sin él, el error de cargo no dice qué hacer.
const targets = spawnSync("rustup", ["target", "list", "--installed"], { encoding: "utf8" });
if (!String(targets.stdout || "").includes(TARGET)) {
  console.error(`[win:check] falta el target de Windows. Instálalo una vez con:\n`);
  console.error(`  rustup target add ${TARGET}\n`);
  process.exit(1);
}

// --- extraer el contrato del módulo real (nunca copiarlo) ---
const src = readFileSync(SYSTEM_MOD, "utf8");
const grab = (re, what) => {
  const m = src.match(re);
  if (!m) {
    console.error(`[win:check] no se encontró ${what} en system/mod.rs — ¿cambió el contrato?`);
    process.exit(1);
  }
  return m[0];
};

const structs = ["Device", "WifiNet", "BtDevice", "AudioChannel", "SystemState"].map((n) =>
  grab(new RegExp(`pub struct ${n} \\{[\\s\\S]*?\\n\\}`), `struct ${n}`),
);
const channel = grab(/pub enum Channel \{[\s\S]*?\n\}/, "enum Channel");
const trait = grab(/pub trait SystemControls[^{]*\{[\s\S]*?\n\}/, "trait SystemControls");

// Se les quitan los derives de serde: el harness no depende de serde.
const contract = [
  ...structs.map((s) => `#[derive(Debug, Clone)]\n${s}`),
  `#[derive(Debug, Clone, Copy, PartialEq, Eq)]\n${channel}`,
  trait,
].join("\n\n");

mkdirSync(join(OUT, "src"), { recursive: true });
writeFileSync(
  join(OUT, "Cargo.toml"),
  `# Generado por scripts/win-check.mjs — no editar a mano.
[package]
name = "wincheck"
version = "0.0.0"
edition = "2021"

[dependencies]
${readFileSync(join(ROOT, "src-tauri/Cargo.toml"), "utf8")
  .match(/windows = \{[\s\S]*?\n\] \}/)[0]
  .replace(/^\s*#.*$/gm, "")}
windows-core = "0.58"

[workspace]
`,
);
writeFileSync(
  join(OUT, "src/lib.rs"),
  `// Generado por scripts/win-check.mjs — no editar a mano.
#![allow(dead_code, non_snake_case)]

pub mod system {
${contract}

${SHARED_MODS.map(
  (m) =>
    `    #[path = ${JSON.stringify(
      resolve(join(ROOT, "src-tauri/src/system", `${m}.rs`)),
    )}]\n    pub mod ${m};`,
).join("\n")}

    #[path = ${JSON.stringify(resolve(WINDOWS_MOD))}]
    pub mod windows;
}
`,
);

console.log(`[win:check] comprobando system/windows/ contra ${TARGET}…\n`);
const r = spawnSync("cargo", ["check", "--target", TARGET], {
  cwd: OUT,
  stdio: "inherit",
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`\n✔ system/windows/ compila para Windows (tipos y firmas).`);
console.log("  Ojo: esto NO prueba el comportamiento — eso necesita el PC.");
