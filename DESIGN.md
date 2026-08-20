---
name: GM
description: Consola de sala minimalista y repintable — un shell oscuro que el usuario ajusta por CSS
colors:
  console-ink: "#0e1116"
  elevated-ink: "#171b22"
  surface-slate: "#1d232c"
  surface-slate-raised: "#262d38"
  scrim: "rgba(8, 10, 14, 0.72)"
  console-white: "#e8edf3"
  muted-steel: "#9aa6b4"
  console-blue: "#4c8dff"
  console-blue-light: "#7aa7ff"
  ready-green: "#52d69a"
  alert-red: "#ff5d5d"
  on-accent-ink: "#06101f"
  on-green-ink: "#04140d"
typography:
  display:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 700
  badge:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.66rem"
    fontWeight: 700
  glyph-category:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 400
  glyph-control:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
rounded:
  md: "14px"
  lg: "22px"
  pill: "999px"
spacing:
  card-gap: "18px"
  pad: "28px"
  sm: "8px"
  md: "14px"
components:
  game-card:
    rounded: "{rounded.md}"
    width: "190px"
  nav-tab:
    textColor: "{colors.muted-steel}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
  nav-tab-active:
    backgroundColor: "{colors.surface-slate}"
    textColor: "{colors.console-white}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
  toggle:
    backgroundColor: "{colors.surface-slate-raised}"
    textColor: "{colors.muted-steel}"
    rounded: "{rounded.pill}"
    padding: "10px 0"
  toggle-on:
    backgroundColor: "{colors.ready-green}"
    textColor: "{colors.on-green-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 0"
  select:
    backgroundColor: "{colors.surface-slate-raised}"
    textColor: "{colors.console-white}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  chip:
    backgroundColor: "{colors.surface-slate-raised}"
    textColor: "{colors.muted-steel}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  list-item:
    backgroundColor: "{colors.surface-slate-raised}"
    textColor: "{colors.console-white}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  list-item-active:
    backgroundColor: "{colors.console-blue}"
    textColor: "{colors.on-accent-ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-confirm:
    backgroundColor: "{colors.ready-green}"
    textColor: "{colors.on-green-ink}"
    rounded: "12px"
    padding: "0 12px"
---

# Design System: GM

## Overview

**Creative North Star: "The Repaintable Console"**

GM es un shell de consola de salón, minimalista y **plug & play**: oscuro, sereno y
legible desde el sofá, pensado para que el arte de los juegos —no la interfaz— sea lo que
llena la pantalla. La UI es deliberadamente discreta: unas pestañas tipo píldora, una
rejilla de portadas y un anillo de foco que brilla. Nada compite con el contenido.

La segunda mitad de la tesis es igual de vinculante: **todo es repintable**. No hay un solo
color, medida o forma escrito a mano en un componente; todo pasa por tokens `--gm-*`. Un
usuario puede cargar su propio CSS y transformar el aspecto por completo sin tocar código,
y los temas integrados (Midnight, Aurora, Sunset, entre otros) existen para demostrarlo.
Por eso la base es intencionadamente neutra: es un lienzo, no una declaración. El diseño
que aquí se documenta describe las **invariantes** que cualquier repintado debe respetar
para seguir sintiéndose como una consola — no una paleta fija. Nota: desde el rebrand a
VELUM, el tema por defecto es **Velum** (marca), no Midnight — mismas invariantes de
forma/tipografía/layout de abajo, solo cambia la paleta de color.

El lenguaje visual se apoya en **capas tonales, no en sombras**: la profundidad nace de
apilar superficies cada vez más claras (`console-ink` → `surface-slate` →
`surface-slate-raised`), y la única "luz" protagonista es el **glow del foco**. Al enfocar,
los elementos crecen (`scale`) y se rodean de un halo del color de acento — la interacción
se siente táctil y física al mando, que es la forma principal (y a menudo única) de
manejar GM.

**Key Characteristics:**
- Shell oscuro y sereno; el arte del juego es el protagonista, la UI se aparta.
- 100% tokenizado (`--gm-*`): repintable por CSS sin tocar componentes.
- Legible "a 10 pies": tamaños generosos, jerarquía clara, foco inequívoco.
- Foco con glow + crecimiento: reactivo y táctil al mando.
- Profundidad por capas tonales; sombra reservada a lo que flota.
- Bordes suaves y píldoras: formas amables, sin esquinas duras.

## Colors

Paleta oscura de bajo ruido, construida sobre azules-grises fríos con un único acento azul
eléctrico y dos colores de estado. La rareza del acento es intencional.

