## Idioma

Responde siempre en español.

## Reglas de comportamiento

- No saludar al inicio de cada respuesta.
- No releer archivos que ya fueron leídos en la conversación.
- Usar `Edit` para cambios puntuales; solo reescribir un archivo completo si el cambio lo justifica.
- Evitar sobre-explicaciones. Ser directo y conciso.
- Leer el archivo antes de modificarlo.
- Si falta contexto, hacer suposiciones razonables y continuar desarrollando.
- Actualizar este archivo al terminar cada proceso relevante.
- Hook `impeccable`: si los hallazgos reportados son preexistentes (no relacionados con
  la edición actual), no generar un mensaje de reconocimiento — solo actuar si hay un
  hallazgo real introducido por el cambio en curso, o si el usuario pide revisarlos.

# GM — launcher de sala tipo consola

> **Nota de marca**: el producto se lanza al público como **VELUM**. "GM"
> sigue siendo el nombre de proyecto/código interno en este repo (rutas,
> prefijo CSS `--gm-*`, nombres de archivo, docs) — no se reescribió toda la
> documentación interna, solo lo visible/empaquetado (ver
> `feature-rebrand-y-setup.md`).

Convierte un PC (objetivo: Windows) en una experiencia tipo consola para la sala:
arranca a pantalla completa, muestra los juegos instalados y se maneja **100% con
mando**. Aspecto totalmente personalizable por **CSS/perfiles**. Pensado para
**consumir el mínimo de recursos durante el juego** (el launcher se suspende mientras
juegas — ver fases).

> Estado actual: **MVP** funcional con **datos simulados (mock)**, desarrollado en
> macOS. La integración real con Steam/GOG/Epic y los controles de sistema de Windows
> son fases posteriores (ver `docs/` y el plan).

## Stack

- **Tauri v2** (backend Rust, WebView del sistema) — footprint mínimo.
- **Svelte 5 + Vite** (frontend).
- **gilrs** (Rust) para leer mando(s): Xbox/XInput, DualSense, genéricos.

## Cómo ejecutar (dev)

Requisitos: **Node.js** y **Rust** (rustup). Un solo comando (instala deps si faltan y
levanta la app nativa; sirve en Mac y Windows):

```bash
npm run go
```

Otros atajos:

```bash
npm run setup     # deja la máquina lista: verifica Node/Rust + descarga TODAS las deps
npm run web       # solo la UI en el navegador (datos mock JS) y la abre
npm run dist      # compila el ejecutable/instalador (src-tauri/target/release/)
npm run bundle    # empaqueta el repo en gm.bundle para llevarlo a Windows
npm run version:set -- 0.2.0-beta.1   # sube la versión (package.json + Cargo.toml)
npm run win:check # type-check de system/windows/ (código Windows) desde Mac
npm run clean     # limpia el build (cargo clean + dist) si se corrompe
npm run rebuild   # clean + go (recompila desde cero)
```

`npm run setup` no instala herramientas del sistema; si falta Node o Rust te dice de
dónde bajarlos. Instala/descarga las dependencias del proyecto (npm + crates de Rust).

## Dev vs. consola (importante)

Rust y Node solo hacen falta para **compilar**. El PC de la sala **no** necesita
herramientas de desarrollo: se compila un instalador con `npm run dist` y ese PC solo
requiere el runtime **WebView2** (ya incluido en Windows 10/11). Ejecutar desde código
(`npm run go`) es solo para desarrollar/probar.

## Compilar

```bash
npm run tauri build    # binario en src-tauri/target/release/
```

En macOS produces un binario mac; el binario de **Windows** se compila en/para Windows
(ver `docs/development.md`, flujo dev-en-Mac / deploy-Windows).

## Controles

Mando: **A** aceptar · **B** volver · **D-pad/stick** navegar · **LB/RB** pestañas ·
**Start** biblioteca · **Select** menú de sistema (QAM) · **Guide (mantener)** menú
radial de sistema (rombo de 8 posiciones: minimizar/maximizar/pantalla completa/
cerrar/apagar).
Teclado (equivalente, para dev): flechas, Enter, Esc, Tab (biblioteca), Q (menú de
sistema, lista), E/R (pestañas). Todos los atajos (mando, teclado/mouse, teclado
virtual) son reasignables desde Configuración → Configuración de atajos. Detalle
completo en `docs/input.md`.

## Mapa del proyecto

