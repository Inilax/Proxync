---
title: Workspaces
description: Isolated project contexts featuring dynamic activity tracking, 7-day inactivity filtering, batch tunnel teardown, and custom glass dialogs.
---

In Proxync v0.2.1, workspaces serve as isolated project contexts with dynamic netstat reconnaissance, multi-tunnel segregation, and batch lifecycle management.

## What a Workspace Holds

- **Discovered Processes (`ProcessProfile[]`)** — Identified dev servers with PID, port, command, working directory, and framework detection.
- **Playground Collections (`SavedRequest[]`)** — Saved REST API requests organized into tree folders.
- **Traffic Log History (`RequestLog[]`)** — Recorded HTTP/WebSocket traffic with deterministic port, tunnelId, and server attribution.
- **Domain Records (`DomainRecord[]`)** — Verified custom domain configurations.
- **Workspace Activity (`lastActivityAt`)** — Timestamps updated automatically on workspace selection, tunnel launch, or incoming traffic.

## Dynamic Activity Tracking & 7-Day Inactivity Filtering

- **Relative Activity Indicators** — Workspace cards display relative timestamps (`Just now`, `4m ago`, `18h ago`, `3d ago`).
- **Inactive Auto-Categorization** — Workspaces dormant for over 7 days automatically transition into the **Inactive** tab to keep your active workspace rail clean.
- **Active Workspace Restraints** — Workspace provisioning cards are focused exclusively on the **Active** tab.

## Batch Multi-Tunnel Teardown & Safety

- **1-Click Stop All** — Stop all running tunnels associated with the workspace concurrently with graceful child process cleanup.
- **Confirm Purge Dialog** — Customized glassmorphic confirmation modals protect against accidental workspace deletion.
- **Global Escape Key Handler (`useEscape`)** — Pressing `Esc` dismisses modal overlays and inline creation forms seamlessly.
