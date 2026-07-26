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

En `src/lib/theming/themes.js`. Cada tema = `{ name, tokens, extraCss }`. Incluye
`midnight` (por defecto), `aurora` y `sunset`. Añadir uno nuevo = añadir una entrada.

## Perfiles

Un **perfil** combina un tema base con personalización propia:

```js
{ id, name, baseTheme, tokenOverrides: { "--gm-accent": "#ff7a59" }, extraCss: "", wallpaper }
```

Se gestionan en **Ajustes** dentro de la app (crear, activar, elegir tema, acento, CSS
externo, borrar). Se persisten vía `save_config` (JSON en el dir de datos de la app; en
web, `localStorage`).

## Cómo se aplica (runtime, sin recargar)

`src/lib/theming/index.js` → `applyProfile(profile)`:
1. escribe los tokens (tema base + overrides del perfil) en `<style id="gm-theme-vars">`;
2. inyecta el CSS extra (tema + perfil) en `<style id="gm-theme-extra">`.

## Cargar CSS externo

En Ajustes → "Aplicar CSS de ejemplo" se carga `EXAMPLE_EXTERNAL_CSS` (redefine tokens
en `:root`) para demostrar la carga en runtime. En la app real, este texto vendría de un
archivo `.css` elegido por el usuario. Tu CSS puede redefinir cualquier `--gm-*` y/o
añadir reglas nuevas (p. ej. estilar `.gm-card`).
