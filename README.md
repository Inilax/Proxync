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
  <a href="https://github.com/Inilax/Proxync/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat" alt="PRs Welcome" /></a>&nbsp;
  <a href="https://github.com/Inilax/Proxync/graphs/contributors"><img src="https://img.shields.io/github/contributors/Inilax/Proxync?style=flat" alt="Contributors" /></a>
</p>

---

Proxync is a standalone, local-first desktop application that sits next to your running server. You click a button, and suddenly your `localhost:3000` is available on a public URL — with every request flowing through it logged, inspectable, and replayable. It's like ngrok, Postman, and Swagger UI had a baby, running entirely on your machine.

### Why this exists

We got tired of switching between five tabs to debug a single webhook. The tunnel in one window. Postman in another. Swagger open somewhere. Proxync puts all of that in one place, running completely offline with local SQLite/file persistence.

### What you get

- **One-click tunneling** — Direct Cloudflare Tunnels (free public HTTPS) or Localtunnel. Pick one, click Go Live.
- **Local Intercepting TCP Proxy** — Runs a lightweight Rust-based interceptor locally that captures and logs request and response headers dynamically.
- **Live traffic inspector** — Every request and response captured in real-time. Headers, body, timing, status — the works.
- **Auto-generated Swagger docs** — We watch your traffic and build an OpenAPI spec from it. No YAML required.
- **Built-in request runner** — Basically Postman, but inside the app. Replay captured requests, tweak them, save collections.
- **Custom domains** — Map custom domains directly to your local tunnel with registrar tips and instant verification.

### The stack

The application is built on [Tauri v2](https://v2.tauri.app/) (Rust backend, React + TypeScript frontend). It runs entirely offline and standalone, saving state locally in your Windows AppData folder (`AppData/Roaming/Proxync/data.json`) with zero external API dependencies.

### Get it running

You need Node ≥ 20 and the Rust toolchain.

```bash
git clone https://github.com/Inilax/Proxync.git
cd proxync
npm install

# Start the desktop app in development mode
npm run dev
```

That's it. The Tauri window opens, you see your running processes, you hit Share, and you're live.

### Want to contribute?

We'd genuinely love that. Here's the gist:

1. Fork it
2. Branch off: `git checkout -b feature/main-your-thing`
3. Make sure it compiles: `npm run build`
4. Open a PR

If you're looking for context on the codebase, check [`.agents/architecture.json`](.agents/architecture.json) — it's a map of the modules in the project. The [`CHANGELOG.md`](CHANGELOG.md) tracks what's been built and what's next.

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
