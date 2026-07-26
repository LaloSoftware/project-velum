# Roadmap (fases posteriores)

Lo que NO está en el MVP y queda planificado. El MVP actual funciona con datos mock en
macOS; estas fases añaden la integración real y capacidades extra.

## F2 — Integración real de tiendas (en Windows)
`SteamSource`, luego `EpicSource`, luego `GogSource`, detrás del trait `LibrarySource`
(ver `docs/stores.md`). Leen los ficheros de cada cliente y rellenan la biblioteca real.

## F3 — Ciclo lanzar / suspender
Lanzar el juego (URI o ejecutable) y **suspender el launcher** mientras se juega
(ocultar ventana / liberar recursos), con un watcher que lo **restaura** al cerrar el
juego. Es la clave del objetivo de "consumo mínimo durante el juego".

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
