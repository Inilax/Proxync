---
title: Configuration
description: The data.json state file, environment variables, and ports used by Proxync.
---

Proxync keeps its entire state in a single JSON file. This page documents its location, schema, and the environment variables and ports the app uses.

## State file location

The state file is resolved by the backend at runtime:

| Platform | Path |
| --- | --- |
| Windows | `%APPDATA%\Proxync\data.json` |
| macOS / Linux | `~/.config/Proxync/data.json` |

The file is created on demand and written synchronously on every state change.

## Top-level schema

```json
{
  "workspaces": [WorkspaceConfig],
  "activeWorkspaceId": "string | null",
  "appSettings": AppSettings
}
```

## Entities

### WorkspaceConfig

```json
{
  "id": "string",
  "name": "string",
  "remoteWorkspaceId": "string | null",
  "profiles": [ProcessProfile],
  "savedRequests": [SavedRequest],
  "capturedRequests": [RequestLog],
  "domains": [DomainRecord],
  "languageHint": "string",
  "selectedProfileId": "string | null",
  "lastSwaggerGeneratedAt": "string | null",
  "projectRootPath": "string",
  "scannedFiles": ["string"],
  "notes": "string"
}
```

### ProcessProfile

```json
{
  "id": "string",
  "processName": "string",
  "port": 8080,
  "framework": "string",
  "languageHint": "string",
  "command": "string",
  "directory": "string",
  "executable": "string",
  "lastSharedAt": "string | null",
  "lastTunnelUrl": "string | null",
  "starterRequestCount": 0
}
```

### SavedRequest

```json
{
  "id": "string",
  "name": "string",
  "method": "GET",
  "path": "/api/users",
  "headers": "string",
  "body": "string",
  "source": "manual"
}
```

`source` is one of `"manual"`, `"starter-scan"`, `"captured"`.

### RequestLog

```json
{
  "id": "string",
  "method": "GET",
  "path": "/api/users",
  "status": 200,
  "durationMs": 42,
  "headers": {},
  "capturedAt": "number"
}
```

### DomainRecord

```json
{
  "id": "string",
  "name": "example.com",
  "verificationToken": "proxync-verification-<uuid8>",
  "verified": true,
  "createdAt": "number",
  "updatedAt": "number"
}
```

### AppSettings

```json
{
  "defaultProjectRootPath": "string",
  "notes": "string"
}
```

## Migration from legacy storage

Early versions stored state in `localStorage`. On load, if `state.workspaces` is absent, the app migrates from these keys and writes the merged result to `data.json`:

```text
proxync_local_workspaces_v1
proxync_local_active_workspace_v1
proxync_app_settings_v1
```

## Environment variables

| Variable | Effect |
| --- | --- |
| `APPDATA` (Windows) / `HOME` | Locates the state file. |
| `TAURI_DEV_HOST` | Sets the Vite dev HMR host during `tauri dev`. |

There are no other environment variables and no `.env` files in the repo.

## Ports

| Port | Purpose |
| --- | --- |
| `1420` | Vite dev server (fixed, `strictPort`). |
| `1421` | Vite HMR (only when `TAURI_DEV_HOST` is set). |
| `3939` | Legacy relay/API port (`ws://localhost:3939/relay`). **No server listens on it** — it belongs to the removed API package. |
| ephemeral | The intercepting proxy (`127.0.0.1:0`). |

## Security

The app's Tauri capabilities (`src-tauri/capabilities/default.json`) grant only `core:default` and `opener:default` to the main window. The `@tauri-apps/plugin-shell` package is declared as a dependency but is **not** registered as a plugin — tunnel and process spawning happens inside the Rust backend, not via the shell plugin.
