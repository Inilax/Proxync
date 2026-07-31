---
title: Installation
description: Requirements, installing the Windows build, and building Proxync from source.
---

This page covers system requirements, installing the packaged Windows build, and building Proxync from source.

## Requirements

Proxync targets **Windows**. Tauri itself is cross-platform and the code contains best-effort macOS/Linux paths, but the tunnel and process-discovery commands are Windows-only tooling.

- **OS** — Windows 10 or later (x64).
- **WebView2 Runtime** — required by Tauri 2 for the embedded webview. The NSIS installer installs it automatically in most setups.
- **Node.js ≥ 20** and **npm ≥ 10** — only required at runtime for public tunnels (see below) and for building from source.
- **Rust toolchain** — only required for building from source (MSVC toolchain on Windows).

### Runtime dependencies for tunnels

Public tunnels (Cloudflare and Localtunnel) are launched on demand via `npx`, which downloads the `cloudflared` / `localtunnel` packages the first time you use them. This requires:

- A network connection.
- `node` and `npx` available on your `PATH`.

Everything else — workspaces, traffic inspection on the local proxy, Postman runner, Swagger generation — works fully offline.

## Install the packaged build

The official distribution is the NSIS installer `Proxync_0.1.7_x64-setup.exe` (an MSI variant is also produced).

1. Download the installer from the [GitHub Releases](https://github.com/Inilax/Proxync/releases) page.
2. Run the installer and follow the setup wizard.
3. Launch **Proxync** from the Start menu or desktop shortcut.

## Build from source

### 1. Prerequisites

- Node.js ≥ 20 and npm ≥ 10.
- Rust stable with the **MSVC** target (`x86_64-pc-windows-msvc`).
- The Tauri CLI is a dev dependency of the desktop package (`@tauri-apps/cli`), so no global install is needed.

### 2. Install dependencies

```bash
npm install
```

This installs the `packages/desktop` workspace and its frontend and Tauri dependencies.

### 3. Run in development mode

```bash
npm run tauri dev
```

Run from `packages/desktop`. This starts the Vite dev server (fixed on port **1420**) and opens the app window pointed at it.

### 4. Build a release bundle

```bash
npm run tauri build
```

Outputs NSIS and MSI installers under:

```text
packages/desktop/src-tauri/target/release/bundle/nsis
packages/desktop/src-tauri/target/release/bundle/msi
```

### 5. Build the frontend only

```bash
npm run build
```

Type-checks with `tsc` and builds the Vite production bundle into `packages/desktop/dist`.

## Verify the installation

On first launch, Proxync asks you to create a workspace. If you installed the packaged build, a `data.json` state file appears at:

```text
%APPDATA%\Proxync\data.json
```

See [Configuration](/docs/configuration) for the file's format.

## Uninstall

Use **Settings → Apps → Installed apps** on Windows and select Proxync, or re-run the NSIS installer and choose **Uninstall**. The uninstaller removes the app but keeps the data file at `%APPDATA%\Proxync\data.json`.
