---
title: Roadmap
description: Feature roadmap, completed releases, and future targets for Proxync.
---

## Completed in v0.2.1

- [x] **Proxync Native SSH High-Throughput Tunnels** — Direct Origin Port 2222 routing, Ed25519 JIT TLS certificate signing, `TempDirGuard` zero-trace memory safety, and 8-character random subdomain generation (`px-*.proxync.dev`).
- [x] **Dynamic Netstat Full-Port Service Discovery** — Single dynamic `netstat -ano` scanner capturing all listening services across IPv4 and IPv6 on any port, combined with single bulk WMI/CIM process reconnaissance (`Win32_Process`).
- [x] **Pro Debugger & Dual-Stream Support Logging Engine** — Native Rust disk logger in `%APPDATA%/Proxync/logs` (`app.log` on by default, `traffic.log` on-demand stream), AI agent diagnostic directives (`reason`, `target`, `hint`), PII sanitizer, and 1-click diagnostic support bundle exporter (`proxync-support-bundle.json`).
- [x] **Multi-Tunnel Traffic Segregation & Bot Noise Filtering** — Deterministic `port`/`tunnelId`/`requestId` metadata tagging on proxy events and automated bot vulnerability probe filtering (`/.env`, `/.git`, `*.pem`).
- [x] **Incremental OpenAPI Spec Ingestion** — Dynamic URL path parameterization (`/api/todos/{id}`) and continuous deep-merging across sequential requests.
- [x] **Emergency CVE Security Update Radar** — Unconditional pre-flight startup scan for urgent vulnerability patches.
- [x] **Batch Multi-Tunnel Teardown** — 1-click **Stop All** button in Explore screen and Workspace Dashboard.
- [x] **High-DPI Setup Wizard & Open-Source License** — High-DPI NSIS installer branding assets and embedded MIT license.

## Completed in v0.2.0

- [x] **v0.2.0 Release & UX Overhaul** — Playground redesign with Target Route Badges (`Cloudflare Edge`, `Public Tunnel`, `Local Loopback`), glass context menus, and keyboard hotkey overlays (`Ctrl+/`).
- [x] **Zero-Config Observability Hub** — Percentile latency metrics ($P50, P90, P99$), total bandwidth meter, status code distribution heatmap, and public Webhook stream replay.
- [x] **Smart Version-Aware Auto-Updater** — Production-ready background update checks with forced minor/major version dialogs.
- [x] **Generic Replay Engine & Native Rust Executor** — Native HTTP execution for all HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with automatic `gzip`/`deflate`/`brotli` decompression.
- [x] **Active Internet Connectivity Guard** — Edge ping checks (`checkRealInternetConnection`) preventing CLI timeout hangs when offline.
- [x] **Dynamic Workspace Activity & 7-Day Inactivity Filtering** — Dynamic workspace relative activity tracking (`lastActivityAt`) and 7-day inactivity auto-categorization.

## Planned for v0.3.0 & Beyond

- [ ] **CLI Companion (`proxync-cli`)** — Run quick tunnels directly from your terminal without opening the desktop GUI.
- [ ] **AI-Powered Traffic Debugger** — Intelligent local agent flagging slow endpoints, header mismatches, and schema validation errors.
- [ ] **On-The-Fly Request & Response Mocking** — Intercept and modify HTTP request/response headers and payloads before hitting localhost servers.
- [ ] **Offline-First SQLite State Engine** — Transition state serialization to SQLite for high-performance log querying and large payload storage.
- [ ] **Native OS Webhook & Tunnel Notifications** — Instant OS desktop notifications for incoming webhooks and tunnel status events.
- [ ] **Enterprise Team Workspaces** — Team workspace sharing, live session preservation, and custom domain visibility.
