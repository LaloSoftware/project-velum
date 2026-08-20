import { writable } from "svelte/store";
import { tr } from "../i18n/index.js";

/*
 * Teclado virtual en pantalla. Permite escribir texto SOLO con el mando,
 * para que nada dependa del teclado físico (nombrar perfiles, buscar, etc.).
 *
 * Atajos de mando (interpretados en App.svelte cuando el teclado está abierto):
 *   A escribir · Y/△ espacio · X/□ borrar · LB/RB Mayús · B cancelar.
 *
 * Uso: const texto = await openKeyboard(valorInicial, "Título");
 *   -> resuelve con el string final, o null si se cancela.
 *
 * `{ mask: true }` para secretos (claves de Wi-Fi): el valor se pinta con
 * puntos y hay un botón para revelarlo. La pantalla está en la sala, a la
 * vista de todos — mostrar la clave del router en grande no es aceptable.
 */

export const vk = writable({
  open: false,
  title: "",
  value: "",
  shift: false,
  mask: false,
  reveal: false,
  _resolve: null,
});

let resolver = null;

export function openKeyboard(initial = "", title = tr("vk.write"), { mask = false } = {}) {
  return new Promise((resolve) => {
    resolver = resolve;
    vk.set({
      open: true,
      title,
      value: initial,
      shift: false,
      mask,
      reveal: false,
      _resolve: resolve,
    });
  });
}

/** Alterna mostrar/ocultar el valor cuando está enmascarado. */
export function vkToggleReveal() {
  vk.update((s) => ({ ...s, reveal: !s.reveal }));
}

export function vkType(ch) {
  vk.update((s) => ({ ...s, value: s.value + ch }));
}

export function vkBackspace() {
  vk.update((s) => ({ ...s, value: s.value.slice(0, -1) }));
}

export function vkToggleShift() {
  vk.update((s) => ({ ...s, shift: !s.shift }));
}

export function vkDone(cancelled = false) {
  let finalValue = null;
  vk.update((s) => {
    finalValue = cancelled ? null : s.value;
    return {
      open: false,
      title: "",
      value: "",
      shift: false,
      mask: false,
      reveal: false,
      _resolve: null,
    };
  });
  if (resolver) {
    resolver(finalValue);
    resolver = null;
  }
}
