import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { reportError } from "./lib/stores/ui.js";

// Instrumentación de diagnóstico: los errores no capturados se muestran en
// pantalla (ver ErrorBanner en App.svelte) para poder verlos sin DevTools.
//
// "ResizeObserver loop completed with undelivered notifications" es una
// advertencia benigna y conocida del motor del WebView (típicamente disparada
// tras una ráfaga de resize, como al entrar/salir de pantalla completa), no un
// error real de la app — GM ni siquiera usa ResizeObserver en ningún lado. Se
// deja en consola para no perder rastro, pero no se muestra como error.
function isBenignResizeObserverNoise(err) {
  const msg = (err && err.message) || String(err);
  return /ResizeObserver loop/i.test(msg);
}

window.addEventListener("error", (e) => {
  const err = e.error || e.message;
  if (isBenignResizeObserverNoise(err)) {
    console.warn("[gm] advertencia benigna ignorada:", err);
    return;
  }
  reportError(err, "window.onerror");
});
window.addEventListener("unhandledrejection", (e) => {
  if (isBenignResizeObserverNoise(e.reason)) {
    console.warn("[gm] advertencia benigna ignorada:", e.reason);
    return;
  }
  reportError(e.reason, "unhandledrejection");
});

const app = mount(App, { target: document.getElementById("app") });

export default app;
