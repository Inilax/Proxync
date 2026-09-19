---
title: Overview
description: Proxync is a local-first developer workspace studio — high-speed tunnels, live traffic inspection, API playground, observability, and Swagger docs in one private desktop app.
---

Welcome to **Proxync**! Proxync is a free, local-first desktop studio designed to take the friction out of local development and testing.

If you are building apps with modern frameworks, AI coding assistants (like Cursor, Claude, or v0), or traditional stacks, Proxync gives you everything you need to share, inspect, and debug your backend in one clean window.

> **In 30 Seconds:** Think of Proxync as having **Ngrok + Postman + Swagger docs + a live traffic inspector** rolled into a single lightweight desktop app. No cloud accounts, no subscription paywalls, and no tracking.

---

## Why Developers & Vibe Coders Love Proxync

When you are rapidly building and iterating on apps, you shouldn't have to juggle five different terminal windows, deal with broken tunnel links, or wrestle with browser CORS errors.

Here is what Proxync does for you at a glance:

1. **Share your local app in 1 click**  
   Get an instant, secure public HTTPS link to test on your phone, demo to a client, or receive real webhooks from services like Stripe, GitHub, and Shopify.
2. **Never lose your public link when code reloads (Resilient Standby Mode)**  
   When an AI edits your code or your dev server restarts on save, older tunnel tools crash and drop your link with a `502 Bad Gateway`. Proxync holds your public URL alive in standby and automatically reconnects the moment your code reboots.
3. **Finds your dev servers automatically (Smart Recon)**  
   You never have to search for port numbers or open terminal tabs. Proxync quietly detects Next.js, Vite, FastAPI, Express, Django, Python, Go, and Bun dev servers as soon as they boot up.
4. **Test APIs without CORS blocks (Playground)**  
   A built-in REST API playground that runs natively on your machine—meaning your requests never get blocked by browser CORS restrictions.
5. **Jump straight from traffic logs to code**  
   Spot an unexpected request or error in the live traffic inspector? Click **Open in Editor** to jump directly to the exact file and line in **VS Code** or **Cursor**.
6. **Clean background teardown (Zero zombie tasks)**  
   When you stop a tunnel or quit Proxync, every background process is cleanly terminated. No mystery processes secretly hogging your ports or draining your laptop battery.
7. **100% Private & Local-First**  
   Your data, requests, and logs stay strictly on your workstation in local JSON files. We never store or inspect your payloads.

---

## What's Inside the Studio

Proxync brings together seven essential development tools into one unified workspace:

| Tool | What It Does | Why You Need It |
| :--- | :--- | :--- |
| **[Tunnels & Sharing](/docs/tunnels)** | Expose local ports via Proxync Native SSH or Cloudflare. | Test on mobile devices, share live previews, and receive external webhooks. |
| **[Traffic Inspector](/docs/traffic)** | Real-time HTTP and WebSocket log stream. | See exactly what headers, query parameters, and payloads hit your server. |
| **[API Playground](/docs/postman)** | Fast, tabbed REST API client. | Test endpoints instantly without opening heavy external tools or hitting CORS errors. |
| **[Request Workbench](/docs/workbench)** | Live replay and visual response diffing. | Compare responses before and after code changes side-by-side. |
| **[Swagger & OpenAPI](/docs/swagger)** | Auto-generated interactive API docs. | Explore and test all your backend routes without writing manual YAML. |
| **[Observability Hub](/docs/observability)** | Zero-config latency & error analytics. | Spot slow database queries, view status code distributions, and replay webhooks. |
| **[Pro Debugger & Settings](/docs/settings)** | Dual-stream disk logging & diagnostics. | Inspect logs with automatic 5MB/10MB rotation and export 1-click support bundles. |

---

## Under the Hood (For Systems Engineers)

For developers curious about the underlying technical architecture:

- **High-Throughput Native Origin Relay (`relay.proxync.dev:2222`)**: Low-latency SSH tunneling over Direct Origin Port 2222 with just-in-time Ed25519 TLS certificates and automatic clean subdomains (`https://px-*.proxync.dev`).
- **Zero-Orphan Process Groups (`setpgid`)**: POSIX process group isolation (`setpgid(0, 0)`) delivers an atomic `SIGKILL` to child tunnel processes on exit, eliminating orphaned background workers holding open ports.
- **Smart OS Reconnaissance**: Low-level kernel and system scanning (Windows Netstat/WMI, macOS Darwin `proc_pidpath`/`lsof`, Linux `ss`/`/proc`) with automatic filtering of internal OS daemons (`ControlCenter`, `rapportd`).
- **SSRF Intranet Shield**: Strict loopback host whitelisting (`is_permitted_probe_host`) blocks outbound socket probes to private subnets (`192.168.x.x`, `10.x.x.x`, `169.254.169.254`).
- **Lightweight Architecture**: Engineered with **Tauri v2** and modular Rust for an ultra-lean memory footprint (~12MB RAM) and zero background cloud dependencies.

---

## Where Your Data Lives

All settings, workspaces, and collections are stored strictly as local JSON files on your device:

- **Windows**: `%APPDATA%\Proxync\data.json`
- **macOS**: `~/Library/Application Support/Proxync/data.json`
- **Linux**: `~/.config/Proxync/data.json`

---

## Ready to Get Started?

- **[Installation Guide](/docs/installation)** — Download the pre-built desktop installer or compile from source.
- **[Quickstart in 3 Minutes](/docs/quickstart)** — Launch your first tunnel and inspect live traffic in three simple steps.
- **[Architecture Deep-Dive](/docs/architecture)** — Learn how Proxync's Rust engine and React frontend communicate.
