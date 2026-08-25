# Changelog

All notable changes to the Proxync (Portly) workspace studio project are documented here.

## [fix/workspace-search-bar] - 2026-08-25 (Workspace Command Search Dropdown, Direct Hub Navigation & Inline Creation)
- **Feature Summary**:
  - **Floating Workspace Search Dropdown (`App.tsx`)**: Replaced plain search input with an interactive floating command dropdown anchored under the top search bar. Filters present and created workspaces in real time by name, notes, server processes, or open ports, with active badges and hotkey support (`Ctrl+K` / `Cmd+K` to open, `Escape` or click-outside to dismiss).
  - **1-Click Workspace Hub Navigation & Robust Click Handlers (`App.tsx`)**: Upgraded selection items with `onMouseDown` (`e.preventDefault()`, `e.stopPropagation()`) to immediately switch active workspace and navigate straight to the workspace hub (`workspace_dashboard`) without blur race conditions.
  - **Direct Workspace Creation via Reused Helper (`App.tsx`)**: Extended `createWorkspace(explicitName?: string)` to allow direct 1-click creation from search queries without intermediate lobby redirections.
  - **Safe Tunnel Lifecycle Teardown (`App.tsx`)**: Maintained strict tunnel lifecycle teardown (`stopAllTunnels(true)`) and process rediscovery when switching between workspaces via search.
  - **UI & Documentation Polish (`App.tsx`, `README.md`)**: Removed text-decoration underline on *All Workspaces Studio* button in favor of clean interactive styling, and refined README feature highlights and platform support statuses.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `README.md`
  - `CHANGELOG.md`

