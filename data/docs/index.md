---
title: Overview
description: Proxync is a local-first developer tunneling workspace studio — tunnels, traffic, requests, and Swagger docs in one private desktop app.
---

Proxync is a **local-first, Windows-focused desktop developer studio** that combines the tools a backend developer reaches for every day into a single offline app:

- **Tunnels** — expose a local development server to the internet with a public URL (Cloudflare Quick Tunnels or Localtunnel), without touching your firewall or router.
- **Traffic inspector** — a live log of every HTTP request that flows through your tunnel, with status codes and timing.
- **Postman-style runner** — build and send HTTP requests (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD), save them per project, and replay them anytime.
- **Swagger generation** — generate an OpenAPI 3.1.0 document from the traffic you capture and the requests you save.

Everything runs locally. Your workspaces, requests, and settings are stored as a single JSON file on your machine. No account, no cloud, no telemetry.

## What it's built on

- **Tauri v2** desktop shell with a **React 19 + TypeScript** frontend.
- **Rust** backend (Tokio, Tokio-Tungstenite, Reqwest) that handles process discovery, a local intercepting HTTP proxy, and tunnel child processes.
- **Vite 7** for the frontend build and hot reload.

See [Architecture](/docs/architecture) for the full breakdown.

## Key concepts

- **Workspace** — an isolated project context. Each workspace carries its own discovered processes, saved requests, captured traffic, custom domains, and notes. See [Workspaces](/docs/workspaces).
- **Process** — a development server detected on a common local port (e.g. `5173`, `8000`, `8080`). Processes are the unit you share and inspect.
- **Tunnel** — a public URL that forwards traffic to a local process. See [Tunnels & Sharing](/docs/tunnels).
- **Proxy** — a local intercepting proxy Proxync starts behind each tunnel to capture request metadata for the traffic log and OpenAPI generation.

## What's next

- [Installation](/docs/installation) — requirements and how to install or build Proxync.
- [Quickstart](/docs/quickstart) — share a server and inspect traffic in about five minutes.
- [API Reference](/docs/api-reference) — the Tauri command surface exposed by the backend.
