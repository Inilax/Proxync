---
title: Installation
description: Simple setup guide for installing Proxync across Windows, macOS, and Linux, understanding system requirements, and building from source.
---

Getting started with Proxync is quick and easy. Proxync is packaged as a lightweight, native desktop application (~12MB RAM) built with Tauri v2 and Rust.

---

## Supported Operating Systems

| Operating System | Architecture | Package Format | Status | Local Data Location |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Windows 10 / 11 (`x64`) | NSIS Setup `.exe` / `.msi` | **Available Now (v0.2.2)** | `%APPDATA%\Proxync\` |
| **macOS** | Apple Silicon & Intel (`arm64`, `x64`) | `.dmg` / `.app` | **Available Now (v0.2.2)** | `~/Library/Application Support/Proxync/` |
| **Linux** | Ubuntu, Debian, Fedora, Arch (`x64`) | `.deb` / `.AppImage` | **Available Now (v0.2.2)** | `~/.config/Proxync/` |

---

## System Requirements

To run Proxync, you only need a few standard developer tools:

1. **Microsoft WebView2 Runtime (Windows)**  
   WebView2 powers the desktop user interface. Modern Windows 10 and 11 installations include this by default. If your machine is missing it, the Proxync setup wizard will install it automatically.
2. **Node.js ≥ 20**  
   Required for modern web toolchains and Cloudflare Quick Tunnels. Proxync automatically detects whatever tool manager you use (`pnpm`, `bun`, `nvm`, `volta`, `asdf`, or Homebrew) without requiring manual PATH configuration.
3. **Rust Toolchain (Optional)**  
   Only needed if you want to compile Proxync directly from source code (`cargo`, `rustc ≥ 1.78`).

---

## Install on Windows

The easiest way to install Proxync on Windows is via the signed installer:

1. Head over to the official [GitHub Releases](https://github.com/Inilax/Proxync/releases) page.
2. Download `Proxync_0.2.2_x64-setup.exe` (or the `.msi` bundle).
3. Run the installer and follow the setup wizard.
4. Launch **Proxync** from your Start menu or desktop shortcut.

---

## Install on macOS

Proxync runs natively on Apple Silicon (M-series) and Intel Macs via a Universal binary:

1. Head over to the official [GitHub Releases](https://github.com/Inilax/Proxync/releases) page.
2. Download `Proxync_0.2.2_universal.dmg`.
3. Open the disk image and drag **Proxync** into your **Applications** folder.
4. Launch **Proxync** from Spotlight, Launchpad, or Finder.

---

## Install on Linux

Proxync provides native packages for major 64-bit Linux distributions:

- **Debian / Ubuntu / Mint (`.deb`)**:
  Download `proxync_0.2.2_amd64.deb` and install it:
  ```bash
  sudo dpkg -i proxync_0.2.2_amd64.deb
  # or
  sudo apt install ./proxync_0.2.2_amd64.deb
  ```

- **Universal AppImage**:
  Download `Proxync_0.2.2_amd64.AppImage`, make it executable, and run:
  ```bash
  chmod +x Proxync_0.2.2_amd64.AppImage
  ./Proxync_0.2.2_amd64.AppImage
  ```

> [!NOTE]
> Proxync is 100% open source under the permissive Apache 2.0 license. Installers require zero cloud accounts or elevated root permissions for standard tunneling.

---

## Smart Auto-Updates & Security Alerts

Proxync comes with a gentle, privacy-conscious update system:

- **Quiet Background Checks** — Proxync checks for standard updates on launch and every **2 hours** while running (you can adjust or disable this anytime in **Settings**).
- **Emergency Security Radar** — If an urgent security patch is released, Proxync immediately detects the verified update and offers a 1-click update with live progress so your machine stays safe.
- **Graceful Restart** — When an update finishes downloading, Proxync gives you a friendly 2-second countdown before restarting into the new version without losing your open drafts.
- **Offline Friendly** — If your network drops or GitHub CDN is momentarily propagating files, Proxync silently handles it without throwing annoying popups.

---

## Building from Source

If you prefer building from source or want to contribute to Proxync, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/Inilax/Proxync.git
cd Proxync
npm install
```

### 2. Run in Development Mode

```bash
cd packages/desktop
npm run tauri dev
```

This starts the Vite development server and launches the native Tauri desktop window with live hot reloading enabled.

### 3. Build Production Binaries

```bash
cd packages/desktop
npm run tauri build
```

Compiled native installers will be generated under `packages/desktop/src-tauri/target/release/bundle/`:
- **Windows**: `.exe` (NSIS) or `.msi`
- **Linux**: `.deb` or `.AppImage`
- **macOS**: `.dmg` or `.app`

---

## Where Are My Files Stored?

Everything Proxync creates stays strictly on your computer. Here is where your configuration and diagnostic logs are stored:

```text
# Windows
%APPDATA%\Proxync\data.json
%APPDATA%\Proxync\logs\app.log
%APPDATA%\Proxync\logs\traffic.log

# macOS
~/Library/Application Support/Proxync/data.json
~/Library/Application Support/Proxync/logs/

# Linux
~/.config/Proxync/data.json
~/.config/Proxync/logs/
```

Ready to start sharing your projects? Check out the **[Quickstart Guide](/docs/quickstart)**!
