# Desarrollo

## Requisitos

- **Node.js** (18+; probado con 22).
- **Rust** (rustup, toolchain stable). Instala con `https://rustup.rs`.
- En Windows, además: **WebView2** (viene con Windows 10/11 recientes) y las
  herramientas de compilación de MSVC.

## Comandos

```bash
npm install            # dependencias del frontend + Tauri CLI
npm run dev            # solo UI en el navegador (datos mock JS)  -> localhost:1420
npm run tauri dev      # app nativa completa (Vite + Rust)
npm run tauri build    # binario de release
npm run tauri icon <src.png>   # regenerar iconos desde una imagen
```

## Flujo dev-en-Mac / deploy-Windows

- La **UI y el theming** se desarrollan y prueban en macOS con mocks
  (`MockSource`, `MockSystemControls`). Un mando real (Xbox/DualSense) funciona en el Mac
  vía `gilrs`.
- **Mandos en la PC de la sala (Windows): usar cable, no Bluetooth genérico.** Xbox real,
  fightsticks en modo PC y DualSense por cable funcionan bien (ver `docs/input.md`); por
  Bluetooth genérico de Windows (no el dongle Xbox Wireless) hoy **no** funcionan —
  limitación conocida de la plataforma, detalle en `docs/input.md` y
  `feature-fix-control-input.md`.
- La **integración real** (Steam/GOG/Epic, Wi-Fi/BT/audio, suspensión en juego) es
  específica de Windows: se implementa detrás de los mismos traits y se compila/prueba en
  el **PC Windows** (`npm run tauri build` en Windows, o cross-compilation).
- Mantén las rutas/APIs de Windows **solo** dentro de sus implementaciones (`*Source`,
  `WindowsSystemControls`) para no bloquear el desarrollo en Mac.

## Estructura

Ver `CLAUDE.md` (mapa del proyecto) y `docs/architecture.md`.

## Estrategia de ramas git

`origin` apunta a `https://github.com/LaloSoftware/project-velum.git`. Cinco niveles, de más
volátil a más estable — **`dev` nunca se pushea**, solo `develop` y `release` viven en GitHub:

- **`testing/<nombre>`** — rama de la **sesión de pruebas**, creada a partir de los últimos
  cambios (de su `feature/<nombre>`, o de `dev` si es algo nuevo). Aquí van commits WIP de
  **cualquier cosa que haya que probar**, sin miedo a ensuciar.
- **`feature/<nombre>`** — código **limpio/definitivo** de la funcionalidad. Recibe el
  merge de `testing/<nombre>` cuando la prueba y los ajustes están listos.
- **`dev`** — integración completa, **privada** (nunca se pushea a `origin`). Recibe
  `feature/<nombre>` cuando la funcionalidad está **terminada**. Incluye toda la doc interna
  (`docs/decisions.md`, `docs/roadmap.md`, `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`,
  `design_icons.md`).
- **`develop`** — espejo **público** de `dev`, sin esos 6 archivos internos. Es lo que se
  publica en GitHub para trabajo/colaboración. Se sincroniza con un merge real + `git rm`
  de los excluidos (no se reescribe historial, es seguro aunque ya esté publicada):
  ```bash
  git switch develop
  git merge --no-ff dev -m "merge: dev -> develop"
  # si algún path excluido reaparece por cambios en dev:
  git rm docs/decisions.md docs/roadmap.md CLAUDE.md PRODUCT.md DESIGN.md design_icons.md
  git commit -m "chore: quita docs/config internos para la rama pública develop"
  git push origin develop
  ```
- **`release`** — solo versiones estables (con tag), fusiona **`develop`** (nunca `dev`
  directo) **solo cuando el responsable lo indica** explícitamente. Push a `origin` de
  `release` y del tag siempre con permiso explícito previo.

Flujo:
`testing/<n>` → (probar y ajustar) → `feature/<n>` → (feature terminada) → `dev` (privada) →
`develop` (pública, filtrada) → (bajo indicación) → `release` + tag.

