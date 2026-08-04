# Changelog

All notable changes to the Proxync (Portly) workspace studio project are documented here.

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
