---
title: Traffic Inspector
description: Real-time HTTP and WebSocket traffic inspector with multi-tunnel segregation, automated bot probe filtering, and 1-Click IDE Jump.
---

Debugging incoming requests should not require scattering `console.log()` statements across your entire codebase.

The **Traffic Inspector** acts like your browser's Network tab, but for your entire backend server. Every request hitting your tunnels or local dev servers is captured in real time, with full headers, URL parameters, payloads, and response times.

---

## Why Developers Love the Traffic Inspector

When developing webhooks or backend APIs, it is notoriously hard to know what payload an external service actually sent.

The Traffic Inspector solves this:
- **Zero Configuration:** Simply start your dev server and tunnel. Traffic flows into the inspector automatically.
- **Inspect Everything:** Expand any request to inspect HTTP methods, status codes, query parameters, authorization headers, and formatted JSON bodies.
- **Smart Bot Filtering:** The public internet is constantly scanned by automated bots looking for exposed files like `/.env`, `/.git`, or `/wp-admin`. Proxync automatically filters out this background noise so your feed only shows your real application traffic.
- **Multi-Server Separation:** Running frontend Vite (`:5173`) and a Python backend (`:8000`) at the same time? Proxync tags each request with its exact server and port, so traffic never gets mixed up.

---

## What You See in Each Request

Click on any row in the traffic list to expand its full details:

| Field | What It Shows | Example |
| :--- | :--- | :--- |
| **Method & Status** | HTTP verb and response code | `POST 200 OK` or `GET 404 Not Found` |
| **Path** | Full endpoint URI including query parameters | `/api/webhooks/stripe?source=checkout` |
| **Latency** | How long your local server took to respond | `18ms` |
| **Server & Port** | Which local application handled the request | `FastAPI (Port 8000)` |
| **Headers** | All request and response headers in a clean list | `Authorization: Bearer ***`, `Content-Type: application/json` |
| **Body Preview** | Pretty-printed, syntax-highlighted JSON or text | Formatted request and response payloads |

---

## Powerful 1-Click Actions

Every captured request row gives you immediate actions to speed up your workflow:

### 1. 1-Click Jump to Code (VS Code & Cursor)
Notice a bug or want to modify how an endpoint handles a request? Click the **Open in Editor** button. Proxync detects where the route is defined in your project and opens it directly in **VS Code** or **Cursor** at the exact controller line.

### 2. Send to Playground
Want to test the same endpoint with slightly different headers or payloads? Click **Send to Playground** to convert the captured request into an editable draft with one click.

### 3. Send to Request Workbench
Want to compare how your backend responds before and after you edit your code? Send the request to the **Request Workbench** to run live replays with side-by-side visual response diffing.

### 4. Instant Replay
Need to test your server logic again without asking Stripe or GitHub to resend the webhook? Click **Replay** to send the exact same payload through Proxync's native HTTP engine directly to your local server.

---

## What to Read Next

- **[Request Workbench](/docs/workbench)** — Deep dive into multi-tab drafts and visual response diffing.
- **[API Playground](/docs/postman)** — Organize requests into folders and test endpoints without CORS blocks.
- **[Observability Hub](/docs/observability)** — View latency percentiles and slowest routes across your app.
