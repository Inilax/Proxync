---
title: API Reference
description: Complete reference for Tauri IPC commands, Rust backend functions, emitted events, and shared data contracts in Proxync.
---

This page provides the technical specification for the Tauri v2 Inter-Process Communication (IPC) command surface connecting the React frontend to the native Rust engine.

---

## Native IPC Commands

### `execute_http_request`
Executes an HTTP request natively in Rust, completely bypassing browser CORS restrictions. Uses pooled `reqwest` clients with automatic `gzip`, `deflate`, and `brotli` decompression, and automatically attaches OS-appropriate `User-Agent` strings.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `request` | `HttpRequest` | Object containing `method`, `url`, `headers`, and optional `body`. |

**Returns:** `HttpResponse` containing `status`, `headers`, `body`, and `durationMs`.

---

### `open_tunnel` & `close_tunnel`
- **`open_tunnel`**: Spawns a Proxync Native Relay tunnel (`relay.proxync.dev:2222`) or Cloudflare Quick Tunnel. Automatically establishes process group isolation (`setpgid(0, 0)`) on Unix.
- **`close_tunnel`**: Cleanly terminates the entire child process tree (`taskkill /F /T` on Windows, atomic POSIX `SIGKILL` on Unix) and wipes ephemeral keys.

---

### `scan_ports` & `scan_processes`
Scans all active listening dev servers across IPv4 and IPv6:
- **Windows:** Uses `netstat -ano` combined with bulk WMI queries (`Win32_Process`).
- **macOS:** Inspects Darwin kernel sockets via `lsof -iTCP` and resolves process names via `proc_pidpath`, filtering internal macOS daemons (`ControlCenter`, `rapportd`).
- **Linux:** Uses `ss -tulpn` and `/proc` filesystem inspection.

---

### `resolve_process_directory`
Discovers the working project folder for a running dev server using unprivileged `lsof` (macOS), `/proc/<pid>/cwd` (Linux), or WMI (Windows).

---

### `get_system_info`
Returns host platform diagnostic fingerprinting via `os_info`:
- Operating system, kernel distribution, CPU architecture, bitness.
- Hostname, local IP, process PID, and WebView engine version.

---

### `save_support_bundle_dialog`
Opens the operating system's native save dialog to export `proxync-support-bundle.json` with sanitized logs and system diagnostics.

---

### Log Management Commands
- **`append_log_entry`**: Appends a structured log entry to `app.log` or `traffic.log` with automatic 5MB/10MB file rotation.
- **`read_logs_summary`**: Returns current disk usage statistics (file sizes in bytes, line counts).
- **`clear_log_files`**: Safely clears log files on disk.
- **`open_logs_folder`**: Opens the operating system's file manager to Proxync's logs folder.

---

### `save_app_state` & `load_app_state`
Persists and reads application state and workspace data directly to `data.json`.

---

## Real-Time Events (Backend to Frontend)

| Event Name | Payload | When It Fires |
| :--- | :--- | :--- |
| `request:log` | `{ requestId, port, tunnelId, method, path, headers, timestamp }` | Fired when the proxy intercepts an incoming request. |
| `request:log:response` | `{ requestId, status, responseHeaders, bodyPreview, durationMs, timestamp }` | Fired when the backend returns a response. |
| `tunnel:auto-closed` | `{ tunnelId }` | Fired when an active background tunnel disconnects or terminates. |
| `offline` / `online` | `{ status }` | Fired when the active internet connectivity guard detects a network change. |

---

## Core TypeScript Data Contracts

```ts
// Application Settings
type AppSettings = {
  defaultProjectRootPath: string;
  notes: string;
  telemetryMode: "enhanced" | "basic";
  appLogging: boolean;
  trafficLogging: boolean;
  autoUpdateEnabled: boolean;
  developerInspectTools: boolean;
  lastUpdateCheckedAt?: number;
};

// Diagnostic Log Entry
type AppLogEntry = {
  seq: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  details?: Record<string, unknown>;
};

// Logs Summary on Disk
type LogsSummary = {
  logs_dir: string;
  app_log_bytes: number;
  traffic_log_bytes: number;
  app_log_lines: number;
  traffic_log_lines: number;
};

// Host System Telemetry
type SystemInfo = {
  os_type: string;
  os_version: string;
  architecture: string;
  bitness: string;
  hostname: string;
  local_ip: string;
  webview_version: string;
  pid: number;
};
```

---

## What to Read Next

- **[Architecture Deep-Dive](/docs/architecture)** — Detailed breakdown of Proxync's Rust subsystems.
- **[Configuration](/docs/configuration)** — File locations and data format reference.
- **[Settings & Domains](/docs/settings)** — Managing preferences from the user interface.
