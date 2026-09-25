---
title: Frequently Asked Questions
description: Comprehensive answers about Proxync — enterprise compliance, client NDAs, privacy, tunneling, CORS, offline mode, and system architecture.
---

## Enterprise Compliance & Security

### Is Proxync compliant with enterprise security policies, client NDAs, and healthcare standards?
**Yes.** Proxync is built from the ground up with a strict **100% local-first architecture**:
- **Zero Cloud Payload Storage:** Your source code, API payloads, header values, environment variables, and request histories are never transmitted to or stored on third-party servers. All session history is written directly to your local computer in SQLite and JSON files.
- **Client NDA Safe:** Because customer data stays entirely on your workstation, you can safely test APIs and webhooks for enterprise clients, banking platforms, or healthcare providers without violating confidentiality agreements or HIPAA / SOC 2 controls.
- **No Incoming Firewall Holes:** Proxync never opens incoming ports on your office router or home network. All connections are initiated via standard outbound encrypted TLS tunnels (port 443 / SSH 2222).

### Does Proxync upload my code, API requests, or secrets to the cloud?
**Never.** Proxync has no user tracking, no third-party analytics scripts, and no remote database. The only network activity Proxync performs is routing the active HTTP traffic between your local server and your assigned public tunnel endpoint while the tunnel is actively running.

### What is the SSRF Intranet Shield and how does it protect internal networks?
When you expose a local server through a public tunnel, malicious actors might attempt Server-Side Request Forgery (SSRF) attacks to probe your private home or corporate intranet.

Proxync includes a built-in **SSRF Intranet Shield** that strictly binds tunnel routing to `127.0.0.1` and Proxync's verified relay endpoints. It automatically drops any incoming requests attempting to scan private RFC-1918 subnets (`192.168.x.x`, `10.x.x.x`, `172.16.x.x`) or cloud metadata endpoints (`169.254.169.254`).

### How does Proxync mask sensitive credentials in diagnostic logs?
Proxync maintains two local log files in your system application directory:
- **`app.log` (5MB limit):** Tracks application startup, port discovery, and tunnel state.
- **`traffic.log` (10MB limit):** Stores optional on-demand HTTP request and response records.

Both files feature an automated redaction engine that masks sensitive authentication headers (e.g. `Authorization: Bearer [REDACTED]`, `X-Api-Key`, `Cookie`) before writing to disk. When log files reach their size limit, they automatically rotate to `.old` backups to protect your disk space.

---

## Tunneling & Client Collaboration

### Can external clients or QA testers preview my app without installing Proxync?
**Yes!** When you click **Share**, Proxync assigns a secure public web link (such as `https://px-a7x9f2.proxync.dev`).

Anyone on iOS, Android, macOS, or Windows can open that URL directly in their standard browser (Safari, Chrome, Firefox) to interact with your live local app in real time. They never have to install Proxync, install browser extensions, configure DNS, or create an account.

### What is Resilient Standby Mode and how does it protect webhooks?
When building modern web apps or vibe coding with AI tools like Cursor, your local development server restarts frequently whenever you save a file.

With standard tunneling tools, server restarts immediately crash the tunnel connection, returning a `502 Bad Gateway` error to external webhook providers (such as Stripe, GitHub, or Shopify).

Proxync's **Resilient Standby Mode** holds your public tunnel URL in a protective standby state during server reboots. External webhooks receive a temporary holding response while Proxync's background health probe watches for your local port to recover. As soon as your server compiles, buffered requests are instantly delivered without dropping a single webhook.

### Can I run and share multiple local dev servers at the same time?
**Yes.** Proxync is designed for modern full-stack workflows. You can run your Next.js frontend on port `3000`, a FastAPI backend on port `8000`, and a worker service on port `4000` simultaneously. Proxync discovers each listening port, allows you to share each one with its own independent public URL, and tags every incoming request in the Traffic Inspector with clear port and service badges.

### Does Proxync support WebSockets, Server-Sent Events (SSE), and AI streaming?
**Yes.** Proxync natively supports:
- **Bidirectional WebSockets** (e.g., `Socket.io`, real-time chat, multiplayer games).
- **Server-Sent Events (SSE)** (e.g., streaming OpenAI/Anthropic responses via Vercel AI SDK).
- **HTTP Chunked Transfers** and large binary file uploads.

Tunnels maintain persistent streaming connections without premature timeout cuts or response buffering delays.

