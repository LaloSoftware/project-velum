# Input y navegación

Requisito central: **toda** la interfaz se maneja con mando(s). Nada depende del teclado
físico (hay teclado virtual en pantalla para escribir).

## Fuentes de input

Las fuentes de **mando** emiten eventos **crudos** `{ type: "dir"|"button", name, pressed }`;
el mapeo `botón→acción` se hace en el frontend (bindings configurables). Las acciones que
interpreta `App.svelte` son: `up | down | left | right | accept | back | north | west |
context | filters | menu | quick | openSystemMenu | steamSyncSummary | tabLeft |
tabRight | search | filterPrev | filterNext | vkSpace | vkBackspace | vkShift |
vkCancel | vkConfirm`.

1. **Mando vía Rust/`gilrs`** (app real) — `src-tauri/src/input.rs`. Un hilo lee los
   mandos y emite el evento Tauri `gm://input`. Direcciones (d-pad/stick) → `type:"dir"`;
   botones de acción → `type:"button"` con id crudo. Cubre **Xbox/XInput, DualSense y
   genéricos** con mapeos SDL, en Windows y macOS. **Varios mandos** controlan el mismo
   foco (cualquiera dispara).
2. **Teclado y mouse** (siempre) — mapean a acciones vía `src/lib/stores/keyBindings.js`,
   un store **independiente y configurable** en paralelo al de mando (mismo mecanismo de
   swap al reasignar). Las flechas son la única excepción: navegación fija, no remapeable
   (igual que el d-pad). Sin default asignado, un input físico no dispara nada — no hay
   "red de seguridad" hardcodeada aparte de esto.
3. **Gamepad API del navegador** (fallback) — solo fuera de Tauri (`npm run dev`), misma
   forma de evento crudo. `src/lib/input/index.js`.

## Atajos configurables

Dos mapas **independientes y simultáneos**, cada uno con su propia UI de reasignación
(captura: "Pulsa un botón/tecla…", con *swap* si ya estaba usado) en **Configuración de
atajos** (`ShortcutsSection.svelte`):

- **Mando** — `src/lib/stores/bindings.js`, mapa `botón crudo → acción`.
- **Teclado y mouse** — `src/lib/stores/keyBindings.js`, mapa `key:<code>|mouse:<botón> →
  acción`.

`App.svelte -> dispatch` interpreta cada acción según el contexto (p. ej. `north` =
detalle en una tarjeta, espacio con el teclado abierto). El modo captura lo exponen
`setCapture()/clearCapture()` (mando) y `setKeyCapture()/clearKeyCapture()`
(teclado/mouse) en `input/index.js`. "Restaurar por defecto" en cada tabla vuelve a su
mapa base.

Defaults e ids crudos de botón:

| Botón (id crudo) | Acción por defecto | Teclado/mouse por defecto |
|------------------|--------------------|---------------------------|
| `south` (A / Cross) | accept (aceptar / **jugar** en tarjeta) | Enter / Espacio |
| `north` (Y / Triángulo) | north (**detalle** en tarjeta; espacio en teclado) | I |
| `east` (B / Circle) | back (volver / cancelar) | Esc / Retroceso |
| `west` (X / Cuadrado) | west (borrar en teclado) | X |
| `l1` (LB) / `r1` (RB) | tabLeft / tabRight (pestañas) | E / R |
| `lt` (LT/L2) / `rt` (RT/R2) | filterPrev / filterNext (filtro de tienda en **Juegos**) | — |
| `l3` (clic stick izq.) | search (abrir **búsqueda** en Juegos) | S |
| `r3` (clic stick der.) | context (**menú contextual** de tarjeta) | C |
| `start` | menu (menú **Configuración**) | Tab |
| `select` | quick (menú Sistema / QAM) | Q |
| `guide` | — (reservado como modificador de combos, ver abajo) | — |
| — | filters (filtros y orden, Juegos/Apps) | F |
| — | openSystemMenu (**menú rápido de sistema** — ver abajo) | sin default |
| d-pad / stick izq. | up/down/left/right (**fijo**) | Flechas (fijo) |

## "Funciones": combos y menú rápido de sistema

Sección propia dentro de **Configuración de atajos**, separada de las dos tablas de
arriba porque agrupa atajos que no son "una tecla → una acción" simple:

