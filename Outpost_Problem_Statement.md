# Outpost — Problem Statement & Build Blueprint
*(working title — alternates: Foyer / Hatch / Greenroom — run a trademark/domain check before committing)*

> **Note on origin:** This is an independently scoped concept. No code, design files, or proprietary material from any prior project were used — only general market research (public tunneling/collaboration tools, 2026) and first-principles product thinking. Treat this as a clean-room rewrite, not a continuation of anyone else's work.

> **This is a real application**, not just an API: a desktop client (tunnel agent + UI for chat/voice/inspector) talking to a backend control plane, with a public no-install viewer in the browser for whoever receives the link.

---

## 1. Problem Statement

Distributed teams routinely need to show something running only on one person's machine to someone else — a teammate, a designer, a client. Today they choose between three bad options:

| Approach | Why it falls short |
|---|---|
| Deploy to staging/preview env | Needs CI/CD, infra cost, slow for a 10-minute check |
| Screen-share on a call | Synchronous only; viewer can't click around or inspect anything themselves |
| Plain tunnel tool (ngrok, Pinggy, Cloudflare Tunnel, etc.) | Gives a link and nothing else — no chat, no traffic visibility. Reviewers immediately fall back to Slack/Zoom to actually talk about what they're seeing |

The closest real competitor — **Livecycle** — solves "comment in context" with annotations/screenshots on shared preview environments, but it's Docker/PR-centric, and its toolkit stops at async comments — no live chat, no voice, no visibility into the HTTP traffic actually flowing through the tunnel.

