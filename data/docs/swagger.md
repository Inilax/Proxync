---
title: Swagger & OpenAPI Studio
description: Automatic OpenAPI 3.0 spec generation engine, Dynamic Netstat discovery, bot probe filtering, dynamic path parameterization, and multi-framework codebase scanner.
---

In Proxync v0.2.1, the **Swagger Studio** combines live traffic OpenAPI spec generation with an **Automatic Multi-Framework Codebase Scanner**, bot probe filtering, and incremental route deep-merging.

## Key Features in v0.2.1

- **Dynamic Netstat Full-Port Recon** — Scans all listening ports on IPv4 and IPv6 (`recon.rs`), automatically identifying frameworks and associating public tunnels.
- **Malicious Bot Probe & Scanner Filter** — Automatically ignores noisy vulnerability scans (`/.env`, `/.git`, `*.pem`, `/wp-admin`) and SPA HTML fallback catch-alls.
- **Dynamic URL Path Parameterization** — Generalizes dynamic path segments (IDs e.g. `todo-1787085033407`, UUIDs, numerical IDs, Mongo ObjectIDs) into standard OpenAPI path parameters (e.g. `/api/todos/{id}`) with matching `in: path` parameter definitions.
- **Incremental OpenAPI Spec Ingestion** — Deep-merges newly captured traffic with previously generated routes, preventing route loss when testing endpoints sequentially.
- **Multi-Tunnel Server Picker** — Clear server dropdown rendering active public tunnels (`Port :4000 — px-subdomain (https://...)`) with clickable tunnel badges on endpoint cards.
- **2-Way Collection Export/Import** — Export OpenAPI specs directly into Playground collections or import existing OpenAPI YAML/JSON specs.

## Codebase Scanner Supported Frameworks

| Framework | Scan Strategy |
| --- | --- |
| Next.js | Scans `app/api/**/route.ts` and `pages/api/**/*.ts`. |
| Vite / React | Discovers dev server and proxies traffic to backend origins. |
| Express / Fastify | Inspects route registration (`app.get`, `router.post`). |
| NestJS | Parses `@Controller()` and HTTP method decorators (`@Get`, `@Post`). |
| FastAPI | Parses `@app.get()`, `@app.post()`, and Pydantic models. |
| Spring Boot | Parses `@RestController`, `@GetMapping`, `@PostMapping`. |
| Go (Gin/Chi) | Scans router definitions and handler signatures. |

## 2-Way Playground Collection Sync

Clicking **Export to Playground** inside Swagger Studio automatically converts all endpoints into collection items and redirects seamlessly into **Playground**.
