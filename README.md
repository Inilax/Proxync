<p align="center">
  <img src="packages/desktop/public/logo.svg" alt="Proxync" width="120" />
</p>

<h1 align="center">Proxync</h1>

<p align="center">
  Tunnel your localhost to the world. Capture every request. Standalone, local-first developer studio.
</p>

<p align="center">
  <a href="https://github.com/Inilax/Proxync/releases"><img src="https://img.shields.io/badge/version-v0.2.3-blue?style=flat" alt="Version v0.2.3" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync"><img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=flat" alt="Platform: Windows | Linux | macOS" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/stargazers"><img src="https://img.shields.io/github/stars/Inilax/Proxync?style=flat" alt="Stars" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Inilax/Proxync?style=flat" alt="License" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/issues"><img src="https://img.shields.io/github/issues-raw/Inilax/Proxync?style=flat" alt="Issues" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat" alt="PRs Welcome" /></a>&nbsp;
  <a href="https://scorecard.dev/viewer/?uri=github.com/Inilax/Proxync"><img src="https://api.scorecard.dev/projects/github.com/Inilax/Proxync/badge" alt="OpenSSF Scorecard" /></a>&nbsp;
  <a href="https://discord.gg/cu682ak5A"><img src="https://img.shields.io/badge/Community-Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

---

Proxync is a standalone, local-first desktop application available across **Windows**, **Linux**, and **macOS** that sits right next to your running dev server. Click a button, and your `localhost:3000` is instantly accessible on a secure public URL — with every request flowing through it logged, inspectable, and replayable in real time.

It combines the best of **ngrok**, **Postman**, and **Swagger UI** into a single native workspace running entirely on your machine.

### Why this exists

We got tired of switching between five tabs and apps just to test a single webhook or API route: one window for the tunnel, one for Postman, another for Swagger, and a terminal for logs. Proxync brings everything into one unified, offline-ready desktop studio with local file-based state serialization and zero cloud lock-in.

---

### What you get

- **Native High-Speed Proxync Tunneling & Origin Relay** — Ultra-low latency, zero-setup proprietary tunneling infrastructure (`relay.proxync.dev` on port 2222) alongside Cloudflare Quick Tunnels and local LAN sharing.
- **Resilient Standby Mode** — Server restarts (`Ctrl+C` or hot reload) won't destroy your public URL. Proxync holds your public URL in standby and automatically recovers the moment your local dev server boots back up.
- **Live Traffic Inspector & Intercepting TCP Proxy** — Real-time request and response capture with full header inspection, body formatting (JSON, XML, HTML, form-data), status tracking, and latency breakdowns.
- **Real-Time Schema Drift Detection** — Pure AST diff engine that continuously analyzes live incoming/outgoing payloads against your baseline OpenAPI contracts, immediately flagging breaking changes, type mutations, and missing parameters.
- **Auto-Generated OpenAPI / Swagger 3.0 Specs** — Synthesizes OpenAPI 3.0 specifications on the fly from intercepted traffic with intelligent noise and bot probe filtering. Includes built-in interactive Swagger UI.
- **Built-in API Workbench & Request Runner** — Postman-grade REST API playground with synchronous restart persistence, draft/response tab caching, collections management, and native CORS-bypassing execution.
- **Instant Multi-Language Code Snippets** — 1-click export for intercepted or crafted requests into cURL, JavaScript (Fetch), Python (Requests), Go, and Rust.
- **Smart Multi-Platform Reconnaissance** — OS-native port & process scanner (Windows `netstat`/WMI, Linux `ss`/`/proc`, macOS Darwin kernel `proc_pidpath`/`lsof`). Automatically detects frameworks (Next.js, Vite, Express, FastAPI, Django, Flask, Rails, Spring Boot, Python HTTP server, Go, etc.) with system daemon noise filtering, whitespace-safe command parsing, and symlink cycle defense.
- **Zero-Orphan Process Group Architecture** — POSIX process group isolation (`setpgid(0, 0)`) ensures child tunnel processes (SSH, Cloudflared) are cleanly terminated on exit, leaving zero orphan processes holding open ports.
- **GUI Toolchain PATH Resolution** — Dynamically discovers and injects user-space Node & package manager paths (`pnpm`, `bun`, `nvm`, `volta`, `asdf`, `homebrew`) so tunnels execute seamlessly inside packaged desktop GUI sessions.
- **Custom Domains & Multi-Provider DoH** — Map your own branded domains directly to local tunnels with resilient DNS-over-HTTPS token verification (Google DoH with Cloudflare DoH fallback).
- **Seamless In-App Auto-Updates** — Native background updater powered by Tauri v2 with Minisign cryptographic verification, dual-manifest fallback, and an automated 2-second grace countdown relaunch flow.
- **Local-First Privacy & System Telemetry** — Zero telemetry on request bodies. All logs, settings, and workspace profiles are stored strictly on your local machine. Includes startup hardware/OS diagnostic banners (`os_info`), Rust panic hooks, and dual-stream rotating disk logs (`app.log` at 5MB, `traffic.log` at 10MB).
- **Hardened Security & Supply Chain Defense** — Evaluated with OpenSSF Scorecard, automated CodeQL static analysis, SSRF & TCP latency probe whitelisting, strict hostname sanitization (CWE-20 immunity), and universal native file dialogs via `tauri-plugin-dialog`.

