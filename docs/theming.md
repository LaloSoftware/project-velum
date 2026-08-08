# Theming y perfiles

Todo el aspecto de GM se expresa con **design tokens**: variables CSS `--gm-*`. Los
componentes nunca usan colores/medidas fijas, solo `var(--gm-*)`. Cambiar el aspecto =
cambiar tokens (y, si quieres, añadir CSS propio).

## Tokens principales (`src/app.css`)

| Token | Qué controla |
|-------|--------------|
| `--gm-bg`, `--gm-bg-elev`, `--gm-surface`, `--gm-surface-2` | Fondos/superficies |
| `--gm-text`, `--gm-text-dim` | Texto |
| `--gm-accent`, `--gm-accent-2` | Color de acento |
| `--gm-focus-ring`, `--gm-focus-scale` | Aspecto del foco (mando/teclado) |
| `--gm-radius`, `--gm-radius-lg`, `--gm-gap`, `--gm-pad` | Formas y espaciado |
| `--gm-card-w`, `--gm-card-ratio` | Tamaño de las portadas |
| `--gm-wallpaper` | Fondo de sala |

## Temas integrados

En `src/lib/theming/themes.js`. Cada tema = `{ name, kind, tokens, extraCss }`, con
`kind: "dark" | "light"`. Diez temas: `midnight` (por defecto), `aurora`, `sunset`,
`carbon`, `neon`, `forest` (oscuros) y `paper`, `cloud`, `sand`, `mint` (claros).
Añadir uno nuevo = añadir una entrada al objeto.

`kind` no afecta el CSS por sí solo — lo usa `Settings.svelte` (`pickTheme()`) para
decidir si al cambiar de tema hace falta descartar un override de `--gm-text`
pensado para el tema anterior (ver "Color de texto" abajo), y para agrupar el
selector en dos secciones.

## Color de texto y tipografía

Dos controles nuevos en Ajustes → Apariencia, mismo mecanismo que "Color de acento"
(escriben `tokenOverrides` del perfil activo, no tocan el tema base):

- **Color de texto**: sobreescribe `--gm-text` del perfil. Al pasar de un tema
  oscuro a uno claro, si había un override previo se descarta automáticamente
  (`pickTheme()` en `Settings.svelte`) para que el texto no desaparezca sobre el
  nuevo fondo claro — el tema claro ya trae su propio `--gm-text` oscuro por
  defecto, y el usuario puede volver a personalizarlo después. No se toca si ya se
  estaba en un tema claro. No hay cálculo de contraste (WCAG/luminancia): es un
  descarte simple del override anterior, no una elección automática del mejor
  color — ver "Pendiente / a evaluar a futuro" más abajo.
- **Tipografía**: `Select` con una lista curada de font-stacks nativas de Windows
  (`FONT_OPTIONS` en `themes.js`) — Segoe UI (sistema, por defecto), Arial, Verdana,
  Trebuchet MS, Georgia, Times New Roman, Consolas y Courier New. Todas offline, sin
  depender de fuentes descargadas. Escribe `tokenOverrides["--gm-font"]`.

## Perfiles

Un **perfil** combina un tema base con personalización propia:

```js
{ id, name, baseTheme, tokenOverrides: { "--gm-accent": "#ff7a59" }, extraCss: "", wallpaper }
```

Se gestionan en **Ajustes** dentro de la app (crear, activar, elegir tema, acento,
color de texto, tipografía, CSS externo, borrar). Se persisten vía `save_config`
(JSON en el dir de datos de la app; en web, `localStorage`).

## Cómo se aplica (runtime, sin recargar)

`src/lib/theming/index.js` → `applyProfile(profile)`:
1. escribe los tokens (tema base + overrides del perfil) en `<style id="gm-theme-vars">`;
2. inyecta el CSS extra (tema + perfil) en `<style id="gm-theme-extra">`.

## Cargar CSS externo

En Ajustes → "Aplicar CSS de ejemplo" se carga `EXAMPLE_EXTERNAL_CSS` (redefine tokens
en `:root`) para demostrar la carga en runtime. En la app real, este texto vendría de un
archivo `.css` elegido por el usuario. Tu CSS puede redefinir cualquier `--gm-*` y/o
añadir reglas nuevas (p. ej. estilar `.gm-card`).

## Iconos de botones (prompts)

