/*
 * Temas integrados. Cada tema es un conjunto de overrides de tokens --gm-*
 * (y, opcionalmente, CSS extra). Demuestran que SOLO con tokens/CSS cambia
 * radicalmente el aspecto. El usuario puede crear los suyos (ver docs/theming.md).
 *
 * `kind` ("dark" | "light") no afecta el CSS directamente: lo usa Settings.svelte
 * para decidir si al activar el tema hace falta reiniciar el override de
 * --gm-text del perfil (ver pickTheme() ahí) y para separarlos en el selector.
 */

export const BUILTIN_THEMES = {
  midnight: {
    name: "Midnight (por defecto)",
    kind: "dark",
    // Sin overrides: usa el tema base de app.css.
    tokens: {},
    extraCss: "",
  },

  aurora: {
    name: "Aurora",
    kind: "dark",
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
    kind: "dark",
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

  carbon: {
    name: "Carbón",
    kind: "dark",
    tokens: {
      "--gm-bg": "#0b0c0e",
      "--gm-bg-elev": "#141518",
      "--gm-surface": "#1c1e22",
      "--gm-surface-2": "#26282d",
      "--gm-text": "#eef0f2",
      "--gm-text-dim": "#9199a3",
      "--gm-accent": "#c9cdd3",
      "--gm-accent-2": "#e6e9ec",
      "--gm-wallpaper":
        "radial-gradient(1100px 700px at 15% -10%, #1c1e22 0%, transparent 55%), radial-gradient(900px 650px at 110% 10%, #26282d 0%, transparent 50%), #0b0c0e",
    },
    extraCss: "",
  },

  neon: {
    name: "Neón Arcade",
    kind: "dark",
    tokens: {
      "--gm-bg": "#0a0014",
      "--gm-bg-elev": "#150726",
      "--gm-surface": "#1f0d38",
      "--gm-surface-2": "#2b1350",
      "--gm-text": "#f5ecff",
      "--gm-text-dim": "#b79ddb",
      "--gm-accent": "#ff2e9c",
      "--gm-accent-2": "#00e5ff",
      "--gm-wallpaper":
        "radial-gradient(1100px 700px at 10% -10%, #3a0a5c 0%, transparent 55%), radial-gradient(900px 650px at 110% 10%, #06283a 0%, transparent 50%), #0a0014",
    },
    extraCss: "",
  },

  forest: {
    name: "Bosque",
    kind: "dark",
    tokens: {
      "--gm-bg": "#0c140f",
      "--gm-bg-elev": "#131f17",
      "--gm-surface": "#1a2b20",
      "--gm-surface-2": "#22392b",
      "--gm-text": "#eaf5ed",
      "--gm-text-dim": "#9ab8a4",
      "--gm-accent": "#4caf6e",
      "--gm-accent-2": "#7fd99b",
      "--gm-wallpaper":
        "radial-gradient(1100px 700px at 10% -10%, #17301f 0%, transparent 55%), radial-gradient(900px 650px at 110% 10%, #123024 0%, transparent 50%), #0c140f",
    },
    extraCss: "",
  },

  paper: {
    name: "Papel",
    kind: "light",
    tokens: {
      "--gm-bg": "#f6f1e7",
      "--gm-bg-elev": "#efe8d8",
      "--gm-surface": "#e8dfc9",
      "--gm-surface-2": "#ddd2b6",
      "--gm-text": "#211d15",
      "--gm-text-dim": "#6b5f47",
      "--gm-accent": "#2f6fed",
      "--gm-accent-2": "#5b8ff2",
      "--gm-wallpaper":
        "radial-gradient(1100px 700px at 15% -10%, #efe6cf 0%, transparent 55%), radial-gradient(900px 650px at 110% 10%, #e6dcc0 0%, transparent 50%), #f6f1e7",
    },
    extraCss: "",
  },

  cloud: {
    name: "Nube",
    kind: "light",
    tokens: {
      "--gm-bg": "#eef2f7",
      "--gm-bg-elev": "#e4eaf2",
      "--gm-surface": "#d9e1ec",
      "--gm-surface-2": "#cdd7e6",
      "--gm-text": "#151a21",
      "--gm-text-dim": "#5b6472",
      "--gm-accent": "#4c8dff",
      "--gm-accent-2": "#7aa7ff",
      "--gm-wallpaper":
        "radial-gradient(1100px 700px at 15% -10%, #e2e9f3 0%, transparent 55%), radial-gradient(900px 650px at 110% 10%, #d6e0ee 0%, transparent 50%), #eef2f7",
    },
    extraCss: "",
  },

  sand: {
    name: "Arena",
    kind: "light",
    tokens: {
      "--gm-bg": "#f2e9d8",
      "--gm-bg-elev": "#ecdfc7",
      "--gm-surface": "#e3d3b3",
      "--gm-surface-2": "#d6c299",
      "--gm-text": "#241c0f",
      "--gm-text-dim": "#6e5c3c",
      "--gm-accent": "#d97b3f",
      "--gm-accent-2": "#e8a06b",
      "--gm-wallpaper":
        "radial-gradient(1100px 700px at 15% -10%, #ecdfc4 0%, transparent 55%), radial-gradient(900px 650px at 110% 10%, #e2cfa8 0%, transparent 50%), #f2e9d8",
    },
    extraCss: "",
  },

  mint: {
    name: "Menta",
    kind: "light",
    tokens: {
      "--gm-bg": "#eaf7f0",
      "--gm-bg-elev": "#dcf0e4",
      "--gm-surface": "#cfe8da",
      "--gm-surface-2": "#bfdccb",
      "--gm-text": "#0f2116",
      "--gm-text-dim": "#4d715c",
      "--gm-accent": "#1fae72",
      "--gm-accent-2": "#4fd499",
      "--gm-wallpaper":
        "radial-gradient(1100px 700px at 15% -10%, #dcf1e6 0%, transparent 55%), radial-gradient(900px 650px at 110% 10%, #cfe9da 0%, transparent 50%), #eaf7f0",
    },
    extraCss: "",
  },
};

// Font-stacks curadas para el selector de tipografía global (Ajustes → Apariencia).
// Todas disponibles de forma nativa en Windows 10/11 — el launcher es offline, no
// depende de fuentes descargadas.
export const FONT_OPTIONS = [
  { id: "system", label: "Sistema (Segoe UI)", value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: "arial", label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { id: "verdana", label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { id: "trebuchet", label: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  { id: "georgia", label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { id: "times", label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { id: "consolas", label: "Consolas (monoespaciada)", value: "Consolas, 'Courier New', monospace" },
  { id: "courier", label: "Courier New (monoespaciada)", value: "'Courier New', Courier, monospace" },
];

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
