---
title: API Reference
description: The Tauri IPC command surface, Rust native functions, emitted events, and shared data contracts of Proxync v0.2.0.
---

Proxync's Rust backend exposes Tauri v2 IPC commands and events for process discovery, HTTP proxying, native request execution, auto-updating, and autostart capabilities.

## Native Commands

### `execute_http_request`
Executes any HTTP request (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`) natively in Rust using `reqwest` with automatic `gzip`, `deflate`, and `brotli` decompression, bypassing browser CORS restrictions.

| Parameter | Type | Description |
| --- | --- | --- |
| `request` | `HttpRequest` | Payload containing `method`, `url`, `headers`, and optional `body`. |

**Returns:** `HttpResponse` (`status`, `headers`, `body`, `durationMs`).

### `check_real_internet_connection`
Pings public edge endpoints to verify active internet connectivity before opening cloud tunnels.

**Returns:** `boolean` — `true` if internet connection is established.

### `scan_ports` & `scan_processes`
Parses native Windows netstat and WMI/CIM process entries to resolve PIDs, commands, working directories, and frameworks.

### `start_proxy`
Spawns a local intercepting TCP & WebSocket proxy bound to an ephemeral port.

### `open_cloudflare_tunnel` & `open_localtunnel`
Launches `cloudflared` or `localtunnel` background processes pointing to the local proxy port.

### `save_app_state` & `load_app_state`
Persists non-blocking JSON state directly to `%APPDATA%\Proxync\data.json`.

## Backend Events

| Event Name | Payload | Description |
| --- | --- | --- |
| `request:log` | `{ rawRequestId, method, path, headers, timestamp }` | Emitted when proxy intercepts an incoming HTTP request. |
| `request:log:response` | `{ rawRequestId, status, responseHeaders, bodyPreview, durationMs, timestamp }` | Emitted when proxy intercepts an HTTP response. |
| `tunnel:auto-closed` | `{ tunnelId }` | Emitted when a background tunnel process terminates. |
| `offline` / `online` | `{ status }` | Network connectivity status events from edge ping checks. |

## Data Models in v0.2.0

```ts
type AppSettings = {
  defaultProjectRootPath: string;
  notes: string;
  telemetryMode: "enhanced" | "basic";
  autoUpdateEnabled: boolean;
  developerInspectTools: boolean;
  lastUpdateCheckedAt?: number;
};

type WorkspaceConfig = {
  id: string;
  name: string;
  profiles: ProcessProfile[];
  savedRequests: SavedRequest[];
  capturedRequests: RequestLog[];
  domains: DomainRecord[];
  lastActivityAt: number;
  projectRootPath: string;
  notes: string;
};
```
