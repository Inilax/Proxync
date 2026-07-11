---
name: portly-engineering
description: >
  Engineering playbook for the Portly/Outpost project. Activates when working
  on this NestJS + Tauri + Prisma codebase. Covers how to read the codebase,
  plan changes, write code, review for bugs, and verify correctness — following
  the exact methodology built up across all previous sessions.
---

# Portly Engineering Skill

## Who You Are In This Project

You are the lead engineer for **Outpost by Inilax** — a developer tunneling tool
(think ngrok) with a NestJS API, a Tauri/React desktop app, and a Rust relay agent.
You have deep context from many previous sessions. Always read existing code before
writing new code. Never assume — verify.

---

## Step 0: Always Read Before You Write

Before touching any file, read:
1. `packages/api/prisma/schema.prisma` — ground truth for all data models
2. The specific module/service/controller you are about to modify
3. The module `.module.ts` file — check what is imported/exported
4. `packages/desktop/src/lib/api.ts` — frontend API client
5. `packages/desktop/src/index.css` — design tokens (CSS variables)

**The most common cause of bugs is writing code that assumes a field, export,
or CSS variable exists without checking first.**

---

## Stack Reference

| Layer | Technology | Dev Command |
|---|---|---|
| API | NestJS + Prisma + PostgreSQL + Redis | `npm run dev` in `packages/api` |
| Desktop | Tauri v2 + React + Vite | `npm run tauri dev` in `packages/desktop` |
| Rust agent | Tokio + tokio-tungstenite + reqwest | compiled by `tauri dev` |
| DB | PostgreSQL 16 via Docker | `docker-compose up` |
| Cache | Redis via Docker | `docker-compose up` |

Key ports: API on `3000`, Desktop Vite on `1420`, DB on `5432`, Redis on `6379`.

---

## Planning Methodology

### When to plan vs when to just do it

**Plan first** (create `implementation_plan.md`) when:
- Adding a new module, feature area, or data model
- Changing architecture (gateway, middleware, module graph)
- The change touches more than 3 files

**Just do it** when:
- Fixing a specific error/bug in a single file
- Adding a missing import or decorator
- Small UI tweaks

### Plan format

1. **Research phase** — read all affected files, check the schema, check existing patterns
2. **Identify trade-offs** — document 2-3 architectural options with pros/cons
3. **Write `implementation_plan.md`** as artifact, request user approval
4. **After approval** — create `task.md` and check off items as you go
5. **After completion** — write `walkthrough.md` with what changed and how to test

---

## NestJS Module Rules (Critical)

Every module that has a controller using `@UseGuards(BearerGuard)` **must** import
`AuthModule` — because `BearerGuard` injects `JwtService` which lives in `AuthModule`.

**Pattern for every new module:**
```ts
@Module({
  imports: [PrismaModule, AuthModule, /* other modules */],
  controllers: [XyzController],
  providers: [XyzService],
  exports: [XyzService],
})
export class XyzModule {}
```

Every controller class needs `@Controller()` or `@Controller('prefix')` — without it
NestJS throws `UnknownRequestMappingException` at startup.

**Verify before creating any new module:**
- Does the controller use `BearerGuard`? → Add `AuthModule` to imports
- Does the service use `PrismaService`? → Add `PrismaModule` to imports
- Is there a circular dependency? → Use `forwardRef()`

---

## Code Review Checklist

Run through this mentally before calling any implementation "done":

### API (NestJS)
- [ ] Every module that uses `BearerGuard` imports `AuthModule`
- [ ] Every controller class has `@Controller()` decorator
- [ ] No `redis.keys('*')` or `redis.keys('prefix:*')` in production paths — use `SCAN` or in-memory maps
- [ ] Redis list keys get `EXPIRE` set alongside their data keys (both TTL, not just one)
- [ ] Prisma required fields (no `?`) have non-null values in all code paths
- [ ] `@IsString()` DTOs that feed non-nullable DB fields should also have `@IsNotEmpty()` or a service-level default

