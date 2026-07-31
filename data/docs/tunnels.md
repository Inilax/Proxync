---
title: Tunnels & Sharing
description: Expose a local process with Cloudflare Quick Tunnels, Localtunnel, custom domains, or a LAN share.
---

Proxync exposes a running local process in four ways. Three of them produce a public URL; one is LAN-only.

## How sharing works

When you share a process, Proxync:

1. Starts a **local intercepting TCP proxy** bound to an ephemeral `127.0.0.1` port. It forwards raw bytes to `127.0.0.1:<your port>`, parses the request line and headers, and emits `request:log` / `request:log:response` events used by the traffic log.
2. Ties a tunnel (or LAN share) to that proxy.

Request bodies and responses are streamed through; only metadata (method, path, headers, status, timing) is captured.

## Cloudflare Quick Tunnel

Uses the official `cloudflared` package via `npx`:

```bash
npx -y --package=cloudflared cloudflared tunnel --url http://127.0.0.1:<proxy-port>
```

Proxync spawns the process, watches its stderr for the first `*.trycloudflare.com` URL, and returns it as the public URL. Timeout is 20 seconds.

**Requirements:** network access and `npx` on `PATH` (first run downloads `cloudflared`). No Cloudflare account needed.

## Localtunnel

Uses the `localtunnel` package via `npx`:

```bash
cmd /C npx -y localtunnel --port <proxy-port> [--subdomain <subdomain>]
```

Proxync spawns the process and parses the `your url is:` line to get the public `*.loca.lt` URL. Timeout is 10 seconds. An optional subdomain can be supplied if it is still available.

## Custom domain

If you have verified a domain in [Settings & Domains](/docs/settings), you can share a process against it. This path creates a local tunnel for traffic capture but does **not** open a public tunnel — it is used when your own infrastructure routes the domain to your machine.

## LAN share

No tunnel at all. Proxync surfaces:

```text
http://localhost:<port>
http://<local-ip>:<port>
```

so other machines on your network can reach the server directly. The local IP is resolved via a UDP connect to `8.8.8.8:80` (`get_local_ip`).

## Stopping a tunnel

Closing a tunnel kills the underlying child process (`cloudflared` / `localtunnel`) and the proxy so no orphan processes are left behind. Tunnels that drop on their own emit a `tunnel:auto-closed` event, mark the tunnel closed in the UI, and show a toast.

## Notes

- Only **one public URL** is active per share.
- The proxy port is ephemeral — do not depend on a fixed port.
- Public tunnel modes require `node`/`npx` **at runtime**; LAN share and local capture do not.
- The internal `open_tunnel` command registers with a WebSocket relay at `ws://localhost:3939/relay`. This was used by the legacy API architecture (since removed) and is **not** invoked by the current UI. See [Architecture](/docs/architecture).