### Primary
- **Console Blue** (`#4c8dff`): el acento y protagonista de la interacción. Vive en el
  **anillo de foco** (`--gm-focus-ring`, borde sólido + halo por `color-mix`), en el ítem
  seleccionado de una lista (red Wi-Fi actual), en sliders (`accent-color`) y en el cursor
  del teclado. No es color de relleno de grandes áreas.
- **Console Blue Light** (`#7aa7ff`): variante clara para realces sutiles y las letras
  destacadas de las pistas de botón (`.hints b`).

### Neutral
- **Deep Console Ink** (`#0e1116`): fondo raíz de la sala y de los overlays a pantalla
  completa; sobre él se pinta el `--gm-wallpaper` (degradados radiales suaves).
- **Elevated Ink** (`#171b22`): fondo de paneles que flotan alto (teclado virtual).
- **Surface Slate** (`#1d232c`): superficie base de tarjetas de contenido (categorías del
  QAM, pestaña activa, teclas).
- **Surface Slate Raised** (`#262d38`): segundo escalón tonal — controles dentro de una
  superficie (toggles, selects, chips, ítems de lista, teclas al fondo).
- **Console White** (`#e8edf3`): texto principal.
- **Muted Steel** (`#9aa6b4`): texto secundario/atenuado, etiquetas, metadatos, estados
  inactivos.
- **Scrim** (`rgba(8,10,14,0.72)`): velo translúcido bajo overlays y teclado.

### Tertiary (estados)
- **Ready Green** (`#52d69a`): estado "activo/correcto" — toggle encendido, Ethernet
  conectado, botón **Aceptar**. Sobre él el texto va en tinta verde muy oscura (`#04140d`).
- **Alert Red** (`#ff5d5d`): peligro/destructivo (eliminar, errores).

### Named Rules
**The Rare Accent Rule.** El azul de acento nunca rellena áreas grandes: es para foco,
selección y realces puntuales. Su escasez es lo que hace que el foco "cante".

**The No Hardcode Rule.** Ningún componente escribe un color literal salvo las **tintas de
contraste sobre acento/verde** (`#06101f`, `#04140d`, `#04140d`), que existen porque no hay
token para "texto-sobre-acento". Todo lo demás es `var(--gm-*)`.

## Typography

**Fuente única:** stack del sistema — `system-ui, -apple-system, "Segoe UI", Roboto,
sans-serif` (`--gm-font`). No hay fuente display separada: la jerarquía es por **peso y
tamaño**, no por familia. Base `16px` (`--gm-font-size`).

**Character:** neutra, nativa y rápida — la tipografía del sistema arranca al instante y no
impone marca, coherente con un shell repintable. La personalidad la ponen el peso alto de
los títulos y las cifras tabulares.

### Hierarchy
- **Display** (800, `1.6rem`): títulos de overlay/sección ("Sistema" en el QAM) y el valor
  en curso del teclado. Peso controlado por `--gm-title-weight` (900 en el tema Sunset).
- **Title** (700, `1.05rem`): pestañas de navegación; etiquetas de categoría del QAM.
- **Body** (400–600, `1rem`): texto general, nombres en listas.
- **Label** (700, `0.85rem`): sub-textos atenuados, metadatos, pistas de botón.
- **Badge** (700, `0.66rem`): etiquetas dentro de una píldora — tienda en la portada,
  "Guardada"/"Conectado" en las filas del QAM. El reloj y los porcentajes usan `font-variant-numeric:
  tabular-nums`.

### Icon glyphs (escala aparte)
Los iconos son **emoji del sistema**, no texto, así que no van en la rampa de arriba: se
dimensionan por el peso visual que deben tener como marca gráfica, y forzarlos a un escalón
tipográfico los deja pequeños al lado de su etiqueta.

- **Category glyph** (token `glyph-category`, `1.4rem`): el emoji que abre cada categoría del QAM (📶 🔵 🔊 🎤) y
  otros iconos de encabezado de fila.
- **Control glyph** (token `glyph-control`, `1.1rem`): el emoji dentro de un control pulsable, como el botón de
  silencio del QAM. Un paso por debajo del de categoría, porque compite con el fondo del
  botón.
- Los emoji embebidos en una línea de texto (una etiqueta de dispositivo, por ejemplo)
  heredan el tamaño del texto y **no** usan esta escala.

### Named Rules
**The Weight-Not-Face Rule.** La jerarquía se expresa con peso (400/700/800) y tamaño sobre
una sola familia del sistema; no se introducen fuentes decorativas en la base.

