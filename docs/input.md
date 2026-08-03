# Input y navegación

Requisito central: **toda** la interfaz se maneja con mando(s). Nada depende del teclado
físico (hay teclado virtual en pantalla para escribir).

## Fuentes de input

Las fuentes de **mando** emiten eventos **crudos** `{ type: "dir"|"button", name, pressed }`;
el mapeo `botón→acción` se hace en el frontend (bindings configurables). Las acciones que
interpreta `App.svelte` son: `up | down | left | right | accept | back | north | west |
menu | quick | tabLeft | tabRight`.

1. **Mando vía Rust/`gilrs`** (app real) — `src-tauri/src/input.rs`. Un hilo lee los
   mandos y emite el evento Tauri `gm://input`. Direcciones (d-pad/stick) → `type:"dir"`;
   botones de acción → `type:"button"` con id crudo. Cubre **Xbox/XInput, DualSense y
   genéricos** con mapeos SDL, en Windows y macOS. **Varios mandos** controlan el mismo
   foco (cualquiera dispara).
2. **Teclado físico** (siempre) — mapea directo a acciones (`KEY_MAP`), sin pasar por los
   bindings. Es la **red de seguridad** si el usuario se bloquea remapeando.
3. **Gamepad API del navegador** (fallback) — solo fuera de Tauri (`npm run dev`), misma
   forma de evento crudo. `src/lib/input/index.js`.

## Atajos configurables (bindings)

`src/lib/stores/bindings.js` guarda el mapa `botón crudo → acción` (persistido en la
config). Las **direcciones son fijas** (navegación); solo se remapean los botones de
acción. La sección **Configuración de atajos** (`ShortcutsSection.svelte`) reasigna con
captura: "Pulsa un botón…" → el siguiente botón crudo se asigna a la acción (con *swap*
si ya estaba usado). "Restaurar por defecto" vuelve al mapa base.

Defaults e ids crudos de botón:

| Botón (id crudo) | Acción por defecto | Teclado |
|------------------|--------------------|---------|
| `south` (A / Cross) | accept (aceptar / **jugar** en tarjeta) | Enter |
| `north` (Y / Triángulo) | north (**detalle** en tarjeta; espacio en teclado) | i |
| `east` (B / Circle) | back (volver / cancelar) | Esc / Backspace |
| `west` (X / Cuadrado) | west (borrar en teclado) | x |
| `l1` (LB) / `r1` (RB) | tabLeft / tabRight (pestañas; Mayús en teclado) | e / r |
| `lt` (LT/L2) / `rt` (RT/R2) | filterPrev / filterNext (filtro de tienda en **Juegos**) | — |
| `l3` (clic stick izq.) | search (abrir **búsqueda** en Juegos) | — |
| `r3` (clic stick der.) | context (**menú contextual** de tarjeta) | c |
| `start` | menu (menú **Configuración**) | Tab |
| `select` / `guide` | quick (menú Sistema / QAM) | q |
| d-pad / stick izq. | up/down/left/right (**fijo**) | Flechas |

`App.svelte -> dispatch` interpreta cada acción según el contexto (p. ej. `north` =
detalle en una tarjeta, espacio con el teclado abierto). El **modo captura** para el
remapeo lo exponen `setCapture()/clearCapture()` en `input/index.js`.

## Modo "en juego" (sesión)

