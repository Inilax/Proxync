# Portly — Phase 1 Architecture & Progress Summary

This document summarizes the complete end-to-end architecture built during Phase 1. **If you are a new AI agent reading this, use this as your primary context for understanding the codebase and the current state of the project.**

## 1. System Architecture (Current State)

We have built a fully functional local tunneling system (similar to Ngrok/Cloudflare Tunnels) using a Monorepo approach (Turborepo). 

### 1.1 Backend: The Control Plane (`packages/api`)
- **Framework**: NestJS (TypeScript).
- **Database**: PostgreSQL (running via Docker) with Prisma ORM.
- **Role**: Acts as the centralized server that authenticates users, manages workspaces, and routes public HTTP traffic down to the desktop agents.
- **Key Components**:
  - `RelayGateway` (`relay.gateway.ts`): A raw WebSocket server (`@nestjs/platform-ws`) that desktop agents connect to. It maintains a registry of active tunnels and subdomains.
  - `RelayMiddleware` (`relay.middleware.ts`): Intercepts all incoming HTTP requests to subdomains (e.g., `http://fast-kite.localtest.me:3000`). It packages the HTTP request into a JSON payload and forwards it over the WebSocket to the correct agent. It expects a Base64 encoded response back to handle binary data (images, fonts, etc.) correctly.
  - `TunnelsService`: Generates random subdomains and manages tunnel lifecycles in the database.

### 1.2 Frontend: The Desktop Agent (`packages/desktop`)
- **Framework**: Tauri v2 (Rust backend) + React/Vite (TypeScript frontend).
- **UI**: Modern, dark-mode React interface where users can log in, view workspaces, and click "Share" to open a tunnel.
- **Rust Core (`src-tauri/src/lib.rs`)**: 
  - Exposes native commands via IPC (`scan_ports`, `open_tunnel`, `close_tunnel`).
  - **The Tunnel Engine**: When `open_tunnel` is called, it establishes a WebSocket connection (`tokio-tungstenite`) to the NestJS Control Plane.
  - **Concurrency**: It uses `tokio::spawn` to process incoming HTTP requests from the cloud *in parallel*. This ensures heavy frameworks like Next.js (which request 20+ assets simultaneously) do not bottleneck the tunnel.
  - **Binary Support**: Uses `reqwest` to fetch the local port's data, converts the raw bytes to Base64 using the `base64` crate, and sends it back to the cloud.

---

## 2. Achievements & Fixes in Phase 1
- **End-to-End Tunneling Works**: Users can successfully tunnel local ports (e.g., `8080` or `4000`) and access them via `localtest.me:3000` subdomains.
- **Binary/Asset Corruption Fixed**: Switched from UTF-8 string decoding to raw Base64 buffers for HTTP bodies, allowing images and complex JS chunks to load perfectly.
- **Concurrency Bottlenecks Resolved**: Refactored the Rust WebSocket listener to use `tokio::sync::mpsc::unbounded_channel` and spawn concurrent HTTP workers.
- **Socket Protocol Conflict Resolved**: Switched NestJS from Socket.io to raw `WsAdapter` so the pure Rust `tokio-tungstenite` client can connect seamlessly without protocol handshake errors.

---

## 3. Phase 2: Cloud Deployment & Infrastructure (Next Steps)

Currently, the Control Plane is running on `localhost:3000`, meaning the generated links cannot be shared globally. Phase 2 focuses on moving the Control Plane to the public internet.

### Step 1: Containerize the Control Plane
- Create a `Dockerfile` for `packages/api`.
- Ensure it properly builds the NestJS app and runs Prisma migrations (`npx prisma migrate deploy`).

### Step 2: Provision Cloud Infrastructure
- Set up a managed PostgreSQL database (e.g., Supabase, Neon, or AWS RDS).
- Deploy the Dockerized API to a cloud provider (e.g., Render, Railway, AWS ECS, or DigitalOcean).

### Step 3: Configure Wildcard DNS & HTTPS
- Register a domain (e.g., `inilax.com` or `portly.com`).
- Configure a wildcard DNS record (`*.portly.com`) pointing to the deployed API.
- Ensure the cloud provider issues a Wildcard SSL/TLS certificate so all subdomains get HTTPS out of the box.

### Step 4: Update URL Generation & Environments
- Update `tunnels.service.ts` to output `https://[subdomain].portly.com` (removing the `:3000` port completely).
- Update the Desktop app to point its WebSocket connection to `wss://api.portly.com/relay`.

### Step 5: (Optional but High Value) Proxy WebSocket Traffic
- Currently, the tunnel only proxies HTTP traffic. Modern dev servers (Next.js, Vite) rely on WebSockets for Hot Module Replacement (HMR). 
- Enhance `RelayMiddleware` to intercept WebSocket Upgrade requests and tunnel raw TCP/WebSocket frames to the Rust agent so that HMR works over the public tunnel.