---

### Platform Support

Proxync is engineered with [Tauri v2](https://v2.tauri.app/) and Rust for minimal memory footprint and native performance:

| Platform | Architecture | Binary / Package | State Storage Location | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Windows 10 / 11 (`x64`) | `.msi`, NSIS Setup `.exe` | `%APPDATA%\Proxync\` (`AppData/Roaming/Proxync/`) | Supported |
| **Linux** | Ubuntu, Debian, Fedora, Arch (`x64`) | `.deb`, `.AppImage` | `~/.config/Proxync/` | Supported |
| **macOS** | Apple Silicon & Intel (`arm64`, `x64`) | `.dmg`, `.app` | `~/Library/Application Support/Proxync/` | Supported |

---

### Get it running

#### Prerequisites
- **Node.js** ≥ 20
- **Rust toolchain** (`cargo`, `rustc`) — [Install Rust](https://www.rust-lang.org/tools/install)

#### Clone & Run in Development

```bash
# 1. Clone the repository
git clone https://github.com/Inilax/Proxync.git
cd Proxync

# 2. Install dependencies
npm install

# 3. Start the desktop studio in development mode
cd packages/desktop
npm run tauri dev
```

#### Build Production Binaries

```bash
cd packages/desktop
npm run tauri build
```

The compiled native installer or bundle will be generated under `packages/desktop/src-tauri/target/release/bundle/`:
- **Windows**: `.exe` (NSIS) / `.msi`
- **Linux**: `.deb` / `.AppImage`
- **macOS**: `.dmg` / `.app`

---

### Want to contribute?

We'd love your help! Here is how to get started:

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Ensure TypeScript and Rust checks pass:
   ```bash
   npm run build
   cargo check --manifest-path packages/desktop/src-tauri/Cargo.toml
   ```
4. Submit a Pull Request

Check out [`CHANGELOG.md`](CHANGELOG.md) for recent architectural milestones and release notes.

#### Guidelines:
- Avoid blocking the Tauri main thread — use `tokio::spawn` or `tauri::async_runtime::spawn_blocking` for asynchronous background processes.
- Ensure all local app state serialization is thread-safe and non-blocking.
- Guarantee child tunnel processes are isolated with process groups and gracefully terminated on application exit.
- Maintain zero hardcoded environment paths — all process targets and workspaces must be dynamically resolved at runtime.

---

### Roadmap

- [x] **Native High-Speed Proxync Tunneling** — Proprietary low-latency origin relay infrastructure (`relay.proxync.dev` on port 2222) with instant standby URL preservation across dev server restarts.
- [x] **Real-Time Schema Drift & OpenAPI Synthesis** — Continuous AST diff engine detecting contract breaking changes, paired with automated OpenAPI 3.0 generation from live traffic.
- [x] **Postman-Grade API Workbench** — Local-first REST client with synchronous restart persistence, collection grouping, and native CORS-bypassing runner.
- [ ] **macOS & Linux Production Stabilization** — Multi-distribution hardening across Linux (Wayland/XDG desktop portal, AppImage, `.deb`) and macOS (Apple Silicon notarization, Gatekeeper compliance, and Darwin kernel syscall refinements).
- [ ] **CLI Companion (`proxync-cli`)** — Ultra-lightweight terminal companion to launch tunnels, test endpoints, and stream traffic logs directly from the command line.
- [ ] **Enterprise Edition** — Team collaboration workspaces, persistent shared tunnels, organization-wide custom domains, centralized audit telemetry, and autonomous AI agent background execution.
- [ ] **On-The-Fly Request & Response Mocking** — Intercept and mutate HTTP request/response headers and payloads before hitting localhost, enabling rapid frontend development against unbuilt backends.
- [ ] **Automated Test Suite Synthesizer** — 1-click generation of end-to-end integration tests (Jest, Vitest, Pytest, Playwright) synthesized directly from live intercepted traffic.
- [ ] **Offline-First SQLite State Engine** — High-performance indexed storage for large payload analysis, deep fuzzy search, and historical log queries.
- [ ] **Native OS Webhook & Tunnel Notifications** — Instant desktop alerts for incoming webhook deliveries and tunnel health events.

---

<p align="center">
  <img src="packages/desktop/public/logo.svg" alt="Proxync" width="36" />
</p>

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Inilax">Inilax</a></sub><br/>
  <sub>
    <a href="https://github.com/Inilax/Proxync/issues">Report Bug</a> · 
    <a href="https://github.com/Inilax/Proxync/issues">Request Feature</a> · 
    <a href="https://github.com/Inilax/Proxync/discussions">Discussions</a>
  </sub>
</p>
