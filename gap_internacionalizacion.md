# Gap: internacionalización (idioma/región de Steam + i18n de la UI)

> Documento de gap — no hay código pendiente de esta sesión, es la investigación y
> las decisiones ya tomadas para que una sesión futura empiece con contexto en vez
> de re-investigar. Mientras tanto, todo sigue como está: `PRIMARY_LANG = "latam"`
> fijo, UI 100% en español.

## Estado actual (verificado en el código)

- `src-tauri/src/steam_api/mod.rs:31-32`:
  ```rust
  pub(crate) const PRIMARY_LANG: &str = "latam";
  pub(crate) const FALLBACK_LANG: &str = "english";
  ```
  Comentario ya presente ahí mismo: *"cuando exista un selector de idioma real
  (pendiente, ver docs/accounts.md) PRIMARY_LANG pasa a resolverse desde la
  config en vez de ser una constante"*.
- Usadas en 4 llamadas a la Steam Web API (parámetro `l`):
  - `steam_api/achievements.rs::fetch_schema` (recibe `lang` genérico, ya no
    hardcodeado — el que sí llama con la constante es su caller).
  - `steam_api/achievements.rs::fetch_schema_with_fallback` — llama
    `fetch_schema(..., PRIMARY_LANG)`, y si el esquema viene sin traducción
    (`schema_needs_fallback`), reintenta con `FALLBACK_LANG`.
  - `steam_api/achievements.rs::fetch_player_achievements` — `.query("l",
    PRIMARY_LANG)`, sin fallback.
  - `steam_api/library.rs::fetch_owned_games` — `.query("l", PRIMARY_LANG)`.
- **No existe** ningún parámetro `cc`/`country`/región geográfica en ninguna
  llamada — Steam distingue idioma (`l`) de región de tienda/precios (`cc`), y
  esta app solo usa `l` (nombres/descripciones de logros y biblioteca).
- **No existe** ningún comando Tauri que reciba idioma/región desde el
  frontend hoy — habría que crearlo desde cero.
- Ya documentado (redundante) en `docs/decisions.md` y `docs/accounts.md`,
  sección "Idioma".

## Dos sub-problemas distintos (no confundir alcance)

### (a) Selector de idioma/región para las consultas a Steam (y a futuro GOG)

Cambiar `l=latam` fijo por un valor elegible por el usuario. Alcance acotado:
solo afecta el idioma en que se leen nombres/descripciones de logros y de la
biblioteca — **no** traduce la interfaz de GM.

**Qué requeriría:**
- Backend: `PRIMARY_LANG` deja de ser constante — se convierte en parámetro
  (`lang: String`) enhebrado por las funciones de arriba
  (`fetch_schema_with_fallback`, `fetch_player_achievements`,
  `fetch_owned_games`, y sus callers `sync_one_game`/`resolve_schema_cache`/
  `fetch_schema_and_cache` en `achievements.rs`) + las dos Tauri commands que
  ya reciben otros parámetros del frontend: `steam_sync_library` y
  `steam_sync_achievements` ganan un parámetro `lang: String` más.
  `FALLBACK_LANG` se queda fijo en `"english"` (no hace falta que sea
  configurable — es el fallback universal razonable para cualquier idioma
  elegido).
- Frontend: un store **global** (no por perfil — es una preferencia del
  usuario real, no del "look" de un tema; mismo criterio que `steamAccount`),
  con el idioma/código activo, persistido vía `patchAppConfig` (igual que
  `showSteamId`/`steamSyncOptions` en `stores/steamAccount.js`).
- UI: un selector (Ajustes → ¿Cuentas? ¿sección propia?) con los idiomas
  disponibles.

