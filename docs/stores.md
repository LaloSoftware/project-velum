# Fuentes de biblioteca (Steam / GOG / EA / Ubisoft Connect / Apps)

Estado: **local-first implementado** para **Steam**, **GOG**, **EA App/Origin**,
**Ubisoft Connect** y **Apps de Windows** (instalados, sin cuentas ni red). Epic, Xbox/MS
Store y el vincular-cuenta (biblioteca completa) quedan para después. Todas implementan
el trait `LibrarySource` (`src-tauri/src/library/mod.rs`):

```rust
pub trait LibrarySource {
    fn id(&self) -> &'static str;
    fn list(&self) -> Vec<Game>;
}
```

## Selección de fuentes (`active_sources()` en `library/mod.rs`)

- **`GM_FIXTURES_DIR`** (prueba): Steam/GOG/EA leen de esa carpeta → funciona en cualquier
  SO (para validar el parseo en Mac). Ubisoft no aplica (no lee ficheros, ver abajo).
- **Windows**: `SteamSource` (real) + `GogSource::windows()` + `EaSource::windows()` +
  `UbisoftSource` + `AppsSource`.
- **Otro (Mac sin fixtures)**: `MockSource` (para desarrollar la UI).

## Modelo `Game`

`{ id, title, store, kind (game|app), coverPath, widePath, heroPath, logoPath,
installDir, launchTarget, lastPlayed }` (camelCase para el frontend). Tres imágenes:
**carátula** (`coverPath`, vertical 600×900, siempre en la tarjeta), **carátula
expandida** (`widePath`, apaisada ~920×430, tarjeta enfocada en Inicio) y **hero**
(`heroPath`, fondo ancho ~1920×620, fondo de Inicio y Detalle) + `logoPath`. Pueden ser
**rutas de fichero locales** (Steam) o **URLs remotas** (GOG). El frontend las resuelve
con `imageUrl()` (`src/lib/util/asset.js`): las URLs http(s)/data se usan tal cual; las
rutas locales se piden al backend (`read_image` en `src-tauri/src/assets.rs`), que
devuelve un `data:` URI. El resultado se cachea por ruta.

El usuario puede **sobrescribir** las 3 imágenes por juego desde el detalle
(`ArtEditor.svelte` → `stores/artoverrides.js`, persistente): tienen prioridad sobre el
arte de la tienda. Si no hay ninguna, la UI cae a un degradado determinista. Un **logo**
(PNG transparente) puede subirse aparte y se muestra superpuesto sobre el hero del
Detalle, con su posición ajustable en un preset de **3×3** (esquinas/bordes/centro,
`logoPos`, persistente por juego).

### Fade-in y precarga (Fase 9l)

Las imágenes grandes (hero, sobre todo) tardan lo suyo en resolverse —
especialmente locales (Steam), que pasan por `read_image`/base64 vía IPC en
vez de cargar directo. Sin más aviso, el "pop-in" (aparecer de golpe) se nota.
Dos cambios, ninguno afecta qué imagen se muestra, solo cómo aparece:

