# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- App de escritorio Tauri v2: frontend web (Svelte 5) en el WebView del sistema.
El lenguaje visual es web/CSS, no nativo de un SO. Contexto de uso: PC de sala a
pantalla completa en una TV, manejado con mando. -->

## Users

Usuario principal: alguien que quiere convertir su **PC (objetivo: Windows)** en una
experiencia tipo consola para la **sala/salón**. Se sienta en el sofá, frente a una TV,
y opera **100% con mando** (Xbox/XInput, DualSense, genéricos) a pantalla completa. No
quiere teclado/ratón ni tocar Windows para jugar.

Como proyecto **open source**, hay una segunda audiencia: entusiastas de HTPC y
**creadores de temas** que instalan GM, lo personalizan por CSS/perfiles y potencialmente
contribuyen. Esto hace relevantes: onboarding claro, defaults sensatos, extensibilidad
del theming y documentación.

## Product Purpose

GM es un **launcher de sala tipo consola** para PC. Arranca a pantalla completa, muestra
los juegos instalados (Steam/GOG/Apps hoy; Epic pendiente) y todo se maneja con mando.
El objetivo es que un PC de salón se sienta y se use como una consola dedicada, sin
sacrificar recursos durante el juego.

Éxito = el usuario enciende, navega su biblioteca, lanza un juego y vuelve, **sin teclado,
sin ratón y sin salir a Windows**, con un launcher que no le roba recursos al juego y con
un aspecto que puede moldear a su gusto.

## Positioning

Frente a Steam Big Picture y Playnite Fullscreen, GM defiende **tres pilares por igual**
(ninguno subordinado a otro):

1. **Mínimo consumo durante el juego** — el launcher se **suspende/minimiza** al lanzar y
   se restaura al terminar (no intenta "hacerse ligero" mientras corre en paralelo).
   Footprint base mínimo por Tauri v2 (WebView del sistema, no Electron).
2. **Personalización total por CSS/perfiles** — todo el aspecto son tokens `--gm-*`; un
   perfil = tema base + overrides + CSS extra, editable desde la propia app. La sala se ve
   como el usuario quiera, sin tocar componentes.
3. **Sala 100% mando + QAM de sistema** — no solo la biblioteca: también **Wi-Fi/Bluetooth/
   audio (entrada y salida)** del PC se controlan desde un menú rápido (QAM) con el mando,
   sin abrir ajustes de Windows.

## Operating Context

- **Escena de uso:** salón, TV, distancia de sofá (UI legible "a 10 pies"), pantalla
  completa, mando en mano. Multi-monitor/TV como fase futura (elegir pantalla de salida).
- **Plataforma objetivo:** Windows 10/11 (solo requiere runtime WebView2 en el PC de sala).
  Desarrollo actual en macOS con datos **mock**. Rust/Node solo hacen falta para compilar,
  no en el PC de sala.
- **Controles:** A aceptar · B volver · D-pad/stick navegar · LB/RB pestañas · Start
  biblioteca · Select/Guide menú de sistema (QAM). Teclado como equivalente para dev.
- **Capas de UI:** pestañas (Inicio/Juegos/Aplicaciones) → overlays (Configuración y QAM)
  → detalle → menú contextual de tarjeta → desplegable de Select → confirmación → teclado
  virtual en pantalla. Navegación por **foco espacial** propia y por regiones.
- **Fuentes de biblioteca:** Steam, GOG y Apps (locales, instalados) con su arte; Epic y
  vincular-cuenta pendientes.

## Capabilities and Constraints

**Capacidades confirmadas (MVP / hecho):**
- Biblioteca local real (Steam/GOG/Apps) con arte (Steam oficial + grid personalizado como
  data URI; GOG vía BD Galaxy), tarjetas, detalle, Inicio con recientes y hero.
- Lanzar juego real (URI/exe) + ciclo **lanzar → suspender/minimizar → restaurar** con
  watcher del proceso (`gm://game-ended`); overlay que bloquea input para evitar instancias
  múltiples; "volver" configurable.
- QAM con **controles de sistema reales en Windows** (Wi-Fi/Ethernet/listar-conectar,
  Bluetooth, audio in/out) vía `WindowsSystemControls`; mock en macOS.
- Theming por tokens `--gm-*` + perfiles (tema base + overrides + CSS extra) desde Ajustes.
- Input nativo con `gilrs` (varios mandos, lee sin foco de ventana); remapeo de botones
  configurable; teclado virtual en pantalla con atajos.
- QOL: ocultar juegos/apps (blacklist), grupos/colecciones manuales, filtros por tienda,
  búsqueda, menú contextual de tarjeta, navegación por regiones.

**Restricciones / arquitectura:**
- Frontera única frontend↔backend por `src/lib/ipc/index.js`; **fallback mock en web** para
  desarrollar la UI sin backend nativo.
- Lo específico del SO se abstrae tras traits (`LibrarySource`, `SystemControls`) con impl.
  mock (macOS) y real (Windows). El resto del código no depende de Windows.
- Objetivo transversal: **consumir el mínimo de recursos**, especialmente durante el juego.

**Explícitamente pendiente (no inventar como hecho):** Epic, vincular-cuenta (biblioteca
completa vía Steam Web API), autoarranque con Windows, apagar/suspender el PC desde la UI,
escaneo Wi-Fi en vivo y emparejar BT, selección de pantalla de salida (multi-monitor),
descarga de portadas/metadatos con caché, editor visual de temas, sets de iconos de botón,
rumble/haptics, Steam Controller nativo por HID.

## Brand Commitments

Ninguno vinculante aún. **"GM" es un nombre provisional** (placeholder); no hay logo,
paleta, tipografía ni voz obligatorias. El trabajo visual futuro puede proponer identidad
con libertad. Idioma de trabajo del proyecto: **español** (docs, UI de dev).

## Evidence on Hand

- Documentación propia detallada en `docs/` (architecture, theming, input, stores,
  system-controls, development, decisions, roadmap).
- Implementación funcional (MVP) con datos mock en macOS y controles/biblioteca reales en
  Windows en fases avanzadas.
- **No existen** (no fabricar): testimonios, métricas de usuarios, benchmarks publicados,
  cifras de descargas, capturas de marca ni promesas de licenciamiento/precio.

## Product Principles

1. **Se maneja con mando, siempre.** Cualquier función debe ser alcanzable y cómoda a
   distancia de sofá con mando; teclado/ratón son ayuda de dev, no requisito de sala.
2. **No robar recursos al juego.** El launcher cede protagonismo (y RAM/CPU) mientras se
   juega; se suspende y restaura, no compite.
3. **Aspecto moldeable sin tocar código.** Todo lo visual vive en tokens/perfiles/CSS; la
   personalización es de primera clase, no un extra.
4. **La sala no obliga a salir a Windows.** Red, audio y Bluetooth se resuelven desde el
   QAM con el mando.
5. **Mac-dev / Windows-deploy sin acoplar.** Lo específico del SO queda tras traits con
   mocks; la UI se desarrolla y verifica sin backend nativo.

## Accessibility & Inclusion

- **UI a distancia de sofá ("10-foot UI"):** tamaños, contraste y foco legibles desde el
  sillón en una TV; el estado de foco debe ser inequívoco (navegación espacial).
- **Navegación por mando como base**, no como añadido: el orden de foco y los indicadores
  de botón (`ButtonPrompt`) deben mantenerse coherentes en todas las capas.
- Sin estándar de accesibilidad formal establecido aún para el proyecto.
