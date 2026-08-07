---
title: Tunnels & Sharing
description: Expose local processes with Cloudflare Quick Tunnels, Localtunnel, custom domains, or LAN shares with Active Internet Guard.
---

Proxync v0.2.0 provides instant one-click public URL creation and LAN sharing for your local servers, backed by edge connection health checks and target route indicators.

## How Sharing Works

When you start a tunnel:

1. **Local Intercepting TCP/WebSocket Proxy** — Bound to an ephemeral local port, this Rust proxy forwards traffic to your dev server (`127.0.0.1:<port>`), captures headers HashMaps and body previews, and emits real-time events.
2. **Tunnel Child Process Spawning** — Spawns `cloudflared` or `localtunnel` pointing at the intercepting proxy.
3. **Target Route Badges** — Playground requests display dynamic target badges:
   - `Cloudflare Edge` — Requests passing through a public Cloudflare edge tunnel.
   - `Public Tunnel` — Requests passing through Localtunnel edge proxies.
   - `Local Loopback` — Requests routed directly to local loopback ports.

## Active Internet Connectivity Guard

To prevent CLI timeout hangs when attempting to launch cloud tunnels while offline or on degraded connections, Proxync v0.2.0 includes an **Active Internet Connectivity Guard** (`checkRealInternetConnection`):

- **Edge Ping Check** — Validates internet connectivity against public edge endpoints before executing `cloudflared` or `localtunnel`.
- **Offline Callout Banners** — Displays offline warnings inside `DomainSelectDialog` and surfaces real-time toast notifications when network status changes (`offline` / `online`).

## Cloudflare Quick Tunnels

Executes official `cloudflared` quick tunnels:

```bash
npx -y --package=cloudflared cloudflared tunnel --url http://127.0.0.1:<proxy-port>
```

Proxync parses stderr output for your public `*.trycloudflare.com` URL with high-reliability stdout parsing.

## Localtunnel

Executes `localtunnel` with optional custom subdomains:

```bash
cmd /C npx -y localtunnel --port <proxy-port> [--subdomain <subdomain>]
```

Parses the returned `*.loca.lt` URL.

## Custom Domain Verification

Map custom domains to your local tunnels with integrated DNS record verification (A and CNAME records) and registrar configuration instructions in Settings.

## LAN Sharing & 1-Click Open in Browser

- **LAN Share** — Exposes `http://<local-ip>:<port>` for devices on your local network.
- **1-Click Open in Browser** — Active tunnel action menus (`⋮`) in **WelcomeView** and **ProcessView** feature a 1-click **Open in Browser** shortcut to launch public URLs instantly.

## Process Cleanup & Safety

When stopping a tunnel, Proxync cleanly sends signal commands to terminate all child processes (`cloudflared`, `localtunnel`, and TCP proxy workers), preventing orphaned background processes.
