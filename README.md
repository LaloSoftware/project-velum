<p align="center">
  <img src="src/assets/velum-icon.svg" width="120" height="120" alt="Logo de VELUM" />
</p>

<h1 align="center">VELUM</h1>

<p align="center">
  Launcher de sala tipo consola para PC — 100% manejable con mando, aspecto totalmente
  repintable por CSS/perfiles.
</p>

<p align="center">
  <img alt="Plataforma" src="https://img.shields.io/badge/plataforma-Windows-0078D6" />
  <img alt="Hecho con Tauri" src="https://img.shields.io/badge/hecho%20con-Tauri%20v2-24C8DB" />
  <img alt="Hecho con Svelte" src="https://img.shields.io/badge/hecho%20con-Svelte%205-FF3E00" />
  <img alt="Estado" src="https://img.shields.io/badge/estado-Beta-yellow" />
</p>

<!--
  Cuando el repo tenga URL pública, sumar acá badges que dependen de ella, p. ej.:
  - Última versión: https://img.shields.io/github/v/release/<owner>/<repo>
  - Descargas: https://img.shields.io/github/downloads/<owner>/<repo>/total
-->

## Overview

VELUM convierte una PC (pensado para Windows) en una experiencia tipo consola para la
sala/salón: arranca a pantalla completa, muestra la biblioteca de juegos instalados y
se maneja **100% con mando** — sin mouse ni teclado, sin salir a Windows. Todo el
aspecto es **repintable**: no hay colores/medidas fijas en la interfaz, todo pasa por
tokens de diseño (temas y perfiles), así que se puede personalizar por completo sin
tocar código.

Pensado para **consumir el mínimo de recursos mientras se juega** — el launcher se
suspende al lanzar un juego y se restaura solo al volver.

## Features

- **Biblioteca unificada**: juegos y apps de Steam/GOG/Epic detectados localmente,
  con vinculación opcional de cuenta de Steam (biblioteca completa, incluyendo lo no
  instalado, y logros con revelado sin spoilers).
- **Multimedia personal**: Música (álbumes, discos multi-CD, listas de reproducción),
  Imágenes (visor) y Videos (streaming real, sin cargar el archivo entero a memoria).
- **Temas y perfiles**: aspecto 100% personalizable por tokens CSS — incluye el tema
  de marca **Velum** con 3 variantes (oscuro, claro, y una variante "Pulse").
- **100% mando**: navegación completa, menú rápido de sistema (QAM) y menú radial
  (mantener Home) para atajos de un solo gesto.
- **Configuración inicial**: primer arranque guiado (selección de tiendas a mostrar).
- **Autoarranque con Windows** — deja la PC lista como consola sin tocar nada.
- **Teclado virtual en pantalla** y **sonidos personalizables** (navegación,
  notificaciones, inicio).

## Capturas

_Próximamente._

## Instalación

### Para jugar (usuario final)

1. Bajá el instalador (`.exe`/`.msi`) más reciente desde
   **[Releases](https://github.com/TU_USUARIO/TU_REPO/releases)**
   <!-- reemplazar por la URL real del repo cuando esté publicado -->.
2. Ejecutalo — Windows 10/11 con WebView2 (ya viene instalado en versiones modernas de
   Windows) es el único requisito.
3. Listo — VELUM arranca a pantalla completa.

### Para desarrollo

Requisitos: **Node.js** y **Rust** (rustup).

```bash
npm run go
```

Un solo comando: instala las dependencias que falten y levanta la app nativa (sirve
tanto en macOS para desarrollar como en Windows).

Otros atajos útiles: `npm run setup` (deja la máquina lista sin levantar la app),
`npm run web` (solo la UI en el navegador, con datos simulados), `npm run dist`
(compila el instalador), `npm run bundle` (empaqueta el repo para llevarlo a otra
máquina).

## Información de desarrollo

- **Stack**: [Tauri v2](https://tauri.app/) (backend Rust + WebView del sistema,
  footprint mínimo), [Svelte 5](https://svelte.dev/) + Vite (frontend), `gilrs`
  (lectura de mando en Rust — Xbox/XInput, DualSense, genéricos).
- **Arquitectura**: el frontend habla con Rust únicamente a través de una capa de
  IPC — en modo navegador (sin Tauri) esa misma capa cae a datos simulados, así que
  la UI se puede desarrollar y probar sin el backend nativo. Lo específico del SO
  (fuentes de biblioteca, controles de sistema) vive detrás de traits con una
  implementación simulada activa en macOS y la real en Windows, para que el
  desarrollo en Mac no dependa de tener Windows a mano.
- **Theming**: todo el aspecto se expresa con variables CSS (`--gm-*`) — un tema o
  perfil es un conjunto de overrides de esas variables más CSS opcional. Cambiar el
  aspecto nunca requiere tocar un componente.
- **Mapa de carpetas** (alto nivel):
  ```
  src/                 Frontend (Svelte)
    lib/components/      Vistas y widgets
    lib/stores/          Estado de la app
    lib/theming/         Temas y tokens de diseño
    lib/input/           Navegación por foco + fuentes de input (mando/teclado)
    lib/ipc/             Frontera con el backend
  src-tauri/            Backend (Rust / Tauri)
  ```

## Roadmap

- Controles de sistema reales de Windows (Wi-Fi/Bluetooth/volumen) en el menú rápido.
- Selección de pantalla de salida (multi-monitor / TV).
- `EpicSource` (biblioteca de Epic Games) y arte de GOG sin conexión.
- Soporte nativo de Steam Controller (HID) y rumble/haptics.
- **Internacionalización**: selector de idioma/región para la interfaz (hoy 100% en
  español) y para las preferencias regionales de Steam.
- **Sistema de actualizaciones**: poder ver si hay una versión nueva e instalarla
  desde la propia app instalada, sin tener que bajar un instalador a mano de nuevo.

## Contribución

Los issues y pull requests son bienvenidos. El desarrollo activo vive en la rama
`dev` — las ramas de trabajo (`feature/*`, `testing/*`) se mergean ahí antes de
llegar a `release`.

## Licencia

_Por definir._ Ver [`LICENSE`](./LICENSE).

## Atribuciones

Construido sobre [Tauri](https://tauri.app/), [Svelte](https://svelte.dev/) y
[`gilrs`](https://gitlab.com/gilrs-project/gilrs), entre otras dependencias de
código abierto.

<!-- TODO: crédito de los sonidos incluidos (src/assets/sounds/) — completar con su
     fuente/licencia real. -->

## Disclaimer

VELUM es un proyecto independiente y no oficial. No está afiliado, respaldado ni
patrocinado por Valve Corporation (Steam), GOG sp. z o.o., Epic Games ni Electronic
Arts. Todas las marcas mencionadas son propiedad de sus respectivos dueños.
