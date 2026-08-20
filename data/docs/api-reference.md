---
title: API Reference
description: The Tauri IPC command surface, Rust native functions, emitted events, and shared data contracts of Proxync v0.2.1.
---

Proxync's modular Rust backend exposes Tauri v2 IPC commands and events for dynamic process discovery, HTTP proxying, native SSH tunneling, dual-stream disk logging, and auto-updating.

## Native IPC Commands

### `execute_http_request`
Executes any HTTP request (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`) natively in Rust using pooled `reqwest` clients with automatic `gzip`, `deflate`, and `brotli` decompression, bypassing browser CORS restrictions.

| Parameter | Type | Description |
| --- | --- | --- |
| `request` | `HttpRequest` | Payload containing `method`, `url`, `headers`, and optional `body`. |

**Returns:** `HttpResponse` (`status`, `headers`, `body`, `durationMs`).

### `open_tunnel` & `close_tunnel`
- `open_tunnel`: Spawns Proxync Native SSH (Direct Origin Port 2222, JIT Ed25519 TLS certs), Cloudflare Quick Tunnels, or Localtunnel.
- `close_tunnel`: Terminates tunnel child process trees (`taskkill /F /T` on Windows) and cleans up ephemeral keys via `TempDirGuard`.

### `scan_ports` & `scan_processes`
Dynamically scans all listening services across IPv4 and IPv6 (`netstat -ano`) and performs single batch WMI/CIM queries (`Get-CimInstance Win32_Process`) with framework fingerprinting.

### `append_log_entry`, `read_logs_summary`, `clear_log_files`, `open_logs_folder`
- `append_log_entry`: Writes structured diagnostic logs to disk (`app.log` / `traffic.log`).
- `read_logs_summary`: Returns live disk metrics (`app_log_bytes`, `traffic_log_bytes`, line counts).
- `clear_log_files`: Safely wipes log streams on disk.
- `open_logs_folder`: Opens the OS log folder in File Explorer / Finder.

### `save_app_state` & `load_app_state`
Persists non-blocking JSON state directly to `%APPDATA%\Proxync\data.json`.

## Backend Events

| Event Name | Payload | Description |
| --- | --- | --- |
| `request:log` | `{ requestId, port, tunnelId, method, path, headers, timestamp }` | Emitted when proxy intercepts an incoming HTTP request. |
| `request:log:response` | `{ requestId, status, responseHeaders, bodyPreview, durationMs, timestamp }` | Emitted when proxy intercepts an HTTP response. |
| `tunnel:auto-closed` | `{ tunnelId }` | Emitted when a background tunnel process terminates. |
| `offline` / `online` | `{ status }` | Network connectivity status events from edge ping checks. |

## Data Models in v0.2.1

```ts
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

type AppLogEntry = {
  seq: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  details?: Record<string, unknown>;
};

type LogsSummary = {
  logs_dir: string;
  app_log_bytes: number;
  traffic_log_bytes: number;
  app_log_lines: number;
  traffic_log_lines: number;
};
```