- **Volver al launcher (en juego)** — botón + modo *pulsar*/*mantener* con duración
  (ver "Modo en juego" abajo).
- **Combos de botones** — `src/lib/stores/comboShortcuts.js`: lista de
  `{ id, buttons: string[], action, enabled }`. Se disparan cuando **todos** los botones
  del combo están presionados **a la vez** (no una secuencia). Detección en
  `input/index.js` (`trackComboButton`): un `Set` de botones crudos sostenidos +
  un `Set` de combos ya disparados mientras se mantienen (para no repetir el disparo,
  liberado al soltar cualquiera de sus botones). **Guide/Home es el botón base de
  todos los combos por defecto** (justo por eso no tiene acción individual propia —
  ver tabla arriba); cada uno reasignable con el mismo modo captura que el resto.
  **Un botón miembro de un combo habilitado que ya está "en curso" (algún otro de sus
  botones también sostenido) no dispara además su propia acción individual** —
  `isComboEngaged()` en `input/index.js` lo suprime antes del `resolve()` normal. Sin
  esto, reasignar p. ej. el combo de sistema a `guide + north` disparaba A LA VEZ el
  combo y la acción individual de `north` (Detalle en tarjeta) — bug real encontrado
  al reasignar un combo con un segundo botón distinto de los por defecto:
  - `system-menu` (**Guide + Start → openSystemMenu**).
  - `steam-sync-summary` (**Guide + L3 → steamSyncSummary**): expande/colapsa el
    detalle del badge de resumen de sync de Steam (`SteamSyncSummaryBadge.svelte`,
    ver `docs/accounts.md`). Solo tiene efecto mientras el badge está vivo
    (`steamSyncSummary` no nulo en `stores/steamAccount.js`) — si ya se cerró (por
    click o por su temporizador), el combo no reabre nada.
- **Menú de sistema (teclado/mouse)** — el equivalente de un solo input físico al combo
  de arriba, para quien no tiene mando: reasignable como cualquier fila de la tabla de
  teclado/mouse (acción `openSystemMenu`, sin default — ver tabla arriba).

### Menú rápido de sistema (`SystemQuickMenu.svelte`)

Se abre con el combo de mando o el atajo de teclado/mouse de "Funciones" (acción
`openSystemMenu`, guardas contra abrir si ya hay otro modal encima). Muestra **siempre
las 6 acciones** de ventana/energía (a diferencia del pie de Configuración, que alterna
Maximizar/Restaurar según estado): Minimizar, Maximizar, Entrar/Salir de pantalla
completa, Cerrar la aplicación, Apagar el sistema (reusa el flujo de confirmación
existente — el menú queda abierto detrás mientras se confirma). Orden editable desde
**Configuración → Acciones del sistema** (mover arriba/abajo), persistido en
`stores/systemActions.js` → `quickMenuOrder`. B/Esc cierra el menú.

El **pie de botones de ventana/energía al final de Configuración está oculto por
defecto** (`showPowerFooter` en `stores/systemActions.js`) — el menú rápido de arriba
es el acceso pensado para el día a día; el pie sigue disponible si se reactiva desde
la misma sección "Acciones del sistema".

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

**Arriba/abajo con el Detalle abierto**: `dispatch()` tiene un atajo especial
(`detailUp()`/`detailDown()`) para navegar el menú inferior del Detalle
(Grupos/Imágenes/Soundtrack/Vista de juego) con arriba/abajo en vez del `nav.move()`
genérico. Ese atajo solo debe activarse si el Detalle es la capa **de verdad** activa —
si hay algo abierto ENCIMA (teclado virtual al nombrar un grupo, el color picker del
editor de imágenes, el modal de logros, etc.), arriba/abajo debe navegar DENTRO de esa
capa, no manipular el Detalle por detrás. `modalOverDetail` (`App.svelte`) es la lista de
capas que cuentan como "encima" — bug real encontrado en la Fase 9g: faltaba este
chequeo, así que abrir el modal de logros y presionar abajo expandía "Vista de juego"
del Detalle por debajo en vez de navegar el modal.

**Abrir Config/QAM con el Detalle abierto**: por el mismo motivo, `openOverlay("config")`/
`openOverlay("qam")`/`openSystemQuickMenu()` (acciones `menu`/`quick`/`openSystemMenu`)
ahora también se bloquean si `$detailGame` está activo — antes solo `west`/`context`/
`filters` lo hacían, así que Start/Select/Guide+Start sí abrían esos menús con el
Detalle abierto (renderizando invisibles por detrás, ya que la capa "detail" tiene
prioridad de scope pero no de render/z-index).

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

Estos botones de mando son **reasignables e independientes** del resto de atajos —
`src/lib/stores/vkBindings.js`, mapa propio `botón crudo → acción de teclado virtual`
(`vkSpace | vkBackspace | vkShift | vkCancel | vkConfirm`), con su propia tabla
"Teclado virtual (mando)" en Configuración de atajos y el mismo mecanismo de swap.
Se resuelve **antes** que el mapa normal de mando mientras el teclado virtual está
abierto (`resolveVk()` en `input/index.js`, revisado antes de `resolve()`), así que un
mismo botón físico puede tener una acción normal y una de teclado virtual sin chocar.
Es **solo de mando**: teclado/mouse no necesita reasignación aquí porque ya tiene un
comportamiento fijo razonable (ver siguiente párrafo) y no comparte botones entre dos
funciones como sí le pasa a un botón físico de mando.

Si hay un **teclado físico**, con el teclado virtual abierto también se puede escribir
directamente: caracteres → texto, Backspace → borrar, Enter → aceptar (resuelve
`openKeyboard()` con el texto escrito, sea para buscar, nombrar un perfil, etc.), Esc →
cancelar (las flechas siguen navegando las teclas en pantalla), Ctrl+V/Cmd+V → pega el
portapapeles completo de una vez (vía `@tauri-apps/plugin-clipboard-manager` en la app,
`navigator.clipboard` en modo web). Fijo, no configurable. Ver `input/index.js`
(`handlePhysicalTyping`).

El botón **?123/ABC** (junto a Mayús) alterna las 3 filas de letras por símbolos
(`!@#$%^&*()`, etc.) — la fila de dígitos es fija en ambos modos. Es un `data-focusable`
más, sin atajo de mando dedicado: se llega por navegación normal + Aceptar, igual que
cualquier otra tecla del grid.

## Notas / futuro

- **Steam Controller sin Steam Input**: en su "lizard mode" emula teclado/ratón, así que
  navega con la capa de teclado desde ya. Soporte nativo HID = fase posterior (`hidapi`).
- Pendiente (fases): rumble/haptics.
