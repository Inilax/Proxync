---
title: Installation
description: Requirements, installing the Windows packaged installer, Smart Auto-Updates, and building Proxync from source.
---

This page covers system requirements, installing the packaged Windows release, the Smart Version-Aware Auto-Updater, and building Proxync from source.

## Requirements

Proxync targets **Windows x64** (with cross-platform macOS/Linux support coming soon).

- **OS** — Windows 10 or later (64-bit).
- **WebView2 Runtime** — required by Tauri v2. Included in standard Windows setup or installed automatically.
- **Node.js ≥ 20** and **npm ≥ 10** — required at runtime for public tunnel spawning (`cloudflared` / `localtunnel`).
- **Rust Toolchain** — required only when building from source (`x86_64-pc-windows-msvc`).

## Install the Packaged Build

The official release is available as `Proxync_0.2.0_x64-setup.exe` via GitHub Releases:

1. Download the installer from the [GitHub Releases](https://github.com/Inilax/Proxync/releases) page.
2. Run the NSIS installer wizard.
3. Launch **Proxync** from your Start menu or Desktop shortcut.

## Smart Version-Aware Auto-Updater

Proxync v0.2.0 includes a built-in background update system powered by `tauri-plugin-updater` and `tauri-plugin-process`:

- **Silent Update Scheduler** — Checks for updates on application startup and every **2 hours** when automatic updates are enabled in **Settings** (or every **7 days** when disabled).
- **Forced Version Dialogs** — When a **minor or major** version bump is released (e.g. `0.2.x → 0.3.0` or `0.x → 1.0.0`), a persistent forced update dialog prompts **Update Now**.
- **Optional Patch Toasts** — Patch updates (e.g. `0.2.0 → 0.2.1`) present non-blocking toasts allowing you to **Update Now**, **Skip this version**, or choose **Later**.

## Build from Source

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Inilax/Proxync.git
cd proxync
npm install
```

### 2. Run Desktop App in Development Mode

```bash
cd packages/desktop
npm run tauri dev
```

This starts the Vite dev server on port `1420` and launches the Tauri v2 window.

### 3. Build Production Executable

```bash
npm run tauri build
```

Generates production NSIS and MSI installers under:

```text
packages/desktop/src-tauri/target/release/bundle/nsis/
packages/desktop/src-tauri/target/release/bundle/msi/
```

## Local State Directory

Local workspace state and application settings persist automatically at:

```text
%APPDATA%\Proxync\data.json
```

See [Configuration](/docs/configuration) for details.
