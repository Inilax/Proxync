---
title: API Reference
description: The Tauri command surface, emitted events, and shared types of the Proxync backend.
---

Proxync's Rust backend exposes commands to the React frontend through Tauri's IPC. This page is the reference for that surface.

All commands are async and return `Result<T, String>`. The frontend calls them via `@tauri-apps/api`:

```ts
import { invoke } from "@tauri-apps/api/core";

const ports: number[] = await invoke("scan_ports");
```

## Commands

### `scan_ports`

Returns the ports currently listening on `localhost` among the known development ports.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| — | — | — | No arguments. |

**Returns:** `number[]` — open ports.

### `scan_processes`

Scans known ports and resolves each to a process with metadata.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `bypassCache` | `boolean` | — | When `true`, forces a fresh scan instead of reusing the cache. |

**Returns:** `ProcessCandidate[]`

```ts
type ProcessCandidate = {
  id: string;
  name: string;
  port: number;
  pid: number;
  command: string;
  directory: string;
  executable: string;
  framework: string;
  access: string;
  uptime: string;
};
```

### `start_proxy`

Starts the local intercepting TCP proxy bound to an ephemeral port.

| Parameter | Type | Description |
| --- | --- | --- |
| `localPort` | `number` | The target server port to forward to. |

**Returns:** `number` — the assigned proxy port.

### `open_cloudflare_tunnel`

Starts a Cloudflare Quick Tunnel.

| Parameter | Type | Description |
| --- | --- | --- |
| `localPort` | `number` | The proxy port to expose. |

**Returns:** `string` — the public `*.trycloudflare.com` URL.

### `open_localtunnel`

Starts a Localtunnel.

| Parameter | Type | Description |
| --- | --- | --- |
| `localPort` | `number` | The proxy port to expose. |
| `subdomain` | `string \| null` | Optional requested subdomain. |

**Returns:** `string` — the public `*.loca.lt` URL.

### `close_tunnel`

Stops a running tunnel and kills its child process.

| Parameter | Type | Description |
| --- | --- | --- |
| `tunnelId` | `string` | The tunnel to close. |

**Returns:** `void`. Errors with `Tunnel not found` if the id is unknown.

### `open_tunnel` (legacy)

Registers with a WebSocket relay and forwards requests to a local port.

| Parameter | Type | Description |
| --- | --- | --- |
| `tunnelId` | `string` | Tunnel identifier. |
| `localPort` | `number` | Target port. |
| `token` | `string` | Tunnel token. |
| `workspaceId` | `string` | Workspace identifier. |
| `relayUrl` | `string \| null` | Relay URL (default `ws://localhost:3939/relay`). |

> **Legacy.** This command belongs to the pre-standalone API architecture (the relay service on port `3939` was removed). It is still registered but **not invoked** by the current UI.

### `scan_directory`

Recursively lists project source files.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | Root path to scan. |

Skips `node_modules`, `target`, `.git`, `build`, `bin`, `.gradle`; collects `java`, `ts`, `js`, `py`, `go`, `cs`, `controller` files.

**Returns:** `string[]` — relative file paths.

### `read_file_content`

Reads a file inside a root path.

| Parameter | Type | Description |
| --- | --- | --- |
| `rootPath` | `string` | Root path. |
| `relPath` | `string` | Relative path to read. |

**Returns:** `string` — file contents. Path traversal outside the root is rejected.

### `get_local_ip`

Resolves the LAN IP of the machine.

**Returns:** `string` — local IP (determined via a UDP connect to `8.8.8.8:80`).

### `save_app_state`

Persists the whole app state.

| Parameter | Type | Description |
| --- | --- | --- |
| `state` | `string` | Raw JSON state. |

**Returns:** `void`. Writes `<APPDATA>/Proxync/data.json` synchronously.

### `load_app_state`

Loads the persisted state.

**Returns:** `string` — raw JSON state, or `"{}"` when the file does not exist yet.

## Events

The backend emits these events, which the frontend consumes with `@tauri-apps/api/event`:

### `request:log`

A request observed by the proxy (or relay).

```ts
// proxy path
{ id: string; method: string; path: string; headers: Record<string, string>; timestamp: number }
// relay path
{ requestId: string; method: string; path: string; timestamp: number }
```

### `request:log:response`

The response for a logged request.

```ts
{ requestId: string; status: number; timestamp: number }
```

### `tunnel:auto-closed`

A tunnel closed itself (e.g. `cloudflared` died after repeated health-check failures).

```ts
{ tunnelId: string }
```

## Shared types

The frontend models (`packages/desktop/src/lib/types.ts`) are the source of truth for the state shapes:

| Type | Fields |
| --- | --- |
| `RequestLog` | `id`, `method`, `path`, `status?`, `durationMs?`, `headers?`, `bodyPreview?`, `responseHeaders?`, `capturedAt?` |
| `SavedRequest` | `id`, `name`, `method`, `path`, `headers`, `body`, `source: "manual" \| "starter-scan" \| "captured"` |
| `ProcessProfile` | `id`, `processName`, `port`, `framework`, `languageHint`, `command`, `directory`, `executable`, `lastSharedAt?`, `lastTunnelUrl?`, `starterRequestCount` |
| `DomainRecord` | `id`, `name`, `verificationToken`, `verified`, `createdAt`, `updatedAt` |
| `WorkspaceConfig` | `id`, `name`, `remoteWorkspaceId?`, `profiles[]`, `savedRequests[]`, `capturedRequests[]`, `domains[]`, `languageHint`, `selectedProfileId?`, `lastSwaggerGeneratedAt?`, `projectRootPath`, `scannedFiles[]`, `notes` |
| `AppSettings` | `defaultProjectRootPath`, `notes` |

See [Configuration](/docs/configuration) for how these map to the persisted `data.json`.
