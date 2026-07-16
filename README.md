<p align="center">
  <img src="docs/assets/logo.png" alt="Proxync" width="64" />
</p>

<h1 align="center">Proxync</h1>

<p align="center">
  Tunnel your localhost to the world. Capture every request. Debug together.
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

Proxync is a desktop app that sits next to your running server. You click a button, and suddenly your `localhost:3000` is available on a public URL — with every request flowing through it logged, inspectable, and replayable. It's like ngrok, Postman, and Swagger UI had a baby, and that baby could also group-chat.

### Why this exists

We got tired of switching between five tabs to debug a single webhook. The tunnel in one window. Postman in another. Swagger open somewhere. Slack for "hey can you hit that endpoint again?". Proxync puts all of that in one place.

### What you get

- **One-click tunneling** — LAN, [Localtunnel](https://theboroer.github.io/localtunnel-www/) (free public HTTPS), or your own custom domain. Pick one, click Go Live.
- **Live traffic inspector** — Every request and response captured in real-time. Headers, body, timing, status — the works.
- **Auto-generated Swagger docs** — We watch your traffic and build an OpenAPI spec from it. No YAML required.
- **Built-in request runner** — Basically Postman, but inside the app. Replay captured requests, tweak them, save collections.
- **Team chat** — Text channels with presence indicators and screenshot sharing. No more "check Slack".
- **Custom domains** — Register `api.yourcompany.com`, verify via DNS, bind it to your tunnel. Your own mini Vercel for dev.

### The stack

The desktop app is [Tauri 2](https://v2.tauri.app/) (Rust backend, React + TypeScript frontend). The API gateway is [NestJS](https://nestjs.com/) with [Prisma](https://www.prisma.io/) + PostgreSQL and Redis for pub/sub. Everything talks over WebSockets.

### Get it running

You need Node ≥ 20, Docker (for Postgres + Redis), and the Rust toolchain.

```bash
git clone https://github.com/Inilax/Proxync.git
cd proxync
npm install

# spin up postgres + redis
docker-compose up -d

# configure and seed the database
cp packages/api/.env.example packages/api/.env
cd packages/api && npx prisma db push

# start the api (runs on :3939)
npm run dev

# in another terminal — start the desktop app
cd packages/desktop
npm run tauri dev
```

That's it. The Tauri window opens, you see your running processes, you hit Share, and you're live.

### Want to contribute?

We'd genuinely love that. Here's the gist:

1. Fork it
2. Branch off: `git checkout -b feature/main-your-thing`
3. Make sure it compiles: `cd packages/api && npm run build` and `cd packages/desktop && npm run build`
4. Open a PR

If you're looking for context on the codebase, check [`.agents/architecture.json`](.agents/architecture.json) — it's a map of every module, model, and file in the project. The [`CHANGELOG.md`](CHANGELOG.md) tracks what's been built and what's next.

A few ground rules:
- Read `prisma/schema.prisma` before touching the data layer
- Don't block the Tauri main thread — `tokio::spawn` is your friend
- Avoid `redis.keys()` in hot paths
- If your controller uses `@UseGuards(BearerGuard)`, import `AuthModule`

Or just open an issue. Seriously, even "this button looks weird" is helpful.

### What's next

- [ ] Agentic debugger — an AI friend that watches your traffic and flags issues before you do
- [ ] Voice rooms (WebRTC)
- [ ] Browser-based tunnel viewer
- [ ] OS notifications for incoming requests
- [ ] Plugin system for custom middleware
- [ ] Rate limiting dashboards

---

<p align="center">
  <img src="docs/assets/logo.png" alt="Proxync" width="28" />
</p>

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Inilax">Inilax</a></sub><br/>
  <sub>
    <a href="https://github.com/Inilax/Proxync/issues">Report Bug</a> · 
    <a href="https://github.com/Inilax/Proxync/issues">Request Feature</a> · 
    <a href="https://github.com/Inilax/Proxync/discussions">Discussions</a>
  </sub>
</p>
