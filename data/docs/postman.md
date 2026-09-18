---
title: Playground
description: REST client with Generic Replay Engine, native Rust HTTP executor, glass right-click context menus, and Target Route Badges.
---

In Proxync v0.2.1, the REST client view is **Playground** — featuring a native Rust HTTP executor, Generic Replay Engine, glass context menus, and Target Route Badges.

## Key Features in v0.2.1

- **Generic Replay Engine** — Replay any HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) via native Rust HTTP executor (`execute_http_request`), bypassing browser CORS limitations and automatically appending results to Traffic Logs.
- **Target Route Badges** — A pill-shaped badge next to the Send button displays the active route target:
  - `Proxync Native` — Traffic routed through high-throughput Native SSH tunnels (Direct Origin Port 2222).
  - `Cloudflare Edge` — Traffic routed through public Cloudflare edge tunnels.
  - `Public Tunnel` — Traffic routed through public Localtunnel edge proxies.
  - `Local Loopback` — Traffic routed through local dev server ports.
- **Glass Right-Click Context Menu** — Right-click any collection request item to access **Rename**, **Copy URL**, **Duplicate Request**, or **Delete**.
- **Keyboard Shortcuts Modal** — Press `Ctrl + /` or `Ctrl + ?` anywhere in Playground to display the hotkey reference sheet (`Ctrl + Enter` to Send, `Ctrl + S` to Save directly to collection).
- **Inline Collection Folder Management** — Expanded 280px sidebar rail with inline folder creation, renaming, and contrast-overhauled action buttons.
- **Automatic Decompression** — Supports automatic `gzip`, `deflate`, and `brotli` payload decompression for accurate response rendering.

## Collection Item Sources

| Source | Description |
| --- | --- |
| `manual` | Created manually using the request builder. |
| `starter-scan` | Auto-scanned from dev server routes. |
| `captured` | Sent from Traffic Inspector. |
| `swagger-import` | Imported from OpenAPI 3.0 specs. |

## Playground Keyboard Shortcuts

- `Ctrl + Enter` — Send active request.
- `Ctrl + S` — Save active request to selected collection.
- `Ctrl + /` or `Ctrl + ?` — Toggle keyboard shortcut overlay.
- `Esc` — Dismiss open dialogs or context menus.
