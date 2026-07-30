# Bitácora de decisiones

Registro breve del *por qué* de las decisiones importantes.

- **Tauri v2 (no Electron)**: footprint mínimo (WebView del sistema, ~30-60MB idle vs
  ~150-250MB de Electron), binario pequeño. Encaja con el objetivo de no robar recursos.
  El frontend sigue siendo 100% web.
- **Svelte 5 + Vite (no Angular/React)**: compila a JS mínimo, arranque rápido, ideal
  para una UI de sala fluida. Modelo de componentes cercano a lo que ya conoce el autor.
- **Theming por tokens `--gm-*` (no clases hardcodeadas)**: un tema/perfil es un set de
  variables, permite CSS externo y perfiles sin tocar componentes.
- **Input nativo con `gilrs` (no solo Gamepad API)**: mapeos consistentes entre mandos,
  lectura aunque la ventana no tenga foco, y varios mandos. La Gamepad API queda como
  fallback web.
- **Traits `LibrarySource` / `SystemControls` con mocks**: permiten desarrollar toda la
  UI en macOS y dejar lo específico de Windows para una fase posterior sin acoplar el
  resto del código.
- **Suspender el launcher durante el juego (no "hacerlo ligero")**: el consumo real en
  juego se resuelve cerrando/ocultando el launcher y restaurándolo al terminar (fase F3).
- **IPC con fallback mock en web**: `npm run dev` funciona sin backend nativo, acelerando
  el desarrollo/verificación de la UI.
- **Navegación por foco propia (spatial nav)**: ligera y tematizable con `--gm-focus-*`,
  sin depender de librerías atadas a un framework.
- **Tira de Inicio: 3 capas ortogonales (orientación/recorrido/lectura) + posición
  abstracta**: en vez de un enum combinado de "layouts" predefinidos, se separan en
  ejes independientes para que las combinaciones salgan gratis (2×2×3). `homePosition`
  y `homeCardAlign` guardan valores abstractos `start/center/end` (no
  `top/bottom/left/right`) para no migrar el dato al cambiar de orientación — solo
  cambian las etiquetas mostradas en Ajustes.
- **Barra superior con grid de 3 columnas**: `tabsAlign`/`clockPosition` (alineación de
  pestañas y posición del reloj, independientes entre sí) reemplazan el
  `justify-content: space-between` fijo de `App.svelte`; el orden lógico de navegación
  (`TABS`, `cycleTab`, bumpers) no cambia, es puramente visual.
