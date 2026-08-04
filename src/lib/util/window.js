/*
 * Controles de la ventana nativa (Tauri). En modo web son no-op.
 */

async function win() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export async function minimizeWindow() {
  try {
    await (await win()).minimize();
  } catch {
    /* modo web */
  }
}

export async function enterFullscreen() {
  try {
    await (await win()).setFullscreen(true);
  } catch {
    /* modo web */
  }
}

export async function exitFullscreen() {
  try {
    await (await win()).setFullscreen(false);
  } catch {
    /* modo web */
  }
}

export async function enterFullscreenIf(on) {
  if (on) return enterFullscreen();
}

// Restaura la ventana tras suspenderla (fin del juego): la desminimiza y le da foco.
export async function unminimizeAndFocus() {
  try {
    const w = await win();
    await w.unminimize();
    await w.setFocus();
  } catch {
    /* modo web */
  }
}

export async function toggleMaximize() {
  try {
    await (await win()).toggleMaximize();
  } catch {
    /* modo web */
  }
}

// Acción fija (no alterna según estado) — la usa el menú rápido de sistema,
// donde "Maximizar" siempre debe maximizar sin importar el tamaño actual.
export async function maximizeWindow() {
  try {
    await (await win()).maximize();
  } catch {
    /* modo web */
  }
}

export async function isFullscreen() {
  try {
    return await (await win()).isFullscreen();
  } catch {
    return false; // modo web
  }
}

// Notifica `cb(fullscreen)` cuando cambia el tamaño de la ventana (entrar/salir
// de pantalla completa dispara un resize). Devuelve una función para dejar de
// escuchar. No hay evento nativo de "fullscreen-changed", así que se infiere
// re-consultando `isFullscreen()` en cada resize.
export async function onFullscreenChange(cb) {
  try {
    const w = await win();
    const unlisten = await w.onResized(async () => cb(await isFullscreen()));
    return unlisten;
  } catch {
    return () => {}; // modo web
  }
}

export async function closeApp() {
  try {
    await (await win()).close();
  } catch {
    /* modo web */
  }
}