```
src/                 Frontend Svelte
  lib/components/     Vistas y widgets (Home, GlobalMenu, QAM, GameDetail, teclado virtual…)
  lib/stores/         Estado (juegos, ui/overlays, perfiles, teclado, idioma)
  lib/theming/        Tokens --gm-* y temas
  lib/i18n/           Runtime de traducción + diccionarios por idioma
  lib/input/          Navegación por foco + fuentes de input
  lib/ipc/            Frontera con el backend (con fallback mock en web)
src-tauri/           Backend Rust (Tauri)
  src/library/        LibrarySource + MockSource (juegos)
  src/system/         SystemControls + Mock (Wi-Fi/BT/audio in-out del QAM)
  src/input.rs        Hilo gilrs → eventos de mando al frontend
  src/launch.rs       Lanzar juego (stub) + abrir launchers
  src/config.rs       Persistencia de perfiles (JSON)
  src/update.rs       Auto-actualización (updater envuelto en comandos propios)
docs/                Documentación detallada por tema
```

## Personalizar el aspecto

Todo el estilo son tokens `--gm-*`. Un **perfil** = tema base + overrides de tokens +
CSS extra. Se editan desde **Ajustes** dentro de la app. Guía: `docs/theming.md`.

## Controles de sistema (QAM)

Red, Bluetooth y audio de **salida y entrada** desde el QAM. El contrato Rust↔JS, el mock
(con latencia y errores simulados) y toda la UI están cerrados y se verifican en macOS; el
backend real de Windows está completo en lo esencial: **audio** (Core Audio, validado en
hardware), **Wi-Fi** (`netsh` + radio por WinRT) y **Bluetooth** (WinRT: listar, descubrir,
emparejar, olvidar). Conectar/desconectar BT a mano y el emparejado con PIN quedan fuera a
propósito — ver `docs/system-controls.md`. El código de Windows se type-checkea desde Mac
con `npm run win:check`, y el parseo de `netsh` vive en `system/netsh_parse.rs`
—multiplataforma a propósito— para poder tener tests aquí. Dos
invariantes que no hay que deshacer: el trait es `&self` + `Arc` (nunca un mutex global, o
un escaneo Wi-Fi bloquearía el volumen) y el mock JS se elige por `isTauri`, **nunca** por
`catch` (tragarse el error dejaría un toggle mintiendo). Detalle en
`docs/system-controls.md`.

## Actualizaciones

La app se actualiza sola desde **Configuración → Actualizaciones** (canal estable/beta,
botón manual y toggle opcional de búsqueda al iniciar). El updater
(`tauri-plugin-updater`) va **envuelto en comandos Rust propios**
(`src-tauri/src/update.rs`) y no se usa desde JS: el `check()` de la API JS no acepta
`endpoints`, así que el selector de canal solo es posible desde Rust. Los endpoints
apuntan a un release-puntero con tag `channels` (`latest.json` / `beta.json`) porque
`releases/latest` de GitHub ignora los prerelease, que es como se publican las betas.

Publicar = `npm run version:set -- <ver>` + tag `v*` en `release`; el resto lo hace
`.github/workflows/release.yml`. Un tag con guion (`v0.2.0-beta.1`) va al canal beta;
sin guion, al estable. Requiere las claves de firma minisign — pasos en
`docs/development.md` → "Publicar una versión".

## Git / ramas

`release` (estables, con tags) ← `develop` (pública, filtrada, sin este archivo ni
`PRODUCT.md`/`DESIGN.md`/`design_icons.md`/`docs/decisions.md`/`docs/roadmap.md`) ← `dev`
(integración, privada, nunca se pushea) ← `feature/*` (cambios importantes). Detalle en
`docs/development.md`.

## Más documentación

`docs/architecture.md`, `docs/theming.md`, `docs/input.md`, `docs/stores.md`,
`docs/system-controls.md`, `docs/i18n.md`, `docs/development.md`,
`docs/decisions.md`, `docs/roadmap.md` (fases futuras: tiendas reales,
multi-monitor, etc.).

## Idiomas

Tres: español LATAM (canónico), español España e inglés. El texto va en
`src/lib/i18n/locales/*.js` con claves planas (`settings.language.title`), se
usa como `$t("clave")` en componentes y `tr("clave")` en stores. Fechas y horas
**siempre** con `$fmt.*`, nunca `toLocaleTimeString()` a pelo. Los ids
persistidos no se traducen ni se renombran — ver la "regla de oro" en
`docs/i18n.md`. Antes de cerrar un cambio con texto: `npm run i18n:check`.

**Migración a `$t`/`tr` completa** (fases F1-F4, ver `feature-internacionalizacion.md`):
UI, stores y mensajes de error de Rust (códigos `"codigo"`/`"codigo|detalle"`,
`i18n/errors.js`). Cualquier texto que aparezca en español al poner la interfaz
en English es, por definición, una cadena sin migrar (regresión, no lo
esperado) — reportarla como bug puntual, no como fase pendiente.

`PRODUCT.md` (raíz) — verdad de producto para trabajo de diseño (impeccable): usuarios,
propósito, posición, principios. No es visual; el mundo visual se documenta aparte.
