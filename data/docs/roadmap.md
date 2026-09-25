---
title: Roadmap
description: Feature roadmap, completed releases, and future vision for Proxync.
---

We are building Proxync in the open with a focus on simplicity, developer privacy, and eliminating friction in everyday local development.

Here is what we have accomplished and what is coming next.

---

## Completed in v0.2.3 (Current Release)

- [x] **API Schema Drifter Hotfix** — Resolved an issue where the runtime API schema drifter was failing to detect and reconcile contract drift against active endpoints during traffic inspection.
- [x] **Dependent Bot Noise Shield Fix** — Fixed false-positive triggers and traffic noise filtering for dependent background bots, health checkers, and keep-alive pingers.
- [x] **Workspace Dependency Modernization** — Bumped all outdated workspace libraries and dependencies to their latest stable releases, addressing security vulnerabilities.
- [x] **Minor Bug Fixes & Stability Polish** — General engine improvements across socket recon fallback, UI state preservation, and background process event handling.

---

## Completed in v0.2.2

- [x] **Dynamic Relay DNS (`relay.proxync.dev:2222`)** — Low-latency origin routing with seamless background server failovers.
- [x] **Resilient Standby Mode** — Public URLs stay active across local server hot-reloads and restarts, eliminating broken webhook deliveries.
- [x] **Zero-Orphan Process Group Architecture** — POSIX process isolation (`setpgid(0, 0)`) cleanly terminates all child tunnel helpers on exit, leaving zero zombie processes holding open ports.
- [x] **SSRF Intranet Shield** — Strict loopback whitelisting (`is_permitted_probe_host`) blocks tunnels from scanning or probing private internal network addresses.
- [x] **macOS Darwin Kernel Port Recon** — High-accuracy port scanning using `lsof` and `proc_pidpath` to resolve true process names and root project paths.
- [x] **Ghost Daemon Noise Filtering** — Automatically ignores internal operating system daemons (`ControlCenter`, `rapportd`) so only real web servers are shown.
- [x] **GUI Toolchain PATH Injection** — Automatically detects user-space Node managers (`pnpm`, `bun`, `nvm`, `volta`, `asdf`, Homebrew) in packaged desktop builds.
- [x] **Pro Debugger & Dual-Stream Log Rotation** — Dual-stream logging (`app.log` at 5MB, `traffic.log` at 10MB) with automatic file rotation and startup hardware diagnostics.
- [x] **Universal Native File Dialogs** — Native OS file choosers via `tauri-plugin-dialog` supporting Windows, macOS, and Linux (KDE, Sway, Wayland via XDG Portal).
- [x] **Persistent Playground State** — Automatic draft and response preservation across restarts so you never lose unsaved API work.
- [x] **Cross-Platform Release Bundles** — Native packaged distribution across Windows (`.exe` / `.msi`), macOS Universal (`.dmg`), and Linux (`.deb` / `.AppImage`).
- [x] **Decommissioned Localtunnel & Added Python HTTP Support** — Cleaned legacy dependencies and added one-click sharing for Python's built-in `http.server`.

---

## Completed in v0.2.1

- [x] **Proxync Native SSH Origin Relay** — Proprietary Direct Origin Port 2222 infrastructure with ephemeral Ed25519 TLS certificate signing.
- [x] **Dynamic Netstat Full-Port Service Discovery** — Discovers web servers across all listening ports on IPv4 and IPv6 without hardcoded port lists.
- [x] **Multi-Tunnel Traffic Segregation** — Independent traffic inspection and attribution for concurrent dev servers.
- [x] **Automated Bot Noise Filtering** — Automatically hides internet vulnerability scans (`/.env`, `/.git`, `*.pem`) from your traffic stream.
- [x] **OpenAPI Spec Ingestion & Codebase Scanner** — Auto-generates OpenAPI 3.0 documentation with dynamic path parameterization (`/api/todos/{id}`).
- [x] **Emergency Security Radar** — Startup pre-flight check for zero-day security releases.
- [x] **Batch "Stop All" Tunnels** — One-click button to cleanly shut down all active tunnels.

---

## Planned for v0.3.0 & Beyond

- [ ] **Terminal CLI Companion (`proxync-cli`)** — Launch quick tunnels and stream live traffic directly in your terminal without opening the desktop GUI.
- [ ] **On-The-Fly Request & Response Mocking** — Intercept and modify HTTP request/response headers or JSON bodies before they reach your local dev server.
- [ ] **Automated Test Suite Synthesizer** — Generate automated test suites (Jest, Vitest, Pytest, Playwright) directly from live captured traffic with one click.
- [ ] **Offline SQLite Engine** — High-performance indexed local storage for analyzing large traffic histories and deep fuzzy search.
- [ ] **Desktop Webhook Notifications** — Instant operating system notifications when an external service delivers a webhook.
- [ ] **Enterprise Edition** — Shared team workspaces, permanent team subdomains, role-based permissions, and centralized team logging.

---

## Have a Feature Request?

Proxync is driven by developer feedback. If you have an idea, ran into a bug, or want to suggest an improvement, please open an issue or join the discussion on [GitHub](https://github.com/Inilax/Proxync)!
