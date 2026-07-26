# GM — launcher de sala tipo consola

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
npm run web       # solo la UI en el navegador (datos mock JS) y la abre
npm run dist      # compila el ejecutable/instalador (src-tauri/target/release/)
npm run bundle    # empaqueta el repo en gm.bundle para llevarlo a Windows
```

## Compilar

```bash
npm run tauri build    # binario en src-tauri/target/release/
```

En macOS produces un binario mac; el binario de **Windows** se compila en/para Windows
(ver `docs/development.md`, flujo dev-en-Mac / deploy-Windows).

## Controles

Mando: **A** aceptar · **B** volver · **D-pad/stick** navegar · **LB/RB** pestañas ·
**Start** biblioteca · **Select/Guide** menú de sistema (QAM).
Teclado (equivalente, para dev): flechas, Enter, Esc, Tab (biblioteca), Q (sistema),
E/R (pestañas). Ver `docs/input.md`.

## Mapa del proyecto

```
src/                 Frontend Svelte
  lib/components/     Vistas y widgets (Home, GlobalMenu, QAM, GameDetail, teclado virtual…)
  lib/stores/         Estado (juegos, ui/overlays, perfiles, teclado)
  lib/theming/        Tokens --gm-* y temas
  lib/input/          Navegación por foco + fuentes de input
  lib/ipc/            Frontera con el backend (con fallback mock en web)
src-tauri/           Backend Rust (Tauri)
  src/library/        LibrarySource + MockSource (juegos)
  src/system/         SystemControls + Mock (Wi-Fi/BT/audio del QAM)
  src/input.rs        Hilo gilrs → eventos de mando al frontend
  src/launch.rs       Lanzar juego (stub) + abrir launchers
  src/config.rs       Persistencia de perfiles (JSON)
docs/                Documentación detallada por tema
```

## Personalizar el aspecto

Todo el estilo son tokens `--gm-*`. Un **perfil** = tema base + overrides de tokens +
CSS extra. Se editan desde **Ajustes** dentro de la app. Guía: `docs/theming.md`.

## Git / ramas

`release` (estables, con tags) ← `dev` (integración) ← `feature/*` (cambios importantes).
El MVP vive en `dev`. Detalle en `docs/development.md`.

## Más documentación

`docs/architecture.md`, `docs/theming.md`, `docs/input.md`, `docs/stores.md`,
`docs/system-controls.md`, `docs/development.md`, `docs/decisions.md`.
