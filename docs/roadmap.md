# Roadmap (fases posteriores)

Lo que NO está en el MVP y queda planificado. El MVP actual funciona con datos mock en
macOS; estas fases añaden la integración real y capacidades extra.

## F2 — Integración real de tiendas (local-first)
- **Hecho**: `SteamSource`, `GogSource` y `AppsSource` (Windows) leyendo archivos locales
  (instalados), con fixtures + tests. Lanzar real (URI/exe). Arte de Steam (oficial +
  personalizado de `grid`) servido como data URI (`read_image`) y de GOG (URLs de la BD
  Galaxy), usado en tarjeta/detalle/Inicio (card enfocada con hero + fondo hero de Inicio).
  `lastPlayed` de GOG (BD) + registro local de "reciente" al lanzar. Ver `docs/stores.md`.
- **Pendiente**: `EpicSource`, vincular-cuenta (biblioteca completa vía Steam Web API),
  iconos de apps, arte de GOG **offline**. Clasificación de biblioteca: los soundtracks
  descargados de Steam aparecen como un "juego" aparte, y algunos DLCs de GOG aparecen
  duplicados (un registro en Juegos y otro en Aplicaciones) — encontrado probando con
  bibliotecas reales en Windows. A evaluar: (a) detección automática por heurística
  (nombre/tipo de producto en Steam/GOG) que los reclasifique a la sección "Multimedia"
  en vez de Juego/Aplicación, o (b) opción manual (menú contextual/detalle) para marcar
  un ítem como Multimedia/Aplicación/Juego y moverlo de sección.

## F3 — Ciclo lanzar / suspender
- **Hecho (MVP)**: al lanzar, `PlayingOverlay` **bloquea el input** (evita instancias
  múltiples) y el launcher **se minimiza**. Un hilo vigía en Rust (`sysinfo`) detecta el
  fin del proceso por `installDir` (Steam/GOG) y emite `gm://game-ended` → el launcher se
  **restaura** (y vuelve a pantalla completa si lo estaba). Botón de "volver" configurable
  (botón + pulsar/mantener) siempre disponible; `focus_game` trae al frente el juego en
  marcha (Windows, best-effort). Ver `stores/playsession.js` + `launch.rs`.
- **Pendiente**: liberar/limitar recursos del propio launcher durante el juego (más allá
  de minimizar), detección de cierre para apps `.lnk` sin `installDir`.

## F4 — Controles de sistema reales + integración de sala
`WindowsSystemControls` (Wi-Fi/BT/volumen/salida) para el QAM (ver
`docs/system-controls.md`), autoarranque con Windows (shell replacement o inicio) y
salir/apagar/suspender el PC desde la UI.

## F5 — Metadatos / carátulas
Descarga de portadas y metadatos con caché local; editor visual de temas.

## F6 — Selección de pantalla de salida (multi-monitor / TV)
Con varios monitores + TV conectados, poder **elegir en qué pantalla arranca** el
launcher y, en lo posible, el juego.

- **Launcher (factible con Tauri):** enumerar pantallas con `available_monitors()` /
  `primary_monitor()` / `current_monitor()`, y colocar la ventana con `set_position` +
  `set_fullscreen` en la elegida. Guardar la pantalla preferida en la config/perfil y
  aplicarla al arrancar. Añadir un selector en **Ajustes** o en el **QAM**.
- **Juego (depende del SO/juego, requiere investigación):** muchos juegos abren en el
  monitor "principal" de Windows o en el que tengan configurado. Opciones a evaluar:
  fijar temporalmente el monitor elegido como principal antes de lanzar (API de Windows),
  o dejar la salida al ajuste propio del juego. Documentar hallazgos aquí.
- Encaja de forma natural con F3 (al lanzar/suspender) y con F4 (integración de sala).

## Otras mejoras pendientes (menores)
- **Steam Controller nativo** vía HID (`hidapi`); hoy navega por su modo teclado/ratón.
- **Rumble/haptics**.

## Hecho recientemente
- **Atajos del teclado virtual** (Y/△ espacio, X/□ borrar, LB/RB Mayús).
- **Remapeo de botones configurable** (sección "Configuración de atajos", ver
  `docs/input.md`).
- **Navegación reorganizada**: pestañas Inicio/Juegos/Aplicaciones + menú Configuración.
- **Filtros de biblioteca**: activar/desactivar tiendas (Steam/GOG/Epic) y **grupos
  personalizados** (colecciones manuales, se asignan desde el detalle o el menú de tarjeta).
  Atajos L3=buscar, LT/RT=cambiar filtro; barra a ancho completo con alineación configurable.
- **Menú contextual de tarjeta** (atajo R3): jugar/ejecutar, detalles, grupos, ocultar,
  eliminar (con confirmación).
- **Ocultar** juegos/apps (blacklist gestionada en Configuración > Ocultos).
- **Navegación por regiones** (Configuración por columnas) y **QAM en acordeón**.
- Infra de **iconos de botones** (`ButtonPrompt`, hoy texto; sets de iconos pendientes).
