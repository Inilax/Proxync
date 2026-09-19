---
title: Architecture
description: Technical architecture of Proxync — Tauri v2 desktop shell, modular Rust backend, React 19 frontend, and local state engine.
---

Proxync is engineered as a lightweight, private, and high-performance desktop studio. Unlike traditional development tools that rely on heavy Electron wrappers consuming hundreds of megabytes of RAM, Proxync uses **Tauri v2** and **native Rust**, keeping memory usage lean (~12MB RAM) while delivering sub-millisecond networking performance.

---

## High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Desktop Application Shell (Tauri v2 / WebView2 Container)             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  React 19 + TypeScript Frontend (Vite 7)                         │  │
│  │  Views: Explore · Workspaces · Tunnels · Traffic · Playground ·   │  │
│  │         Workbench · Observability · Swagger · Settings           │  │
│  │  Modules: logger.ts · openApiGenerator.ts · api.ts · toast.tsx   │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │ Tauri IPC Commands & Events          │
│  ┌──────────────────────────────┴───────────────────────────────────┐  │
│  │  Modular Native Rust Backend (proxync_lib)                       │  │
│  │  ├─ recon.rs   : OS port & process discovery (WMI / Darwin FFI)  │  │
│  │  ├─ tunnel.rs  : Native SSH (relay.proxync.dev:2222) & Cloudflare│  │
│  │  ├─ proxy.rs   : TCP stream proxy, SSRF shield, port attribution │  │
│  │  ├─ storage.rs : AppData JSON persistence & log rotation (5/10MB)│  │
│  │  └─ http.rs    : Multi-OS User-Agent Reqwest CORS-bypassing engine│ │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │ Outbound Network Streams             │
│      ┌──────────────────────────┼──────────────────────────┐           │
│      │                          │                          │           │
│  Native Origin Relay      Cloudflare Edge            Local Proxy       │
│  (relay.proxync.dev:2222) (cloudflared quick)        (127.0.0.1:*)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## The Tech Stack

- **Desktop Shell:** [Tauri v2](https://v2.tauri.app/) — Native windowing and IPC bridge with minimal overhead.
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS with Obsidian Void tokens, Lucide icons, and Motion 60fps animations.
- **Backend:** Rust (2021 Edition), Tokio async runtime, Reqwest HTTP client with connection pooling and automated payload decompression.
- **Packaging:** Native desktop installers across Windows (signed NSIS `.exe` and `.msi`), macOS (Universal `.dmg` for Apple Silicon and Intel), and Linux (`.deb` and `.AppImage`).

---

## Core Backend Subsystems

### 1. Smart OS Reconnaissance (`recon.rs`)
Proxync quietly discovers local development servers without requiring you to remember port numbers:
- **Windows:** Queries active listening ports via `netstat -ano` and resolves process details via bulk WMI (`Win32_Process`).
- **macOS:** Uses Darwin kernel system APIs (`proc_pidpath` and unprivileged `lsof`) to bypass standard 16-character process name truncation and locate the project's root folder.
- **Daemon Filtering:** Automatically filters out internal operating system daemons (`ControlCenter`, `rapportd`, `identityservicesd`, `launchd`) so only your actual web servers are shown.
- **Framework Detection:** Fingerprints common development servers including Next.js, Vite, FastAPI, Express, NestJS, Spring Boot, Go, Bun, and Python HTTP server.

### 2. Resilient Tunnel Engine (`tunnel.rs`)
- **Origin Relay Routing:** Connects to `relay.proxync.dev` on Direct Origin Port `2222` with dynamic DNS resolution, allowing seamless background server failover.
- **Resilient Standby Mode:** When your local server restarts during code hot-reloading, Proxync keeps your public URL active in standby and reconnects the instant your code reboots.
- **Clean Process Isolation:** Spawns child tunnel processes as leaders of isolated process groups (`setpgid(0, 0)` on Unix). When you quit or stop a tunnel, the OS kernel cleanly terminates the entire process tree, leaving zero zombie processes locking ports.

### 3. SSRF Intranet Shield (`proxy.rs`)
To protect private corporate networks and home Wi-Fi environments:
- Enforces strict loopback whitelisting (`is_permitted_probe_host`).
- Completely blocks attempts to probe private subnets (`192.168.x.x`, `10.x.x.x`, `172.16.x.x`, and cloud metadata endpoints like `169.254.169.254`).

### 4. Pro Debugger & Dual-Stream Logging (`storage.rs`, `logger.ts`)
- **System Telemetry Banner:** Generates a structured hardware/OS banner on startup detailing platform, kernel version, architecture, and WebView version.
- **Automatic Log Rotation:** Keeps disk usage predictable by archiving `app.log` at 5MB and `traffic.log` at 10MB.
- **Panic Protection:** Intercepts unexpected Rust panics and logs formatted stack traces directly to `app.log`.

### 5. Native CORS-Bypassing HTTP Engine (`http.rs`)
- Executes HTTP requests directly from the desktop operating system using Rust's `reqwest` library.
- Automatically injects platform-appropriate `User-Agent` headers (`Windows NT`, `Macintosh`, `X11; Linux`) matching the host system.
- Completely eliminates browser CORS restrictions for hassle-free API testing.

---

## What to Read Next

- **[API Reference](/docs/api-reference)** — Complete Tauri IPC command and event documentation.
- **[Configuration](/docs/configuration)** — File locations and settings schema.
- **[Roadmap](/docs/roadmap)** — Explore planned features and future releases.
