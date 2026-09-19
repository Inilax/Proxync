---
title: Quickstart
description: Share a local dev server with a secure tunnel, inspect live traffic, and test APIs in under three minutes with Proxync.
---

Welcome to the Proxync quickstart! In less than three minutes, you will share a local web project with a secure public link, test an API call, and see live traffic stream in.

No signups, no credit cards, and no complex command-line flags required.

---

## Step 1: Launch Proxync & Open a Workspace

When you launch Proxync for the first time, it automatically creates your default workspace.

Think of a **Workspace** as an organized project folder that holds your discovered dev servers, saved API requests, and live traffic history. You can rename it anytime or create new workspaces for separate projects.

---

## Step 2: Start Your Dev Server

Start your local backend or full-stack app as you normally would in your terminal or IDE (such as Cursor, VS Code, or WebStorm):

```bash
# Example: Next.js, Vite, Express, or FastAPI
npm run dev
# or
uvicorn main:app --reload
```

Now switch over to Proxync and click **Tunnels & Recon**:
- Proxync automatically detects running dev servers across common ports (like `3000`, `5173`, `8000`, `4000`, or `8080`).
- It recognizes your framework (Next.js, Vite, FastAPI, Python, Go, etc.) without you having to manually configure anything.

---

## Step 3: Share Your Local App

Next to your detected server, click **Share**:

Choose how you'd like to share it:
1. **Proxync Native Relay (Recommended)**  
   Launches a fast, secure SSH tunnel via `relay.proxync.dev:2222` and instantly assigns you an 8-character public HTTPS link (e.g. `https://px-a1b2c3d4.proxync.dev`).
2. **Cloudflare Quick Tunnel**  
   Launches a free public `*.trycloudflare.com` link through Cloudflare's edge network.
3. **LAN Share**  
   Gives you a clean local Wi-Fi IP (e.g. `http://192.168.1.50:3000`) to test your app on your phone or tablet on the same network.

Click the **Open in Browser** icon (`⋮` menu) to test your link. Anyone you send this URL to can now view your local app!

> [!TIP]
> **Why Resilient Standby Mode is a Lifesaver for Vibe Coders:**  
> When you edit code in Cursor or VS Code and your server restarts, traditional tunnel tools crash and drop your link. Proxync holds your public URL alive in standby and seamlessly routes traffic the millisecond your dev server finishes compiling. You never have to copy-paste a new webhook URL into Stripe or Slack!

---

## Step 4: Watch Live Traffic & Webhooks Flow In

Click **Traffic** in the left sidebar:

- As people browse your site or external services send webhooks, requests appear in real time.
- Click any request row to see HTTP headers, query parameters, timing, and formatted JSON response bodies.
- Unwanted internet bot scans (like automated probes searching for `/.env` or `/wp-admin`) are automatically filtered out so your feed stays clean.

---

## Step 5: Test & Replay in Playground

Want to test an API endpoint or retry a failed webhook?

- On any traffic item, click **Send to Playground**.
- Proxync opens the request in its built-in API testing tab.
- Tweak request bodies or headers, then press `Ctrl + Enter` (or `Cmd + Enter` on macOS) to send it.
- Because Playground runs natively inside the desktop app, you will **never encounter browser CORS errors**.

---

## Step 6: 1-Click Jump to Your Code

If you notice a bug or unexpected response while inspecting traffic:

- Click the **Open in Editor** icon.
- Proxync immediately opens the controller or route file in **VS Code** or **Cursor** at the exact line of code handling that request.

---

## Next Steps

Now that your first server is running and shared, explore the rest of Proxync's toolkit:

- **[Tunnels & Sharing](/docs/tunnels)** — Learn about standby modes, custom domains, and clean process teardown.
- **[Traffic Inspector](/docs/traffic)** — Master multi-server traffic segregation and payload filtering.
- **[API Playground](/docs/postman)** — Organize requests into reusable folders and environments.
- **[Request Workbench](/docs/workbench)** — Compare live responses against captured requests with visual diffing.
- **[Swagger & OpenAPI Studio](/docs/swagger)** — Auto-generate interactive API documentation from your code.
