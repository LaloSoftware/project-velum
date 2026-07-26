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
- La **integración real** (Steam/GOG/Epic, Wi-Fi/BT/audio, suspensión en juego) es
  específica de Windows: se implementa detrás de los mismos traits y se compila/prueba en
  el **PC Windows** (`npm run tauri build` en Windows, o cross-compilation).
- Mantén las rutas/APIs de Windows **solo** dentro de sus implementaciones (`*Source`,
  `WindowsSystemControls`) para no bloquear el desarrollo en Mac.

## Estructura

Ver `CLAUDE.md` (mapa del proyecto) y `docs/architecture.md`.

## Estrategia de ramas git

Repo **local** (sin remoto por ahora). Cuatro niveles, de más volátil a más estable:

- **`testing/<nombre>`** — rama de la **sesión de pruebas**, creada a partir de los últimos
  cambios (de su `feature/<nombre>`, o de `dev` si es algo nuevo). Aquí van commits WIP de
  **cualquier cosa que haya que probar**, sin miedo a ensuciar.
- **`feature/<nombre>`** — código **limpio/definitivo** de la funcionalidad. Recibe el
  merge de `testing/<nombre>` cuando la prueba y los ajustes están listos.
- **`dev`** — integración. Recibe `feature/<nombre>` cuando la funcionalidad está
  **terminada**.
- **`release`** — solo versiones estables (con tag). Se pasa de `dev` a `release`
  **solo cuando el responsable lo indica** explícitamente.

Flujo:
`testing/<n>` → (probar y ajustar) → `feature/<n>` → (feature terminada) → `dev` →
(bajo indicación) → `release` + tag.

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

# 5) Publicar versión estable (SOLO cuando se indique)
git switch release && git merge --no-ff dev && git tag v0.1.0
```

> Regla: los commits de prueba viven en `testing/*`; a `feature/*` solo llega el código
> final ya validado; a `dev` solo features terminadas; a `release` solo bajo indicación.

## Notas

- El frontend compila con avisos de a11y silenciados a propósito en las capas cuya
  interacción real es por nuestro sistema de foco (no por semántica de ratón).
- `src-tauri/target/` y `node_modules/` están en `.gitignore`.
