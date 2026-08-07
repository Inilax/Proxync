---
title: Traffic Inspector
description: Live HTTP & WebSocket traffic log with unique UUID keys, immutable request ID tracking, headers HashMap, and raw body previews.
---

Proxync v0.2.0 includes a comprehensive **Traffic Inspector Overhaul** designed for stability under high live traffic volume.

## Key Features in v0.2.0

- **Immutable Request ID Expansion** — Fixed dropdown auto-collapse under live traffic by tracking row expansion using immutable request IDs (`rawRequestId`).
- **Unique React Keys** — Solved key collisions and scroll jumping by keying log rows with unique UUID identifiers.
- **Rust Header & Body Preview** — Enhanced Rust TCP and WebSocket proxy to parse, store, and emit complete headers HashMaps and body previews.
- **Accurate Status Code Badging** — Aligned status code updates and response duration timing across active requests.

## Captured Data

| Field | Description |
| --- | --- |
| `rawRequestId` | Immutable unique identifier for matching request/response pairs. |
| `method` | HTTP Method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`). |
| `path` | Full request URI path with query parameters. |
| `status` | HTTP response status code (e.g. `200 OK`, `404 Not Found`, `500 Server Error`). |
| `latency` | Response time calculation in milliseconds. |
| `headers` | Parsed request and response headers HashMap. |
| `bodyPreview` | Raw body snippet for inspecting request/response payloads. |

## Actions & Replay

From any traffic row:
- **Send to Playground** — Converts the captured request directly into a saved Playground collection item.
- **Generic Replay Engine** — Replays captured requests through native Rust HTTP executor, appending the replayed response directly back into the Traffic log.
- **Inspect Drawer** — Inspect full request headers, response headers, and payload previews.
