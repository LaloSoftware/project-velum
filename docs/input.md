# Input y navegación

Requisito central: **toda** la interfaz se maneja con mando(s). Nada depende del teclado
físico (hay teclado virtual en pantalla para escribir).

## Fuentes de input

Todas emiten las **mismas acciones**, que `App.svelte` interpreta según el contexto:
`up | down | left | right | accept | back | menu | quick | tabLeft | tabRight`.

1. **Mando vía Rust/`gilrs`** (app real) — `src-tauri/src/input.rs`. Un hilo lee los
   mandos y emite el evento Tauri `gm://input` `{ action, pressed }`. Cubre
   **Xbox/XInput, DualSense y genéricos** con mapeos SDL, en Windows y macOS.
   **Varios mandos** controlan el mismo foco (cualquiera dispara).
2. **Teclado físico** (siempre) — comodidad/accesibilidad. Nunca única vía.
3. **Gamepad API del navegador** (fallback) — solo fuera de Tauri (`npm run dev`), para
   probar con mando en modo web. `src/lib/input/index.js`.

## Mapa de botones

| Mando | Teclado | Acción |
|-------|---------|--------|
| A / Cross | Enter | aceptar |
| B / Circle | Esc / Backspace | volver / cerrar capa |
| D-pad / stick izq. | Flechas | navegar el foco |
| LB / RB | E / R | pestañas (Inicio/Apps/Ajustes) |
| Start | Tab | abrir biblioteca (overlay) |
| Select / Guide | Q | abrir menú de sistema (QAM) |

Definido en un solo sitio: `input.rs` (`button_action`) y `input/index.js` (`KEY_MAP`,
`PAD_BUTTON_MAP`).

## Navegación por foco (spatial navigation)

`src/lib/input/navigation.js` mueve el foco entre elementos marcados con
`data-focusable` según su geometría en pantalla, dentro de un **scope** (la capa activa).
Usa el foco nativo del DOM, así que el estilo del foco vive en CSS
(`[data-focusable]:focus` con `--gm-focus-*`).

- `data-focus-default` marca el elemento a enfocar al entrar en una capa.
- `App.svelte` recalcula el scope cuando cambia la capa activa
  (vista → overlay → detalle → teclado virtual).

## Teclado virtual

`src/lib/components/VirtualKeyboard.svelte` + `stores/keyboard.js`. Se abre con
`await openKeyboard(valorInicial, "Título")`, que resuelve con el texto final (o `null`
si se cancela con B). Sus teclas son `data-focusable`, así que se escriben con el mando.

## Notas / futuro

- **Steam Controller sin Steam Input**: en su "lizard mode" emula teclado/ratón, así que
  navega con la capa de teclado desde ya. Soporte nativo HID = fase posterior (`hidapi`).
- Pendiente (fases): rumble/haptics y remapeo de botones configurable.
