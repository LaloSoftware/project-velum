import { writable } from "svelte/store";

/*
 * Teclado virtual en pantalla. Permite escribir texto SOLO con el mando,
 * para que nada dependa del teclado físico (nombrar perfiles, buscar, etc.).
 *
 * Uso: const texto = await openKeyboard(valorInicial, "Título");
 *   -> resuelve con el string final, o null si se cancela.
 */

export const vk = writable({ open: false, title: "", value: "", _resolve: null });

let resolver = null;

export function openKeyboard(initial = "", title = "Escribir") {
  return new Promise((resolve) => {
    resolver = resolve;
    vk.set({ open: true, title, value: initial, _resolve: resolve });
  });
}

export function vkType(ch) {
  vk.update((s) => ({ ...s, value: s.value + ch }));
}

export function vkBackspace() {
  vk.update((s) => ({ ...s, value: s.value.slice(0, -1) }));
}

export function vkDone(cancelled = false) {
  let finalValue = null;
  vk.update((s) => {
    finalValue = cancelled ? null : s.value;
    return { open: false, title: "", value: "", _resolve: null };
  });
  if (resolver) {
    resolver(finalValue);
    resolver = null;
  }
}
