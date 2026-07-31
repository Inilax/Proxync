---
title: Architecture
description: How Proxync is structured — Tauri shell, Rust backend, React frontend, and how data flows.
---

## Overview

```
┌─────────────────────────────────────────────────┐
│  Desktop window (Tauri v2 / WebView2)            │
│  ┌───────────────────────────────────────────┐  │
│  │  React 19 + TypeScript frontend (Vite 7)  │  │
│  │  Views: Lobby · Overview · Traffic ·      │  │
│  │         Postman · Swagger · Settings      │  │
│  └─────────────────────┬─────────────────────┘  │
│                        │ invoke / event         │
│  ┌─────────────────────┴─────────────────────┐  │
│  │  Rust backend (proxync_lib)               │  │
│  │  Tokio · Tokio-Tungstenite · Reqwest      │  │
│  └─────────────────────┬─────────────────────┘  │
│                        │                        │
│      ┌─────────────────┼─────────────────┐      │
│      │                 │                 │      │
│  cloudflared     localtunnel     local proxy   │
│  (npx child)     (npx child)     (127.0.0.1:*) │
└─────────────────────────────────────────────────┘
```

## Stack

- **Desktop shell:** Tauri v2, product name `Proxync`, identifier `com.proxync.app`, version `0.1.7`.
- **Frontend:** React 19 + TypeScript, built with Vite 7, styled with vanilla CSS (glassmorphism theme).
- **Backend:** Rust (edition 2021), with Tokio, Tokio-Tungstenite, Reqwest, Serde, and Lazy-Static shared state.
- **Package:** an npm workspace (`packages/desktop`). The Rust crate is named `proxync` with library target `proxync_lib` to avoid the Windows binary/library name collision.

## Source layout

```text
packages/desktop/
├── src/                        # React frontend
│   ├── main.tsx                # React root
│   ├── App.tsx                 # App shell: state, events, view routing, invokes
│   ├── lib/types.ts            # Shared TypeScript models
│   ├── lib/api.ts              # Offline "mock API" client
│   └── components/views/       # Lobby, Welcome, Process, Traffic, Postman,
│                               # Swagger, Settings, Dialogs, SharedComponents
├── src-tauri/                  # Rust backend
│   ├── src/lib.rs              # Tauri builder, all commands, tunnel processes
│   ├── src/main.rs             # Entry (calls proxync_lib::run)
│   ├── tauri.conf.json         # Window, bundling (NSIS + MSI), CSP
│   └── capabilities/default.json
```

## Data flow

1. **Discovery.** The backend scans known dev ports and resolves PIDs via `netstat`, then process metadata via PowerShell `Get-CimInstance Win32_Process`. Results are cached per port.
2. **Sharing.** The frontend invokes `start_proxy`, then spawns `cloudflared` / `localtunnel` (or uses a custom domain / LAN share).
3. **Capture.** The proxy parses each request's request line and headers, forwards bytes to the target, parses the response status, and streams the body back. Metadata is emitted as `request:log` / `request:log:response` events.
4. **Persistence.** The frontend serializes `{ workspaces, activeWorkspaceId, appSettings }` and calls `save_app_state`, which writes `data.json` synchronously.

## Tunneling model

- **Local proxy:** a plain-HTTP passthrough on an ephemeral `127.0.0.1` port. Bodies are forwarded/streamed, never persisted.
- **Child processes:** `cloudflared` and `localtunnel` are spawned via `npx -y` and monitored; closing a tunnel kills them to avoid orphans. The tooling requires `node`/`npx` at runtime.
- **Legacy relay:** `open_tunnel` connects to a WebSocket relay (`ws://localhost:3939/relay`) for request forwarding. This is dead code since the API package was removed — the current UI uses the proxy + `cloudflared`/`localtunnel` path.

## Persistence

One JSON file per install: `%APPDATA%\Proxync\data.json` (see [Configuration](/docs/configuration)). The write is synchronous `std::fs::write` on every state change. A SQLite migration is on the [Roadmap](/docs/roadmap).

## Release process

`develop` → manual `prepare-release.yml` (optionally with a version input) → release PR into `main` → `release.yml` on push to `main` creates tag `vX.Y.Z`, a permanent `release-vX.Y.Z` branch, builds Windows installers (NSIS + MSI), and publishes a draft GitHub Release. CI pins Node 22 and uses the stable Rust toolchain.
