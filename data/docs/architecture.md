---
title: Architecture
description: Technical architecture of Proxync v0.2.1 — Tauri v2 desktop shell, modular Rust backend, Pro Debugger, React 19 frontend, and state model.
---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Desktop Shell (Tauri v2 / WebView2 Container)                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  React 19 + TypeScript Frontend (Vite 7)                         │  │
│  │  Views: Explore · Workspaces · Tunnels · Traffic · Playground ·   │  │
│  │         Observability · Swagger · Settings                       │  │
│  │  Modules: logger.ts · openApiGenerator.ts · api.ts · toast.tsx   │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │ invoke / IPC events                  │
│  ┌──────────────────────────────┴───────────────────────────────────┐  │
│  │  Modular Rust Native Backend (proxync_lib)                       │  │
│  │  ├─ recon.rs   : Dynamic netstat full-port & bulk WMI recon      │  │
│  │  ├─ tunnel.rs  : Native SSH (2222), Cloudflare, Localtunnel      │  │
│  │  ├─ proxy.rs   : TCP stream proxy, bot filter, port attribution  │  │
│  │  ├─ storage.rs : AppData JSON persistence & disk logger          │  │
│  │  └─ http.rs    : CORS-bypassing Reqwest HTTP engine              │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │                                      │
│      ┌──────────────────────────┼──────────────────────────┐           │
│      │                          │                          │           │
│  Native SSH Tunnel        Cloudflare Edge            Local Proxy       │
│  (Port 2222, JIT TLS)     (cloudflared npx)          (127.0.0.1:*)     │
└────────────────────────────────────────────────────────────────────────┘
```

## Stack

- **Desktop Shell:** Tauri v2 (`proxync`, version `0.2.1`).
- **Frontend:** React 19 + TypeScript, Vite 7, Material 3 & Nunito Sans design tokens, Lucide icons, Motion animations.
- **Backend:** Rust 2021 edition with modular domain architecture (`http.rs`, `proxy.rs`, `recon.rs`, `storage.rs`, `tunnel.rs`), Tokio async runtime, Reqwest (with automatic decompression and connection pooling), `tauri-plugin-autostart`, and `tauri-plugin-updater`.
- **Packaging:** Windows NSIS and MSI installers with High-DPI NSIS header/sidebar bitmaps and embedded MIT open-source license.

## Key Subsystems in v0.2.1

1. **Dynamic Netstat Full-Port Discovery (`recon.rs`)** — Dynamically captures all listening dev services across IPv4 and IPv6 via single-pass `netstat -ano` and single bulk WMI/CIM process query (`Get-CimInstance Win32_Process`).
2. **Proxync Native High-Throughput Tunnels (`tunnel.rs`)** — High-speed SSH tunnels on direct origin port 2222 with JIT Ed25519 TLS certs, host key pinning, zero-trace `TempDirGuard`, and random subdomain auto-generation (`px-*.proxync.dev`).
3. **Pro Debugger & Dual-Stream Logging (`storage.rs`, `logger.ts`)** — Disk logging in `%APPDATA%/Proxync/logs` (`app.log` on by default, `traffic.log` stream on-demand), AI agent diagnostic directives (`reason`, `target`, `hint`), sensitive token redaction, and 1-click support bundle export.
4. **Traffic Segregation & Bot Probe Noise Filtering (`proxy.rs`, `openApiGenerator.ts`)** — Deterministic `port`/`tunnelId`/`requestId` metadata tagging on proxy events, automated bot probe rejection (`/.env`, `/.git`, `*.pem`), and SPA catch-all HTML suppression.
5. **Incremental OpenAPI Spec Ingestion (`openApiGenerator.ts`)** — Dynamic URL path parameterization (`/api/todos/{id}`) and continuous deep-merging across sequential requests.
6. **Emergency CVE Security Radar (`App.tsx`)** — Unconditional pre-flight startup scan for urgent vulnerability patches.
