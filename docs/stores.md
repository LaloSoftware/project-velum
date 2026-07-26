# Fuentes de tiendas (Steam / GOG / Epic)

Estado: **hoy solo hay `MockSource`**. Las fuentes reales son fase F2 y se prueban en
Windows. Todas implementan el trait `LibrarySource` (`src-tauri/src/library/mod.rs`):

```rust
pub trait LibrarySource {
    fn id(&self) -> &'static str;
    fn list(&self) -> Vec<Game>;
}
```

## Modelo `Game`

`{ id, title, store, kind (game|app), coverPath, installDir, launchTarget, lastPlayed }`
(se serializa en camelCase para el frontend).

## Añadir una fuente real (guía)

1. Crear `src-tauri/src/library/steam.rs` con `struct SteamSource` que implemente
   `LibrarySource`.
2. Registrarla en `active_sources()` (idealmente sólo en Windows con `cfg!(windows)`).
3. `launch_target` debe ser lo que sepa lanzar `launch.rs` (URI o ejecutable).

## Dónde/cómo leer cada tienda (referencia para F2)

- **Steam**: `steamapps/libraryfolders.vdf` (rutas de bibliotecas) +
  `steamapps/appmanifest_*.acf` (juegos instalados: appid, nombre, installdir).
  Lanzar: `steam://rungameid/<appid>`. Crates: `keyvalues-parser` / `steamy-vdf`.
- **GOG Galaxy**: SQLite `C:\ProgramData\GOG.com\Galaxy\storage\galaxy-2.0.db`
  (o escaneo de carpetas de instalación como fallback). Lanzar: ejecutable del juego.
  Crate: `rusqlite` (vía `tauri-plugin-sql`).
- **Epic**: manifests JSON `.item` en
  `C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests`.
  Lanzar: `com.epicgames.launcher://apps/<AppName>?action=launch`.

Todas las rutas/detalles específicos de Windows deben vivir **solo** dentro de cada
`*Source`, para no acoplar el resto del código al SO.

## Recientes / `lastPlayed`

La vista Inicio ordena por `lastPlayed`. Las fuentes reales pueden rellenarlo desde los
metadatos de cada tienda; además, al lanzar un juego se puede registrar el timestamp.
