// Traduce un código de posición (ver NOTIFY_POSITIONS en stores/uiprefs.js —
// mismo esquema tl/tc/tr/ml/mr/bl/bc/br que el preset 3×3 del logo en
// ArtEditor.svelte, sin "mc") a un estilo CSS `position: fixed` inline.
// Compartido por cualquier notificación flotante que respete la preferencia
// de posición del usuario (hoy: GamepadNotice.svelte).
const EDGE = "18px"; // mismo margen que ya usaban SteamSyncIndicator/SteamSyncSummaryBadge

const POSITIONS = {
  tl: `top: ${EDGE}; left: ${EDGE};`,
  tc: `top: ${EDGE}; left: 50%; transform: translateX(-50%);`,
  tr: `top: ${EDGE}; right: ${EDGE};`,
  ml: `top: 50%; left: ${EDGE}; transform: translateY(-50%);`,
  mr: `top: 50%; right: ${EDGE}; transform: translateY(-50%);`,
  bl: `bottom: ${EDGE}; left: ${EDGE};`,
  bc: `bottom: ${EDGE}; left: 50%; transform: translateX(-50%);`,
  br: `bottom: ${EDGE}; right: ${EDGE};`,
};

export function notifyPositionStyle(code) {
  return `position: fixed; ${POSITIONS[code] || POSITIONS.br}`;
}
