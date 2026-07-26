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

Repo **local** (sin remoto por ahora).

- **`release`** — solo versiones estables. No se desarrolla aquí; recibe merges de `dev`
  y se etiqueta (`v0.1.0`, …).
- **`dev`** — integración del desarrollo en curso. El MVP vive aquí.
- **`feature/<descripcion>`** — cada cambio importante sale de `dev` y vuelve a `dev`.
  Ej.: `feature/rework-pagina-inicio`, `feature/steam-source`, `feature/qam-real`.

Flujo: `feature/*` → merge a `dev` → cuando estable, `dev` → merge a `release` + tag.

```bash
# nueva feature
git switch dev
git switch -c feature/mi-cambio
# ... trabajo, commits ...
git switch dev && git merge --no-ff feature/mi-cambio

# publicar versión estable
git switch release && git merge --no-ff dev && git tag v0.1.0
```

## Notas

- El frontend compila con avisos de a11y silenciados a propósito en las capas cuya
  interacción real es por nuestro sistema de foco (no por semántica de ratón).
- `src-tauri/target/` y `node_modules/` están en `.gitignore`.