```bash
# 1) Empezar una funcionalidad
git switch dev
git switch -c feature/mi-cambio          # rama limpia de la feature
git switch -c testing/mi-cambio          # rama de pruebas (parte de la feature)

# 2) Iterar/probar: commits WIP libres en testing
git add -A && git commit -m "wip: probando X"
#   ... (probar en Mac/Windows, ajustar, más commits WIP) ...

# 3) Prueba OK -> pasar el código final, limpio, a la feature
git switch feature/mi-cambio
git merge --squash testing/mi-cambio     # junta los WIP en un cambio limpio
git commit -m "feat: mi-cambio"
git branch -D testing/mi-cambio          # opcional: cerrar la rama de pruebas

# 4) Feature terminada -> integrar en dev
git switch dev && git merge --no-ff feature/mi-cambio

# 5) Publicar en develop (ver recipe arriba)
git switch develop && git merge --no-ff dev -m "merge: dev -> develop"

# 6) Publicar versión estable (SOLO cuando se indique, con permiso para el push)
git switch release && git merge --no-ff develop -m "merge: develop -> release"
git tag -a v0.1.0 -m "<notas del release>"
```

> Regla: los commits de prueba viven en `testing/*`; a `feature/*` solo llega el código
> final ya validado; a `dev` solo features terminadas; a `develop` solo lo público (sin los 6
> archivos internos); a `release` solo bajo indicación explícita, con permiso para el push.

## Publicar una versión

La app se actualiza sola desde **Configuración → Actualizaciones** (backend en
`src-tauri/src/update.rs`, UI en `src/lib/components/UpdatesSection.svelte`). Publicar
una versión = pushear un tag `v*` a `release`; de ahí en más lo hace
`.github/workflows/release.yml`.

### Preparación (una sola vez)

1. Generar el par de claves del updater, en el Mac:
   ```bash
   npx tauri signer generate -w ~/.tauri/velum.key
   ```
   **Ponle passphrase.** Genera `velum.key` (privada) y `velum.key.pub` (pública).
2. **Guardar la privada** en el gestor de contraseñas y en una copia offline. Si se
   pierde, ninguna instalación existente podrá volver a actualizarse nunca: habría que
   repartir el instalador a mano. Es el riesgo número uno de todo esto.
3. Pegar el contenido de `velum.key.pub` en `src-tauri/tauri.conf.json` →
   `plugins.updater.pubkey` (va commiteada: es pública por definición). Mientras esté
   vacío, la app responde `errors.update.builder_failed` al buscar.
4. En GitHub → *Settings → Secrets and variables → Actions*, crear:
   - `TAURI_SIGNING_PRIVATE_KEY` — el contenido íntegro de `~/.tauri/velum.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — su passphrase
5. Tras el primer workflow verde (que ya habrá creado el release `channels`), sembrar el
   canal estable para que responda "estás al día" en vez de fallar:
   ```bash
   echo '{"version":"0.0.0","notes":"","pub_date":"2026-01-01T00:00:00Z","platforms":{}}' > latest.json
   gh release upload channels latest.json --clobber
   ```

### Cada versión

```bash
npm run version:set -- 0.2.0-beta.1   # package.json + Cargo.toml + lock
npm run i18n:check                    # si tocaste texto
git add -A && git commit -m "chore: version 0.2.0-beta.1"
# dev -> develop -> release (ver "Estrategia de ramas"), y con permiso explícito:
git tag -a v0.2.0-beta.1 -m "<notas>" && git push origin release --tags
```

El tag decide el canal: **con guion** (`v0.2.0-beta.1`) sale como prerelease y su
manifiesto se publica como `channels/beta.json`; **sin guion** (`v0.2.0`) sale como
release estable y va a `channels/latest.json`.

Notas sueltas:

- La versión sale solo de `package.json`: `tauri.conf.json` la lee de ahí
  (`"version": "../package.json"`).
- Nada de build metadata semver (`0.2.0+abc`): el bundler lo rechaza. `version:set` ya
  aborta si lo intentas.
- Las "Novedades" que muestra la app son las notas del release **en el momento del
  build**; editarlas después no cambia el manifiesto ya publicado.
- El release con tag `channels` es solo un puntero de manifiestos. No se descarga la app
  desde ahí.

## Notas

- El frontend compila con avisos de a11y silenciados a propósito en las capas cuya
  interacción real es por nuestro sistema de foco (no por semántica de ratón).
- `src-tauri/target/` y `node_modules/` están en `.gitignore`.
- `src/main.js` filtra "ResizeObserver loop completed with undelivered
  notifications" del reporte de errores en pantalla (`ErrorBanner.svelte`) —
  es una advertencia benigna y conocida del motor del WebView (típicamente
  tras una ráfaga de resize, como entrar/salir de pantalla completa), GM no
  usa `ResizeObserver` en ningún lado. Sigue logueada como `console.warn`,
  solo no interrumpe con el banner.
