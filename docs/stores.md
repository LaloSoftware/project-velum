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
arte de la tienda. Si no hay ninguna, la UI cae a un degradado determinista.

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
