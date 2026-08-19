/*
* i18n — invariantes de reactividad (F2a en adelante). Criterio: los mapas de etiquetas que antes eran `const`
 * a nivel de módulo tienen que cambiar EN CALIENTE al cambiar de idioma.
 * Se cargan los módulos reales a través de Vite (ssrLoadModule) para que
 * funcionen import.meta.glob y el resto de features del bundler.
 */
import { createServer } from "vite";
import { get } from "svelte/store";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const load = (p) => server.ssrLoadModule("/src/lib/" + p);

const { locale, t, fmt } = await load("i18n/index.js");
const { names } = await load("i18n/names.js");
const { QUICK_MENU_ACTIONS } = await load("stores/systemActions.js");
const { MUSIC_RADIAL_ACTIONS } = await load("stores/musicPlayer.js");
const { RADIAL_LABEL } = await load("stores/radialMenu.js");
const { BUTTON_LABELS, ACTIONS } = await load("stores/bindings.js");

let fail = 0;
const eq = (got, want, what) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { console.error(`FALLA ${what}\n  esperado: ${JSON.stringify(want)}\n  obtenido: ${JSON.stringify(got)}`); fail++; }
  else console.log(`ok  ${what} → ${JSON.stringify(got)}`);
};

console.log("\n--- 1. RADIAL_LABEL (el mapa que se congelaba) ---");
locale.set("es-419");
eq(get(RADIAL_LABEL).shutdown, "Apagar el sistema", "radial es-419");
eq(get(RADIAL_LABEL).musicToggle, "Reproducir/pausar música", "radial música es-419");
locale.set("en-US");
eq(get(RADIAL_LABEL).shutdown, "Shut down the system", "radial EN CALIENTE a en-US");
eq(get(RADIAL_LABEL).musicToggle, "Play/pause music", "radial música en caliente");

console.log("\n--- 2. BUTTON_LABELS: token fijo + descriptor traducido ---");
locale.set("es-419");
eq(get(BUTTON_LABELS).north, "Y / Triángulo", "north es-419");
eq(get(BUTTON_LABELS).l3, "L3 (stick izq.)", "l3 es-419");
locale.set("en-US");
eq(get(BUTTON_LABELS).north, "Y / Triangle", "north EN CALIENTE");
eq(get(BUTTON_LABELS).l3, "L3 (left stick)", "l3 EN CALIENTE");
eq(get(BUTTON_LABELS).south, "A / Cross", "el token NO se traduce");

console.log("\n--- 3. Arrays compartidos migrados ---");
const all = [...QUICK_MENU_ACTIONS, ...MUSIC_RADIAL_ACTIONS, ...ACTIONS];
eq(all.filter((a) => "label" in a).length, 0, "ninguno conserva `label` crudo");
eq(all.every((a) => a.labelKey), true, "todos tienen labelKey");

console.log("\n--- 4. Nombres: lo autogenerado sigue el idioma, lo del usuario NO ---");
locale.set("es-419");
eq(get(names).profile({ name: "" }), "Por defecto", "perfil autogenerado es-419");
eq(get(names).group({ name: "" }), "Grupo", "grupo autogenerado es-419");
eq(get(names).playlist({ name: "" }), "Lista", "lista autogenerada es-419");
locale.set("en-US");
eq(get(names).profile({ name: "" }), "Default", "perfil autogenerado EN CALIENTE");
eq(get(names).group({ name: "" }), "Group", "grupo autogenerado EN CALIENTE");
eq(get(names).profile({ name: "Salón" }), "Salón", "nombre del usuario NO se traduce");
eq(get(names).playlist({ name: "Mix nocturno" }), "Mix nocturno", "lista del usuario NO se traduce");

console.log("\n--- 5. fmt.duration (estaba duplicada en 2 componentes) ---");
eq(get(fmt).duration(0), "0:00", "0s");
eq(get(fmt).duration(65), "1:05", "65s");
eq(get(fmt).duration(3599), "59:59", "3599s");
eq(get(fmt).duration(NaN), "0:00", "NaN");
eq(get(fmt).duration(-5), "0:00", "negativo");

await server.close();
console.log(fail ? `\n${fail} FALLA(S)` : "\nTodo OK");
process.exit(fail ? 1 : 0);
