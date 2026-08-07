---
title: Roadmap
description: Future feature roadmap and release targets for Proxync.
---

## Completed in v0.2.0

- [x] **v0.2.0 Release & UX Overhaul** — Playground redesign with Target Route Badges (`Cloudflare Edge`, `Public Tunnel`, `Local Loopback`), glass context menus, and keyboard hotkey overlays (`Ctrl+/`).
- [x] **Zero-Config Observability Hub** — Percentile latency metrics ($P50, P90, P99$), total bandwidth meter, status code distribution heatmap, and public Webhook stream replay.
- [x] **Multi-Framework Codebase Scanner** — Automatic OpenAPI 3.0 route scanner supporting Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, and Go.
- [x] **Smart Version-Aware Auto-Updater** — Production-ready background update checks with forced minor/major version dialogs.
- [x] **Generic Replay Engine & Native Rust Executor** — Native HTTP execution for all HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with automatic `gzip`/`deflate`/`brotli` decompression.
- [x] **Active Internet Connectivity Guard** — Edge ping checks (`checkRealInternetConnection`) preventing CLI timeout hangs when offline.
- [x] **Dynamic Workspace Activity & 7-Day Inactivity Filtering** — Dynamic workspace relative activity tracking (`lastActivityAt`) and 7-day inactivity auto-categorization.

## Planned for v0.3.0 & Beyond

- [ ] **Proprietary High-Speed Proxync Tunnels** — Launch dedicated Proxync edge tunnel infrastructure alongside Cloudflare Tunnels for lower latency and higher bandwidth.
- [ ] **CLI Companion (`proxync-cli`)** — Run quick tunnels directly from your terminal without opening the desktop GUI.
- [ ] **AI-Powered Traffic Debugger** — Intelligent local agent flagging slow endpoints, header mismatches, and schema validation errors.
- [ ] **On-The-Fly Request & Response Mocking** — Intercept and modify HTTP request/response headers and payloads before hitting localhost servers.
- [ ] **Offline-First SQLite State Engine** — Transition state serialization to SQLite for high-performance log querying and large payload storage.
- [ ] **Native OS Webhook & Tunnel Notifications** — Instant OS desktop notifications for incoming webhooks and tunnel status events.
- [ ] **Enterprise Team Workspaces** — Team workspace sharing, live session preservation, and custom domain visibility.