**The Glyphs-Are-Not-Type Rule.** Un emoji dimensionado a `1.4rem` no crea un escalón
tipográfico nuevo: es una marca gráfica y se mide como tal. Solo el texto se ciñe a la rampa
Display/Title/Body/Label.

## Layout

Marco de **app a pantalla completa, sin scroll de página** (`overflow: hidden`,
`user-select: none`, `cursor: default` — se comporta como consola, no como web). Estructura
en tres bandas verticales (`flex-column`, `height: 100%`):

- **Topbar**: pestañas píldora a la izquierda, reloj a la derecha; padding `16px` /
  `--gm-pad` (28px).
- **Content**: área flexible (`flex: 1`, `min-height: 0`) que aloja la vista activa.
- **Hints**: pie con las pistas de botón, separado por `border-top: 1px solid
  var(--gm-surface)`.

**Rejilla de juegos:** tarjetas de ancho fijo `--gm-card-w` (190px) con relación
`--gm-card-ratio` (3/4), separadas por `--gm-gap` (18px). Alrededor de cada tarjeta se
reserva `--gm-focus-space` (26px) para que el crecimiento + el anillo de foco no se
recorten.

**Overlays:** panel lateral que se desliza. Configuración entra desde la izquierda
(`min(920px, 100%)`); el QAM entra desde la derecha (`min(460px, 100%)`), sobre un scrim a
pantalla completa. El detalle de juego ocupa toda la pantalla (capa `z-index: 50`).

Ritmo de espaciado observado: `8 / 10 / 12 / 14 / 16 / 18(gap) / 22 / 28(pad)`.

## Elevation & Depth

**Profundidad por capas tonales, sombra mínima.** El relieve no viene de sombras sino de
apilar superficies cada vez más claras: `console-ink` (fondo) → `surface-slate` (tarjeta) →
`surface-slate-raised` (control dentro de la tarjeta). La sombra se reserva para lo que
realmente **flota** por encima del plano: tarjetas de portada, paneles de overlay y el
teclado.

La "luz" protagonista no es una sombra sino el **glow del foco**: un anillo de acento con
halo (`--gm-focus-ring`) que aparece solo como respuesta al foco.

### Shadow Vocabulary
- **Cover lift** (`box-shadow: 0 4px 12px rgba(0,0,0,0.3)`): eleva las portadas sobre el
  fondo.
- **Panel drop** (`box-shadow: 0 0 60px rgba(0,0,0,0.5)`): overlays laterales.
- **Floating panel** (`box-shadow: 0 20px 60px rgba(0,0,0,0.5)`): teclado virtual y paneles
  que descansan alto.
- **Focus glow** (`--gm-focus-ring`: `0 0 0 3px accent, 0 0 22px 2px color-mix(accent 55%)`):
  no es sombra ambiental sino la señal de foco; la única "luz" del sistema.

### Named Rules
**The Flat-At-Rest Rule.** Las superficies son planas en reposo y se distinguen por tono.
La única luz que aparece por interacción es el glow del foco.

## Shapes

Formas amables, sin esquinas duras. Dos radios base tematizables — `--gm-radius` (14px,
tarjetas/superficies/ítems) y `--gm-radius-lg` (22px, paneles flotantes como el teclado) —
y un radio **píldora** (`999px`) que recorre toda la UI de acción: pestañas, toggles ON/OFF,
badges de tienda y chips de Bluetooth. Los radios son variables de tema: Aurora los
agranda (20/28px), Sunset los reduce (8/12px) para un aire más retro.

**Foco = transformación de forma:** al enfocar, el elemento escala (`--gm-focus-scale`,
1.06 por defecto) y se envuelve en el anillo; en modo Inicio la tarjeta enfocada no escala,
sino que **se ensancha** (de 3:4 a 16:9) revelando el arte apaisado.

## Components

### Navegación (pestañas)
- **Forma:** píldora (`999px`), padding `8px 20px`.
- **Reposo:** texto `muted-steel`, sin fondo; peso 700.
- **Activa:** fondo `surface-slate` + texto `console-white`.
- **Foco:** `--gm-focus-ring` + texto a `console-white`.

### Tarjeta de juego (signature)
- **Forma:** portada con radio `--gm-radius` (14px), relación 3:4; título debajo en
  `muted-steel` que pasa a `console-white` al enfocar.
- **Fondo:** arte real (`cover`) o, sin arte, un degradado determinista derivado del título
  (hue estable por hash) — nunca una caja vacía.
