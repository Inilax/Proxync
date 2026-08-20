---
title: Tunnels & Sharing
description: Expose local processes with Proxync Native SSH tunnels, Cloudflare Quick Tunnels, Localtunnel, custom domains, or LAN shares with Active Internet Guard and Batch Teardown.
---

Proxync v0.2.1 provides high-throughput one-click public URL creation, proprietary Native SSH tunnels, and LAN sharing for your local dev servers.

## Proxync Native High-Throughput Tunnels (Port 2222)

Proxync v0.2.1 introduces **Proxync Native Tunnels** — a high-speed, proprietary tunneling architecture built directly into the free desktop application:

- **100% Free & Zero-Config** — Included out-of-the-box in the desktop app. No registration, no credit cards, and no server configuration required. Just click **Public Share** to get an instant HTTPS URL.
- **High-Throughput Direct Origin (Port 2222)** — Direct SSH connection to Proxync's optimized tunnel relays using hardware-accelerated ciphers (`chacha20-poly1305`, `aes128-gcm`) with `IPQoS=throughput` for sub-millisecond local forwarding.
- **JIT Ephemeral Ed25519 Cert Signing** — Dynamically signs TLS keys via `https://api.proxync.dev/api/tunnel/sign-jit-cert` with zero-RTT handshakes.
- **Zero-Trace Security (`TempDirGuard`)** — Ephemeral keys and session `known_hosts` files are locked with single-user OS ACL permissions and securely erased on tunnel closure.
- **Automatic Random Subdomains** — Instantly provisions clean, unique 8-character subdomains (e.g. `https://px-a1b2c3d4.proxync.dev`).

## Cloudflare Quick Tunnels & Localtunnel

- **Cloudflare Edge** — Instant `*.trycloudflare.com` public tunnels pointing to local TCP proxy.
- **Localtunnel** — Optional custom subdomain tunnels (`*.loca.lt`).

## Active Internet Connectivity Guard

To prevent CLI timeout hangs when attempting to launch tunnels offline, Proxync performs real edge pings (`checkRealInternetConnection`) before spawner execution.

## Batch Multi-Tunnel Teardown

- **1-Click Stop All** — Prominent **Stop All** button in **Explore** (`WelcomeView`) and **Workspace Dashboard** terminates all active tunnel processes and child process trees (`taskkill /F /T` on Windows) concurrently via `Promise.all`.

## Custom Domain Verification

Map custom domains with automated DNS-over-HTTPS pre-flight verification (Google & Cloudflare DoH), token rotation, and instant status synchronization across views.

## LAN Sharing & 1-Click Open in Browser

- **LAN Share** — Exposes `http://<local-ip>:<port>` for devices on your local network.
- **1-Click Open in Browser** — Action menus feature an instant **Open in Browser** shortcut.
