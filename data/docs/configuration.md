---
title: Configuration
description: Local data.json configuration schema, AppSettings, and ports used by Proxync v0.2.0.
---

Proxync stores workspace data and application settings in a single local JSON file at `%APPDATA%\Proxync\data.json`.

## Configuration Schema

```json
{
  "workspaces": [
    {
      "id": "ws-1723000000",
      "name": "My Backend API",
      "lastActivityAt": 1723048000000,
      "projectRootPath": "C:\\Projects\\my-backend-api",
      "profiles": [],
      "savedRequests": [],
      "capturedRequests": [],
      "domains": [],
      "notes": "Development server configuration"
    }
  ],
  "activeWorkspaceId": "ws-1723000000",
  "appSettings": {
    "defaultProjectRootPath": "C:\\Projects",
    "notes": "",
    "telemetryMode": "enhanced",
    "autoUpdateEnabled": true,
    "developerInspectTools": false,
    "lastUpdateCheckedAt": 1723048000000
  }
}
```

## Settings Reference

| Key | Values | Default | Description |
| --- | --- | --- | --- |
| `telemetryMode` | `"enhanced"` \| `"basic"` | `"enhanced"` | Enhanced (P50/P90/P99 latency math & bandwidth meter) vs Basic (Low CPU mode, logging 5xx errors only). |
| `autoUpdateEnabled` | `boolean` | `true` | When `true`, background update checks run every 2h. When `false`, checks run every 7d. |
| `developerInspectTools` | `boolean` | `false` | Enables browser developer tools inspect options in context menus. |

## Network Ports

- `1420` — Vite development server port (dev builds).
- `127.0.0.1:*` — Ephemeral ports for local intercepting TCP proxy instances.