Los indicadores de botón (`ButtonPrompt.svelte`, footer/menús) pueden mostrarse como
**texto** (comportamiento de siempre, "auto") o como **iconos reales**, elegibles en
Ajustes → Iconos de botones (`stores/prompts.js::PROMPT_STYLES`): 3 sets (línea,
duotono, badge) × 3 plataformas (Xbox, PlayStation, universal) = 9 combinaciones + auto.
Los SVG viven en `src/assets/icons/<set>/<plataforma>/<token>.svg`, mismo `<token>`
físico que usa `stores/bindings.js` (south, east, l1, guide...) — agregar un set o
plataforma nueva es solo sumar una carpeta con esos mismos nombres
(`theming/icons.js::iconFor()`, sin tabla de traducción).

Aparte del estilo elegido, `stores/inputSource.js` recuerda la **última fuente de
input detectada** (mando o teclado/mouse, actualizado por `lib/input/index.js` en
cada evento crudo) para decidir automáticamente qué atajo mostrar en el pie y otros
menús de navegación cuando ambos coexisten (p. ej. el menú radial de mando (Home) vs.
su atajo de teclado/mouse alterno para el menú de sistema — ver `docs/input.md`).

## Sonidos

Ajustes → Sonidos: sonido de inicio configurable (`stores/sounds.js`, lista curada de
`.ogg` + botón "Probar"), reproducido una vez en `App.svelte` justo después de aplicar
el arranque (`applyStartup()`). Si el WebView bloquea autoplay con audio, falla en
silencio y no interrumpe el arranque.

## Fondo de metadatos (Detalle)

Ajustes → Apariencia → "Fondo de metadatos (Detalle)": toggle (`metaBgVisible`,
default `true`) + slider de opacidad 0-100% (`metaBgOpacity`, `stores/uiprefs.js`,
persistente por perfil) para el fondo detrás del título/plataforma/meta del
Detalle (hoy flota sobre el hero, la legibilidad venía solo del degradado fijo
`.art::after`). Default de opacidad según el tema activo (`BUILTIN_THEMES[...]
.kind`, mismo lookup que `pickTheme()`): **30% en temas oscuros, 50% en
claros** — un tema oscuro ya tiene bastante contraste por el degradado; uno
claro necesita más respaldo para el texto oscuro sobre una imagen ocupada. El
color base es `--gm-bg-elev` (no un negro fijo) compuesto con la opacidad vía
`color-mix()`, así que se adapta solo al tema/perfil activo.

**Legibilidad de raíz (ajuste tras prueba real, no solo este fondo opcional)**:
`.art::after` (el degradado permanente detrás de TODA la metadata, con o sin
el fondo de arriba activo) usaba `rgba(0,0,0,0.72)` fijo — en temas claros el
texto pasa a oscuro (`--gm-text`) pero ese degradado seguía siendo negro,
quedando texto oscuro sobre un velo oscuro sin importar la opacidad del fondo
configurable. Ahora usa `color-mix(in srgb, var(--gm-bg) 82%, transparent)`
(tematizado) — resuelve el contraste de raíz en vez de compensar solo con el
fondo opcional. De paso, `.store`/`.meta`/`.meta.dim` (`GameDetail.svelte`)
subieron de tamaño (pensado para verse desde el sofá/TV, no solo de cerca).

## Difuminado de fondo (Inicio)

Ajustes → Apariencia → "Difuminado de fondo (Inicio)": slider 0-100%
(`homeBgFade`, `stores/uiprefs.js`, persistente por perfil, default 55) que
controla la opacidad del hero de fondo de `Home.svelte` (`.bg`, antes fija en
`0.55`) antes de desvanecerse al wallpaper del tema vía `mask-image`. Más
bajo = fondo más tenue/difuminado; más alto = foto más visible.

## Wallpaper de Inicio

Ajustes → Apariencia → "Wallpaper de Inicio": imagen fija que reemplaza el
fondo hero de `Home.svelte` (por defecto, la carátula/hero del juego enfocado
en la tira "Reciente") para **todos** los juegos — solo afecta ese fondo
grande; las carátulas de `GameCard` en la tira y el hero por-juego del Detalle
no se tocan. `homeWallpaperPath` (`stores/uiprefs.js`, persistente por perfil,
`null` = sin wallpaper): guarda la **ruta de archivo absoluta** elegida con el
diálogo nativo (`@tauri-apps/plugin-dialog`, mismo mecanismo que
`ArtEditor.svelte::pick()` — nunca se copia el binario), resuelta a `data:` URI
en el momento de mostrarla vía `util/asset.js::imageUrl()`. Sin toggle aparte:
la sola presencia del path activa el wallpaper (`Home.svelte`: `bgSrc =
$homeWallpaperPath || <hero del juego enfocado>`); "Quitar" limpia el campo y
vuelve al hero por-juego. Hereda el difuminado (`homeBgFade`, arriba) sin
código extra — es solo una fuente alternativa para la misma capa `.bg`.

