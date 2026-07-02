# Proxync by Inilax

> Instant tunnel + real-time collaboration workspace for dev teams.

## What is Proxync?
Proxync is a developer tunneling tool (similar to ngrok) combined with a real-time collaboration workspace. Start your dev server, click Share, and send a link. The other person sees the live, running build — complete with live chat, voice, and request inspection — without ever leaving the page.

## Tech Stack & Architecture
- **API (Control Plane)**: NestJS + Prisma + PostgreSQL + Redis
- **Desktop App**: Tauri 2 (Rust backend) + React + Vite (Frontend)
- **Database**: PostgreSQL 16 (via Docker)
- **Cache / PubSub**: Redis 7 (via Docker)

### How it works
1. **Rust Agent**: The Tauri desktop app runs a Rust agent (`src-tauri/src/lib.rs`) that establishes a WebSocket relay connection to the API and dynamically proxies local ports.
2. **NestJS API Gateway**: The `RelayGateway` manages incoming WebSocket connections for tunneling traffic, as well as handling live chat and presence updates via Redis PubSub.
3. **Desktop UI**: The React app provides a `TunnelsView` for managing tunnels and viewing real-time request logs, and a `ChatPanel` for workspace collaboration.

## Repository Structure
```text
proxync/
├── packages/
│   ├── api/       # NestJS backend (API, DB schema, WS gateway)
│   ├── desktop/   # Tauri app (React frontend + Rust agent)
│   └── web/       # Public browser viewer (React + Vite)
├── docker-compose.yml # Postgres & Redis
└── .env.example
```

## Quick Start (Development)

### Prerequisites
- Node.js ≥ 20, npm ≥ 10
- Docker Desktop (for Postgres & Redis)
- Rust toolchain (for Tauri desktop app)

### 1. Clone & Install
```bash
git clone <repo>
cd proxync
npm install
```

### 2. Start Infrastructure
Run the database and cache in the background:
```bash
docker-compose up -d
```
*(This starts Postgres on `5432` and Redis on `6379`, plus Adminer on `8080`)*

### 3. Configure Environment
Ensure your environment variables are configured. For example, for the API:
```bash
cp packages/api/.env.example packages/api/.env
```
*(Ensure `DATABASE_URL` and `REDIS_URL` point to your local docker instances)*

### 4. Database Setup
Apply the latest Prisma schema to your local database:
```bash
cd packages/api
npx prisma migrate dev
```

### 5. Run the API
```bash
cd packages/api
npm run dev
```
- API runs on `http://localhost:3000`
- Swagger Docs available at `http://localhost:3000/api`

### 6. Run the Desktop App
```bash
cd packages/desktop
npm run tauri dev
```
- The Vite server runs on `http://localhost:1420`
- Tauri will automatically compile the Rust agent and launch the native desktop window.

## Contributing Guidelines
Please review the internal playbook (`.agents/skills/portly-engineering/SKILL.md`) for our codebase methodology, NestJS module rules, and code review checklists. Key rules include:
- Always read `packages/api/prisma/schema.prisma` before making data changes.
- Ensure any controller using `@UseGuards(BearerGuard)` imports `AuthModule`.
- Avoid `redis.keys()` in production paths; use in-memory maps or `SCAN`.
- Do not block the Tauri main thread in Rust; use `tokio::spawn` for async loops.

Check `CHANGELOG.md` for a summary of completed features and upcoming roadmap plans.