- **Elevación:** `Cover lift`.
- **Foco (grid):** `scale(--gm-focus-scale)` + `z-index`. **Foco (Inicio):** se ensancha a
  16:9 (`width × 2.6`) mostrando el hero, sin escalar.
- **Badge:** píldora `rgba(8,10,14,0.85)` arriba-izquierda con la tienda (Steam/GOG/App),
  `0.66rem` peso 700.

### Toggle (ON/OFF)
- **Forma:** píldora, `min-width: 62px`, texto en mayúsculas peso 800.
- **Off:** fondo `surface-slate-raised`, texto `muted-steel`.
- **On:** fondo `ready-green`, texto `on-green-ink` (`#04140d`).
- **Variante mute:** muestra emoji de estado en vez de ON/OFF.

### Select
- **Forma:** botón a ancho completo, radio `--gm-radius`, fondo `surface-slate-raised`,
  padding `11px 14px`; etiqueta atenuada + valor + caret `▾`.
- **Comportamiento:** no despliega opciones en línea; abre un **popover flotante**
  (`SelectPopover`) anclado al botón. Al cerrar, el foco vuelve al ancla.
- **Foco:** `--gm-focus-ring`.

### Chips / etiquetas
- **Estilo:** píldora `surface-slate-raised`, texto `muted-steel` peso 600, `0.85rem`.
  Usados para dispositivos Bluetooth emparejados (solo lectura).

### Ítems de lista (redes Wi-Fi)
- **Estilo:** fila `surface-slate-raised`, radio `--gm-radius`, `space-between` (nombre /
  meta con candado + señal %).
- **Actual/seleccionado:** fondo `console-blue`, texto `on-accent-ink` (`#06101f`).
- **Foco:** `--gm-focus-ring`.

### QAM (menú de sistema, signature)
- Acordeón por foco: cada categoría (`.cat`, fondo `surface-slate`, radio `--gm-radius`)
  muestra cabecera (icono + label + estado + toggle) y **solo la categoría enfocada
  despliega** sus controles (lista de redes, slider de volumen, select de dispositivo).
- **Slider:** nativo con `accent-color: var(--gm-accent)`; al enfocar, halo de foco.

### Teclado virtual (signature)
- Panel flotante `elevated-ink`, radio `--gm-radius-lg`, `Floating panel` shadow, anclado
  abajo-centro sobre scrim.
- **Teclas:** `52×52px` mínimo, radio `12px`, fondo `surface-slate`; al enfocar
  `--gm-focus-ring` + `scale(1.08)`. Mayús activo y "Aceptar" usan acento/verde.
- Cursor parpadeante en `console-blue`.

### Botones de acción (confirmar / cancelar)
- **Confirmar/Aceptar:** fondo `ready-green`, texto oscuro — el "primario" del sistema.
- **Cancelar/secundario:** fondo `surface-slate`.
- **Destructivo:** `alert-red` (eliminar/errores).

## Do's and Don'ts

### Do:
- **Do** enrutar todo color/medida/forma por tokens `--gm-*`; un componente nuevo debe ser
  repintable sin editarlo.
- **Do** señalar el foco con `--gm-focus-ring` + crecimiento (`--gm-focus-scale`), y dejar
  aire (`--gm-focus-space`) para que no se recorte.
- **Do** construir profundidad apilando `console-ink → surface-slate → surface-slate-raised`;
  reservar la sombra para lo que flota.
- **Do** usar la píldora (`999px`) para controles de acción (pestañas, toggles, chips,
  badges) y `--gm-radius` para superficies/ítems.
- **Do** mantener el acento azul escaso (foco/selección/realce), y usar verde=activo,
  rojo=peligro.
- **Do** diseñar "a 10 pies": tamaños generosos, jerarquía por peso, cifras con
  `tabular-nums`.

### Don't:
- **Don't** escribir colores o medidas literales en componentes (excepto las tintas de
  contraste sobre acento/verde, que hoy no tienen token).
- **Don't** rellenar áreas grandes con el azul de acento.
- **Don't** introducir fuentes decorativas en la base; la jerarquía es por peso/tamaño
  sobre el stack del sistema.
- **Don't** apoyar la profundidad en sombras marcadas en reposo; el sistema es plano y
  tonal, la sombra es para lo que flota.
- **Don't** dejar estados vacíos como cajas muertas: sin arte, degradar por hash del título;
  sin datos, texto atenuado corto.
- **Don't** asumir ratón: cada control debe ser alcanzable por foco espacial con mando.
