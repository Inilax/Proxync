---
title: Overview
description: Proxync is a local-first developer tunneling workspace studio — Native SSH tunnels, traffic inspection, Pro Debugger, Observability Hub, and Swagger docs in one private desktop app.
---

Proxync is a **standalone, local-first developer workspace studio** that combines essential backend developer tools into a single offline-capable desktop application:

- **Proxync Native SSH & Cloudflare Tunnels** — high-throughput Ed25519 JIT TLS cert tunnels on port 2222 with zero-trace `TempDirGuard` security, random subdomain auto-generation (`px-*.proxync.dev`), Active Internet Connectivity Guard, and 1-click Stop All batch teardown.
- **Dynamic Netstat Full-Port Service Discovery** — single-pass `netstat -ano` capturing all listening dev services across IPv4 and IPv6 on any port with single bulk WMI/CIM recon and framework fingerprinting (Next.js, Vite, FastAPI, NestJS, Go, Spring Boot, Bun).
- **Traffic Inspector with Segregation** — real-time logging of HTTP/WebSocket traffic with deterministic port, tunnelId, and server attribution, automated bot probe filtering (`/.env`, `/.git`, `*.pem`), headers HashMap, and body preview.
- **Playground Studio** — REST client with saved collection trees, native Rust HTTP executor (bypassing CORS), Generic Replay Engine (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), glass right-click context menu, Target Route Badges, and keyboard hotkeys (`Ctrl+/`, `Ctrl+S`, `Ctrl+Enter`).
- **Request Workbench & Visual Diffing** — multi-tab execution studio, live side-by-side and unified response diffing against captured traffic, 1-click IDE jumping (VS Code / Cursor at exact controller line), and polyglot code exporter (cURL, Fetch, Python, Go, Rust).
- **Pro Debugger & Dual-Stream Support Logging** — native Rust disk logging in `%APPDATA%/Proxync/logs` (`app.log` enabled by default, `traffic.log` on-demand), structured LLM diagnostic directives, automatic PII/credential redaction, and 1-click Support Diagnostic Bundle Exporter (`proxync-support-bundle.json`).
- **Swagger & OpenAPI Studio** — automatic multi-framework codebase scanner, incremental OpenAPI 3.0 route deep-merging, dynamic URL path parameterization (`/api/todos/{id}`), and 2-way collection export.
- **Observability Hub** — zero-config latency analytics ($P50, P90, P99$), status code gauges, bandwidth meters, public Webhook stream replay, Error Center, and configurable telemetry modes (Enhanced vs Basic Low-CPU).
- **Emergency CVE Security Update Radar** — unconditional startup security pre-flight scan detecting critical CVE patches and triggering streamlined update delivery.

Everything runs locally. Your workspaces, requests, collections, and settings are stored in local JSON format on your machine (`AppData/Roaming/Proxync/data.json` on Windows, `~/.config/Proxync` on Linux/macOS).

## Technical Architecture

- **Tauri v2** desktop shell with a **React 19 + TypeScript** frontend.
- **Rust Backend Modularized** (`http.rs`, `proxy.rs`, `recon.rs`, `storage.rs`, `tunnel.rs`) handling dynamic netstat/WMI recon, local TCP/WebSocket intercepting proxy, native SSH and Cloudflare tunnels, and disk logging.
- **Vite 7** frontend build system and hot reload.

See [Architecture](/docs/architecture) for the complete breakdown.

## Core Concepts

- **Workspace** — an isolated project context tracking discovered processes, saved collections, traffic logs, custom domains, activity history, and notes. See [Workspaces](/docs/workspaces).
- **Process** — a development server dynamically discovered on listening ports via netstat & WMI.
- **Tunnel** — a public HTTPS endpoint (Proxync Native SSH, Cloudflare, or Localtunnel) forwarding internet traffic to a local process. See [Tunnels & Sharing](/docs/tunnels).
- **Request Workbench** — multi-tab execution engine with live visual response diffing, IDE controller jumping, and code export. See [Request Workbench](/docs/workbench).
- **Playground Collection** — structured API request definitions with target route indicators and collection management. See [Playground](/docs/postman).
- **Observability Metric** — real-time latency percentiles, error tracking, and bandwidth telemetry. See [Observability Hub](/docs/observability).

## Next Steps

- [Installation](/docs/installation) — download and setup requirements.
- [Quickstart](/docs/quickstart) — start a tunnel and inspect traffic in 5 minutes.
- [API Reference](/docs/api-reference) — full Tauri IPC command surface.