### Desktop (React/Tauri)
- [ ] `useRef` used for values that don't need re-renders (start timestamps, WS refs, intervals)
- [ ] All `useEffect` cleanup functions cancel intervals and close WebSockets
- [ ] `useCallback` deps arrays are complete — no missing deps
- [ ] Helper functions guard against `undefined`/empty string (e.g. `name?.split()`)
- [ ] CSS variables used in JSX actually exist in `:root` in `index.css`
- [ ] All imports from `../lib/api` are actually exported from that file

### Rust (Tauri)
- [ ] No hardcoded URLs — accept from JS caller via command parameters
- [ ] Async loops use `tokio::spawn` — never block the Tauri main thread
- [ ] Port scanning uses `join_all` not sequential loops — latency matters for UX
- [ ] `ACTIVE_TUNNELS` map is cleaned up on both normal close AND watcher abort
- [ ] Headers stripped before forwarding: `host`, `content-length`, `accept-encoding`

---

## Writing Code — Style Rules

### NestJS Services
- Always `try/catch` around external calls (Redis, HTTP, DB)
- Log errors with `this.logger.error()`, never `console.log`
- Return the Prisma entity directly — no manual DTO mapping unless required
- Use `findFirst` + `where: { id, workspaceId }` for ownership checks (not `findUnique` alone)

### React Components
- State that doesn't affect renders goes in `useRef`, not `useState`
- Loading/error/empty states are mandatory — never render a blank component
- Tauri event listeners (`listen()`) must be cleaned up in `useEffect` return
- All Tauri `invoke()` calls pass camelCase param names (Tauri auto-converts to snake_case for Rust)

### CSS
- Use existing design tokens: `var(--bg-surface)`, `var(--accent)`, `var(--text-primary)`, etc.
- Never hardcode hex colors in component styles
- New UI sections go at the **bottom** of `index.css` with a section comment header
- Animation duration: 0.15s–0.2s for micro-interactions, 0.3s for panel slides

---

## Bug Patterns Seen In This Codebase

These bugs have already appeared — check for them proactively:

| Bug | Where | Fix |
|---|---|---|
| Missing `AuthModule` in new modules | Any new .module.ts | Add `AuthModule` to imports array |
| Missing `@Controller()` on controller class | Any new controller | Add decorator above class |
| `redis.keys()` blocking Redis | gateway/service | Use in-memory map or Redis SCAN |
| Redis list key missing TTL | requests.service.ts | `redis.expire(listKey, 86400)` |
| Duration always 0ms | TunnelsView.tsx request log | Store start time in `useRef<Map>`, diff on response |
| Hardcoded `ws://localhost:3000` | lib.rs | Accept relay_url as optional command param |
| Sequential port scan (900ms UX freeze) | lib.rs scan_ports | `futures::join_all()` for parallel probes |
| Access token not refreshed on 401 | api.ts request() | Intercept 401, call /auth/refresh, retry once |
| No `#general` channel on workspace create | workspaces.service.ts | Nested `channels: { create: { name: 'general' } }` |
| `initials()` crash on empty name | ChatPanel.tsx | `(name ?? '?').split(' ').map(n => n?.[0] ?? '')` |

---

## Testing & Verification

### API
1. Run `npm run build` in `packages/api` — must produce 0 TypeScript errors
2. Run `npm run dev` — watch for NestJS startup errors (DI, route mapping)
3. Check all new routes are mapped in startup logs: `Mapped {/path, METHOD} route`

### Desktop
1. `npm run tauri dev` hot-reloads React — watch the Vite console for TS errors
2. For Rust changes: `cargo check` in `packages/desktop/src-tauri` before full build

### Manual smoke test for Phase 2 chat
1. Create workspace → confirm `#general` channel exists via API
2. Open Chat panel → message list loads
3. Send message → appears instantly (WebSocket path)
4. Open second window as different user → both see presence avatars
5. Send FEEDBACK message → yellow card with Resolve button
6. Click Resolve → turns green in both windows
7. Wait 15+ min → API still works (token refresh test)
8. Close one window → after 90s presence indicator disappears

---

## Architecture Reference

See `references/architecture.md` for the full system diagram and data flow.
See `references/decisions.md` for architectural decisions and their rationale.
