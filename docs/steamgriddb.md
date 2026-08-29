# SteamGridDB (Fase 3, `feature-imagenes.md`)

Integración con [SteamGridDB](https://www.steamgriddb.com/) para elegir carátulas,
carátulas expandidas, heroes y logos a mano desde el Detalle de un juego — un tercer
botón junto a *Elegir*/*Quitar* en cada slot de `ArtEditor.svelte`. Hermano de
`docs/steam-metadata.md`: ese documento es el detalle campo-por-campo de la Steam
Web API, este es el de la API de SteamGridDB.

## La API

Base `https://www.steamgriddb.com/api/v2`, auth `Authorization: Bearer <token>`. La
documentación web (`/api/v2`) está detrás de Cloudflare y no se puede leer con un
fetch normal; el spec real es público en
`https://www.steamgriddb.com/static/openapi.yml` (v2.10.0 al momento de escribir
esto) — es la fuente de verdad de todo lo de abajo, conviene releerlo si algo no
encaja al tocar este código.

Endpoints usados (`src-tauri/src/griddb/mod.rs`):

- `GET /games/id/{gameId}` — **no se usa** (no hace falta: esta app siempre entra
  por plataforma o por búsqueda, nunca tiene ya un id de SteamGridDB de entrada).
- `GET /games/{platform}/{platformId}` — resolver por id externo (`griddb_game_by_platform`).
- `GET /search/autocomplete/{term}` — búsqueda por nombre (`griddb_search`), la
  salida para plataformas sin mapeo.
- `GET /{grids|heroes|logos}/game/{gameId}` — imágenes de un juego ya resuelto
  (`griddb_images`, un comando para los 3 endpoints con `kind` como parámetro).

### Filtros por endpoint

| Filtro | grids | heroes | logos |
|---|---|---|---|
| `styles` | `alternate` `blurred` `white_logo` `material` `no_logo` | `alternate` `blurred` `material` | `official` `white` `black` `custom` |
| `dimensions` | `460x215` `920x430` `600x900` `342x482` `660x930` `512x512` `1024x1024` | `1920x620` `3840x1240` `1600x650` | **no acepta** |
| `mimes` | `image/png` `image/jpeg` `image/webp` | igual que grids | `image/png` `image/webp` |
| `types` | `static` `animated` (default `static`) | igual | igual |
| `nsfw` / `humor` / `epilepsy` | `false` (default) · `true` · `any` | igual | igual |
| `limit` / `page` | default `50` (>50 se ignora) / default `0` | igual | igual |

`griddb::validate_filters` valida `kind` y cada valor contra estas tablas **antes**
de salir a la red — un filtro inválido da un error claro (`griddb.invalid_style|…`,
`griddb.dimensions_not_supported`, etc.) en vez de un 400 opaco de SteamGridDB.

Los multivalor van como CSV en la query (`styles=material,blurred`).

### El campo `style` de una imagen: ambigüedad conocida

El spec oficial documenta `Grid.style` como un **string simple**, pero al menos un
wrapper cliente de referencia lo observa como **array** en la práctica.
`griddb::de_string_or_vec` acepta cualquiera de las dos formas y normaliza a
`Vec<String>` — más robusto que confiar ciegamente en un formato sin poder probarlo
contra la API real. Ver el test `image_style_accepts_string_or_array`.

## Dónde vive la key

Una key **global** por instalación (no por-cuenta, a diferencia de Steam — no hay
concepto de "sesión" en la API de SteamGridDB, solo un token de servicio). Vive en
el keyring del SO (`gm-launcher-griddb`, `griddb::stored_key`), nunca en
`config.json`, mismo criterio que la key de Steam (ver `docs/accounts.md`). Se
valida con una llamada barata (`/search/autocomplete/a`) antes de guardarla —
mismo motivo: "guardar sin validar" dejaría creer que quedó vinculada aunque esté
mal, y el primer síntoma real aparecería recién en la primera búsqueda.

Configuración → Cuentas → bloque "SteamGridDB" (`AccountsSection.svelte`): campo
enmascarado + botón de guardar/validar + botón de quitar + enlace a
`steamgriddb.com/profile/preferences` para generar una.

## Mapeo tienda → plataforma

`stores/griddb.js::platformIdFor`:

| `game.store` | Plataforma SGDB | Id a usar |
|---|---|---|
| `steam` | `steam` | appid de `steam:{appid}` — **verificado** |
| `gog`, `ea`, `ubisoft`, apps, resto | — | sin mapeo, cae a búsqueda por nombre |

**GOG no tiene id externo en SteamGridDB en absoluto** (no está en el enum
`Platforms` del spec: `steam, origin, egs, bnet, uplay, flashpoint, eshop`) — no es
un descuido de esta app, la API no lo soporta.

**EA (`origin`) y Ubisoft (`uplay`) quedaron sin mapear a propósito**: la API sí
soporta esas plataformas, pero no hay forma de confirmar el id exacto que espera
SteamGridDB (offer id del `.mfst` para EA, `gameId` del registro para Ubisoft) sin
una instalación real de esos launchers para contrastar. Mandar un id adivinado
sería peor que no mandarlo — podría emparejar con el juego equivocado. Si se
verifica en el futuro, el cambio es agregar el caso a `platformIdFor` — el resto
del flujo (resolución → caché → imágenes) ya lo soporta sin tocar nada más.

Sin mapeo (o si `griddb_game_by_platform` da 404), el modal cae a
`griddb_search(game.title)` y deja elegir a la persona de una lista de resultados.
La elección se cachea en el slice `griddb.resolvedGameId` de `config.json` por
`game.id`, para no volver a preguntar la próxima vez que abra el modal de ese
mismo juego.

## Filtros en la UI: globales vs. por-slot

`GridDbPickerModal.svelte` tiene dos grupos de filtros con alcance distinto a
propósito:

- **Categorías (adultos/humor/epilepsia/animadas)** — preferencia GLOBAL,
  compartida por los 4 slots (`stores/griddb.js::globalFilters`, slice
  `griddb.globalFilters`). Si alguien no quiere ver contenido adulto, no lo quiere
  en carátulas *ni* en heroes *ni* en logos — repetir el ajuste en cada slot sería
  puro trabajo manual. Son interruptores de **mostrar/ocultar** (`false`/`any`), no
  los 3 estados que permite la API — `true` ("SOLO esa categoría") no se expone: no
  es una intención real de nadie configurando una consola de sala.
- **Estilo / resolución / formato** — dependen del endpoint, se persisten POR SLOT
  (`slotFilters`, slice `griddb.slotFilters`). La resolución nativa de cada slot
  arranca premarcada (`GRIDDB_SLOTS[slot].native`); `logo` no tiene control de
  resolución en absoluto (la API no acepta `dimensions` ahí).

## Import: mismo almacén que la Fase 2

Elegir una imagen del modal (`stores/griddb.js::importGriddbImage`) llama
`art_import_url` (`artstore.rs`) — descarga y copia por el MISMO camino de
validación/nombrado/reemplazo de slot que `art_import` (elegir un archivo a mano),
así el resultado es indistinguible de un import manual: termina como un archivo más
en `<app_config_dir>/art/<id escapado>/`, con override normal en `artOverrides`. Ver
`docs/stores.md` para el detalle del almacén.

`art_import_url` es el único comando de `artstore.rs` que sale a la red — por eso
es **no-async** a propósito (como todo `griddb/`): un `async fn` con una llamada
bloqueante de `ureq` adentro estancaría el runtime de Tauri por toda la duración de
la descarga.

## Caché y cortesía con una API gratuita

- Resultados de imágenes: caché en memoria por `(kind, gameId, filtros, page)`
  durante la sesión (`stores/griddb.js::fetchGriddbImages`), sin invalidación por
  tiempo — cambiar un filtro ya apunta a otra clave.
- Cambiar un filtro **debounce** de ~220ms antes de disparar el fetch
  (`GridDbPickerModal.svelte`) — encadenar varios toggles rápido no dispara una
  petición por click.
- Resolución juego → SteamGridDB: cacheada indefinidamente en `config.json` (no
  hay motivo para volver a resolverlo, un juego no cambia de appid).

## Pendiente

- Iconos (`/icons/...`) — la API los tiene, esta app solo pidió grids/heroes/logos.
- EA/Ubisoft sin verificar (ver arriba).
- Ocultar el botón "SteamGridDB" cuando no hay key guardada — hoy es visible
  siempre, por decisión explícita: más descubrible que escondido.