- **Fade-in real** (`svelte/transition`'s `fade`, ~280ms): el hero de
  `Home.svelte` (`.bg`) y de `GameDetail.svelte` ya lo tenían gated por
  `{#if url}` — se agregó `transition:fade` directo. La carátula expandida
  (`.menu-art` en `GameDetail.svelte`) igual. El hero de `GameDetail.svelte`
  necesitó separar el degradado base (`.art`, siempre presente, instantáneo)
  de la foto (`.art-photo`, capa nueva superpuesta) porque `background-image`
  no anima de forma fiable con CSS — el fade va sobre la `opacity` de esa capa,
  no sobre el degradado.
- **Precarga de vecinos** (`Home.svelte`): al enfocar una tarjeta en la tira de
  Inicio, además de cargar SU hero, se llama `imageUrl()` (sin mostrarlo) para
  el hero de la tarjeta inmediatamente anterior y siguiente. `imageUrl()` ya
  cachea por ruta (con deduplicación de peticiones en vuelo), así que esto es
  gratis si el usuario no navega hacia ahí, y elimina el pop-in si sí lo hace
  — la imagen ya estaba resuelta de antes.

**Considerado y descartado**: cachear `read_image` también del lado Rust (la
frontend ya dedupe por sesión; un caché en Rust solo ayudaría entre
invalidaciones de ese caché, beneficio marginal, y suma complejidad de
invalidación si el usuario cambia su arte personalizado). Revertir al
protocolo `asset://` en vez de base64 IPC — descartado a propósito desde antes
(ver cabecera de `src-tauri/src/assets.rs`): fallaba en Windows con arte
personalizado fuera del scope. No se tocó.

### Refresco de carátulas (Fase 9, `feature-imagenes.md`)

El arte de Steam se resuelve una sola vez y de ahí en más nunca se vuelve a
mirar, aunque Steam actualice el arte detrás de la misma ruta/URL — hay DOS
cachés de por medio: el `Map` de `imageUrl()` (sin TTL, vive mientras dure el
proceso) y la caché HTTP de la WebView para las URLs deterministas del CDN
(`stores/games.js::steamCdnArt`). `bustPath()` (`util/asset.js`) invalida
ambas colando un número de versión en la ruta justo antes de resolverla —
`?gmv=<n>` para URLs `http(s):` (fuerza a la WebView a revalidar de verdad; un
`#fragmento` no lo lograría, el navegador lo ignora para cachear) y `#gmv=<n>`
para rutas de fichero locales (se recorta antes de invocar `read_image`, así
que el backend nunca ve el sufijo).

`stores/artRefresh.js` decide CUÁNDO subir ese número y lo persiste en
`config.json` (slice `artRefresh`: `{ lastCheckAt, all, byGame }`) — si no
sobreviviera al reinicio, la URL volvería a su forma sin bust y la WebView
serviría otra vez la copia vieja. `all` es un refresco global (biblioteca
completa); `byGame[id]` es puntual (un solo juego, botón "Sincronizar
carátulas y metadatos" del Detalle). El bust EFECTIVO de un juego es el más
reciente entre los dos (`stores/artoverrides.js::bustedArt()`, la variante de
`effectiveArt()` que aplica el bust a las 3 rutas de imagen).

Una revisión automática y silenciosa corre cada semana (`maybeRefreshArt()`,
llamada al arrancar y reintentada cada 6h con `startArtRefreshTimer()` para
cubrir un PC de sala que nunca se reinicia) y se salta mientras hay una
partida en curso. No descarga nada por sí misma: solo invalida el bust y
recarga la lista de juegos (`loadGames()`) — las imágenes se vuelven a pedir
de forma perezosa, solo cuando un componente visible las necesita, así que no
penaliza el arranque. Este refresco **no pisa** `artOverrides`: `bustedArt()`
parte de `effectiveArt()`, que resuelve el override manual primero — solo
cambia la ruta de la capa de abajo (tienda/CDN).

### Almacén propio de arte personalizado (Fase 2, `feature-imagenes.md`)

Antes, elegir una imagen personalizada (`ArtEditor.svelte`) guardaba en
`artOverrides` la ruta absoluta al archivo ORIGINAL, sin copiar nada — si el
usuario la borraba o movía después, el override quedaba "activo" apuntando a
la nada (`imageUrl()` fallaba en silencio, la UI caía al degradado, y no
había forma de notarlo salvo "Quitar" a mano). Ahora la app se queda con su
**propia copia** en `<app_config_dir>/art/<id escapado>/<slot>-<timestamp>.<ext>`
(`src-tauri/src/artstore.rs`, comandos `art_import`/`art_remove`/`art_prune`),
y es esa copia la que se persiste — borrar el original deja de tener efecto.
El nombre lleva el timestamp de la importación (no solo el slot), así cada
import produce una ruta NUEVA y el repintado es inmediato sin depender del
bust de la sección anterior.

**Escape del id de juego → nombre de carpeta**: los ids (`steam:570`,
`gog:1234`, o la ruta completa de un `.lnk` para `app:`) traen caracteres no
válidos en un nombre de fichero de Windows (`:`, espacios…). `safe_id()`
escapa cada byte fuera de `[A-Za-z0-9.-]` como `_XX` (hex) — **incluido `_`**,
que si pasara sin escapar colisionaría con su propio prefijo de escape (un
`replace(":", "_")` ingenuo dejaría que `a:b` y `a_b` compartan carpeta, y por
lo tanto arte). Los ids largos de `app:` se truncan con un hash corto del id
completo para no acercarse al límite de ruta de Windows. Probado con tests
unitarios en `artstore.rs` (carpeta temporal, sin `AppHandle`).

`art_import` es **idempotente**: si la ruta que se le pasa ya vive dentro de
la carpeta del propio juego, la devuelve sin tocar nada (no la borra ni la
recopia) — necesario porque `initArtOverrides()` reimporta TODOS los
overrides existentes al arrancar (ver abajo), incluidos los que ya pasaron
por este almacén en un arranque anterior.

**Barrido de adopción y saneo** (`stores/artoverrides.js::sweepArtOverrides`,
sin `await` en `initArtOverrides()`, mismo criterio que
`updates.js::maybeCheckOnStart`): por cada override existente al arrancar,
intenta `artImport()`. Si la ruta era externa (instalación previa a esta
fase), la adopta y reescribe el override con la copia nueva. Si el archivo ya
no existe (`art.source_missing`), **elimina ese override** — es exactamente
el bug que motivó esta fase. Cualquier otro error (permisos, disco lleno) NO
borra la personalización del usuario, solo queda sin adoptar por esta vez y
se reintenta en el próximo arranque. Termina con un `artPrune()` que borra
las carpetas de `art/` que ya no corresponden a ningún override vigente —
recibe las claves de `artOverrides`, **no** la lista de juegos instalados,
para que desinstalar un juego temporalmente no se lleve por delante el arte
elegido a mano.

**Fase 3 — SteamGridDB** (`docs/steamgriddb.md`): el tercer botón de cada slot en
`ArtEditor.svelte` (`🔎 SteamGridDB`) descarga la imagen elegida al mismo almacén
por el mismo camino, vía `art_import_url` (variante de `import_into` que descarga
en vez de copiar un fichero local) — el resultado es indistinguible de un import
manual, mismo nombrado/reemplazo de slot/pertenencia a la carpeta del juego.

## Cómo lee cada fuente

- **Steam** (`library/steam.rs`): base de Steam por registro
  (`HKCU\Software\Valve\Steam\SteamPath`, con fallback por defecto). Parsea
  `steamapps/libraryfolders.vdf` (bibliotecas en varios discos) + `appmanifest_*.acf`
  (appid, nombre, installdir, LastPlayed). Ignora redistribuibles/runtimes/Proton por
  appid. `launchTarget = steam://rungameid/<appid>`. Arte: primero el
  **personalizado** del usuario en `userdata/<id>/config/grid/` (`<appid>p.*` carátula,
  `<appid>.*` expandida, `<appid>_hero.*`, `<appid>_logo.png`); si no, el **oficial** en
  `<steam_base>/appcache/librarycache/` (`library_600x900.jpg`, `header.jpg`,
  `library_hero.jpg`, `logo.png`) en sus dos layouts (`<appid>/<nombre>` y
  `<appid>_<nombre>`).
  Parser VDF propio en `library/vdf.rs`.
- **GOG** (`library/gog.rs`): parsea `goggame-*.info` (JSON por juego: nombre, gameId,
  `playTasks` → ejecutable). En Windows obtiene las rutas de instalación de la BD de Galaxy
  (`…/GOG.com/Galaxy/storage/galaxy-2.0.db`, SQLite solo lectura) + la carpeta por defecto
  `C:\GOG Games`; en fixtures/Mac escanea la carpeta dada buscando `.info`.
  `launchTarget = ` ejecutable del playTask. Carátula/hero: URLs sacadas de la misma BD
  (`GamePieces` → `verticalCover`/`originalImages`) por `productId`; best-effort (remotas,
  requieren conexión; si no encajan, degradado).
- **EA App / Origin** (`library/ea.rs`): la EA App sigue escribiendo manifiestos legado
  de Origin en `%ProgramData%\Origin\LocalContent\<carpeta>\*.mfst` por compatibilidad
  hacia atrás. Formato query-string (`?id=Origin.OFR.50.0001456&dipInstallPath=...`),
  claves case-insensitive. Manifiestos de DLC (sin `dipInstallPath`) se descartan. Sin
  nombre "bonito" en el manifiesto: `title` = nombre de carpeta de `dipInstallPath`
  (mismo criterio que Apps). `launchTarget = origin2://game/launch?offerIds=<id>`.
  Deliberadamente **no** usa el archivo `IS` cifrado (AES-256, clave derivada del
  hardware) que usa la EA App moderna para su propia UI: sin documentación oficial,
  hubiera requerido sumar crates de criptografía solo para esto — el `.mfst` legado
  cubre el mismo objetivo con mucho menos riesgo.
- **Ubisoft Connect** (`library/ubisoft.rs`, solo Windows): registro
  `HKLM\SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\<gameId>`, valor `InstallDir` por
  subclave. Sin fichero que parsear ni nombre "bonito": `title` = nombre de carpeta de
  `InstallDir`. `launchTarget = uplay://launch/<gameId>/0`. **Sin verificar en un PC
  Windows real** — el nombre del valor `InstallDir` sale de documentación comunitaria,
  no oficial; si no coincide, la fuente lista cero juegos (fallo silencioso).
- **Apps de Windows** (`library/apps.rs`, solo Windows): accesos `.lnk` del Menú Inicio
  (`%ProgramData%`/`%APPDATA%\…\Start Menu\Programs`). `title` = nombre del acceso;
  `launchTarget` = el `.lnk` (lo resuelve el SO al lanzar). Filtra desinstaladores/ayudas.

Lo específico de Windows (registro, BD SQLite, `.lnk`) vive tras `#[cfg(windows)]`; los
parsers de fichero (VDF, `.info`, `.mfst`) son multiplataforma y **testeables** (ver
Fixtures). La construcción de `Game` de Ubisoft también es una función pura testeable
(`ubisoft::game_from_install`) aunque el descubrimiento por registro no lo sea.

## Lanzar

`launch.rs::launch_game` abre el `launchTarget` (URI `steam://…`/`origin2://…`/`uplay://…`,
ejecutable o `.lnk`) con el SO (`start`/`open`/`xdg-open`) — sin lógica específica de
tienda, cualquier protocolo nuevo funciona igual mientras el launcher correspondiente lo
tenga registrado. La **suspensión del launcher durante el juego** (F3) sigue pendiente.

## Fixtures y tests

- `src-tauri/fixtures/steam/steamapps/*.acf` + `libraryfolders.vdf`,
  `src-tauri/fixtures/gog/<juego>/goggame-*.info` y
  `src-tauri/fixtures/ea/<juego>/*.mfst` de ejemplo (incluye una fixture de DLC sin
  `dipInstallPath` para probar que se descarta).
- Tests: `cargo test` valida los parsers (VDF/ACF, `.info`, `.mfst`) y, para Ubisoft, la
  función pura `game_from_install` (sin registro real).
- `npm run go:fixtures` arranca la app nativa con `GM_FIXTURES_DIR` apuntando a las
  fixtures → se ven los juegos de ejemplo parseados (útil en Mac). Ubisoft no aparece
  ahí (solo registro real de Windows) — su descubrimiento y el lanzamiento real de
  `origin2://`/`uplay://` quedan pendientes de verificar en un PC Windows con EA
  App/Ubisoft Connect instalados.

## Añadir una fuente nueva

Crear `library/<tienda>.rs` con un `struct` que implemente `LibrarySource`, y registrarlo
en `active_sources()` (bajo `#[cfg(windows)]` si es específico de Windows). `launchTarget`
debe ser algo que sepa abrir `launch.rs`.

## Cuenta de Steam vinculada

Además del listado local de esta página, `docs/accounts.md` documenta la Fase 9:
vincular la cuenta de Steam de una persona para traer su biblioteca **completa**
(instalados y no instalados) + logros/horas jugadas. El cruce instalado/no-instalado
usa el mismo `Game.id` (`steam:{appid}`) que produce `SteamSource` arriba.

En la vista Juegos, "Filtros y orden" tiene una sección **"Instalación"**
(`stores/library.js::installFilter`, persistente: Todos/Instalados/No
instalados) para aislar los "fantasmas" sin tener que buscarlos a simple
vista entre el resto de la biblioteca.

## Pendiente

- **Epic** (`.item` en `…/Epic/EpicGamesLauncher/Data/Manifests`), **vincular-cuenta**
  de GOG (ver `docs/accounts.md`, Steam ya implementado), iconos de apps, `lastPlayed`
  de GOG/EA/Ubisoft.
- Arte de GOG **offline** (hoy sus carátulas son URLs remotas de Galaxy) y arte de
  Apps/EA/Ubisoft (ninguna de las tres trae carátula/hero propios todavía).
- **Xbox / MS Store (Game Pass PC)**: diferido — los juegos son paquetes Appx/MSIX en
  una carpeta protegida (`WindowsApps`) o en
  `<unidad>\XboxGames\<juego>\Content\appxmanifest.xml` según dónde el usuario los
  instale. No se encontró documentación pública confiable del formato exacto ni forma
  de verificarlo sin un PC Windows con Game Pass instalado — investigar y planear al
  retomar esta fuente.
- **Ubisoft Connect**: confirmar en un PC Windows real que el valor de registro se
  llama `InstallDir` (viene de documentación comunitaria, no oficial); probar el
  lanzamiento real de `uplay://launch/<id>/0`.
