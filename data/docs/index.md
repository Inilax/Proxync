---
title: Overview
description: Proxync is a local-first developer tunneling workspace studio — tunnels, traffic, Playground Studio, Observability Hub, and Swagger docs in one private desktop app.
---

Proxync is a **standalone, local-first developer workspace studio** that combines essential backend developer tools into a single offline-capable desktop application:

- **One-Click Tunnels** — expose local development servers to the internet via Cloudflare Quick Tunnels or Localtunnel, featuring an Active Internet Connectivity Guard (`checkRealInternetConnection`) and custom domains.
- **Traffic Inspector** — real-time logging of HTTP/WebSocket traffic with immutable request ID tracking (preventing live auto-collapse), Rust header & body preview, and status code matching.
- **Playground** — REST client with saved collection trees, native Rust HTTP executor (bypassing CORS), Generic Replay Engine (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), glass right-click context menu, Target Route Badges (`Cloudflare Edge`, `Public Tunnel`, `Local Loopback`), and keyboard hotkeys (`Ctrl+/`, `Ctrl+S`, `Ctrl+Enter`).
- **Observability Hub** — zero-config latency analytics ($P50, P90, P99$), status code gauges, bandwidth meters, public Webhook stream replay, Error Center, and configurable telemetry modes (Enhanced vs Basic Low-CPU).
- **Swagger & OpenAPI Studio** — automatic multi-framework codebase scanner (Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, Go) and OpenAPI 3.0 generation engine with 2-way collection export.
- **Smart Auto-Updater & Activity Tracking** — automated version-aware background updates with forced minor/major version dialogs and dynamic 7-day workspace inactivity auto-categorization.

Everything runs locally. Your workspaces, requests, collections, and settings are stored in local JSON format on your machine (`AppData/Roaming/Proxync/data.json` on Windows).

## Technical Architecture

- **Tauri v2** desktop shell with a **React 19 + TypeScript** frontend.
- **Rust Backend** (Tokio, Reqwest with automatic gzip/deflate/brotli decompression, `tauri-plugin-autostart`, `tauri-plugin-updater`) handling process discovery, local TCP/WebSocket intercepting proxy, and native HTTP execution.
- **Vite 7** frontend build system and hot reload.

See [Architecture](/docs/architecture) for the complete breakdown.

## Core Concepts

- **Workspace** — an isolated project context tracking discovered processes, saved collections, traffic logs, custom domains, activity history, and notes. See [Workspaces](/docs/workspaces).
- **Process** — a development server detected on common local ports (e.g. `3000`, `5173`, `8000`, `8080`).
- **Tunnel** — a public HTTPS endpoint forwarding internet traffic to a local process. See [Tunnels & Sharing](/docs/tunnels).
- **Playground Collection** — structured API request definitions with target route indicators and collection management. See [Playground](/docs/postman).
- **Observability Metric** — real-time latency percentiles, error tracking, and bandwidth telemetry. See [Observability Hub](/docs/observability).

## Next Steps

- [Installation](/docs/installation) — download and setup requirements.
- [Quickstart](/docs/quickstart) — start a tunnel and inspect traffic in 5 minutes.
- [API Reference](/docs/api-reference) — full Tauri IPC command surface.
