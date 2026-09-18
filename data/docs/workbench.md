---
title: Request Workbench
description: High-performance multi-tab HTTP execution engine with live visual diffing, 1-click IDE jumping, and multi-language code export.
---

## Overview

The **Request Workbench** in Proxync v0.2.1 is an advanced HTTP draft and replay studio designed for rapid API iteration, regression testing, and root-cause debugging.

Instead of copying request payloads back and forth between terminal curl commands, Postman collections, and browser DevTools, the Request Workbench lets you capture live traffic, modify headers and body payloads in multi-tab drafts, execute instant replays, and view **side-by-side visual diffs** against the original response.

```
Captured Traffic  ──▶  Workbench Draft  ──▶  Send & Replay  ──▶  Visual Diff (Live vs Captured)
                                                      │
                                                      └──▶  1-Click IDE Jump (VS Code / Cursor)
```

---

## Key Features

### 1. Multi-Tab Draft Staging
- **Concurrent Tabs**: Stage and edit multiple requests simultaneously without losing state.
- **Header & Body Editor**: Full support for custom headers, URL query parameters, and formatted JSON body payloads.
- **Cache Bypass Toggle**: Injects `Cache-Control: no-cache, no-store` to ensure live responses bypass intermediate memory or HTTP caches.

### 2. Live Replay & Performance Benchmarking
- **Sub-Millisecond Execution**: Direct loopback routing via Proxync's native Rust client.
- **Latency & Status Tracking**: Accurate millisecond-duration telemetry (`18ms`, `34ms`) and HTTP status badge indicators (`200 OK`, `201 Created`, `500 Internal Error`).
- **Replay History**: Track run numbers and compare output changes across successive executions.

### 3. Visual Response Diffing
Compare live replay outputs against the original captured payload in two distinct view modes:
- **Side-by-Side Mode**: Dual-column layout showing the original captured response alongside the fresh live replay response.
- **Unified Mode**: Compact diff view highlighting added, modified, and deleted JSON fields.

---

## 1-Click IDE Jumping

Proxync v0.2.1 bridges runtime traffic inspection with your local code editor. Through a native Tauri IPC command (`open_file_in_editor`), Proxync resolves the source file path and 1-indexed line number where the target endpoint is defined and opens it instantly.

### Supported Editors
- **VS Code**: Launches via `vscode://file/<path>:<line>` or local `code` CLI.
- **Cursor**: Launches via `cursor://file/<path>:<line>` or local `cursor` CLI.

```bash
# Example Jump Target
src/routes/users.ts:42
```

> [!TIP]
> If direct URI protocol launching is restricted by your OS, Proxync automatically copies the formatted file and line target to your system clipboard as an instant fallback.

---

## Multi-Language Code Snippet Generator

Export any captured or staged request into ready-to-run terminal and programming language code snippets in a single click:

| Language / Tool | Target Library |
| :--- | :--- |
| **cURL** | POSIX terminal command |
| **JavaScript / TypeScript** | Native `fetch` API with `async/await` |
| **Python** | `requests` library |
| **Go** | `net/http` standard library |
| **Rust** | `reqwest` with `tokio` async runtime |

---

## Auth Synchronization & Token Injection

- **Sync Auth**: Instantly extracts authorization headers (`Authorization: Bearer ...`), API keys, and session cookies from captured production traffic and applies them to your active draft tab.
- **Bearer Token Helper**: Dedicated input field for quick JWT or Bearer token application without manually formatting header strings.
