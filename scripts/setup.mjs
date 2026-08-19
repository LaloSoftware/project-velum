// `npm run setup` — deja la máquina lista para probar:
// verifica Node/Rust y descarga TODAS las dependencias (Node + crates de Rust),
// sin arrancar la app. Útil la primera vez en un PC nuevo (p. ej. el de Windows).

import { ensureReady } from "./ensure.mjs";

ensureReady({ fetchCrates: true });

console.log("\n✔ Todo listo para probar.");
console.log("   Ejecuta la app con:  npm run go");
console.log("   O compila un instalador con:  npm run dist\n");
