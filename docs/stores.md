# Fuentes de biblioteca (Steam / GOG / Apps)

Estado: **local-first implementado** para **Steam**, **GOG** y **Apps de Windows**
(instalados, sin cuentas ni red). Epic y el vincular-cuenta (biblioteca completa) quedan
para después. Todas implementan el trait `LibrarySource` (`src-tauri/src/library/mod.rs`):

```rust
pub trait LibrarySource {
    fn id(&self) -> &'static str;
    fn list(&self) -> Vec<Game>;
}
```

## Selección de fuentes (`active_sources()` en `library/mod.rs`)

- **`GM_FIXTURES_DIR`** (prueba): Steam/GOG leen de esa carpeta → funciona en cualquier SO
  (para validar el parseo en Mac).
- **Windows**: `SteamSource` (real) + `GogSource::windows()` + `AppsSource`.
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
- **Apps de Windows** (`library/apps.rs`, solo Windows): accesos `.lnk` del Menú Inicio
  (`%ProgramData%`/`%APPDATA%\…\Start Menu\Programs`). `title` = nombre del acceso;
  `launchTarget` = el `.lnk` (lo resuelve el SO al lanzar). Filtra desinstaladores/ayudas.

Lo específico de Windows (registro, BD SQLite, `.lnk`) vive tras `#[cfg(windows)]`; los
parsers (VDF, `.info`) son multiplataforma y **testeables** (ver Fixtures).

## Lanzar

`launch.rs::launch_game` abre el `launchTarget` (URI `steam://…`, ejecutable o `.lnk`) con
el SO (`start`/`open`/`xdg-open`). La **suspensión del launcher durante el juego** (F3)
sigue pendiente.

## Fixtures y tests

- `src-tauri/fixtures/steam/steamapps/*.acf` + `libraryfolders.vdf` y
  `src-tauri/fixtures/gog/<juego>/goggame-*.info` de ejemplo.
- Tests: `cargo test` valida los parsers (VDF/ACF y `.info`).
- `npm run go:fixtures` arranca la app nativa con `GM_FIXTURES_DIR` apuntando a las
  fixtures → se ven los juegos de ejemplo parseados (útil en Mac).

## Añadir una fuente nueva

Crear `library/<tienda>.rs` con un `struct` que implemente `LibrarySource`, y registrarlo
en `active_sources()` (bajo `#[cfg(windows)]` si es específico de Windows). `launchTarget`
debe ser algo que sepa abrir `launch.rs`.

## Pendiente

- **Epic** (`.item` en `…/Epic/EpicGamesLauncher/Data/Manifests`), **vincular-cuenta**
  (Steam Web API para biblioteca completa), iconos de apps, `lastPlayed` de GOG.
- Arte de GOG **offline** (hoy sus carátulas son URLs remotas de Galaxy) y arte de Apps.
