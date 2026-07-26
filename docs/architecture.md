# Arquitectura

## Vista general

```
Frontend (Svelte 5 + Vite)  ──invoke()/eventos──►  Backend (Rust / Tauri)
  UI, navegación por foco,                            LibrarySource (juegos)
  theming, teclado virtual                            SystemControls (Wi-Fi/BT/audio)
                                                      input (gilrs) → eventos
                                                      launch (stub), config (JSON)
```

El frontend **solo** habla con el backend a través de `src/lib/ipc/index.js`. Ese
módulo detecta si corre dentro de Tauri; si no (p. ej. `npm run dev` en un navegador),
usa **datos mock en JS**, de modo que la UI se desarrolla y verifica sin backend nativo.

## Frontera frontend ↔ Rust

- **Comandos** (`invoke`): `list_games`, `system_get_state`, `system_set_*`,
  `launch_game`, `open_launcher`, `load_config`, `save_config`.
- **Eventos** (Rust → JS): `gm://input` con `{ action, pressed }` desde el hilo de
  `gilrs` (ver `docs/input.md`).

## Capas abstraídas (clave para dev-en-Mac / deploy-Windows)

Lo específico del SO se esconde tras traits, con una implementación mock activa en
macOS y una real (Windows) como fase posterior:

- `LibrarySource` (`src-tauri/src/library/`) — de dónde salen los juegos.
  Mock hoy; `SteamSource`/`GogSource`/`EpicSource` en Windows. Ver `docs/stores.md`.
- `SystemControls` (`src-tauri/src/system/`) — Wi-Fi/BT/audio del QAM.
  Mock hoy; `WindowsSystemControls` con el crate `windows`. Ver `docs/system-controls.md`.

Así, el resto del código no depende de Windows y el desarrollo en Mac no se bloquea.

## Estado del frontend (stores de Svelte)

- `stores/games.js` — lista de juegos y derivados (`recentGames`, `onlyGames`, `onlyApps`).
- `stores/ui.js` — vista actual (home/games/apps), overlay (config/QAM), detalle, toasts.
- `stores/appConfig.js` — carga/guardado unificado del JSON de config (perfiles + bindings
  + startup), para que los stores no se pisen al persistir.
- `stores/profiles.js` — perfiles de theming (usa `appConfig`).
- `stores/bindings.js` — mapa botón→acción configurable (atajos). Ver `docs/input.md`.
- `stores/startup.js` — vista inicial + arrancar en pantalla completa.
- `stores/library.js` — filtros de tienda habilitados + filtro/búsqueda activos de Juegos.
- `stores/groups.js` — grupos personalizados (colecciones manuales de juegos).
- `stores/keyboard.js` — teclado virtual en pantalla (`openKeyboard()` devuelve Promise).

## Vistas y capas de UI (z-index)

- **Pestañas** (vista base): **Inicio** (recientes) · **Juegos** (todos, filtro/buscar/
  abrir launchers) · **Aplicaciones**.
- **Overlays** (botones dedicados): **Configuración** (Apariencia / Inicio / Atajos /
  Filtros, con una fila fija de controles de ventana: minimizar / salir de pantalla
  completa / cerrar, vía `lib/util/window.js`) y **Sistema/QAM**.
- De abajo a arriba: **vista** → **overlay** (config o QAM) → **detalle de juego** →
  **teclado virtual**. `App.svelte` calcula la capa activa y fija ahí el "scope" de
  navegación por foco (`input/navigation.js`).

## Estrategia de recursos durante el juego (fase F3, diseñada desde ya)

`launch_game` está pensado para, en la app real:
1. lanzar el juego (URI `steam://` o ejecutable, vía `plugin-shell`),
2. **suspender** el launcher (ocultar ventana / liberar recursos),
3. un watcher detecta el fin del proceso y **restaura** la ventana.

Hoy es un no-op que registra en consola (no hay juegos reales en dev).
