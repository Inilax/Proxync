---
title: Traffic Inspector
description: Live HTTP & WebSocket traffic log with multi-tunnel segregation, deterministic port attribution, automated bot probe filtering, and raw body previews.
---

Proxync v0.2.1 includes a hardened **Traffic Inspector & Attribution Pipeline** designed for high volume, multi-tunnel dev setups.

## Key Features in v0.2.1

- **Multi-Tunnel Port & Server Attribution** — Attaches deterministic `port`, `tunnelId`, and `requestId` metadata to every intercepted log, completely preventing cross-port misattribution across concurrent dev servers.
- **Automated Bot Probe & Noise Filtering** — Detects and filters out malicious automated internet vulnerability scans (`/.env`, `/.git`, `/.ssh`, `*.pem`, `*.key`, `*.bak`, `/wp-admin`) and SPA catch-all fallback requests.
- **Theme-Matching Filter Pills** — Custom dropdown filter pills (`Workspace:`, `Server:`, `Method:`, `Status:`) with high-speed early exit filtering.
- **Immutable Request ID Tracking** — Solves dropdown auto-collapse under live traffic by tracking expansion states via immutable request IDs.
- **Headers & Body Previews** — Captures request and response headers HashMaps and formatted body payloads with 1-click Playground replay.

## Captured Data

| Field | Description |
| --- | --- |
| `requestId` | Deterministic unique identifier for matching request/response pairs. |
| `port` | Local server port where the request was forwarded (e.g. `5173`, `8000`, `4000`). |
| `serverName` | Detected framework runtime name (e.g. `Vite dev server`, `FastAPI backend`). |
| `method` | HTTP Method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`). |
| `path` | Full request URI path with query parameters. |
| `status` | HTTP response status code (e.g. `200 OK`, `404 Not Found`, `500 Server Error`). |
| `latency` | Response time calculation in milliseconds. |
| `targetBadge` | Dynamic target indicator (`Proxync Native`, `Cloudflare Edge`, `Public Tunnel`, `Local Loopback`). |

## Actions & Replay

From any traffic row:
- **Send to Playground** — Converts the captured request directly into a saved Playground collection item.
- **Generic Replay Engine** — Replays captured requests through native Rust HTTP executor, appending the replayed response directly back into the Traffic log.
- **Inspect Drawer** — Inspect full request headers, response headers, and payload previews.
