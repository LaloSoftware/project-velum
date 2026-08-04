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
