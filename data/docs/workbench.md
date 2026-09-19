---
title: Request Workbench
description: Multi-tab HTTP execution studio with live visual response diffing, 1-click IDE jumping, and multi-language code export.
---

When you edit backend code, how do you verify you didn't accidentally break an API response or change a JSON field?

The **Request Workbench** is built for this exact workflow. Instead of copying and pasting payloads between terminal `curl` commands, browser tabs, and external API clients, the Workbench lets you stage requests, tweak headers, replay them instantly, and view **side-by-side visual diffs** showing exactly what changed.

```text
Captured Traffic  ──▶  Workbench Draft  ──▶  Send & Replay  ──▶  Visual Diff (Live vs Captured)
                                                      │
                                                      └──▶  1-Click IDE Jump (VS Code / Cursor)
```

---

## Why Developers Use the Request Workbench

1. **Catch Accidental Schema Breaks**  
   After modifying your code in Cursor or VS Code, replay a captured request. The visual diff highlights added, modified, or missing JSON fields in green and red.
2. **Stage Multiple Requests in Parallel**  
   Use clean browser-like tabs to keep multiple API calls open at once without losing your progress.
3. **No CORS Restrictions**  
   Requests are executed through Proxync's native Rust HTTP engine, so your calls are never blocked by browser CORS security policies.
4. **Instant Token & Auth Sync**  
   Grab the `Authorization: Bearer ...` token or session cookie from real captured traffic and apply it to your draft in a single click.

---

## Core Features

### 1. Visual Response Diffing
Compare live replay results against original captured traffic in two intuitive view modes:
- **Side-by-Side Mode:** Two columns showing the original response on the left and the new live response on the right.
- **Unified Diff Mode:** A compact Git-style diff highlighting changes directly within the JSON tree.

### 2. Multi-Tab Draft Staging
- Open as many request drafts as you need.
- Edit URL query parameters, custom headers, and JSON body payloads with syntax highlighting.
- Toggle **Cache Bypass** to inject `Cache-Control: no-cache` headers, ensuring you test your actual backend logic rather than cached responses.

### 3. 1-Click IDE Deep Linking
Want to see the backend code that generates a specific response? Click **Open in Editor**:
- Proxync automatically matches the route to your project files and opens the file in **VS Code** (`code`) or **Cursor** (`cursor`) at the exact controller line.
- If your system restricts direct URI protocol handlers, Proxync smoothly copies the formatted file path and line number to your clipboard as a fallback.

### 4. Polyglot Code Snippet Generator
Once you have tested an endpoint and confirmed it works, export it into production-ready code in one click:

| Language / Tool | Generated Snippet Format |
| :--- | :--- |
| **cURL** | Terminal command ready to run in Bash or PowerShell |
| **JavaScript / TypeScript** | Modern `fetch` with `async/await` |
| **Python** | Clean `requests` library snippet |
| **Go** | Standard `net/http` request |
| **Rust** | Async `reqwest` + `tokio` snippet |

---

## How to Use the Workbench in 3 Steps

1. **Capture:** In the **Traffic Inspector**, click **Send to Workbench** on any request you want to test.
2. **Tweak & Edit:** Modify JSON values or parameters in the editor to test new scenarios.
3. **Replay & Diff:** Press `Ctrl + Enter` (or `Cmd + Enter`). Review the response and inspect the visual diff to confirm your code changes work as expected.

---

## What to Read Next

- **[API Playground](/docs/postman)** — Organize requests into permanent folders and collections.
- **[Swagger & OpenAPI Studio](/docs/swagger)** — Auto-generate interactive documentation from your routes.
- **[Observability Hub](/docs/observability)** — Monitor response times and find slow routes.