**The gap:** an instant, zero-config tunnel **+** request/traffic inspection **+** real-time chat and voice — kept deliberately lean, without trying to also be a full async-annotation tool (see §6.2 for why that's been cut from scope).

## 2. Vision

> Start your dev server. Click share. Send a link. The other person sees the real, running build — can talk to you about it live, or leave it in chat with a screenshot — and you can see exactly what requests it's making, without leaving the page.

## 3. Why This Is Better, Not Just a Re-Skin

| Dimension | What exists today | What we do differently |
|---|---|---|
| Tunneling | Mature, commoditized (ngrok, Pinggy, Cloudflare Tunnel) | Don't compete on raw tunneling — assume parity, focus effort on what sits on top of it |
| Async feedback | Livecycle: dedicated comment/annotation subsystem | Folded into chat instead of built as a separate system (see §6.2) — same core value, far less to build |
| Sync collaboration | Nothing offers chat/voice tied to a live tunnel | Core differentiator, kept and sharpened |
| Debuggability | ngrok/Pinggy/Hookdeck offer request inspection, with zero collaboration | Bring request/webhook inspection into the *same* shared workspace reviewers are already in |
| Automation | Most tools are GUI/CLI only | First-class API keys, so CI pipelines and scripts can open/manage tunnels without a human in the loop |
| Pricing pain | ngrok's free/low tiers are bandwidth-starved and overage-heavy | Generous beta allowance, simple workspace-based pricing |

## 4. Target Personas

| Persona | Goal | Pain today |
|---|---|---|
| Engineer (author) | Fast, real feedback on a running branch | Reviewers can't easily run it themselves |
| Reviewer / teammate | See and interact with the actual build | Stuck with screen-share or a stale staging link |
| Product / Design (QA) | Validate a live build, leave precise feedback | Vague feedback without a way to attach a picture of what's wrong |
| External client/stakeholder | Preview work, zero install | Needs hand-holding through VPNs or staging logins |
| Engineer (debugging together) | See exactly what request/response caused a bug | Has to read logs out loud over a call |
| DevOps / CI pipeline | Open a tunnel programmatically as part of a pipeline step | No API-key-driven automation path in most consumer tunnel tools |

## 5. Goals (MVP) vs. Non-Goals

**Goals**
- Tunnel a local dev process to a secure HTTPS link in under 30 seconds, end to end.
- Every shared link opens into a **workspace**: live preview + chat + voice + request inspector, together.
- API keys so the same flow can be driven from a CI pipeline or CLI, not just the desktop GUI.
- Give the developer a lightweight request/response inspector for traffic flowing through their own tunnel.
- Auto-clean-up when the local process stops; track bandwidth against the beta allowance.

**Non-goals for now**
- A dedicated DOM-anchored annotation/comment subsystem (deliberately cut — see §6.2)
- Custom domains, SSO, audit logs (paid-tier, post-beta)
- Self-hosted/bring-your-own relay
- UDP tunneling / game-server use cases (real gap in the market, but not this product's wedge)
- Native mobile app, browser extension, VS Code extension (queued, not MVP)

## 6. Functional Requirements

### 6.1 Tunneling (table stakes)
- Auto-detect listening dev ports (Vite, Next.js, Rails, Django, etc.)
- One click → encrypted HTTPS tunnel with a short, memorable subdomain
- WebSocket pass-through (HMR-dependent frameworks need this to actually be usable)
- Auto-expire on process exit or idle timeout

### 6.2 "Comments" — reconsidered and cut as a standalone feature
Pixel-anchored, click-to-pin comments (the Livecycle-style approach) were in an earlier draft of this doc. On reflection, that's the wrong scope for an MVP:

- It requires injecting an overlay script into every HTML response the tunnel proxies — which breaks under strict CSP, SPA route changes, and responsive-layout drift (the anchor point moves under the comment).
- It's effectively a second product surface (a whole annotation subsystem) bolted onto what should be a lean tunnel + collaboration tool.

**What we keep instead:** the underlying need — *point at something, say what's wrong, track whether it got fixed* — folded directly into chat:
- A chat message can carry an attached screenshot
- A message can be flagged `kind: "feedback"` and toggled `resolved: true/false`
- No separate entity, no anchor logic, no script injection

If real usage later shows people specifically need pixel-pinned annotation (not just "feedback message + screenshot"), that's a deliberate, separately-scoped Phase 2+ bet — not something to build speculatively now.

### 6.3 Request/Traffic Inspector
- Live feed of requests hitting the tunnel: method, path, status, timing
- Inspect headers/body for a given request
- Replay a captured request (critical for webhook debugging — Stripe, GitHub, Shopify-style callbacks)

### 6.4 Workspace Collaboration
- Text channels and voice rooms scoped to a workspace
- Live presence: who's currently viewing which tunnel
- Roles: Owner / Admin / Member / Viewer

### 6.5 API Keys & Automation
- Workspace-scoped API keys, separate from user login sessions
- Same `Authorization: Bearer` mechanism as session tokens — the backend distinguishes a JWT from an API key by prefix/format, so clients (including Postman) don't need two different auth flows
- Scoped permissions per key (e.g. `tunnels:write`, `tunnels:read`) so a CI key can't, say, delete the workspace
- Full secret shown exactly once at creation time; only a masked prefix is ever shown again
- Revocable independently, with `lastUsedAt` tracked so dead keys are easy to spot and clean up

### 6.6 Security & Observability
- WebRTC-first for voice and P2P preview delivery where possible; encrypted relay fallback
- TLS on every public tunnel URL
- Metadata-only telemetry — never log proxied payload content beyond what the inspector explicitly stores for the workspace owner
- Per-tunnel and per-workspace bandwidth metering

## 7. Abuse Prevention (must-have, not optional)

Public tunnel tools are a known phishing/malware distribution vector. Before any public beta:
- Rate-limit tunnel creation per account *and* per API key
- Automated content scanning at the edge for known-bad patterns
- A reachable abuse-report endpoint with a fast kill-switch for a flagged tunnel
- Clear acceptable-use policy surfaced at signup, not buried in a footer link

## 8. Technical Architecture

```
 Desktop App (Win/Mac/Linux)
   ├─ Local Agent: process discovery, tunnel client, request capture
   └─ UI: live preview, chat (with screenshot attachments), voice, inspector
        │ HTTPS / WSS
        ▼
 Control Plane API
   ├─ Auth service (sessions + API keys, same Bearer mechanism)
   ├─ Workspace service
   ├─ Tunnel orchestration service
   ├─ Request-inspector service
   ├─ Chat/presence service (WS)
   └─ Bandwidth metering service
        │
        ▼                          ▼
 Relay Network (multi-region)   Voice (WebRTC SFU, P2P-first)
   ├─ TURN/STUN
   ├─ Edge TLS + subdomain routing
   └─ Fallback relay
        │
        ▼
 Public viewer (browser) — no install required
```

**Suggested stack** *(starting point, not a mandate)*

| Layer | Suggestion |
|---|---|
| Control plane API | Node.js (NestJS/Fastify) or Go |
| Datastore | PostgreSQL |
| Ephemeral/presence state | Redis |
| Realtime chat/presence | WebSocket gateway |
| Tunneling/relay | WebRTC + coturn (TURN/STUN); HTTP relay fallback |
| Request capture/replay | Store request/response metadata + size-capped body per tunnel, queryable by the inspector UI |
| Desktop client | Tauri (smaller binary, Rust local agent) or Electron |
| Edge/subdomain routing | Wildcard TLS + reverse proxy (e.g. Traefik) |

## 9. Data Model

- **User**: id, email, name, passwordHash, createdAt
- **Workspace**: id, name, ownerId, plan, bandwidthUsedGB, bandwidthLimitGB, createdAt
- **Membership**: workspaceId, userId, role (owner/admin/member/viewer)
- **ApiKey**: id, workspaceId, name, keyPrefix, hashedSecret, scopes[], lastUsedAt, createdAt, revokedAt
- **Tunnel**: id, workspaceId, ownerId, localPort, protocol, publicUrl, region, status, createdAt, closedAt
- **RequestLog**: id, tunnelId, method, path, status, headers, bodyPreview, durationMs, capturedAt
- **Channel**: id, workspaceId, name, type (text/voice)
- **Message**: id, channelId, userId, text, screenshotUrl (nullable), kind ("chat" | "feedback"), resolved (bool, default false), createdAt
- **VoiceParticipant**: channelId, userId, joinedAt
- **BandwidthUsage**: workspaceId, tunnelId, bytesIn, bytesOut, recordedAt
- **InviteToken**: id, workspaceId, email, role, expiresAt

## 10. API Surface

| Domain | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| API Keys | `POST /workspaces/:id/api-keys`, `GET /workspaces/:id/api-keys`, `DELETE /workspaces/:id/api-keys/:keyId` |
| Workspaces | `POST /workspaces`, `GET /workspaces`, `GET /workspaces/:id`, `PATCH /workspaces/:id`, `DELETE /workspaces/:id` |
| Members | `POST /workspaces/:id/invites`, `GET /workspaces/:id/members`, `PATCH /workspaces/:id/members/:userId`, `DELETE /workspaces/:id/members/:userId` |
| Tunnels | `POST /workspaces/:id/tunnels`, `GET /workspaces/:id/tunnels`, `GET .../tunnels/:tunnelId`, `DELETE .../tunnels/:tunnelId`, `GET .../tunnels/:tunnelId/bandwidth` |
| Request Inspector | `GET /workspaces/:id/tunnels/:tunnelId/requests`, `GET /requests/:id`, `POST /requests/:id/replay` |
| Channels & Messages | `POST /workspaces/:id/channels`, `GET /workspaces/:id/channels`, `GET /channels/:id/messages`, `POST /channels/:id/messages`, `PATCH /messages/:id` (resolve/edit) |
| Voice | `POST /channels/:id/voice/join`, `GET /channels/:id/voice/participants`, `POST /channels/:id/voice/leave` |
| Bandwidth | `GET /workspaces/:id/bandwidth` |
| Health | `GET /health` |

## 11. Success Metrics

- Time-to-first-share (target < 30s)
- % of sessions where a request was inspected or replayed (validates the debugging value-add)
- % of API-key-driven tunnel creation vs. desktop-GUI-driven (validates automation demand)
- Screen-share displacement rate
- P2P vs. relay fallback rate

## 12. Phased Delivery Plan

| Phase | Scope |
|---|---|
| **Phase 0** | Auth (sessions + API keys) + Workspaces + Tunnel create/list/stop — validate the core 30-second share loop, GUI and API-key-driven both |
| **Phase 1** | Request/traffic inspector + replay |
| **Phase 2** | Chat (with screenshot attachments + resolve flag) + voice rooms |
| **Phase 3** | Roles/permissions polish, bandwidth dashboards, abuse-report tooling |
| **Phase 4 (roadmap)** | Custom subdomains, GitHub PR auto-linking, CLI, revisit pixel-anchored annotation only if validated |

## 13. Risks & Open Questions

- Request/response body capture raises its own privacy questions (secrets in headers, PII in payloads) — needs redaction rules before this ships, not after.
- Abuse vector (§7) needs to be solved before any public link-sharing goes out, even in beta.
- Pricing model post-beta: per-seat vs. per-workspace vs. bandwidth-tiered — undecided, worth deciding from early usage data rather than guessing now.
- API key scopes need a concrete, finalized list before launch — "tunnels:write" etc. above is illustrative, not final.

## 14. Tooling for This Spec

Two contract artifacts ship alongside this document, kept in sync with §10:
- **Postman collection** (`Outpost_API.postman_collection.json`) + **environment** (`Outpost.postman_environment.json`) — auto-chains IDs across requests, includes a dedicated API Keys folder, and a "Quick Test: Authenticate with API Key" folder so a developer can paste in a generated key and confirm it works exactly like a login session.
- **OpenAPI/Swagger spec** (`Outpost_openapi.yaml`) — the canonical machine-readable contract. Paste it into editor.swagger.io for a browsable Swagger UI, or import it into Postman/any codegen tool directly.

## 15. Immediate Next Steps

1. Pick a real name (trademark + domain check).
2. Build Phase 0 (tunnel loop, both GUI and API-key paths) — smallest version that's actually usable end to end.
3. Validate with a handful of real users whether the chat-with-screenshot approach (§6.2) is "enough," before ever building true pixel-pinned annotation.
