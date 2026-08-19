import { writable } from "svelte/store";

/*
 * Última fuente de input detectada: "gamepad" o "keymouse" (teclado o mouse,
 * tratados como un solo grupo — ver design_icons.md / feature-icons.md).
 * La actualiza `lib/input/index.js` en cada evento crudo de mando, tecla o
 * clic. Se usa para decidir qué atajos mostrar en el footer y otros menús de
 * navegación (ajuste 2 de la feature de iconos).
 */
export const inputSource = writable("gamepad");