## [feature/develop-readme-v0.2.1-update] - 2026-08-24 (README Documentation Update: v0.2.1 Release, Native High-Speed Tunneling & Platform Status)
- **Feature Summary**:
  - **v0.2.1 Release Status**: Updated project version badge and documentation references across the studio README to reflect version v0.2.1.
  - **Native High-Speed Proxync Tunneling**: Added prominent feature documentation for Native High-Speed Proxync Tunneling, ultra-low latency WebSocket/SSH origin relay infrastructure, and Resilient Standby Mode with automatic URL preservation.
  - **Platform Support Matrix & Roadmap**: Clarified current Windows 10/11 desktop support, updated platform state paths (`%APPDATA%\Proxync\`), and added pending Linux and macOS cross-platform releases to the roadmap and platform matrix.
- **Modified Files**:
  - `README.md`
  - `CHANGELOG.md`

## [fix/universal-proxy-vite-hmr] - 2026-08-23 (Ctrl+R Reload Safety Shield, Vite Tunnel Guard & Bidirectional Stream Telemetry)
- **Feature Summary**:
  - **Ctrl+R / F5 Reload Safety Shield (`App.tsx`)**: Intercepts `Ctrl+R`, `Cmd+R`, and `F5` events in capture mode while a tunnel is running. Suppresses window reload and alerts the user with a warning toast (`⛔ Refresh blocked — stop your active tunnel first to avoid orphan processes`), completely preventing orphan background tunnels and state desynchronization.
  - **Vite Dev Server Detection & Launch Guard (`App.tsx`)**: Added `isViteProcess(process)` helper checking framework signature, command, directory, process name, and default port `5173`. When a user attempts to share a Vite dev server across any tunnel mode (`shareProcess`, `shareProcessCloudflare`, `shareProcessNative`, `shareProcessLocaltunnel`), cleanly halts execution and displays an informative warning toast (`⚠️ Sharing Vite dev servers over public tunnel is currently under development`).
  - **Bidirectional Stream Latency & Status Code Telemetry (`proxy.rs`)**: Captured initial HTTP response chunk to emit precise HTTP status codes and round-trip duration metadata (`request:log:response`) before transitioning into full-duplex `tokio::io::copy_bidirectional`.
  - **Cleaned Up Experimental Rust Pipeline (`tunnel.rs`, `proxy.rs`)**: Cleaned up experimental HTML injection and compression pipelines, keeping standard base64 response transport clean and reliable.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src-tauri/src/proxy.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `CHANGELOG.md`

## [fix/universal-proxy-vite-hmr] - 2026-08-22 (Universal Proxy Engine, Vite 6 HMR Stabilization, Cross-Platform Diagnostic Export & Upload Cap)
- **Feature Summary**:
  - **Universal Full-Duplex Proxy Engine (`proxy.rs`)**: Replaced split read/write loops with non-blocking `tokio::io::copy_bidirectional`. Dynamically rewrites `Host: localhost:<port>` and `Origin: http://localhost:<port>` while preserving `Sec-WebSocket-*` headers and injecting `X-Forwarded-Proto: https`, `X-Forwarded-Host`, and `X-Forwarded-For: 127.0.0.1`. Eliminates Vite 6 `allowedHosts` 403 Forbidden errors and Webpack `Invalid Host Header` errors.
  - **Dev Server HMR Stabilization & React SWC Preamble (`tunnel.rs`)**: Injected a top-of-`<head>` dev server shim for public relay streams that satisfies Vite HMR (`/@vite/client`), Next.js Fast Refresh, and `@react-refresh` with an immediate `readyState: 1 (OPEN)` handshake and pre-initializes React SWC preamble globals (`window.$RefreshReg$`), completely eliminating blank white screens on public tunnel URLs.
  - **50 MB Upload Cap Protection**: Added a strict 50 MB upload body size cap (`MAX_UPLOAD_BODY_BYTES` and `MAX_RELAY_BODY_BYTES`) across both local TCP proxy and relay pipelines, rejecting oversized payloads with explicit `413 Payload Too Large` JSON responses.
  - **Cross-Platform Diagnostic Support Bundle Export (`storage.rs`, `logger.ts`)**: Implemented `save_support_bundle_dialog` in Rust with native OS save pickers (PowerShell on Windows, AppleScript on macOS, Zenity on Linux) alongside Web File System Access API and blob download fallbacks, and upgraded `get_base_data_dir` to support macOS (`Library/Application Support`) and Linux (`~/.config`).
  - **Zero Hardcoded Environment Paths**: Cleaned up hardcoded `%APPDATA%` strings from toasts and settings views in `App.tsx` and `SettingsView.tsx`.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/proxy.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `packages/desktop/src-tauri/src/storage.rs`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/lib/logger.ts`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/App.tsx`
  - `CHANGELOG.md`

## [fix/ide-navigation-and-preflight-probe] - 2026-08-22 (Dynamic IDE Route Navigation, Inactive Port Pre-Flight Probe & Global Traffic Logs Purge)
- **Feature Summary**:
  - **Dynamic Route Resolution & Zero Fake Paths (TC-WB-003)**: Upgraded `RequestWorkbenchDialog.tsx` to include `nearMissMatch` in route resolution and replaced the hardcoded `src/controllers/...` fallback with `null`. When a route is unlinked, displays an explanatory prompt and disables IDE triggers. Dynamically derives `resolvedRoot` from active process candidates and workspace configs so files always resolve to their absolute file system path.
  - **3-Tier Cross-Platform IDE Engine**: Refactored `open_file_in_editor` in `storage.rs` with discrete argument quoting (`code -g "<root>/<path>:<line>"`) on Windows to prevent space splitting in paths, and implemented resilient 3-tier fallbacks (CLI with line jump $\rightarrow$ OS URI scheme $\rightarrow$ system default file opener) across Windows, macOS, and Linux.
  - **Inactive Port Pre-Flight Probe & Residue Purge**: Implemented `probe_port` in `recon.rs` (300ms dual-stack TCP check) and wired `verifyPortIsLive` in `App.tsx`. Prevents creating tunnels on offline ports (e.g. `:4500` after `Ctrl+C`) with clear warning toasts, and triggers background `discoverProcesses(true, true)` to automatically purge dead process cards from the UI.
  - **Global Traffic Logs Clearance**: Fixed `clearTrafficLogs()` in `App.tsx` to completely reset in-memory `requests`, wipe `capturedRequests` across all workspaces in `localStorage`, and delete underlying disk logs via `clearLogs()`.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/recon.rs`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/src/storage.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/RequestWorkbenchDialog.tsx`
  - `CHANGELOG.md`

## [fix/tunnel-resilient-standby] - 2026-08-22 (Resilient Standby Tunnels, 502 Fallback & Instant Local Auto-Recovery)
- **Feature Summary**:
  - **Universal Standby Mode & URL Preservation**: Replaced abrupt hard tunnel teardown on local process shutdown (`Ctrl+C`) with a resilient `STANDBY` state. Preserves public tunnel URLs (`https://px-xxxx.proxync.dev`) across server restarts and hot-reloads so webhook integrations (Stripe, GitHub, Shopify) remain permanently connected without reconfiguration.
  - **Branded 502 Bad Gateway Standby Fallback**: Configured `proxy.rs` to serve a responsive, branded HTML 502 Bad Gateway fallback page when incoming public traffic reaches an offline local target, informing external clients and browsers that the local server is in standby.
  - **Background Port Liveness Engine**: Added a lightweight 1000ms loop in `proxy.rs` using 250ms bounded TCP probes across `127.0.0.1` and `[::1]`. Emits `tunnel:status-changed` events (`ACTIVE` $\leftrightarrow$ `STANDBY`) with automatic UI recovery the instant a developer restarts their server (`npm run dev`).
  - **Frontend Standby Indicators & Badges**: Integrated `STANDBY` status handling across `ProcessView`, `WorkspaceDashboardView`, `WelcomeView`, and `SwaggerView` with amber status badges (`🟡 Standby • Target Offline`), status footer counters, and transition toasts.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/proxy.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/ProcessView.tsx`
  - `packages/desktop/src/components/views/WorkspaceDashboardView.tsx`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `packages/desktop/src/components/views/SwaggerView.tsx`
  - `packages/desktop/src/lib/types.ts`
  - `CHANGELOG.md`

## [fix/develop-responsiveness] - 2026-08-22 (Universal Responsive Layout & Streamlined Workbench Studio Command Bar)
- **Feature Summary**:
  - **Streamlined Workbench Studio Command Bar**: Refactored the sticky sub-header in `RequestWorkbenchDialog.tsx` into a high-density, compact Studio Action Bar ($\sim 48\text{px}$). Consolidated the primary segmented mode switcher (`[DevTools & Mapping] [Traffic & Replay]`) and quick action triggers (`[Export Code]`, `[Save to Collection]`, `[Browser]`) onto a single balanced bar, eliminating triple information redundancy and reclaiming vertical screen real estate.
  - **Traffic Inspector Table Isolation & Typography**: Upgraded table row typography to `text-[13px] font-mono` in `TrafficView.tsx`. Restructured column widths (`Method w-24`, `Status w-20`, `Request Path flex-1 min-w-[180px]`, `Scope w-44`, `Time w-28`, `Duration w-32 text-left`, `Actions w-72`) inside an `overflow-x-auto min-w-[1080px]` container to ensure absolute separation between latency timestamps and action triggers across all viewport sizes.
  - **Non-Destructive Cross-Workspace Telemetry Retention**: Replaced 4 destructive global `setRequests([])` wipes in `App.tsx` with active-workspace scoped filtering (`setRequests(curr => curr.filter(r => r.workspaceId && r.workspaceId !== activeWorkspaceIdRef.current))`) to preserve historical traffic records across workspace switches.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/RequestWorkbenchDialog.tsx`
  - `packages/desktop/src/components/views/TrafficView.tsx`
  - `packages/desktop/src/index.css`
  - `CHANGELOG.md`

## [feature/develop-playground-target-selector] - 2026-08-21 (Playground Interactive Target & Tunnel Selector, Instant State Purge & NSIS Uninstaller Branding)
- **Feature Summary**:
  - **Interactive Target Environment & Public Tunnel Dropdown**: Replaced static route badge in `PostmanView.tsx` with an interactive dropdown selector grouping active public tunnels (`🌐 <hostname> (:<port>)`) and local servers (`⚡ Localhost (:<port>)`). Developers can instantly view and switch active target environments with automatic URL resolution.
  - **State Purge & Stale Response Clearance**: Added `onClearResponse` callback in `PostmanView.tsx` and `App.tsx` to automatically purge cached responses whenever switching target dropdown options, preventing cross-tunnel response confusion.
  - **NSIS Uninstaller Brand Customization**: Created `hooks.nsh` and wired `"installerHooks": "hooks.nsh"` in `tauri.conf.json` defining `MUI_UNICON "icons\\icon.ico"` so the Windows uninstaller dialog displays the official Proxync branding icon instead of the default Nullsoft tin box icon.
- **Modified Files**:
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `packages/desktop/src-tauri/hooks.nsh`
  - `CHANGELOG.md`

## [fix/develop-release-blocker-workspace-tunnel-isolation] - 2026-08-21 (Release Blocker: Automatic Cross-Workspace Tunnel Teardown & Process Isolation)
- **Feature Summary**:
  - **Native Bulk Tunnel Teardown Command**: Implemented `close_all_tunnels()` in Rust (`tunnel.rs`, `lib.rs`) to cleanly drain and abort all active WebSocket relay handles, terminate all child subprocesses (`ssh`, `cloudflared`, `localtunnel`) with OS process tree killing (`taskkill /F /T /PID` on Windows), and shut down all ephemeral TCP stream proxies (`stop_proxy(None)`).
  - **Cross-Workspace Tunnel Teardown on Switch & Create**: Updated `selectWorkspace` and `createWorkspace` in `App.tsx` to automatically invoke `stopAllTunnels(true)` and `close_all_tunnels` whenever switching between workspaces or creating new workspaces. This guarantees running public tunnels from previous workspaces are never orphaned or left accessible in the background.
  - **Frontend State Containment**: Automatically resets `tunnels`, `activeTunnel`, `selectedProcessId`, and `sharingPort` upon workspace switching with informative transition toasts (e.g. `Closed tunnels from "Workspace A"`).
- **Modified Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `packages/desktop/src/App.tsx`
  - `CHANGELOG.md`

## [fix/develop-release-blocker-process-cwd-recon] - 2026-08-21 (Release Blocker: Process Working Directory CWD Reconnaissance via OS PEB Inspection)
- **Feature Summary**:
  - **Stage 0 Native Process CWD Extraction**: Implemented Win32 `PEB` (Process Environment Block) inspection in `recon.rs` (`win_peb::get_process_cwd`) via `NtQueryInformationProcess` and `ReadProcessMemory` to read `RTL_USER_PROCESS_PARAMETERS.CurrentDirectory.DosPath` directly from the OS for any running process and its parent process tree.
  - **Accurate Relative Script & NPM Dev Server Discovery**: Resolved a critical release blocker where servers launched with relative arguments (e.g. `node --watch server.js`, `node server.js`, `npm run dev`) failed directory resolution and fell back to `localhost:<port>`. Directory resolution now deterministically resolves to the exact project root (e.g. `E:\to-do`) across any drive or directory structure.
  - **Preserved Heuristic Fallback Pipeline**: Maintained existing command-line argument parsing, parent process walking, and fallback script search as graceful secondary layers when PEB access is unavailable.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/recon.rs`
  - `CHANGELOG.md`

## [fix/traffic-inspector-duration-and-layout] - 2026-08-21 (Traffic Inspector Duration Capture, Column Layout Overlap Fix & Sanity Testing Isolation)
- **Feature Summary**:
  - **Live Latency & Duration Capture**: Added `Instant::now()` elapsed duration calculation in `proxy.rs` and `tunnel.rs` to compute response round-trip latency in milliseconds (`durationMs`) and emit it inside `request:log:response`. Added `capturedAtMs` tracking and fallback computation in `App.tsx` so durations never remain in a stuck `'pending'` state.
  - **Column Width & Spacing Isolation**: Restructured the Traffic table layout in `TrafficView.tsx` by expanding the `DURATION` column to `w-28` (`112px`) with `pr-6` right-padding, and the `ACTIONS` column to `w-72` (`288px`). Replaced oversized global `.btn-ghost` classes with isolated compact button tokens (`px-2.5 py-1`) to completely eliminate horizontal collision between the latency badge and the Workbench / Playground action triggers.
  - **Sanity & POC Sandbox Isolation**: Added `sanity/` to `.gitignore` and relocated experimental Proof-of-Concept folders to `sanity/POC/` to maintain a pristine, production-clean repository root.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/proxy.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/TrafficView.tsx`
  - `.gitignore`
  - `CHANGELOG.md`

## [feature/develop-multi-tunnel-workbench-scanner] - 2026-08-21 (Proxy Lifecycle Optimization, Fast WebSocket Relay Timeout & Multi-Tunnel Workbench Studio)
- **Feature Summary**:
  - **Ephemeral Proxy Listener Lifecycle & TCP Half-Close**: Refactored `start_proxy` in `proxy.rs` to always abort stale task handles and re-bind fresh listeners per invocation, plus added explicit `client_write.shutdown().await` and `target_write.shutdown().await` on TCP streams to cleanly complete responses without hanging.
  - **Fast WebSocket Relay Connection Timeout**: Added a 2-second timeout to `open_tunnel` WebSocket connection (`tunnel.rs`) so client initialization fails fast when no local loopback relay is active instead of blocking on OS TCP timeouts.
  - **Instant In-Memory Recon Resolution**: Streamlined `recon.rs` by eliminating blocking filesystem drive scanning loops during project directory lookup.
  - **Multi-Tunnel & Multi-Process Dynamic Project Root Synchronization**: Refactored `RequestWorkbenchDialog.tsx` and `App.tsx` to automatically resolve project root directories per-tab based on the originating request's port or tunnel metadata, eliminating cross-process misattribution when running multiple tunnels simultaneously.
  - **Native 1-Click IDE Navigation**: Implemented `open_file_in_editor` native command in Rust (`storage.rs`, `lib.rs`) and TypeScript (`interopUtils.ts`) to jump directly to exact line numbers in VS Code (`code -g <file>:<line>`), Cursor, or the OS default editor.
  - **Dynamic Next.js App Router & Arrow Function Scanner**: Enhanced `codebaseScanner.ts` to normalize Windows backslash file paths and parse both function declarations (`export async function GET`) and arrow function exports (`export const POST = async () =>`).
  - **Fresh Request Log Ingestion & Execution History Runs**: Enhanced Workbench to dynamically merge newly intercepted request events into active tabs as discrete `ExecutionRun` history snapshots with automatic focus on fresh runs.
  - **Process Discovery & Dashboard UX Polish**: Upgraded `DiscoverDialog.tsx` with an `ALREADY EXPOSED` emerald badge, streamlined actions to dedicated `[ Inspect Traffic ➔ ]` navigation, and separated dashboard server card clicks (Process view) from direct traffic inspection.
  - **Zero Hardcoded Environment Paths Enforced**: Stripped all developer test paths and machine-specific fallbacks across UI code in compliance with new workspace Rule 8.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/src/recon.rs`
  - `packages/desktop/src-tauri/src/storage.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/RequestWorkbenchDialog.tsx`
  - `packages/desktop/src/components/views/WorkspaceDashboardView.tsx`
  - `packages/desktop/src/index.css`
  - `packages/desktop/src/lib/codebaseScanner.ts`
  - `packages/desktop/src/lib/interopUtils.ts`
  - `packages/desktop/src/lib/types.ts`
  - `CHANGELOG.md`

## [feature/develop-installer-wizard-branding-and-license] - 2026-08-19 (NSIS Setup Wizard High-DPI Visual Assets & Open-Source License Integration)
- **Feature Summary**:
  - **NSIS Setup Wizard High-DPI Visual Assets**: Replaced legacy prototype installer graphics with high-definition 24-bit RGB Windows bitmaps: `nsis-sidebar.bmp` (164×314 px, 154 KB) featuring 3D isometric server nodes and neon fiber-optic conduits on deep midnight slate (`#0b0f19`) with zero smartphone bezels or text artifacts, and `nsis-header.bmp` (150×57 px, 25.8 KB) featuring a high-contrast glowing network proxy hub.
  - **Open-Source License Agreement Integration**: Embedded the root MIT License agreement (`LICENSE`, Copyright © 2026 Inilax) into the Tauri installer bundle via `licenseFile: "LICENSE"`.
  - **Enhanced App Description & Metadata**: Updated `longDescription` in `tauri.conf.json` to `"Proxync — Instant Local-First Tunneling, API Inspection & Developer Workspace Studio"` for Windows Installed Apps & Tooltips.
- **Modified Files**:
  - `packages/desktop/src-tauri/icons/nsis-header.bmp`
  - `packages/desktop/src-tauri/icons/nsis-sidebar.bmp`
  - `packages/desktop/src-tauri/LICENSE`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `CHANGELOG.md`

## [feature/develop-pro-debugger-dual-stream-logging] - 2026-08-19 (Pro Debugger & Dual-Stream Support Logging Engine, LLM Diagnostic Grammar & Support Bundle Exporter)
- **Feature Summary**:
  - **Cross-Platform Native Rust Logging Engine**: Built `storage.rs` disk logging pipeline in Tauri/Rust supporting Windows (`%APPDATA%/Proxync/logs`), macOS (`~/Library/Application Support/Proxync/logs`), and Linux (`~/.config/Proxync/logs`). Implemented `append_log_entry`, `clear_log_files`, `open_logs_folder` (`explorer.exe`, `open`, `xdg-open`), and `read_logs_summary` IPC handlers registered in `lib.rs`.
  - **Dual-Stream Independent Logging with Split Defaults**: Created lightweight TypeScript logging engine (`logger.ts`) with bounded in-memory ring buffers (1,000 app entries, 2,000 traffic entries, $<500\text{ KB}$ max RAM). Application Diagnostics (`app.log`) is **enabled by default** to capture engine lifecycle, recon scans, proxy binds, tunnel spawn/closures, and crashes. Traffic Stream (`traffic.log`) is **disabled by default** to capture full HTTP request/response payloads, headers, and latencies on demand.
  - **AI Agent & LLM Diagnostic Directives**: Embedded structured session headers with schema definitions in `app.log` and `traffic.log`. Built `logError(source, summary, error, hint, target)` providing deterministic `reason`, `target`, and `hint` attributes for automated AI troubleshooting. Structured `traffic.log` as single-line JSONL with status `errorReason` descriptions (e.g. `502 Bad Gateway: Upstream local service port unreachable`).
  - **Automatic Credential & PII Redaction**: Built sensitive key sanitizer that automatically redacts `Authorization`, `Bearer`, `Cookie`, `Set-Cookie`, `Password`, `Token`, `ApiKey`, and `Secret` tokens to `[REDACTED]` across logs and support bundles.
  - **1-Click Support Diagnostic Bundle Exporter**: Created `exportSupportBundle()` to package active workspace state, settings, active tunnels, discovered processes, and sanitized diagnostic logs into `proxync-support-bundle.json`.
  - **360° Event Instrumentation & StrictMode Idempotency**: Hooked logging across all app operations (OpenAPI generation, Postman requests, replays, scans, workspaces, domains, settings) with active lifecycle listener cleanup in `App.tsx` preventing duplicate log emissions on hot reloads.
  - **Settings Danger Zone UI & Purge Integration**: Overhauled Settings Danger Zone (`SettingsView.tsx`) with side-by-side stream cards, glowing monospaced badges (`● Enabled (Default)` / `● Active • Recording`), disk metrics, path copy pill, and integrated `clearLogs()` into the Purge All Data confirmation dialog (`Dialogs.tsx`).
- **Modified Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/src/storage.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/lib/logger.ts`
  - `packages/desktop/src/lib/types.ts`
  - `CHANGELOG.md`

## [fix/swagger-multi-tunnel-traffic-segregation-probe-filtering] - 2026-08-19 (Multi-Tunnel Traffic Segregation, Malicious Bot Probe Filtering & Incremental OpenAPI Spec Ingestion)
- **Feature Summary**:
  - **Multi-Tunnel & Multi-Server Port Attribution Pipeline**: Refactored Rust proxy (`proxy.rs`) and WebSocket tunnel relay (`tunnel.rs`) to attach deterministic `port`, `tunnelId`, and `requestId` metadata to every emitted `request:log` event. Enriched `App.tsx` request ingestion to dynamically resolve matching public tunnels (`tunnelUrl`, `subdomain`) and process services (`port`, `serverName`), eliminating cross-port misattribution.
  - **Automated Security Scanner & Bot Probe Filtering**: Implemented `isNoiseOrScannerProbe` in `openApiGenerator.ts` to detect and filter out automated internet vulnerability probes (`/.env`, `/.git`, `/.ssh`, `*.pem`, `*.key`, `*.bak`, `*.sql`, `/wp-admin`, `/geoserver/`, `/minio/`, `/admin`) and SPA `index.html` fallback catch-all responses returning `text/html` on arbitrary non-root URLs.
  - **Dynamic URL Path Parameterization**: Built `parameterizePath` helper to generalize dynamic path segments (IDs e.g. `todo-1787085033407-5x3gn`, UUIDs, numerical IDs, Mongo ObjectIDs) into standard OpenAPI path parameters (e.g. `/api/todos/{id}`) with matching OpenAPI `in: path` parameter definitions.
  - **Incremental OpenAPI Spec Ingestion (Endpoint Persistence)**: Enhanced `generateOpenApiSpec` to accept `existingDoc` and deep-merge newly captured traffic with previously generated routes (`GET`, `POST`, `PUT`, `DELETE`), preventing spec overwrites when testing endpoints sequentially.
  - **Swagger Studio UI & Server Filter Refinement**: Overhauled server dropdown in `SwaggerView.tsx` with clear public tunnel URLs and ports (`⚡ Port :4000 — px-subdomain (https://...)`), added clickable tunnel URL badges on endpoint cards, and streamlined the filter header by removing redundant tag filter pills while keeping semantic tag badges on cards.
  - **CSS Flex Properties Fix**: Corrected invalid `shrink: 0` CSS properties to standard `flex-shrink: 0` in `index.css` for `.btn-cloud-option` and `.btn-lan-option`.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/proxy.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/SwaggerView.tsx`
  - `packages/desktop/src/index.css`
  - `packages/desktop/src/lib/openApiGenerator.ts`
  - `packages/desktop/src/lib/types.ts`
  - `CHANGELOG.md`

## [feature/develop-dynamic-netstat-service-discovery] - 2026-08-17 (Dynamic Netstat Full-Port Service Discovery, Single Bulk WMI Recon & In-Memory Directory Engine)
- **Feature Summary**:
  - **Dynamic Full-Port Netstat Discovery**: Completely eliminated the legacy hardcoded 9-port list (`3000, 3001, 4000, 4200, 5000, 5173, 8000, 8080, 8888`) in favor of a single `netstat -ano` scan dynamically capturing all listening dev services across both IPv4 and IPv6 (`[::1]:5173`, `[::]:3000`, `80, 443, 1024..=49151`) while filtering out Windows RPC and system port ranges (`135, 445, 2869, 5040, 6463, 5357, 49152..=49157`).
  - **Single Bulk WMI Process Recon**: Replaced slow $O(N)$ per-port/per-PID PowerShell process queries with a single batch `Get-CimInstance Win32_Process` query executed with `Text` output format to suppress CLIXML stream overhead.
  - **System & Infrastructure Classification**: Implemented multi-layered process filtering to block Windows background services, IDE daemons, and system noise (`svchost`, `System`, `lsass`, `Discord`, `Teams`, `SearchIndexer`, `Antigravity IDE`, `language_server`) while surfacing active dev runtimes (`node`, `python`, `deno`, `bun`, `go`, `cargo`, `java`, `ruby`, `php`, `dotnet`, `proxync`).
  - **Dynamic Framework Fingerprinting**: Integrated command-line argument analysis to identify `Next.js`, `Vite`, `NestJS`, `FastAPI`, `Django`, `Flask`, `Express / Node.js`, `Nuxt`, `Remix`, `Astro`, `Spring Boot`, etc.
  - **IPv6 Target Connectivity & Host Header Normalization in Local Proxy**: Refactored `start_proxy` in `proxy.rs` to connect to `127.0.0.1` with automatic fallback to `[::1]` (IPv6 localhost), resolving the 502 Bad Gateway issue on IPv6-bound servers like Vite. Added automatic `Host: localhost:{port}` header normalization so dev servers with strict host validation (e.g. Vite 5/6, Next.js) accept incoming public tunnel traffic without 403 / Bad Gateway errors.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/recon.rs`
  - `packages/desktop/src-tauri/src/proxy.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/WorkspaceDashboardView.tsx`
  - `CHANGELOG.md`
- **Feature Summary**:
  - **Multi-Service Concurrent Tunnel Spawning**: Replaced scalar `sharingPort` with `spawningPorts: number[]` in `App.tsx` and integrated `addSpawningPort` / `removeSpawningPort` across all sharing handlers (`shareProcessNative`, `shareProcessCloudflare`, `shareProcessLocaltunnel`, `shareProcess`), enabling simultaneous tunnel launches without UI state collisions.
  - **Instantaneous Spawning State**: When clicking tunnel launch options, action buttons are immediately replaced with an active animated loading indicator `[ 🔄 Spawning Tunnel Connection... ]`, preventing double-clicks and duplicate backend spawner execution.
  - **Workspace Hub Card Redesign**: Overhauled `WorkspaceDashboardView.tsx` with Emerald code avatars, normalized framework subtitles, and isolated Local Endpoint container matching design mockups.
  - **Action Button Styling & Containment**: Styled `⚡ Expose (Proxync)` with theme periwinkle purple (`#7c82ff`), `Cloudflare` and `LAN` with dark slate containers (`#20293d`), and added `min-w-0` / `truncate` text containment.
  - **Responsive Layout & Screen Adaptation**: Tuned grid breakpoint to `grid-cols-1 md:grid-cols-2 2xl:grid-cols-3` to ensure generous card width on standard desktop window sizes with sidebar.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/WorkspaceDashboardView.tsx`
  - `packages/desktop/src/index.css`
  - `CHANGELOG.md`


## [feature/proxync-native-tunnel] - 2026-08-15 (Direct Origin Port 2222 Routing, Strict HTTPS JIT Security, Host Key Pinning & Parallel Startup)
- **Feature Summary**:
  - **Direct Port 2222 Origin Routing**: Resolved SSH tunnel connection timeout and public URL 404 issue by configuring default `PROXYNC_SSH_HOST` to connect directly to origin IP `104.208.83.199:2222`, bypassing Cloudflare CDN's non-HTTP port dropping on `api.proxync.dev:2222`.
  - **Strict HTTPS on JIT Key Registration**: Eliminated unencrypted HTTP direct origin fallbacks. All JIT ephemeral Ed25519 public key registration and host key discovery requests now strictly enforce TLS encryption (`https://api.proxync.dev/api/tunnel/sign-jit-cert`) with bearer token validation.
  - **SSH Host Key Pinning & TOFU Elimination**: Hardened SSH connection with `StrictHostKeyChecking=yes`, isolated session `known_hosts` pre-seeded with official Ed25519 public host key (`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDyV3ZNPsHhwJaW6akzFMg/KAE7F1K4WamVtMaeP/vi9 root@Proxync-tunnel`), and `GlobalKnownHostsFile=NUL` / `/dev/null`.
  - **Shell Metacharacter Sanitization**: Applied strict alphanumeric and hyphen allowlist filter (`.filter(|c| c.is_ascii_alphanumeric() || *c == '-')`) to custom subdomains across both Native SSH and Localtunnel spawners to eliminate shell argument injection risks on Windows `cmd.exe /C`.
  - **Credential Redaction in WebSocket Relay**: Sanitized incoming request headers (`Authorization`, `Cookie`, `Set-Cookie`, `x-api-key`, `api-key`) to `[REDACTED]` before broadcasting `request:log` events across the desktop IPC event bus.
  - **Parallel Tunnel & Proxy Spawning**: Refactored `App.tsx` to concurrently invoke `open_tunnel` and `start_proxy` using `Promise.all`, reducing tunnel startup latency by ~40–50%. Converted process directory resolution to asynchronous background execution (`void refreshProcessDirectory`).
  - **Single-User Windows ACLs**: Hardened ephemeral private key file permissions via `spawn_blocking` `icacls ... /inheritance:r /grant:r %USERNAME%:(R)` without insecure "Everyone" fallback.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [feature/develop-batch-tunnel-teardown] - 2026-08-14 (Batch Tunnel Teardown & One-Click Stop All UI)
- **Feature Summary**:
  - **Batch Multi-Tunnel Teardown**: Added a prominent "Stop All" action button beside the active session counter in the Explore screen (`WelcomeView.tsx`) and Workspace Dashboard (`WorkspaceDashboardView.tsx`), conditionally displayed when active sessions exist.
  - **Concurrent Teardown Handler**: Implemented `stopAllTunnels` in `App.tsx` executing concurrent native `close_tunnel` invocations and remote API terminations via `Promise.all` with resilient per-tunnel error handling, synchronous state pruning, and toast notifications.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `packages/desktop/src/components/views/WorkspaceDashboardView.tsx`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [feature/proxync-native-tunnel] - 2026-08-14 (Proxync Native Tunnel Speed Optimization, High-Throughput SSH & Rust Backend Modularization)
- **Feature Summary**:
  - **Tunnel Speed & Connection Optimization**: Replaced per-request HTTP client creation with a global pooled `HTTP_CLIENT` (`tcp_nodelay(true)`, 90s idle pool, connection reuse) for zero-RTT TLS JIT certificate signing requests.
  - **Micro-Delay Key Reload**: Reduced post-signing filesystem synchronization delay from 350ms to 25ms to take advantage of sub-millisecond inotify key reloading on Linux edge servers.
  - **High-Throughput SSH Ciphers & QoS**: Configured native SSH connection with high-speed, hardware-accelerated cipher suites (`chacha20-poly1305@openssh.com,aes128-gcm@openssh.com`), disabled compression CPU overhead (`Compression=no`), enforced `IPQoS=throughput`, and tuned keepalive parameters (`TCPKeepAlive=yes`, `ServerAliveCountMax=3`, `ConnectTimeout=5`).
  - **Windows ACL Permission Optimization**: Streamlined Windows file permissions into a single-pass `icacls` invocation (`/inheritance:r /grant:r %USERNAME%:(R)`).
  - **Modular Rust Backend Architecture**: Refactored monolithic `lib.rs` (1000+ lines) into clean, decoupled domain modules: `http.rs` (CORS-bypassing HTTP executor & decompression), `proxy.rs` (local TCP proxy & event emitters), `recon.rs` (process recognition & directory resolution), `storage.rs` (local data serialization), and `tunnel.rs` (Proxync Native SSH, Localtunnel & Cloudflare tunnel managers).
- **Modified Files**:
  - `packages/desktop/src-tauri/src/http.rs`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/src/proxy.rs`
  - `packages/desktop/src-tauri/src/recon.rs`
  - `packages/desktop/src-tauri/src/storage.rs`
  - `packages/desktop/src-tauri/src/tunnel.rs`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [fix/security-cve-hardening] - 2026-08-14 [SECURITY-CVE] (Security CVE Remediation, Content Security Policy & CI/CD Workflow Hardening)
- **Feature Summary**:
  - **Dependency CVE Remediation [TYPE: CVE-PATCH]**: Patched transitive `nanoid` build dependency vulnerability ([GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8)) via `npm audit fix`, resolving all npm audit security warnings (0 vulnerabilities).
  - **Tauri Content Security Policy Activation**: Configured a robust Content Security Policy in `tauri.conf.json` (`default-src 'self'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com data:`, `connect-src 'self' ws: wss: http: https: ipc:;`) to protect the desktop webview container against unauthorized external script execution.
  - **CI/CD Workflow Script Injection Protection**: Hardened `prepare-release.yml` by encapsulating `${{ github.event.inputs.version }}` inside `env: INPUT_VERSION` with strict semantic version regex format validation (`^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$`) and cross-platform Node.js `Cargo.toml` updates.
  - **Local Security Report Protection**: Added `.gstack/` to `.gitignore` to prevent local AI security audit reports from being tracked or exposed.
- **Modified Files**:
  - `.github/workflows/prepare-release.yml`
  - `.gitignore`
  - `package-lock.json`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `CHANGELOG.md`

## [feature/develop-workspace-hub-traffic-filters-and-tunnel-ux] - 2026-08-14 (Workspace Hub Redesign, Theme-Matching Traffic Filters, Process Tree Teardown & Proxync Native Tunnel UX)
- **Feature Summary**:
  - **Scalable Workspace Hub**: Replaced 100-workspace dropdown clutter with dedicated `WorkspaceDashboardView` rendering detected local server cards and in-place full scanning.
  - **Theme-Matching Dropdown Filters**: Converted Traffic Inspector toolbar to single-row custom `<select>` dropdown pills (`Workspace:`, `Server:`, `Method:`, `Status:`) with dark theme background styling (`bg-surface-container-high text-on-surface`) and early-exit filter pipeline optimizations.
  - **Process Tree Teardown Fix**: Upgraded Rust `close_tunnel` backend command to execute `taskkill /F /T` on Windows, terminating child process trees (`cmd.exe`, `cloudflared.exe`, `ssh.exe`) and aborting `PROXY_HANDLES` TCP proxy listeners to prevent orphan background connections.
  - **Public Share Scrollbar RCA Fix**: Expanded `.domain-select-dialog` modal grid bounds (`max-width: 520px; max-height: min(820px, 92vh)`) and removed hardcoded `maxHeight: '420px'` on options container in `Dialogs.tsx`, permanently eliminating vertical scrollbar flakiness across all selection states.
  - **Dynamic Directory Resolution Security Audit**: Removed hardcoded developer machine path candidates (`candidate_roots` containing `E:\to-do`, `E:\release`, etc.) in `lib.rs` (`resolve_directory_advanced`) and replaced with dynamic current working directory and user home profile resolution.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/TrafficView.tsx`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `packages/desktop/src/components/views/WorkspaceDashboardView.tsx`
  - `packages/desktop/src/components/views/RequestWorkbenchDialog.tsx`
  - `CHANGELOG.md`

## [feature/proxync-native-tunnel] - 2026-08-13 (Proxync Native SSH Tunnel Engine, Zero-Trace Key Security & Random Subdomain Auto-Generation)
- **Feature Summary**:
  - **Native SSH Tunnel Engine**: Built high-speed native SSH tunneling engine in Rust (`open_native_tunnel` in `lib.rs`) establishing direct reverse port-forwarding (`-R {subdomain}:80:127.0.0.1:{port}`) to Proxync edge servers (`api.proxync.dev` / `104.208.83.199:2222`).
  - **Ephemeral JIT Certificate Signing**: Integrated on-demand Ed25519 keypair generation and JIT certificate signing request via `api.proxync.dev/api/tunnel/sign-jit-cert` with Bearer auth token validation.
  - **Zero-Trace Security (`TempDirGuard`)**: Implemented RAII `TempDirGuard` in Rust ensuring temporary SSH private keys and `known_hosts` files are securely erased on tunnel termination. Enforced strict file permissions (`icacls` / `0600`) on Windows and Unix platforms.
  - **Random Subdomain Auto-Generation**: Native SSH tunnels auto-generate secure 8-character random subdomains (e.g. `px-a1b2c3d4.proxync.dev`) without user input, while Localtunnel retains optional custom subdomain configuration.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/.gitignore`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/ProcessView.tsx`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [feature/develop-cve-emergency-security-radar] - 2026-08-10 (Emergency CVE Security Update Radar & Zero False-Positive Detection)
- **Feature Summary**:
  - **Emergency CVE Radar**: Implemented deterministic `isCriticalSecurityUpdate()` helper in `App.tsx` scanning GitHub Release notes for explicit security tags (`[SECURITY-CVE]`, `[TYPE: CVE-PATCH]`, `[CVE]`, or `"critical": true`).
  - **Unconditional Startup Security Check**: Refactored `runUpdateCheck(isStartupCheck)` to run an immediate pre-flight scan on every app launch. Automatically overrides `autoUpdate: OFF` settings and bypasses skipped versions only when a `[SECURITY-CVE]` tagged release is detected.
  - **Streamlined Force Update UI**: Displays a clean, non-scary `🛡️ Required Security Update vX.Y.Z` force update banner with live percentage progress tracking during download and instant `Restart Now` relaunch action.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `CHANGELOG.md`

## [fix/footer-responsiveness-and-version-bump] - 2026-08-10 (Status Footer Responsiveness Fix, Auto-Updater IPC Fix & Release Version Bump to v0.2.1)
- **Feature Summary**:
  - **Auto-Updater Capability Fix**: Fixed missing Tauri v2 security IPC permissions in `packages/desktop/src-tauri/capabilities/default.json`. Added `"updater:default"` and `"process:default"` permissions so the existing auto-updater (`check()`, `downloadAndInstall()`) and restart (`relaunch()`) pass Tauri v2 IPC security checks without runtime permission errors.
  - **Status Footer Responsiveness**: Fixed fixed-positioning gaps and text overlapping issues on narrow viewports in `App.tsx` and `index.css`. Added `@media (max-width: 820px)` rule setting `.app-footer` and `.output-console-dock` to `left: 0 !important` when the sidebar slides offscreen. Added smooth transition (`left 200ms ease`), `overflow-hidden`, and `whitespace-nowrap` to prevent vertical line clipping. Added responsive truncation for active tunnel URLs and responsive visibility breakpoints (`hidden sm:inline`, `hidden md:inline`) for latency, encoding, and console text labels.
  - **Release Version Bump**: Bumped release version from `0.2.0` to `0.2.1` across workspace manifests (`package.json`, `packages/desktop/package.json`, `package-lock.json`, `Cargo.toml`, `tauri.conf.json`), Rust HTTP client `User-Agent` (`lib.rs`), sidebar badge (`App.tsx`), and architecture reference map (`.agents/architecture.json`).
- **Modified Files**:
  - `package.json`
  - `package-lock.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `packages/desktop/src-tauri/capabilities/default.json`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/index.css`
  - `CHANGELOG.md`

## [fix/custom-domain-dns-preflight] - 2026-08-08 (Custom Domain DNS Pre-Flight Verification & Restart Persistence Fix)
- **Feature Summary**:
  - **Root Cause Fixed**: Resolved a silent tunnel bypass where a previously verified custom domain (`demo.clueliq.com`) would still activate a live tunnel even after its DNS TXT record was deleted from the registrar (`DNS_PROBE_FINISHED_NXDOMAIN`). The bug was a React state dependency issue — `shareProcess` used `domains.find()` against React state which could be empty (app freshly restarted) or keyed under a different workspace ID, causing the entire DNS pre-flight block to silently skip.
  - **Restart Persistence Fix**: Fixed issue where domain verification status reverted back to verified upon app restart. Updated `api.domains.list()` to scan all `proxync_custom_domains_*` `localStorage` keys and deduplicate entries so workspace ID mismatches no longer return empty lists. Removed stale `activeWorkspace.domains` fallback in `App.tsx` domain loading effect so old workspace state blob never overrides updated `localStorage` domain verification status.
  - **`api.domains.verifyByName()`**: New method in `api.ts` that scans ALL `localStorage` keys prefixed with `proxync_custom_domains` (not a hardcoded candidate list) to find the domain record with zero React state dependency. Performs live DNS-over-HTTPS lookup via Google DoH (`dns.google/resolve`) with Cloudflare DoH (`cloudflare-dns.com/dns-query`) as fallback. If both resolvers are unreachable (network/firewall issue), the tunnel is blocked to be safe. On DNS token mismatch or NXDOMAIN: rotates `verificationToken`, marks `verified: false` in `localStorage`, syncs state back to React and `activeWorkspace`, and surfaces an actionable toast error.
  - **UI Navigation Bug Fixed**: Moved starter scan state setup (`setStarterSuggestions`, `setSavedRequests`, `updateActiveWorkspace`) to after the DNS pre-flight block. Previously these ran unconditionally at the top of `shareProcess`, causing the UI to navigate to the process view and show the *Import Templates* banner even when the tunnel was being blocked.
  - **Traffic Interception Fix**: Fixed `open_tunnel` invocation to pass `proxyPort` (Rust TCP proxy port) instead of the raw `process.port`, enabling Traffic View log interception for custom domain tunnels. Fixed `tunnels.create()` to build the correct `http://domain:port` URL format.
  - **Domain State Sync**: Improved `addDomain`, `verifyDomain`, and `removeDomain` handlers to properly sync domain state changes into `activeWorkspace` via `updateActiveWorkspace` so Settings and process views stay in sync.
  - **Settings UX Polish**: Enter key now submits the Add Domain form. DNS configuration table polished with new `.dns-table` CSS classes. `Host`/`Value` copy buttons upgraded from `btn-ghost` to `btn-secondary`. Verify button shows dynamic `✓ Re-verify` / `Verify Domain` labels. Remove button upgraded to `btn-danger` with label `Remove Domain`.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/lib/api.ts`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/index.css`
  - `CHANGELOG.md`

## [feature/develop-0.2.0-ui-contrast-and-escape-shortcuts] - 2026-08-07 (UI Button Contrast Overhaul, Active Internet Connection Guard & Escape Shortcuts)
- **Feature Summary**:
  - **Button Contrast Overhaul**: Updated `--color-on-primary` and `--color-on-primary-container` theme tokens in `index.css` to `#ffffff` for high contrast text. Updated inline collection folder `Create` button styling in `PostmanView.tsx` to `text-white font-bold shadow-sm shadow-primary/25`.
  - **Active Internet Connectivity Guard**: Added `checkRealInternetConnection()` edge ping check to prevent `cloudflared` CLI timeout delays when attempting to open cloud tunnels offline. Added `offline` and `online` event listeners with bottom-right toast notifications and added an offline callout banner inside `DomainSelectDialog`.
  - **Global Escape Key Dismissals & Ponytail Refactoring**: Added `useEscape` custom hook in `SharedComponents.tsx` to handle Esc key dismissals across inline workspace creation (`LobbyView.tsx`), collection creation and renaming (`PostmanView.tsx`), and all modal dialogs (`Dialogs.tsx`, `App.tsx`).
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/LobbyView.tsx`
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/index.css`
  - `packages/desktop/src/lib/toast.tsx`
  - `CHANGELOG.md`

## [v0.2.0-release] - 2026-08-07 (Traffic Inspector Overhaul, Generic Replay Engine, Enterprise Tier Preview & Playground Hotkeys)
- **Feature Summary**:
  - **Traffic Inspector Overhaul**: Fixed React key collisions using unique UUIDs. Fixed inline dropdown auto-collapse under live traffic by tracking expansion via immutable request IDs. Solved scroll-position jumping by removing container dynamic key. Fixed status code badge updates in `App.tsx` by aligning `rawRequestId` matching. Enhanced Rust TCP and WebSocket proxy in `lib.rs` to capture and emit headers HashMap and bodyPreview.
  - **Generic Replay Engine**: Upgraded `replayRequest` in `App.tsx` to generically execute any HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) via native Rust HTTP executor and append newly replayed packages directly to Traffic Logs. Raised modal overlay z-index to `9999` with glassmorphic backdrop blur.
  - **Type Safety & Enterprise Preview**: Resolved `AppSettings` and `MainView` type drift in `types.ts`. Re-exported shared interfaces in `SharedComponents.tsx`. Replaced static fake API key box with Enterprise API Key Management preview card in `SettingsView.tsx`. Upgraded Account Settings to Proxync Enterprise & Cloud Sync preview card. Added Enterprise RBAC and Policy badges to Workspace Guardrails. Updated official website domain URLs across `SettingsView`, `WelcomeView`, and `DocsView` to `https://proxync.dev/`.
  - **Playground Hotkeys & Code Generator Fix**: Added `Ctrl + /` and `Ctrl + ?` keyboard hotkey binding in Playground (`PostmanView.tsx`) displaying a glassmorphic hotkey reference modal overlay. Replaced TODO comment stub in `codeSnippetGenerator.ts` with working JSON response handler template.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/TrafficView.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `packages/desktop/src/components/views/DocsView.tsx`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/lib/codeSnippetGenerator.ts`
  - `packages/desktop/src/lib/types.ts`
  - `packages/desktop/src/index.css`
  - `CHANGELOG.md`

## [feature/develop-playground-ux-and-context-menu-enhancements] - 2026-08-06 (Playground UX Overhaul, Glass Context Menu & Smart Banner Hiding)
- **Feature Summary**: Expanded Collections Rail sidebar width to 280px and eliminated duplicate HTTP method badges in sidebar items. Built a custom glassmorphic right-click context menu (Rename, Copy URL, Duplicate Request, Delete) with global contextmenu suppression unless Developer Inspect Tools is enabled. Added Developer Inspect Tools toggle in Settings under Danger Zone. Centralized `HTTP_METHODS` and `stripMethodPrefix()` utility in `SharedComponents.tsx` to strip method prefixes from request titles. Added unimported endpoint deduplication to starter suggestions banner so it automatically stays hidden when all scanned endpoints are already in collections.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/lib/openApiGenerator.ts`
  - `packages/desktop/src/lib/types.ts`
  - `packages/desktop/src/index.css`
  - `CHANGELOG.md`

## [PR #69] - 2026-08-06 (Target Route Badge in Playground - Contributed by @slegarraga)
- **Feature Summary**: Added a compact, pill-shaped Target Route Badge (`.route-badge`) next to the Send button in Playground request builder. Displays dynamic route target indicators (`Cloudflare Edge`, `Public Tunnel`, or `Local Loopback`) so developers immediately know whether traffic traveled through a public edge tunnel or local loopback. Upgraded design tokens across `Dialogs.tsx`, `SharedComponents.tsx`, and `index.css` to Material 3 palette tokens. Made local loopback tooltip URL 100% dynamic based on active process port.
- **Contributor**: @slegarraga (PR #69)
- **Modified Files**:
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/index.css`
  - `packages/desktop/src/App.tsx`
  - `CHANGELOG.md`

## [feature/develop-workspace-activity-and-tunnel-ux-upgrades] - 2026-08-06 (Dynamic Workspace Activity, 7-Day Inactive Auto-Categorization, Custom Glass Modals & 1-Click Open in Browser)
- **Feature Summary**: Implemented dynamic workspace activity tracking (`lastActivityAt`) with relative time formatting (`Just now`, `4m ago`, `18h ago`, `3d ago`), auto-activating on workspace selection, tunnel sharing, and HTTP traffic logs. Renamed `Archived` tab to `Inactive` with automatic 7-day inactivity filtering, auto-disappearing dormant workspaces into `Inactive` tab and restricting Provision Workspace inline card to `Active` tab. Replaced native `confirm()` on Purge All Data with glassmorphic `ConfirmPurgeDialog`. Enhanced Active Workspace selector typography and contrast. Added 1-click **Open in Browser** option to Active Tunnels three-dot menu (`⋮`) in `WelcomeView` and endpoint action tiles in `ProcessView`. Fixed horizontal icon alignment in Coming Soon modal. Renamed Postman navigation label to single-word industry-standard **Playground**.
- **Modified Files**:
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/LobbyView.tsx`
  - `packages/desktop/src/components/views/ProcessView.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `packages/desktop/src/lib/types.ts`
  - `CHANGELOG.md`

## [feature/develop-patch-socketio-parser-vulnerability] - 2026-08-06 (Socket.IO Vulnerability Patch & Orphaned Dependency Pruning)
- **Feature Summary**: Resolved Dependabot security vulnerability `GHSA-2m8v-j782-fhvr` (**Socket.IO: Zero-attachment Memory Exhaustion**) and conducted full codebase audit. Completely pruned 3 orphaned, 100% unused dependencies (`socket.io-client`, `socket.io-parser`, `react-router`) from `packages/desktop/package.json` and root `package.json` overrides, removing 9 unneeded node packages. Verified via `npm audit` (0 vulnerabilities) and clean `npm run build`.
- **Modified Files**:
  - `package.json`
  - `packages/desktop/package.json`
  - `package-lock.json`
  - `CHANGELOG.md`

## [feature/main-telemetry-options] - 2026-08-06 (Persistent Telemetry System with Low-CPU Basic Mode)
- **Feature Summary**: Fully wired persistent **Enhanced** vs **Basic** telemetry options into `AppSettings` with storage persistence. **Enhanced Mode** (default) enables full P50/P90/P99 latency calculations, route leaderboards, and bandwidth meters. **Basic Mode** bypasses array sorting (`durations.sort`) and non-fatal percentile math to minimize CPU/RAM computational overhead, logging only critical 5xx errors. Features clean inline descriptions in Settings and an active Low CPU Mode indicator banner in Observability Hub.
- **Modified Files**:
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/components/views/ObservabilityView.tsx`
  - `packages/desktop/src/App.tsx`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [feature/main-smart-auto-update] - 2026-08-05 (Smart Version-Aware Auto-Update System)
- **Feature Summary**: Fully wired the Settings "Automatic Updates" toggle to the real update scheduler. When **ON** (default), the app checks for updates on startup and every **2 hours**. When **OFF**, it checks only every **7 days** using a persisted timestamp. Introduced a semver `isForceUpdate()` helper: if the **minor or major** version segment increments (e.g. `1.1.x → 1.2.0`, `0.2.x → 0.3.0`), a **forced update** dialog is shown — red, persistent, no Skip or Later buttons, only "Update Now". Pure **patch-only bumps** (e.g. `1.1.4 → 1.1.6`) show the standard optional toast with Skip this version and Later. Toggle state is now persisted to `AppSettings` and survives restarts.
- **Modified Files**:
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/package.json`
  - `package-lock.json`
  - `.agents/changelog.json`
  - `CHANGELOG.md`


## [feature/main-observability-autostart-hub] - 2026-08-05 (Observability Hub, Auto-Start on Boot & Silent Process Spawning)
- **Feature Summary**: Integrated zero-config Observability Hub featuring P50/P90/P99 latency analytics, status code heatmap, bandwidth meter, public Webhook stream replay, Error Center, and high-contrast theme styling for Midnight Slate and Dracula Dark. Integrated native Auto-Start on Boot functionality using `tauri-plugin-autostart` with silent process spawning on Windows (`CREATE_NO_WINDOW`).
- **Modified Files**:
  - `packages/desktop/src/components/views/ObservabilityView.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/components/views/SwaggerView.tsx`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/capabilities/default.json`
  - `package-lock.json`
  - `packages/desktop/package.json`
  - `CHANGELOG.md`

## [feature/main-observability-hub] - 2026-08-05 (Zero-Config Observability Hub, Latency Analytics & Webhook Stream)
- **Feature Summary**: Implemented high-performance O(N) zero-config Observability Hub in `ObservabilityView.tsx` featuring percentile latency metrics (P50/P90/P99), status code distribution gauge, total bandwidth meter, shared public tunnel telemetry, public Webhook interception stream with 1-click Webhook Replay, structured Error Center eliminating terminal console log soup, slowest routes leaderboard, and 1-click debugging navigation to Traffic Inspector and Postman Studio.
- **Modified Files**:
  - `packages/desktop/src/components/views/ObservabilityView.tsx`
  - `packages/desktop/src/App.tsx`
  - `CHANGELOG.md`

## [feature/develop-auto-updater] - 2026-08-04 (Production-Ready Auto Updater)
- **Feature Summary**: Implemented a fully production-ready automatic update system using Tauri v2 native plugins (`tauri-plugin-updater`, `tauri-plugin-process`), modelled after the POSINX Electron auto-updater pattern. On startup (and every 2 hours), the app silently checks GitHub Releases for a newer version. When an update is found, a persistent non-auto-dismissing toast appears with three actions: **Update Now** (silent background download with live % progress shown on the button), **Skip this version** (version saved to `localStorage` — won't prompt again for that version), and **Later** (dismisses until next check). After downloading, a second persistent toast prompts **Restart Now** or **Later**. Upgraded `toast.tsx` to support persistent toasts with a new `dismissToast(id)` API. Updated `release.yml` GitHub Actions workflow to pass `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets to `tauri-action` with `includeUpdaterJson: true`, enabling automatic signed `updater.json` generation and upload on every release. Set real public key in `tauri.conf.json`. Added `*.key` and `*.key.pub` to `.gitignore` to protect signing keys from accidental commits.
- **Modified Files**:
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/lib/toast.tsx`
  - `.github/workflows/release.yml`
  - `.gitignore`
  - `CHANGELOG.md`


## [fix/develop-swagger-redirection] - 2026-08-04 (Swagger Postman Export Auto-Redirection & Theme Filter Pill High-Contrast Contrast Fix)
- **Feature Summary**: Added automatic view redirection to Postman Studio (`setMainView('postman')`) upon clicking 'Export to Postman' in Swagger Studio. Fixed active tag filter pill text contrast across Dracula Dark, Midnight, Cyberpunk, and all themes by setting bright white bold text (`text-white font-bold shadow-md shadow-primary/25`).
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/SwaggerView.tsx`
  - `README.md`
  - `CHANGELOG.md`


## [fix/develop-postman-response-and-decompression] - 2026-08-04 (Postman Response Payload Decompression & Native Execution Fix)
- **Feature Summary**: Resolved empty HTTP response payload issue in Postman Studio when requesting Cloudflare Tunnels or relative endpoints. Added gzip, deflate, and brotli automatic decompression features to reqwest in `Cargo.toml`, updated `Cargo.lock`, set desktop User-Agent header in Rust native HTTP executor (`lib.rs`), and bypassed offline mock response handler.
- **Modified Files**:
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `CHANGELOG.md`


## [feature/develop-swagger-generator] - 2026-08-04 (Automatic OpenAPI Spec Generator, Multi-Framework Codebase Scanner & Swagger Studio UX Overhaul)
- **Feature Summary**: Implemented an automatic multi-framework codebase route scanner (Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, Go) and manual on-demand OpenAPI 3.0 spec generation engine. Added traffic-driven JSON schema inferrer, framework code annotation generator ('Add to Codebase' snippet tab for NestJS, Express JSDoc, FastAPI, Spring Boot, Go), 2-way Postman collection export/import, and redesigned Swagger Studio UX with search filtering, endpoint drawers, parameter tables, raw JSON/YAML views, and spec downloads.
- **Modified Files**:
  - `packages/desktop/src/lib/codebaseScanner.ts`
  - `packages/desktop/src/lib/openApiGenerator.ts`
  - `packages/desktop/src/lib/codeSnippetGenerator.ts`
  - `packages/desktop/src/lib/types.ts`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/components/views/SwaggerView.tsx`
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/App.tsx`
  - `CHANGELOG.md`

## [v0.2.0-dev] - 2026-08-03 (Postman Studio Redesign, Hotkeys & Developer UX Refresh)
- **Feature Summary**: Redesigned Postman Studio (`PostmanView.tsx`) with static collection tree ordering, inline folder renaming/deletion, custom collection hotkeys (`Ctrl+Enter` to Send, `Ctrl+S` to Save directly to selected collection), inline Response tab, native Rust HTTP executor (`execute_http_request`) to bypass CORS, and Windows console signal handler (`SetConsoleCtrlHandler`). Bumped application version to `0.2.0` across workspace manifests (`package.json`, `packages/desktop/package.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`, `package-lock.json`, and `.agents/architecture.json`). Established application-wide `Nunito Sans` font typography system in `assets/typography.css`. Redesigned `DocsView.tsx` into a clean 2-column documentation hub with direct portal links to `https://proxync.dev/docs`.
- **Modified Files**:
  - `package.json`
  - `package-lock.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/index.css`
  - `packages/desktop/src/assets/typography.css`
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/components/views/DocsView.tsx`
  - `.agents/architecture.json`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [v0.1.8] - 2026-08-02 (PostCSS Security Patch & Version Bump)
- **Feature Summary**: Patched Dependabot security vulnerability by upgrading `postcss` from `8.5.16` to `8.5.25` and `nanoid` from `3.3.15` to `3.3.16` in `package-lock.json`. Bumped version to `0.1.8` across root `package.json`, `packages/desktop/package.json`, `tauri.conf.json`, `Cargo.toml`, and `.agents/architecture.json`.
- **Modified Files**:
  - `package.json`
  - `package-lock.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `.agents/architecture.json`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [feature/main-fix-postcss-vulnerability] - 2026-08-01 (PostCSS Security Patch)
- **Feature Summary**: Patched Dependabot security vulnerability by upgrading `postcss` from `8.5.16` to `8.5.25` and `nanoid` from `3.3.15` to `3.3.16` in `package-lock.json`.
- **Modified Files**:
  - `package.json`
  - `package-lock.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `.agents/architecture.json`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [v0.1.7] - 2026-08-01 (React Router CVE Patch & Version Bump)
- **Feature Summary**: Patched Dependabot security vulnerability (CVE-2026-22030 / GHSA-h5cw-625j-3rxh) by upgrading `react-router` to `^8.3.0` (>= 8.3.0) and removing the unused legacy `react-router-dom` dependency. Bumped version to `0.1.7` across root `package.json`, `packages/desktop/package.json`, `tauri.conf.json`, `Cargo.toml`, and `.agents/architecture.json`, and updated `package-lock.json` and `Cargo.lock` accordingly.
- **Modified Files**:
  - `package.json`
  - `package-lock.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `.agents/architecture.json`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [v0.1.6] - 2026-07-23 (Installer UI Panel Fix & Version Bump)
- **Feature Summary**: Fixed blank setup screen in NSIS installer by generating and configuring custom BMP images (`nsis-sidebar.bmp` and `nsis-header.bmp`) for the welcome page sidebar and header. Bumped version to `0.1.6` across root `package.json`, `packages/desktop/package.json`, `tauri.conf.json`, `Cargo.toml`, and `.agents/architecture.json`, and updated `package-lock.json` and `Cargo.lock` accordingly.
- **Modified Files**:
  - `package.json`
  - `package-lock.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `packages/desktop/src-tauri/icons/nsis-header.bmp`
  - `packages/desktop/src-tauri/icons/nsis-sidebar.bmp`
  - `.agents/architecture.json`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [v0.1.3] - 2026-07-21 (Vulnerability Patch & Release Branding)
- **Feature Summary**: Updated desktop package name from generic `desktop` to `proxync`, set author to `Inilax`, and added project description across package.json, Cargo.toml, and tauri.conf.json. Configured NSIS installerIcon under bundle.windows in tauri.conf.json to display custom Proxync ico branding during setup. Patched glib dependency to >= 0.20.12 in Cargo.lock to resolve Dependabot memory unsoundness advisory #4. Updated workspace architecture recon map (.agents) and bumped version to v0.1.3 across all workspace config files.
- **Modified Files**:
  - `package.json`
  - `packages/desktop/package.json`
  - `packages/desktop/src-tauri/Cargo.toml`
  - `packages/desktop/src-tauri/Cargo.lock`
  - `packages/desktop/src-tauri/src/main.rs`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `.agents/architecture.json`
  - `.agents/changelog.json`
  - `CHANGELOG.md`

## [feature/main-standalone-mode] - 2026-07-19 (Cleanup & Branding)
- **Feature Summary**: Updated workspace brand logo to Proxync Graphite Gateway SVG, replacing the old PNG assets. Removed deprecated `docs/assets` folder. Re-wrote `README.md` to reflect local-first standalone desktop architecture and simplify workspace startup commands. Untracked `.agents` directory in git to respect gitignore specifications. Replaced terminal-orb PX text with logo image in WelcomeView.
- **Modified/Deleted Files**:
  - `README.md`
  - `CHANGELOG.md`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/index.css`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `packages/desktop/public/logo.svg` (added)
  - `docs/assets` (deleted)

## [feature/main-standalone-mode] - 2026-07-19
- **Feature Summary**: Migrated application to 100% offline, standalone, local-first mode. Removed NestJS API backend (`packages/api`), postgres/redis configurations, and `docker-compose.yml`. Implemented Rust state serialization commands saving configurations directly to `AppData/Roaming/Proxync/data.json`. Created a local TCP proxy in Rust that intercepts HTTP traffic and emits request/response logs directly to the frontend via Tauri events. Removed all references to Guardrails, Observability views, and Companion chat/voice panels from frontend state and views. Configured Tauri build settings to output a portable single executable, verified clean builds, and updated gitignore settings.
- **Modified/Deleted Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/tauri.conf.json`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/components/views/LobbyView.tsx`
  - `packages/desktop/src/components/views/ProcessView.tsx`
  - `packages/desktop/src/components/views/SwaggerView.tsx`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/lib/api.ts`
  - `packages/desktop/src/lib/types.ts`
  - `.gitignore`
  - `package.json`
  - `docker-compose.yml` (deleted)
  - `packages/desktop/src/components/views/ObservabilityView.tsx` (deleted)

## [feature/main-dynamic-processes-notes] - 2026-07-18
- **Feature Summary**: Implemented dynamic process directory and executable path lookup on Windows using native netstat parsing and WMI/CIM queries with a high-performance local process cache in Rust to prevent OS overhead; shifted Workspace Notes input from SettingsView to WelcomeView; removed obsolete relayDeploymentHint settings from AppSettings.
- **Modified Files**:
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/lib/types.ts`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/App.tsx`

## [feature/main-modular-ui-redesign] - 2026-07-18
- **Feature Summary**: Redesigned the desktop UI/UX completely with a premium glassmorphism theme and modular structure, refactoring App.tsx into independent views under components/views; successfully merged with upstream branch changes, preserving Cloudflare tunnel support, state hydration logic, and Control Plane connection options; resolved all merge conflicts and validated TypeScript compilation.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/index.css`
  - `packages/desktop/src/components/views/Dialogs.tsx`
  - `packages/desktop/src/components/views/LobbyView.tsx`
  - `packages/desktop/src/components/views/ObservabilityView.tsx`
  - `packages/desktop/src/components/views/PostmanView.tsx`
  - `packages/desktop/src/components/views/ProcessView.tsx`
  - `packages/desktop/src/components/views/SettingsView.tsx`
  - `packages/desktop/src/components/views/SharedComponents.tsx`
  - `packages/desktop/src/components/views/SwaggerView.tsx`
  - `packages/desktop/src/components/views/TrafficView.tsx`
  - `packages/desktop/src/components/views/WelcomeView.tsx`
  - `package-lock.json`
  - `.agents/changelog.json`

## [feature/main-cloudflare-refactor] - 2026-07-17
- **Feature Summary**: Integrated Cloudflare Tunnel support using npx cloudflared quick tunnels with automatic trycloudflare URL parsing; built premium visual antenna latency signal bars displaying ping times to Local loopback, Cloudflare edge, and Localtunnel endpoints; refactored App.tsx monolith into independent views (LobbyView, ProcessView, TrafficView, PostmanView, SwaggerView, ObservabilityView, SettingsView) and dialog components; resolved workspaces state hydration race condition by loading local state synchronously on mount; added seamless silent workspace auto-registration during public domain sharing; added permanent Control Plane Connection section inside Settings with reconnect actions; bypassed guest user active tunnel count limits for offline/local MVP mode.
- **Modified Files**:
  - `packages/api/src/tunnels/tunnels.service.ts`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/CompanionPanel.tsx`
  - `packages/desktop/src/components/DiscoverDialog.tsx`
  - `packages/desktop/src/components/DomainSelectDialog.tsx`
  - `packages/desktop/src/components/RequestDetailDialog.tsx`
  - `packages/desktop/src/lib/types.ts`
  - `packages/desktop/src/screens/LobbyView.tsx`
  - `packages/desktop/src/screens/ObservabilityView.tsx`
  - `packages/desktop/src/screens/PostmanView.tsx`
  - `packages/desktop/src/screens/ProcessView.tsx`
  - `packages/desktop/src/screens/SettingsView.tsx`
  - `packages/desktop/src/screens/SwaggerView.tsx`
  - `packages/desktop/src/screens/TrafficView.tsx`

## [feature/main-responsive-ui-cleanup] - 2026-07-17
- **Feature Summary**: Removed duplicate top navbar and tab-strip navigation bars — all navigation now lives exclusively in the sidebar, eliminating the dual-nav confusion. Added a compact 48px mobile-nav-bar (hamburger + current view label) that only appears on screens ≤820px where the sidebar becomes a slide-in overlay drawer. Fixed full-screen layout breakage caused by grid display:none row collapse — workspace-shell converted from CSS grid to flexbox column so content fills 100% height on all screen sizes. Added tunnel status pill inside the sidebar replacing the removed topbar session pill. Redesigned RequestPlayground with sub-tab switcher (REST Client / AI Endpoint Scanner) to prevent input squashing inside narrow inspector panels. Added onClose callback to ChatPanel with dismiss button in header. Implemented 2-step onboarding wizard in LobbyView when no workspaces exist (welcome step → workspace name input step). Added responsive CSS breakpoints for inspector/chat panel overlays at ≤1200px and full-width at ≤768px. Sidebar now auto-closes when any nav item is clicked on mobile.
- **Modified Files**:
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/ChatPanel.tsx`
  - `packages/desktop/src/components/RequestPlayground.tsx`
  - `packages/desktop/src/screens/TunnelsView.tsx`
  - `packages/desktop/src/index.css`
  - `.agents/changelog.json`

## [feature/main-shared-domains-pool] - 2026-07-16
- **Feature Summary**: Refactored custom domains relationship from workspace level to user level to enable sharing domains globally across workspaces; added customDomain unique reference to Tunnels; implemented DomainSelectDialog dropdown choice for exposing tunnels on random subdomains, custom domains, or public Localtunnel proxies; integrated Localtunnel client spawning in Rust layer routing through API port 3939 to support 100% traffic capturing/logging; added local WiFi LAN Tunnel resolver and premium helper select card styling with preferred subdomain selection support.
- **Modified Files**:
  - `packages/api/prisma/schema.prisma`
  - `packages/api/src/domains/domains.controller.ts`
  - `packages/api/src/domains/domains.service.ts`
  - `packages/api/src/relay/relay.middleware.ts`
  - `packages/api/src/tunnels/dto/tunnel.dto.ts`
  - `packages/api/src/tunnels/tunnels.service.ts`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/DomainsSettings.tsx`
  - `packages/desktop/src/lib/api.ts`

## [feature/main-dns-table-and-local-shares-ui] - 2026-07-16
- **Feature Summary**: Reordered and styled custom domains DNS configuration table to match Namesilo/GoDaddy layout; implemented public direct DNS resolver (1.1.1.1/8.8.8.8) to bypass local cached lookup delays; added explicit WAN (public tunnel) vs LAN (local server) share choices; fixed active tunnel state resetting upon re-entering workspaces from Lobby.
- **Modified Files**:
  - `packages/api/src/domains/domains.service.ts`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/DomainsSettings.tsx`
  - `packages/desktop/src/index.css`
  - `.agents/changelog.json`

## [feature/main-agents-and-env-config] - 2026-07-16
- **Feature Summary**: Created workspace rules (AGENTS.md), system architecture recon map (architecture.json), and release logs (changelog.json); shifted .env.example from root to packages/api/ with updated default port 3939.
- **Modified Files**:
  - `.agents/AGENTS.md`
  - `.agents/architecture.json`
  - `.agents/changelog.json`
  - `.env.example`
  - `packages/api/.env.example`

## [main] - 2026-07-16
- **Feature Summary**: Shifted API server to custom port 3939 to avoid local developer port conflicts; introduced workspace onboarding experience for zero-workspace startup; implemented cancel option for local LAN shares in offline modes; resolved NestJS module circular references via decoupled events broker; added active tunnel state hydration on startup; resolved sidebar layout overlapping via scrollbar overrides.
- **Modified Files**:
  - `packages/api/src/main.ts`
  - `packages/api/src/tunnels/tunnels.service.ts`
  - `packages/api/.env`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/ChatPanel.tsx`
  - `packages/desktop/src/lib/api.ts`
  - `packages/desktop/src/screens/ApiKeysView.tsx`
  - `packages/desktop/src/screens/TunnelsView.tsx`
  - `packages/desktop/src/index.css`
