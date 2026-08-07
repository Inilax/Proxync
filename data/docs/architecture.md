---
title: Architecture
description: Technical architecture of Proxync v0.2.0 — Tauri v2 desktop shell, Rust native backend, React 19 frontend, and state model.
---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Desktop Shell (Tauri v2 / WebView2)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React 19 + TypeScript Frontend (Vite 7)              │  │
│  │  Views: Lobby · Process · Traffic · Playground ·      │  │
│  │         Observability · Swagger · Settings            │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │ invoke / IPC events          │
│  ┌───────────────────────────┴───────────────────────────┐  │
│  │  Rust Native Backend (proxync_lib)                    │  │
│  │  Tokio · Reqwest · Tauri Autostart & Updater Plugins │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│      ┌───────────────────────┼───────────────────────┐      │
│      │                       │                       │      │
│  cloudflared           localtunnel             local proxy  │
│  (npx child)           (npx child)             (127.0.0.1:*)│
└─────────────────────────────────────────────────────────────┘
```

## Stack

- **Desktop Shell:** Tauri v2 (`proxync`, version `0.2.0`).
- **Frontend:** React 19 + TypeScript, Vite 7, Material 3 & Nunito Sans design system, Lucide icons, Motion animations.
- **Backend:** Rust 2021 edition with Tokio async runtime, Reqwest (with gzip/deflate/brotli decompression), `tauri-plugin-autostart` (silent Windows boot), and `tauri-plugin-updater` (smart background updates).
- **Packaging:** Windows NSIS and MSI installers with custom NSIS header/sidebar artwork.

## Key Subsystems

1. **Process Discovery** — High-performance Rust netstat parsing with CIM/WMI process lookups and local in-memory caching.
2. **Active Internet Connectivity Guard** — Edge ping checks preventing CLI tunnel timeouts offline.
3. **Generic Replay Engine** — Native Rust HTTP executor executing REST requests directly to bypass CORS.
4. **Observability Engine** — High-performance $O(N)$ real-time telemetry processing P50/P90/P99 percentiles and bandwidth.
5. **Codebase Scanner** — Multi-framework route parser (Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, Go).
6. **Smart Auto-Updater** — Version-aware update scheduler (2h active / 7d inactive checking) with forced minor/major version dialogs.
