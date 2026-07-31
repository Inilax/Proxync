---
title: Quickstart
description: Share a local server with a public URL and inspect its traffic in about five minutes.
---

This guide gets you from an empty install to a shared, inspectable development server in about five minutes. It assumes your project is already running locally on a common dev port.

## 1. Create a workspace

Launch Proxync. On first run the onboarding wizard asks for a project name and the root path of your project. This creates an isolated workspace — see [Workspaces](/docs/workspaces) for what a workspace holds.

## 2. Discover your process

Open **Lobby**. Proxync scans the common development ports — `3000, 3001, 4000, 4200, 5000, 5173, 8000, 8080, 8888` — and lists anything listening on them with its PID, command, working directory, and an inferred framework.

If your server uses another port, start it, then rescan. The scan respects a short cache; reseanning forces a fresh lookup.

## 3. Share it

On the process row choose a share method:

- **Cloudflare** — starts a Quick Tunnel via `cloudflared` and gives you a public `*.trycloudflare.com` URL.
- **Localtunnel** — starts a Localtunnel and gives you a public `*.loca.lt` URL. An optional subdomain can be supplied.
- **Custom domain** — uses a domain you verified in [Settings & Domains](/docs/settings) (traffic capture only, no public URL).
- **LAN** — surfaces `http://localhost:<port>` and `http://<local-ip>:<port>` for machines on your network.

Pick **Cloudflare** for the fastest public URL. The tunnel takes a few seconds to come up while `npx` fetches `cloudflared` on first use.

> The share starts a local intercepting proxy (on an ephemeral `127.0.0.1` port) that captures request metadata. Public traffic flows through that proxy into your server, and the metadata lands in the traffic log.

## 4. Inspect traffic

Open **Traffic**. Every HTTP request that hits your tunnel appears live with its method, path, status code, and timing. Click any row to inspect the request and response headers.

Requests appear as `pending` until a response is seen; long-pending entries can indicate the target server stalled. Public tunnels that close automatically are flagged in the log.

## 5. Send a request to Postman

On any captured request, choose **Send to Postman**. It becomes a saved request (source `captured`) in the current workspace's collection, ready to replay.

## 6. Generate Swagger

Open **Swagger**. Proxync builds an **OpenAPI 3.1.0** document from your captured and saved requests — normalized paths, observed methods, and status codes — and sets the server URL to your active tunnel's public URL. Preview it or copy the JSON.

## Done

You have a public URL for your local server, a live traffic log, reusable saved requests, and an OpenAPI document. Continue with:

- [Tunnels & Sharing](/docs/tunnels) — every share mode in detail.
- [Traffic Inspector](/docs/traffic) — the request log.
- [Postman Runner](/docs/postman) — the REST client.
- [Swagger & OpenAPI](/docs/swagger) — OpenAPI generation.
