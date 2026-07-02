# Changelog & Roadmap

This document outlines what has been implemented so far in Proxync, as well as the immediate roadmap for future phases.

## [Implemented] Phase 1: Core Tunneling Infrastructure
- **Rust Relay Agent**: Built dynamic relay WebSocket connections and concurrent port scanning (`tokio::spawn`, `futures::join_all`).
- **NestJS API Gateway**: Set up the `RelayGateway` to proxy WebSocket traffic, along with a PostgreSQL + Prisma and Redis backend.
- **Tunnels UI**: Built the `TunnelsView` desktop component to display active tunnels and stream real-time request logs.
- **Resilience**: Added request duration tracking, Redis TTLs for lists, 401 auto-refresh interceptors, and fixed hardcoded proxy URLs.

## [Implemented] Phase 2.1: Real-time Chat & Channels
- **Data Models**: Added `Channel` and `Message` models in Prisma.
- **API Endpoints**: Created `ChannelsModule` and `MessagesModule` to handle standard REST operations.
- **Real-time Sync**: Extended `RelayGateway` to support `workspace:join`, `chat:message`, and `presence:ping` events. Added Redis-based workspace room tracking.
- **Desktop Chat UI (`ChatPanel.tsx`)**: 
  - Created a collapsible chat panel integrated directly into `TunnelsView`.
  - Added live presence indicators (30s heartbeats, 90s timeouts).
  - Implemented text messaging and base64 screenshot attachment support.
- **Workspace Auto-provisioning**: Setup default `#general` channel creation when new workspaces are created.

## [Pending] Immediate Pre-flight Fixes (End of Phase 2.1)
*These are minor bug fixes discovered during the Phase 2.1 code review.*
- [ ] Run `prisma migrate dev` to create the new tables.
- [ ] Fix `initials()` function in `ChatPanel.tsx` to prevent crashes on empty user names.
- [ ] Remove unused `WebSocketServer` import in `relay.gateway.ts`.
- [ ] Replace `redis.keys()` scan with in-memory map scan for broadcasting presence in `relay.gateway.ts`.
- [ ] Default message `text` to `''` in `messages.service.ts` when only a screenshot is sent.

---

## [Roadmap] Upcoming Phases

### Phase 2.2 — Request Context Sharing
- Add a "Share this request" action on each request log card in `TunnelsView`.
- Clicking it opens the `ChatPanel` pre-filled with a `FEEDBACK` message containing the method, path, and status code of the selected request.

### Phase 2.3 — Unread Badge + Notifications
- Add an unread message count badge on the Chat toggle button when the panel is closed.
- Integrate Tauri `notification` plugin to trigger OS-level alerts for incoming `FEEDBACK` messages when the app is in the background.

### Phase 2.4 — Voice Rooms (WebRTC)
- Implement WebRTC signaling via `RelayGateway`.
- Add a `VOICE` channel UI in the desktop app for live audio collaboration.
- (*Note: `VoiceParticipant` model already exists in the Prisma schema.*)

### Phase 2.5 — Invite Flow Polish
- Add an "Invite by link" button to the Members view to allow users to easily copy and share workspace invite URLs.