**No confundir con el token `--gm-wallpaper`/`profile.wallpaper`** (perfil,
`theming/index.js:35`): ese es el fondo de TODA la app (`App.svelte`,
`GameDetail.svelte`), hoy solo acepta un valor CSS crudo (gradiente) escrito a
mano en cada tema (`theming/themes.js`), sin UI de carga de imagen — es un
concepto totalmente distinto que sigue sin implementar (infraestructura sin
terminar). Se usó un nombre de campo separado (`homeWallpaperPath`) a
propósito para no mezclarlos.

## Notificaciones (posición)

Ajustes → Notificaciones: picker visual 3×3 (sin el centro-centro, taparía
contenido) para dónde aparecen los avisos flotantes en pantalla —
`notifyPosition`/`NOTIFY_POSITIONS` en `stores/uiprefs.js`, mismos códigos
`tl/tc/tr/ml/mr/bl/bc/br` que el preset de posición del logo en
`ArtEditor.svelte`. `src/lib/util/notifyPosition.js` traduce el código a
`position: fixed` inline; cualquier notificación flotante que la respete lo
usa así (hoy: `GamepadNotice.svelte`, mando conectado/desconectado — ver
`docs/input.md`). Default `"br"` (esquina inferior derecha), mismo lugar
donde ya viven `SteamSyncIndicator`/`SteamSyncSummaryBadge` (esos dos siguen
fijos a esa esquina, no leen la preferencia todavía).

## Resaltado de 100% completado (logros)

Ajustes → Apariencia → "Resaltado de 100% completado (logros)". Un color
compartido (`--gm-complete`, token en `app.css` — mismo valor por defecto que
`--gm-success` pero **independiente**: un perfil puede recolorear uno sin
afectar el otro, ya que `--gm-success` también colorea cualquier toggle "ON"
de la app), ordenado **primero** en la sección para transmitir que es el
color de todo lo que sigue. Debajo, **dos interruptores independientes**
(`completedBadgeEnabled`/`completedGlowEnabled`, `stores/uiprefs.js`, default
`true` los dos — antes uno solo, `completedHighlightEnabled`, controlaba las
dos cosas a la vez):

- **Insignia "100%"** (`completedBadgeEnabled`): la etiqueta de texto —
  `.complete-badge` en la tarjeta (`GameCard.svelte`) y `.ach-badge-tag` en el
  badge de logros del Detalle (`GameDetail.svelte`, agregado en este ajuste
  para tener el mismo tipo de insignia que la tarjeta).
- **Brillo** (`completedGlowEnabled`): el glow/`box-shadow` alrededor de la
  tarjeta y del badge de logros.

Marca los juegos con `unlocked === total` (logros de Steam). La barra de
progreso del modal de logros (`AchievementsModal.svelte`,
`.progress-fill.complete`) se recolorea si **cualquiera** de los dos
interruptores está activo (no tiene insignia/brillo propios, solo refleja el
mismo resaltado). El badge de logros del Detalle también se agrandó en este
ajuste (`.ach-badge`: más padding, ícono e insignia más grandes) para que se
note más.

## Pendiente / a evaluar a futuro

**Cálculo de contraste genérico** en vez del descarte fijo actual de "Color de
texto" al cambiar de tema (ver arriba): calcular la luminancia relativa (WCAG) de
cualquier combinación de fondo/acento que arme el usuario — convertir hex→RGB,
linealizar, sacar luminancia relativa y ratio de contraste — para elegir
automáticamente texto negro/blanco (o avisar de bajo contraste), no solo al entrar
a un tema claro predefinido sino ante cualquier cambio de color manual. Puntos
abiertos si se implementa: contra qué token de superficie medir (`--gm-bg` vs
`--gm-surface` vs `--gm-surface-2` vs `--gm-bg-elev` — no son el mismo fondo) y
cuándo recalcular (no solo al cambiar de tema, también al tocar acento/texto a
mano). No implementado — se documenta como posibilidad futura.
