//! Caché local SQLite de la biblioteca/logros de Steam (Fases 9b/9c). Vive en
//! `<app_config_dir>/steam_cache.sqlite`, junto a `config.json`
//! (`config.rs::config_path` resuelve el mismo directorio). Solo lectura del
//! lado de la Web API — nunca se escribe nada de vuelta a Steam.
//!
//! Esquema deliberadamente normalizado: `achievement_schema` guarda los datos
//! ESTÁTICOS de cada logro posible de un juego (nombre/descripción/ícono, casi
//! nunca cambian, se leen una sola vez vía GetSchemaForGame), separado de
//! `achievements` que guarda solo el estado DINÁMICO por jugador (desbloqueado
//! sí/no + fecha). Evita repetir texto y permite saltarse GetSchemaForGame en
//! sincronizaciones futuras del mismo juego (ver `schema_cache`).

use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn cache_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("no se pudo resolver app_config_dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("steam_cache.sqlite"))
}

pub fn open(app: &AppHandle) -> Result<Connection, String> {
    let path = cache_path(app)?;
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    create_schema(&conn)?;

    // Migración de instalaciones previas: `CREATE TABLE IF NOT EXISTS` no
    // agrega columnas a una tabla que ya existía con un esquema más viejo (los
    // campos de arriba son nuevos desde la Fase 9l). `ensure_column` es
    // idempotente — no hace nada si la columna ya está.
    ensure_column(&conn, "games", "rtime_last_played", "rtime_last_played INTEGER")?;
    ensure_column(&conn, "games", "playtime_2weeks", "playtime_2weeks INTEGER NOT NULL DEFAULT 0")?;
    ensure_column(
        &conn,
        "games",
        "has_community_visible_stats",
        "has_community_visible_stats INTEGER",
    )?;
    ensure_column(&conn, "achievement_schema", "icon_gray_url", "icon_gray_url TEXT")?;
    ensure_column(
        &conn,
        "achievement_schema",
        "hidden",
        "hidden INTEGER NOT NULL DEFAULT 0",
    )?;
    // Idioma del texto cacheado (fase de internacionalización). Las filas que
    // ya existían se escribieron cuando el idioma era la constante fija
    // "latam", así que el DEFAULT es exactamente la verdad de facto. SQLite
    // acepta NOT NULL en ADD COLUMN mientras haya DEFAULT no nulo, y rellena
    // sin reescribir la tabla — importante acá porque recrearla reasignaría
    // los rowid, que son lo que ordena los logros bloqueados en el Detalle
    // (ver el ORDER BY de steam_achievements en achievements.rs).
    ensure_column(
        &conn,
        "achievement_schema",
        "lang",
        "lang TEXT NOT NULL DEFAULT 'latam'",
    )?;
    ensure_column(&conn, "schema_cache", "lang", "lang TEXT NOT NULL DEFAULT 'latam'")?;

    Ok(conn)
}

/// Crea las tablas si no existen — separado de `open()` para poder montar el
/// mismo esquema en una conexión `:memory:` desde los tests (sin depender de
/// `AppHandle`/`app_config_dir`, que no existen fuera de un runtime Tauri).
pub(crate) fn create_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS games (
            steamid TEXT NOT NULL,
            appid INTEGER NOT NULL,
            name TEXT NOT NULL,
            playtime_forever INTEGER NOT NULL DEFAULT 0,
            icon_url TEXT,
            last_synced_at INTEGER NOT NULL,
            rtime_last_played INTEGER,
            playtime_2weeks INTEGER NOT NULL DEFAULT 0,
            has_community_visible_stats INTEGER,
            PRIMARY KEY (steamid, appid)
        );
        CREATE TABLE IF NOT EXISTS achievement_schema (
            appid INTEGER NOT NULL,
            apiname TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            icon_url TEXT,
            icon_gray_url TEXT,
            hidden INTEGER NOT NULL DEFAULT 0,
            -- Idioma en que está el texto guardado acá. NO forma parte de la
            -- PK a propósito: hay UNA fila por logro, con el texto del último
            -- idioma pedido. Meterlo en la PK obligaría a recrear la tabla
            -- (SQLite no permite alterarla) y eso reasignaría los rowid, de
            -- los que depende el orden de los logros bloqueados.
            lang TEXT NOT NULL DEFAULT 'latam',
            PRIMARY KEY (appid, apiname)
        );
        CREATE TABLE IF NOT EXISTS achievements (
            steamid TEXT NOT NULL,
            appid INTEGER NOT NULL,
            apiname TEXT NOT NULL,
            achieved INTEGER NOT NULL,
            unlock_time INTEGER,
            PRIMARY KEY (steamid, appid, apiname)
        );
        CREATE TABLE IF NOT EXISTS schema_cache (
            appid INTEGER PRIMARY KEY,
            fetched_at INTEGER NOT NULL,
            has_achievements INTEGER NOT NULL,
            -- Idioma con el que se llenó achievement_schema para este appid;
            -- lo consulta sync_one_game para decidir si hay que releer el
            -- esquema por cambio de idioma (ver schema_text_is_stale).
            lang TEXT NOT NULL DEFAULT 'latam'
        );
        -- % global de jugadores que tienen cada logro (GetGlobalAchievementPercentagesForGame).
        -- Público, por-appid (no por-cuenta). A diferencia de achievement_schema,
        -- SÍ se refresca (fetched_at) porque el usuario puede configurar cada
        -- cuánto revisarlo (diario/semanal/mensual, ver steam_sync_options en el
        -- frontend) en vez de cachearlo para siempre.
        CREATE TABLE IF NOT EXISTS achievement_global_pct (
            appid INTEGER NOT NULL,
            apiname TEXT NOT NULL,
            percent REAL NOT NULL,
            fetched_at INTEGER NOT NULL,
            PRIMARY KEY (appid, apiname)
        );
        ",
    )
    .map_err(|e| e.to_string())
}

/// Agrega una columna a una tabla ya existente si todavía no la tiene.
/// SQLite no soporta `ADD COLUMN IF NOT EXISTS`, así que se consulta
/// `PRAGMA table_info` primero. `column_ddl` es la definición completa
/// (`"nombre TIPO ..."`), no solo el nombre.
fn ensure_column(conn: &Connection, table: &str, column: &str, column_ddl: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|e| e.to_string())?;
    let exists = stmt
        .query_map([], |r| r.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .any(|name| name == column);
    if !exists {
        conn.execute(&format!("ALTER TABLE {table} ADD COLUMN {column_ddl}"), [])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Borra todo lo de una cuenta (al desvincular) — no toca `achievement_schema`
/// ni `schema_cache`, que son por-juego, no por-cuenta, y sirven para cualquier
/// otra cuenta que se vincule después.
pub fn clear_account(app: &AppHandle, steamid: &str) -> Result<(), String> {
    let conn = open(app)?;
    conn.execute("DELETE FROM games WHERE steamid = ?1", [steamid])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM achievements WHERE steamid = ?1", [steamid])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