Al lanzar un juego/app, `stores/playsession.js` abre una **sesión**: se muestra
`PlayingOverlay` y `App.svelte -> dispatch` **ignora todo el input** (el hilo `gilrs`
sigue emitiendo aunque la ventana esté minimizada, por eso el bloqueo va en el dispatch,
no en minimizar). Solo `accept` trae el juego al frente (`focus_game`). El botón de
**volver al launcher** es **configurable** (botón + modo *pulsar*/*mantener* con duración,
en Configuración de atajos) y se maneja aparte por eventos crudos vía `onRawButton`
(`input/index.js`), para poder detectar el "mantener". Teclado dev: `g` = volver.
El fin del juego lo detecta el backend (evento `gm://game-ended`) → se cierra la sesión.

## Navegación por foco (spatial navigation)

`src/lib/input/navigation.js` mueve el foco entre elementos marcados con
`data-focusable` según su geometría en pantalla, dentro de un **scope** (la capa activa).
Usa el foco nativo del DOM, así que el estilo del foco vive en CSS
(`[data-focusable]:focus` con `--gm-focus-*`).

- `data-focus-default` marca el elemento a enfocar al entrar en una capa.
- `App.svelte` recalcula el scope cuando cambia la capa activa
  (vista → overlay → detalle → menú contextual → confirmación → teclado virtual).

### Regiones (focus groups)

`move(dir)` es **consciente de regiones**: si el elemento enfocado está dentro de un
contenedor con `data-focus-group`, primero busca candidato en la **misma región**; si no
hay en esa dirección, **cruza** a otra región. Se usa en el menú de **Configuración**
(barra lateral `side` → panel `panel` → controles `power`: bajar recorre secciones y sigue
a los botones de ventana; derecha/aceptar entra al panel; izquierda vuelve) y en el
**QAM** (acordeón: cada categoría es una región que se despliega al enfocarla).

Una región puede además declarar `data-focus-wrap="horizontal"|"vertical"`: si no hay
candidato en esa dirección **dentro** del grupo, en vez de cruzar a otra región salta al
elemento en el extremo opuesto del mismo eje (wrap), con prioridad sobre el cruce de
región. Lo usa la tira "Reciente" de Inicio cuando su modo de recorrido es "scroll
infinito" (ver `stores/uiprefs.js` → `homeScrollMode`, `Home.svelte`).

**Cuidado con anidar `data-focus-group`** dentro de otro grupo que ya cubre esa misma
zona (p. ej. dentro del `panel` de Configuración): `groupOf()` usa `closest()`, así que
solo ve el grupo *más cercano* al elemento enfocado. Un subgrupo nuevo hace que sus
elementos queden fuera del `inGroup` del grupo exterior, y el fallback a `outGroup`
trata *todo* lo que está fuera del subgrupo como una sola bolsa (mezclando otras
regiones peer como `side`/`power`, no solo "el resto del panel"). Si un elemento
concreto es difícil de alcanzar por geometría (un clúster de botones angosto entre dos
controles de ancho completo, por ejemplo), es más seguro resolverlo con
espaciado/layout (ver `.profile-block` en `Settings.svelte`) que con un grupo anidado.

### Sliders (`<input type="range">`)

A diferencia del resto de focosables, un slider necesita **entrar en modo edición**
antes de que izquierda/derecha cambien su valor — así arriba/abajo pueden seguir
recorriendo el resto del menú sin tocarlo por accidente. Aceptar sobre un slider
enfocado activa el modo (anillo verde vía la clase `.range-editing`, ver `app.css`);
mientras está activo, izquierda/derecha ajustan el valor y arriba/abajo no hacen nada.
Aceptar de nuevo lo desactiva y el slider vuelve a navegar como cualquier otro
focosable. Es una directiva global (`navigation.js`, funciones `move()`/`activate()`)
que cubre todos los sliders de la app sin tocar cada componente.

## Teclado virtual

`src/lib/components/VirtualKeyboard.svelte` + `stores/keyboard.js`. Se abre con
`await openKeyboard(valorInicial, "Título")`, que resuelve con el texto final (o `null`
si se cancela con B). Sus teclas son `data-focusable`, así que se escriben con el mando.

Atajos de mando para escribir rápido (se muestran en una barra de pistas dentro del
teclado): **A** escribir la tecla enfocada · **Y/△** espacio · **X/□** borrar ·
**LB/RB** alternar Mayús · **B** cancelar.

Si hay un **teclado físico**, con el teclado virtual abierto también se puede escribir
directamente: caracteres → texto, Backspace → borrar, Enter → aceptar, Esc → cancelar
(las flechas siguen navegando las teclas en pantalla). Ver `input/index.js`
(`handlePhysicalTyping`).

## Notas / futuro

- **Steam Controller sin Steam Input**: en su "lizard mode" emula teclado/ratón, así que
  navega con la capa de teclado desde ya. Soporte nativo HID = fase posterior (`hidapi`).
- Pendiente (fases): rumble/haptics.
