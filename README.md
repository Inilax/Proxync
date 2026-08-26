<p align="center">
  <img src="packages/desktop/public/logo.svg" alt="Proxync" width="120" />
</p>

<h1 align="center">Proxync</h1>

<p align="center">
  Tunnel your localhost to the world. Capture every request. Standalone, local-first developer studio.
</p>

<p align="center">
  <a href="https://github.com/Inilax/Proxync/releases"><img src="https://img.shields.io/badge/version-v0.2.1-blue?style=flat" alt="Version v0.2.1" /></a>&nbsp;
  <!-- <a href="https://github.com/Inilax/Proxync"><img src="https://img.shields.io/badge/platform-Windows-lightgrey?style=flat" alt="Windows" /></a>&nbsp; -->
  <a href="https://github.com/Inilax/Proxync/stargazers"><img src="https://img.shields.io/github/stars/Inilax/Proxync?style=flat" alt="Stars" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Inilax/Proxync?style=flat" alt="License" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/issues"><img src="https://img.shields.io/github/issues-raw/Inilax/Proxync?style=flat" alt="Issues" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat" alt="PRs Welcome" /></a>&nbsp;
  <a href="https://discord.gg/cu682ak5A"><img src="https://img.shields.io/badge/Community-Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

---

Proxync is a standalone, local-first desktop application available on **Windows** (with **Linux** and **macOS** coming in the next release) that sits right next to your running server. Click a button, and your `localhost:3000` is instantly accessible on a secure public URL — with every request flowing through it logged, inspectable, and replayable in real time.

It combines the best of **ngrok**, **Postman**, and **Swagger UI** into a single native workspace running entirely on your machine.

### Why this exists

We got tired of switching between five tabs and apps just to test a single webhook or API route: one window for the tunnel, one for Postman, another for Swagger, and a terminal for logs. Proxync brings everything into one unified, offline-ready desktop studio with local file-based state serialization and zero cloud lock-in.

---

### What you get

- **Native High-Speed Proxync Tunneling** — Ultra-low latency, zero-setup proprietary tunneling infrastructure built for high throughput and instantaneous connections alongside Cloudflare Tunnels and Localtunnel.
- **Resilient Standby Mode** — Server restarts (`Ctrl+C` or hot-reload) won't kill your tunnel. Proxync preserves your public URL in standby and automatically recovers the moment your local dev server boots back up.
- **Live Traffic Inspector & Intercepting TCP Proxy** — Real-time request and response logging with full header inspection, body formatting (JSON/XML/form-data), timing breakdown, and status codes.
- **Auto-Generated OpenAPI / Swagger Docs** — Analyzes your live incoming and outgoing HTTP traffic to build OpenAPI 3.0 specifications on the fly — no manual YAML writing required.
- **Built-in API Workbench & Request Runner** — Test, tweak, and replay endpoints directly inside the app with full parameter editing, collection grouping, and native CORS-bypassing execution.
- **Smart Process & Framework Discovery** — Automatically detects active dev servers (Next.js, Vite, Express, FastAPI, Django, Rails, Spring Boot, etc.) and open ports with 1-click sharing.
- **Observability & Health Dashboard** — Monitor real-time traffic volume, latency metrics, environment health, and diagnostic support bundles.
- **Custom Domains** — Map your own domains directly to your local tunnels with DNS verification guidelines and instant status checks.
- **Local-First & Data Privacy** — Zero telemetry on request bodies. All logs, settings, and workspace profiles are stored strictly on your local machine.

---

### Platform Support

Proxync is engineered with [Tauri v2](https://v2.tauri.app/) and Rust for minimal memory footprint and native performance:

| Platform | Architecture | Binary / Package | State Storage Location | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Windows 10 / 11 (`x64`) | `.msi`, NSIS Setup `.exe` | `%APPDATA%\Proxync\` (`AppData/Roaming/Proxync/`) | Supported |
| **Linux** | Ubuntu, Debian, Fedora, Arch (`x64`) | `.deb`, `.AppImage` | `~/.config/Proxync/` | Planned (Next Release) |
| **macOS** | Apple Silicon & Intel | `.dmg`, `.app` | `~/Library/Application Support/Proxync/` | Planned (Next Release) |

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

The compiled native installer or bundle will be generated under `packages/desktop/src-tauri/target/release/bundle/` (e.g. `.exe`/`.msi` on Windows).

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
- Avoid blocking the Tauri main thread — use `tokio::spawn` for asynchronous background processes.
- Ensure all local app state serialization is thread-safe and non-blocking.
- Guarantee child tunnel processes are monitored and gracefully terminated on application exit.

---

### Roadmap

- [x] **v0.2.1 Stabilization & UX Redesign** — Complete studio UI/UX redesign, framework fingerprinting, and enhanced custom domain verification.
- [x] **Native High-Speed Proxync Tunneling** — Proprietary low-latency WebSocket/SSH origin relay infrastructure with instant standby URL preservation.
- [ ] **Cross-Platform Desktop Support (Linux & macOS)** — Native packaging for Linux (`.deb`, `.AppImage`) and macOS (`.dmg`, `.app` with Apple Silicon & Intel support) in the upcoming release.
- [ ] **CLI Companion (`proxync-cli`)** — Run quick tunnels directly from your terminal without opening the desktop GUI when you only need tunneling.
- [ ] **AI-Powered Traffic Debugger** — Local diagnostic intelligence that flags slow endpoints, common header/schema mismatches, and suggests fixes.
- [ ] **On-The-Fly Request & Response Mocking** — Intercept and mutate HTTP request/response headers and payloads before hitting localhost.
- [ ] **Offline-First SQLite State Engine** — High-performance indexed storage for large payload analysis and fast log queries.
- [ ] **Native OS Webhook & Tunnel Notifications** — Instant OS alerts for incoming webhooks and tunnel lifecycle events.
- [ ] **Enterprise Edition** — Team collaboration workspaces, team sharing, live session preservation for team uptime, and organization-wide custom domains.

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
