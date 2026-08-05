<p align="center">
  <img src="packages/desktop/public/logo.svg" alt="Proxync" width="120" />
</p>

<h1 align="center">Proxync</h1>

<p align="center">
  Tunnel your localhost to the world. Capture every request. Standalone, local-first developer studio.
</p>

<p align="center">
  <a href="https://github.com/Inilax/Proxync/stargazers"><img src="https://img.shields.io/github/stars/Inilax/Proxync?style=flat" alt="Stars" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Inilax/Proxync?style=flat" alt="License" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/issues"><img src="https://img.shields.io/github/issues-raw/Inilax/Proxync?style=flat" alt="Issues" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat" alt="PRs Welcome" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/graphs/contributors"><img src="https://img.shields.io/github/contributors/Inilax/Proxync?style=flat" alt="Contributors" /></a>&nbsp;
  <a href="https://discord.gg/cu682ak5A"><img src="https://img.shields.io/badge/Community-Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

---

Proxync is a standalone, local-first desktop application that sits next to your running server. You click a button, and suddenly your `localhost:3000` is available on a public URL — with every request flowing through it logged, inspectable, and replayable. It's like ngrok, Postman, and Swagger UI had a baby, running entirely on your machine.

### Why this exists

We got tired of switching between five tabs to debug a single webhook. The tunnel in one window. Postman in another. Swagger open somewhere. Proxync puts all of that in one place, running completely offline with local file-based state serialization.

### What you get

- **One-click tunneling** — Direct Cloudflare Tunnels (free public HTTPS) or Localtunnel. Pick one, click Go Live.
- **Local Intercepting TCP Proxy** — Runs a lightweight Rust-based interceptor locally that captures and logs request and response headers dynamically.
- **Live traffic inspector** — Every request and response captured in real-time. Headers, body, timing, status — the works.
- **Auto-generated Swagger docs** — We watch your traffic and build an OpenAPI spec from it. No YAML required.
- **Built-in request runner** — Basically Postman, but inside the app. Replay captured requests, tweak them, save collections.
- **Observability Hub** — Monitor environment health, active request volume, and workspace posture metrics.
- **Interactive Documentation Hub** — Integrated offline documentation for setting up tunnels, routing, and developer workflows.
- **Custom domains** — Map custom domains directly to your local tunnel with registrar tips and instant verification.

### The stack

The application is built on [Tauri v2](https://v2.tauri.app/) (Rust backend, React + TypeScript frontend). It runs entirely offline and standalone, saving state locally in your system's AppData or configuration folder (`AppData/Roaming/Proxync/data.json` on Windows or `~/.config/Proxync/data.json` on macOS/Linux) with zero external API dependencies.

### Get it running

You need Node ≥ 20 and the Rust toolchain.

```bash
# Clone the repository
git clone https://github.com/Inilax/Proxync.git
cd proxync
npm install

# Start the desktop app in development mode
cd packages/desktop
npm run tauri dev
```

That's it. The Tauri window opens, you see your running processes, you hit Share, and you're live.

### Want to contribute?

We'd genuinely love that. Here's the gist:

1. Fork it
2. Branch off: `git checkout -b feature/main-your-thing`
3. Make sure it compiles: `npm run build`
4. Open a PR

The [`CHANGELOG.md`](CHANGELOG.md) tracks what's been built and what's next.

A few ground rules:
- Don't block the Tauri main thread — `tokio::spawn` is your friend for asynchronous background operations.
- Keep all local app state serialization non-blocking and thread-safe.
- Ensure spawned child processes (like `cloudflared` or `localtunnel`) are correctly monitored and terminated on close to prevent orphan processes.

### What's next

- [ ] **v0.2.0 Stabilization & UX Redesign** — Fix all minor bug issues raised in v0.1.8, complete studio UI/UX redesign, and include enhanced custom domain verification in v0.2.0.
- [ ] **Native High-Speed Proxync Tunneling** — Launch our own proprietary Proxync Tunneling infrastructure alongside Cloudflare Tunnels — built for higher efficiency, lower latency, and maximum speed.
- [ ] **CLI Companion (`proxync-cli`)** — Run quick tunnels directly from your terminal without opening the desktop GUI when you only need tunneling.
- [ ] **AI-Powered Traffic Debugger** — Intelligent local agent that automatically flags slow endpoints, common header/schema mismatches, and suggests fixes.
- [ ] **Enterprise Edition** — Team collaboration workspaces, team sharing, live session preservation with Proxync Tunnels for high uptime, voice chat, and public custom domain visibility.
- [ ] **On-The-Fly Request & Response Mocking** — Intercept and tweak HTTP request/response headers and payloads on the fly before they hit your localhost.
- [ ] **Offline-First SQLite State Engine** — Transition local state serialization to SQLite for high-performance log querying and large payload storage.
- [ ] **Native OS Webhook & Tunnel Notifications** — Instant OS notifications for incoming webhooks and tunnel lifecycle events.

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
