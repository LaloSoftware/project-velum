/*
 * Temas integrados. Cada tema es un conjunto de overrides de tokens --gm-*
 * (y, opcionalmente, CSS extra). Demuestran que SOLO con tokens/CSS cambia
 * radicalmente el aspecto. El usuario puede crear los suyos (ver docs/theming.md).
 */

export const BUILTIN_THEMES = {
  midnight: {
    name: "Midnight (por defecto)",
    // Sin overrides: usa el tema base de app.css.
    tokens: {},
    extraCss: "",
  },

  aurora: {
    name: "Aurora",
    tokens: {
      "--gm-bg": "#07131a",
      "--gm-bg-elev": "#0c1d26",
      "--gm-surface": "#0f2731",
      "--gm-surface-2": "#15343f",
      "--gm-text": "#eafff7",
      "--gm-text-dim": "#84b4ad",
      "--gm-accent": "#37e6b4",
      "--gm-accent-2": "#7af0d6",
      "--gm-radius": "20px",
      "--gm-radius-lg": "28px",
      "--gm-focus-scale": "1.08",
      "--gm-wallpaper":
        "radial-gradient(1200px 700px at 10% -10%, #0c3b3a 0%, transparent 55%), radial-gradient(1000px 700px at 110% 0%, #103a52 0%, transparent 55%), #07131a",
    },
    extraCss: "",
  },

  sunset: {
    name: "Sunset (retro)",
    tokens: {
      "--gm-bg": "#1a0e18",
      "--gm-bg-elev": "#26121f",
      "--gm-surface": "#331726",
      "--gm-surface-2": "#421d30",
      "--gm-text": "#ffeef4",
      "--gm-text-dim": "#c79bb0",
      "--gm-accent": "#ff7a59",
      "--gm-accent-2": "#ffb27a",
      "--gm-radius": "8px",
      "--gm-radius-lg": "12px",
      "--gm-title-weight": "900",
      "--gm-card-w": "170px",
      "--gm-wallpaper":
        "radial-gradient(1000px 700px at 50% -20%, #7a1f3a 0%, transparent 55%), linear-gradient(180deg, #1a0e18, #0a0509)",
    },
    // Un poquito de CSS extra propio del tema (además de tokens).
    extraCss: `
      .gm-card { text-transform: uppercase; letter-spacing: 0.5px; }
    `,
  },
};

// Ejemplo de "CSS externo" tal cual lo escribiría un usuario en un .css.
// En el MVP se ofrece pegarlo/activarlo desde Ajustes para probar la carga en runtime.
export const EXAMPLE_EXTERNAL_CSS = `/* Tema externo de ejemplo — pega tu propio CSS aquí */
:root {
  --gm-accent: #ffd166;
  --gm-accent-2: #ffe29a;
  --gm-bg: #12100a;
  --gm-surface: #211d12;
  --gm-surface-2: #2c2717;
  --gm-text: #fff7e6;
  --gm-radius: 26px;
}
`;
