---
title: Quickstart
description: Share a local server with a high-speed Native SSH tunnel, inspect live traffic with multi-port segregation, and monitor diagnostics in Pro Debugger.
---

This guide gets you from installation to a shared, inspectable development server in under five minutes using Proxync v0.2.1.

## 1. Create a Workspace

Launch Proxync. The onboarding wizard or inline workspace builder creates an isolated workspace tracking processes, saved collections, traffic logs, and activity stats. See [Workspaces](/docs/workspaces) for details.

## 2. Discover Your Process with Dynamic Netstat

Open **Tunnels & Recon**. Proxync scans all listening dev services across IPv4 and IPv6 (`netstat -ano`) with single bulk WMI process lookups. It automatically identifies running PIDs, ports (e.g. `3000`, `5173`, `8000`, `4000`, or custom ports), and framework signatures (Next.js, Vite, FastAPI, NestJS, Go, Spring Boot, Bun).

## 3. Share Your Local Server

Choose a sharing method:

- **Proxync Native SSH** — launches high-throughput hardware-accelerated SSH tunnels over Direct Origin Port 2222 with JIT Ed25519 TLS certs and automatic 8-character random subdomains (`https://px-*.proxync.dev`).
- **Cloudflare** — launches a free HTTPS public `*.trycloudflare.com` tunnel protected by our **Active Internet Connectivity Guard**.
- **Localtunnel** — launches a public `*.loca.lt` tunnel with optional custom subdomains.
- **Custom Domain** — maps custom domains with live DNS-over-HTTPS pre-flight verification.
- **LAN** — exposes local IP addresses for testing on local networks.

Click **Open in Browser** from the tunnel actions menu (`⋮`) to view your live public server.

## 4. Inspect Live Traffic with Port Attribution

Open **Traffic**. Real-time HTTP & WebSocket traffic flows into the inspector:
- Deterministic port, tunnelId, and server attribution accurately tracks concurrent multi-tunnel traffic without misattribution.
- Malicious automated vulnerability bot probes (`/.env`, `/.git`) and SPA catch-alls are automatically filtered.
- Expand entries to inspect headers HashMaps, timing, and raw response body previews.

## 5. Replay in Playground

Click **Send to Playground** on any captured log item or open **Playground**:
- Use the **Generic Replay Engine** to execute requests directly via native Rust HTTP executor (bypassing CORS).
- Notice the **Target Route Badge** (`Proxync Native`, `Cloudflare Edge`, `Public Tunnel`, `Local Loopback`) next to the Send button.
- Use right-click glass context menus to rename, duplicate, or delete saved endpoints.
- Press `Ctrl + /` anywhere in Playground to open the hotkey reference sheet (`Ctrl + Enter` to Send, `Ctrl + S` to Save).

## 6. Pro Debugger & Observability Hub

- Open **Settings** to inspect live diagnostic streams (`app.log` / `traffic.log`) or click **Export Support Bundle** (`proxync-support-bundle.json`).
- Open **Observability Hub** to inspect P50/P90/P99 latency percentiles, total bandwidth meters, status code gauges, and public webhook stream replays.

## 7. Generate OpenAPI Docs & Codebase Scanner

Open **Swagger**. Run the **Automatic Multi-Framework Codebase Scanner** (Next.js, Vite, NestJS, FastAPI, Express, Spring Boot, Go) to infer incremental OpenAPI 3.0 specs with dynamic URL path parameterization (`/api/todos/{id}`) and export 2-way Playground collections.

## Next Steps

- [Tunnels & Sharing](/docs/tunnels) — detailed tunnel configuration and internet connection guards.
- [Traffic Inspector](/docs/traffic) — live traffic inspection.
- [Playground](/docs/postman) — Playground REST client & Replay Engine.
- [Observability Hub](/docs/observability) — performance monitoring dashboard.
- [Swagger & OpenAPI](/docs/swagger) — spec generator & codebase scanner.