### Do I need to configure port forwarding or modify my router?
**No.** Proxync requires zero router configuration, zero port forwarding, and zero static IP setup. It creates an encrypted outbound TLS tunnel to our relay edge network, allowing your local server to be securely accessible even behind symmetric NATs, mobile hotspots, and strict corporate firewalls.

### What happens if my Wi-Fi drops or I switch networks?
Proxync features automatic socket reconnection. If your Wi-Fi momentarily drops or you switch from Wi-Fi to a mobile hotspot, Proxync detects the network change, reconnects the outbound tunnel, and restores your session automatically.

---

## API Workbench & Offline Development

### Can I use Proxync completely offline without an internet connection?
**Yes!** The entire Proxync developer studio is 100% functional offline:
- **Smart OS Reconnaissance:** Discovers your running local dev servers without internet.
- **API Workbench:** Send GET, POST, PUT, and DELETE requests to `http://localhost:*` offline.
- **Mock Response Servers:** Spin up local JSON mock servers for frontend testing while disconnected.
- **Live Traffic Inspector:** Inspect local HTTP requests and latency waterfalls offline.
- **Swagger / OpenAPI Generator:** Generate API contracts from local routes completely offline.

The only feature that requires an active internet connection is generating public `https://px-*.proxync.dev` share links.

### Why do my requests in Playground never get blocked by CORS?
Web-based API testers and browser extensions operate inside the browser's security sandbox, which enforces strict Cross-Origin Resource Sharing (CORS) policies on localhost requests.

Proxync's API Workbench executes HTTP requests through our native desktop Rust networking engine (`reqwest`) directly at the operating system socket layer. Because requests bypass the browser engine entirely, you never encounter CORS errors when testing private endpoints.

### How does 1-Click IDE Jump work with Cursor and VS Code?
When Proxync inspects incoming requests or logs an API error in the Traffic Inspector, it matches the route path against your active workspace directory.

Clicking the **Jump** button invokes your operating system's registered editor URI schemes (`cursor://file/...:line:col` or `vscode://file/...:line:col`), immediately opening your editor to the exact line of code handling that endpoint.

---

## System Architecture & OS Integration

### How does Proxync prevent orphaned background processes and locked ports?
CLI tunneling tools often leave zombie processes running in the background after you close a terminal tab, leaving ports like `3000` or `2222` mysteriously locked.

Proxync isolates all tunnel child processes into dedicated POSIX process groups (`setpgid(0, 0)` on Unix and Windows job object trees). When you stop a tunnel or quit Proxync, the operating system kernel cleanly and atomically terminates the entire process tree at once.

### How does Smart OS Reconnaissance find my dev servers without system noise?
Proxync inspects listening sockets using native operating system calls. On macOS, it combines `lsof` with the Darwin kernel's `proc_pidpath` system call to identify executable binary names and working project directories while automatically filtering out internal Apple background daemons (`ControlCenter`, `rapportd`, `identityservicesd`). Only genuine developer servers are presented.

### How much CPU and memory does Proxync consume?
Because Proxync is built with **Tauri v2 and Rust** rather than heavy Electron wrappers, its idle memory footprint is typically under **40MB RAM** (compared to 300MB–800MB for Electron-based developer tools). CPU consumption is virtually 0% when idle.

### Is Proxync really free? Are there any hidden limits?
**Proxync is 100% free and open-source under the Apache 2.0 license.** There are no paywalls, no bandwidth throttling, no artificial tunnel session time limits, and no team seat licenses.

### Which operating systems are supported today?
- **Windows (x64):** Available now via signed installer (`Proxync_0.2.3_x64-setup.exe` or `.msi`).
- **macOS (Apple Silicon & Intel):** Available now via Universal `.dmg` (`Proxync_0.2.3_universal.dmg`).
- **Linux (x64):** Available now via native `.deb` package (`proxync_0.2.3_amd64.deb`) and universal `.AppImage` (`Proxync_0.2.3_amd64.AppImage`).

---

## What to Read Next

- **[Quickstart Guide](/docs/quickstart)** — Test your first tunnel in 3 minutes.
- **[Tunnels & Sharing](/docs/tunnels)** — Explore tunnel flags and Resilient Standby Mode.
- **[Architecture Guide](/docs/architecture)** — Deep-dive into our dual-layer Rust and Next.js architecture.
