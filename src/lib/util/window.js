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

export async function exitFullscreen() {
  try {
    await (await win()).setFullscreen(false);
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

export async function isFullscreen() {
  try {
    return await (await win()).isFullscreen();
  } catch {
    return false; // modo web
  }
}

export async function closeApp() {
  try {
    await (await win()).close();
  } catch {
    /* modo web */
  }
}
