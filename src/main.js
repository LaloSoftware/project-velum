import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { reportError } from "./lib/stores/ui.js";

// Instrumentación de diagnóstico: los errores no capturados se muestran en
// pantalla (ver ErrorBanner en App.svelte) para poder verlos sin DevTools.
window.addEventListener("error", (e) => {
  reportError(e.error || e.message, "window.onerror");
});
window.addEventListener("unhandledrejection", (e) => {
  reportError(e.reason, "unhandledrejection");
});

const app = mount(App, { target: document.getElementById("app") });

export default app;