**Catálogo de idiomas de Steam — duda ya resuelta**: Steam **no** expone un
endpoint de Web API que liste sus idiomas soportados en vivo (no hay
`GetSupportedLanguages` ni equivalente). La lista es **estática** y vive en la
documentación de Steamworks Partner
(`partner.steamgames.com/doc/store/localization/languages`), con ~29 códigos:
`arabic`, `bulgarian`, `schinese`, `tchinese`, `czech`, `danish`, `dutch`,
`english`, `finnish`, `french`, `german`, `greek`, `hungarian`, `italian`,
`japanese`, `koreana`, `norwegian`, `polish`, `portuguese`, `brazilian`,
`romanian`, `russian`, `spanish` (España), `latam` (Latinoamérica), `swedish`,
`thai`, `turkish`, `ukrainian`, `vietnamese`. **No hace falta "consultar" nada
en vivo** — se puede copiar esta lista tal cual como catálogo hardcodeado
cuando se implemente el selector (con nombres a mostrar en español, ya que la
UI sigue en español mientras no se aborde (c)).

**Built-ins previstos cuando se implemente**: Español (Latinoamérica) →
`latam` (default, el actual), Español (España) → `spanish`, English →
`english`. Los 3 comparten el mismo texto de interfaz (español) por ahora —
solo cambia qué le piden a Steam.

**Idioma personalizado importable — formato decidido**: cuando se implemente
la opción de agregar un idioma del catálogo de arriba que no esté entre los
built-ins (o corregir el nombre a mostrar), el archivo a importar/exportar es
**JSON con las variables dentro del archivo** — se descartó codificar los
datos en el NOMBRE del archivo (ej. `lang_deutsch_de.txt`, parseando "lo que
sigue a `lang_`") por frágil: nombres con espacios/acentos, un renombrado
accidental o un "(1)" que agrega el SO al descargar dos veces rompe el
parseo silenciosamente. JSON con variables es robusto sin importar cómo se
llame el archivo:
```json
{ "name": "Deutsch", "code": "german" }
```
Solo 2 campos: `name` (texto a mostrar en el selector) y `code` (uno de los
códigos del catálogo de Steam de arriba). Para leer/escribir el archivo
elegido por el usuario: **reusar el patrón de `assets.rs::read_image`** (dos
comandos Tauri nuevos, `read_text_file`/`write_text_file`, mismo estilo:
`std::fs::read_to_string`/`std::fs::write`) en vez de agregar el plugin
`@tauri-apps/plugin-fs` (no instalado hoy — evita sumar una dependencia +
configuración de permisos/capabilities nueva solo para esto).

### (b) Internacionalización completa de la interfaz de GM

Esto es un problema **mucho más grande** y **no** es lo mismo que (a): traducir
de verdad todo el texto que ve el usuario (botones, labels, mensajes de error,
toasts), no solo el idioma que se le pide a Steam.

**Estado**: no existe absolutamente ningún sistema de i18n hoy — sin
diccionario de claves, sin función `t("clave")`, sin librería (`svelte-i18n` o
similar). El 100% del texto está escrito directo en español dentro de cada
componente `.svelte`/store `.js`.

**Tamaño medido** (grep sobre `src/`): ~38 de 42 componentes `.svelte` en
`src/lib/components` tienen texto de UI embebido (cadenas de 2+ palabras entre
comillas), 91 ocurrencias de ese patrón en total ahí; ~10 de 28 stores `.js` en
`src/lib/stores` generan mensajes (errores, toasts) igual de embebidos —
notablemente `stores/steamAccount.js`, que arma varios mensajes de resumen de
sync. `App.svelte` (raíz) solo, ~48 líneas con texto en español. Sin ningún
punto de extracción previo — cualquier i18n real tocaría la gran mayoría de
archivos de `src/lib/components` más varios stores.

**No se aborda en este gap más allá de dejarlo señalado** — es su propio
proyecto, ortogonal a (a). Mientras no se implemente, la interfaz sigue en
español sin importar qué idioma se elija para Steam (built-in o custom).

## Decisión mientras tanto

- No se toca código de idioma en esta sesión — `PRIMARY_LANG` se queda en
  `"latam"`.
- Cuando exista el selector de (a), arranca por defecto en "Español
  (Latinoamérica)" — mismo comportamiento actual, sin sorpresas para
  instalaciones existentes.
