import { derived } from "svelte/store";
import { t, tr } from "./index.js";

/*
 * Nombres de entidades que el usuario puede renombrar (perfiles, grupos,
 * listas de reproducción).
 *
 * Regla: **lo que el usuario escribió NO se traduce jamás.** Lo que la app
 * generó sola se guarda con `name: ""` y se resuelve acá al pintar, así sigue
 * al idioma activo. En cuanto el usuario renombra, su texto queda en la config
 * y estas funciones lo devuelven tal cual para siempre.
 *
 * Dos sabores, mismo criterio que `$t`/`tr`:
 *   - `$names.profile(p)` en componentes — reactivo, cambia con el idioma.
 *   - `profileNameNow(p)` en stores (toasts, mensajes) — imperativo, congela
 *     el texto en el momento de armar el mensaje.
 */

export const names = derived(t, ($t) => ({
  profile: (p) => p?.name || $t("profiles.defaultName"),
  group: (g) => g?.name || $t("groups.defaultName"),
  playlist: (pl) => pl?.name || $t("playlists.defaultName"),
}));

export const profileNameNow = (p) => p?.name || tr("profiles.defaultName");
export const groupNameNow = (g) => g?.name || tr("groups.defaultName");
export const playlistNameNow = (pl) => pl?.name || tr("playlists.defaultName");
