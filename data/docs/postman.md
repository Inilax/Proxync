---
title: Playground
description: Fast, built-in REST API client with zero CORS errors, persistent draft sessions, folder organization, and native Rust execution.
---

Testing your APIs shouldn't require launching a heavy external app, signing up for an account, or bumping into monthly subscription limits.

The **Playground** is Proxync's built-in REST API studio. It gives you a clean, intuitive interface to build requests, inspect JSON responses, organize endpoints into folders, and test your backend—with zero setup friction.

> **Why you'll never see a CORS error in Playground:**  
> Have you ever tried testing an API from a web browser tool, only to be blocked by a red `CORS policy` error? Browser extensions and web apps are subject to strict browser cross-origin rules. Because Playground runs natively inside Proxync's desktop engine, your requests run directly on your operating system with **zero CORS blocks**.

---

## Why Developers & Vibe Coders Love Playground

- **Runs 100% Offline & Private:** Your API keys, headers, and request bodies never touch any third-party cloud.
- **Persistent Drafts:** If you restart Proxync or reboot your computer, your open tabs, unsaved drafts, and recent responses are preserved automatically.
- **Target Route Badges:** Next to the **Send** button, a dynamic badge shows where your request is going:
  - `Local Loopback` — Sent directly to your local port (`localhost:3000`).
  - `Proxync Native` — Routed through your high-speed SSH tunnel (`relay.proxync.dev`).
  - `Cloudflare Edge` — Routed through your public Cloudflare tunnel.
- **Right-Click Context Menus:** Easily rename, duplicate, copy URL, or delete saved requests in your collection sidebar.
- **Built-in Decompression:** Supports automatic `gzip`, `brotli`, and `deflate` decompression so payloads always display as readable JSON or text.

---

## Where Requests Come From

You can populate your Playground collections in four convenient ways:

| Source | How It Works |
| :--- | :--- |
| **Manual Builder** | Click `+ New Request` to type an endpoint URL, pick an HTTP method, and set headers. |
| **Sent from Traffic** | Click **Send to Playground** on any item in the Traffic Inspector to inspect real webhooks. |
| **Auto-Scanned Codebase** | Proxync's route scanner detects endpoints in Next.js, FastAPI, or Express projects automatically. |
| **OpenAPI / Swagger Import** | Import an existing OpenAPI YAML or JSON file to populate a complete collection instantly. |

---

## Keyboard Shortcuts

Work faster with convenient keyboard shortcuts:

| Shortcut (Windows / Linux) | Shortcut (macOS) | Action |
| :--- | :--- | :--- |
| `Ctrl + Enter` | `Cmd + Enter` | Send active request |
| `Ctrl + S` | `Cmd + S` | Save active request to collection |
| `Ctrl + /` | `Cmd + /` | Open the keyboard shortcuts cheat sheet |
| `Esc` | `Esc` | Close context menus and dialogs |

---

## What to Read Next

- **[Request Workbench](/docs/workbench)** — Compare live responses against captured traffic with visual diffs.
- **[Swagger & OpenAPI Studio](/docs/swagger)** — Generate interactive API docs and export them to Playground in one click.
- **[Traffic Inspector](/docs/traffic)** — Capture real-world traffic to send into your Playground collections.
