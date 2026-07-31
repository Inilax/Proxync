---
title: FAQ
description: Frequently asked questions about Proxync — privacy, requirements, and how it works.
---

## Does Proxync require an account?

No. There is no sign-up, no account, and no telemetry. Everything runs locally on your machine.

## Where is my data stored?

In a single JSON file on your machine — `%APPDATA%\Proxync\data.json` on Windows. Your workspaces, requests, traffic metadata, and settings live there. See [Configuration](/docs/configuration).

## Do I need to pay for tunnels?

No. Both public tunnel modes use free services:

- **Cloudflare Quick Tunnels** (`trycloudflare.com`) — free, no account.
- **Localtunnel** (`loca.lt`) — free.

Both are fetched on demand through `npx` the first time you use them.

## Does capturing traffic slow my server?

No. Proxync starts a lightweight local intercepting proxy that forwards raw bytes and parses only metadata (method, path, headers, status, timing). Request and response **bodies are not stored**.

## Do public tunnels work offline?

No. Public tunnels need a network connection and `node`/`npx` on your `PATH`. Everything else — workspaces, the local proxy, the Postman runner, and Swagger generation — works fully offline.

## Which operating systems are supported?

Windows is the primary supported platform (10+, x64). The app is built with Tauri, which is cross-platform, and the code contains best-effort macOS/Linux paths — but the tunnel and process-discovery tooling is Windows-specific, so other platforms are not officially supported yet.

## Is Proxync open source?

The source is MIT-licensed and published by **Inilax**. The repository is currently private; public availability is planned.

## Does Proxync require WebView2?

Yes. Tauri 2 renders the UI with the Microsoft WebView2 Runtime on Windows. The installer handles this automatically in most setups.

## Why does sharing a process require Node?

The Cloudflare and Localtunnel tunnels are launched with `npx` (the `cloudflared` and `localtunnel` packages). If you only use LAN shares or the local traffic inspector, no Node runtime is needed.

## How do custom domains work?

Register a domain in Settings, add the DNS records Proxync shows you (TXT verification + routing), and verify. Verified domains unlock the custom-domain share mode. Verification currently toggles the flag locally; live DNS verification is planned.
