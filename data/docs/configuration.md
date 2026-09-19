---
title: Configuration
description: Local data.json file structure, settings schema, log file paths, and network ports used by Proxync.
---

Proxync is designed to be transparent and local-first. All your workspaces, saved API collections, and application preferences are saved into a single, human-readable JSON file on your machine:

- **Windows:** `%APPDATA%\Proxync\data.json`
- **macOS:** `~/Library/Application Support/Proxync/data.json`
- **Linux:** `~/.config/Proxync/data.json`

You can back up, inspect, or move this file anytime.

---

## Configuration Schema (`data.json`)

Here is an example of what `data.json` looks like:

```json
{
  "workspaces": [
    {
      "id": "ws-1723000000",
      "name": "My Web Project",
      "lastActivityAt": 1723048000000,
      "projectRootPath": "/path/to/my-project",
      "profiles": [],
      "savedRequests": [],
      "capturedRequests": [],
      "domains": [],
      "notes": "Main local development workspace"
    }
  ],
  "activeWorkspaceId": "ws-1723000000",
  "appSettings": {
    "defaultProjectRootPath": "/path/to/projects",
    "notes": "",
    "telemetryMode": "enhanced",
    "appLogging": true,
    "trafficLogging": false,
    "autoUpdateEnabled": true,
    "developerInspectTools": false,
    "lastUpdateCheckedAt": 1723048000000
  }
}
```

---

## Settings Reference

| Key | Type | Default | What It Controls |
| :--- | :--- | :--- | :--- |
| `appLogging` | `boolean` | `true` | Writes application lifecycle and tunnel events to `logs/app.log`. |
| `trafficLogging` | `boolean` | `false` | Enables full payload recording to `logs/traffic.log`. |
| `telemetryMode` | `"enhanced"` \| `"basic"` | `"enhanced"` | Enhanced ($P50, P90, P99$ latency math) vs Basic (Low-CPU mode for older machines). |
| `autoUpdateEnabled` | `boolean` | `true` | When true, checks for updates every 2 hours. When false, checks every 7 days. |
| `developerInspectTools` | `boolean` | `false` | Enables the browser Developer Tools inspector via right-click menus. |

---

## Local Logs & Automatic Rotation

To keep your storage tidy and avoid filling up your hard drive, Proxync limits the size of log files:

- **`app.log` (5MB Limit):** General application events and dev server recon scans. Automatically archives to `app.log.old` when it exceeds 5MB.
- **`traffic.log` (10MB Limit):** Full HTTP request and response payloads when traffic logging is enabled. Automatically archives to `traffic.log.old` when it exceeds 10MB.
- **Panic Hook:** In the unlikely event of an internal fault, stack traces are captured safely to `app.log` to help with debugging.

All sensitive tokens (such as `Authorization: Bearer` and API keys) are masked with asterisks before writing to disk.

---

## Network Ports Used by Proxync

| Port | Protocol | Purpose |
| :--- | :--- | :--- |
| **`2222`** | SSH / TCP | Outbound connection to Proxync Native Relay (`relay.proxync.dev`). |
| **`127.0.0.1:*`** | TCP | Temporary local ports for the intercepting proxy (strictly loopback protected). |
| **`1420`** | TCP | Local Vite server port (only used during development builds from source). |
| **`53 / 443`** | HTTPS | Outbound DNS-over-HTTPS lookups to Google and Cloudflare for domain verification. |

---

## What to Read Next

- **[Architecture Deep-Dive](/docs/architecture)** — How the Tauri desktop shell and Rust engine interact.
- **[Settings & Domains](/docs/settings)** — Configure preferences directly from the app interface.
- **[Workspaces](/docs/workspaces)** — Manage your project workspaces.
