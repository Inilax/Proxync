---
title: Quickstart
description: Share a local server with a public URL, inspect live traffic, replay requests in Playground, and monitor performance in Observability Hub.
---

This guide gets you from installation to a shared, inspectable development server in under five minutes using Proxync v0.2.0.

## 1. Create a Workspace

Launch Proxync. The onboarding wizard or inline workspace builder creates an isolated workspace tracking processes, saved collections, traffic logs, and activity stats. See [Workspaces](/docs/workspaces) for details.

## 2. Discover Your Process

Open **Lobby**. Proxync scans common development ports (`3000`, `3001`, `4000`, `4200`, `5000`, `5173`, `8000`, `8080`, `8888`) using native netstat and process cache lookup in Rust. It identifies running PIDs, working directories, and framework signatures.

## 3. Share Your Local Server

Choose a sharing method:

- **Cloudflare** — launches a free HTTPS public `*.trycloudflare.com` tunnel protected by our **Active Internet Connectivity Guard**.
- **Localtunnel** — launches a public `*.loca.lt` tunnel with optional custom subdomains.
- **Custom Domain** — maps custom domains configured in [Settings](/docs/settings).
- **LAN** — exposes local IP addresses for testing on local networks.

Click **Open in Browser** from the tunnel actions menu (`⋮`) to view your live public server.

> **Active Internet Connectivity Guard**: Proxync checks real edge pings before launching cloud tunnels, preventing CLI timeout delays when offline.

## 4. Inspect Live Traffic

Open **Traffic**. Real-time HTTP & WebSocket traffic flows into the inspector:
- Unique UUIDs and immutable request IDs prevent auto-collapsing dropdowns while traffic streams live.
- Expand entries to inspect headers HashMaps, timing, and raw response body previews.

## 5. Replay in Playground

Click **Send to Playground** on any captured log item or open **Playground**:
- Use the **Generic Replay Engine** to execute requests directly via native Rust HTTP executor (bypassing CORS).
- Notice the **Target Route Badge** (`Cloudflare Edge`, `Public Tunnel`, `Local Loopback`) next to the Send button.
- Use right-click glass context menus to rename, duplicate, or delete saved endpoints.
- Press `Ctrl + /` anywhere in Playground to open the hotkey reference sheet (`Ctrl + Enter` to Send, `Ctrl + S` to Save).

## 6. Monitor in Observability Hub

Open **Observability Hub** to inspect P50/P90/P99 latency percentiles, total bandwidth meters, status code gauges, public webhook streams, and the structured Error Center.

## 7. Generate OpenAPI Docs & Codebase Scanner

Open **Swagger**. Run the **Automatic Multi-Framework Codebase Scanner** (Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, Go) to infer OpenAPI 3.0 specs and export 2-way Playground collections.

## Next Steps

- [Tunnels & Sharing](/docs/tunnels) — detailed tunnel configuration and internet connection guards.
- [Traffic Inspector](/docs/traffic) — live traffic inspection.
- [Playground](/docs/postman) — Playground REST client & Replay Engine.
- [Observability Hub](/docs/observability) — performance monitoring dashboard.
- [Swagger & OpenAPI](/docs/swagger) — spec generator & codebase scanner.
