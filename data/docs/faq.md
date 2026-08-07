---
title: FAQ
description: Frequently asked questions about Proxync v0.2.0 — features, privacy, telemetry options, auto-updater, and system requirements.
---

## Does Proxync require an account?

No. Proxync runs 100% locally on your machine with local file serialization. No cloud account is required.

## How does Telemetry work in v0.2.0?

Proxync v0.2.0 includes persistent telemetry options stored locally under **Settings**:
- **Enhanced Mode (Default)** — Processes live P50, P90, P99 latency analytics and bandwidth meters for the Observability Hub.
- **Basic Mode (Low CPU)** — Bypasses percentile array calculations to minimize CPU/RAM usage on low-spec hardware.

Telemetry calculations are processed 100% locally on-device.

## How do Automatic Updates work?

The built-in Smart Version-Aware Auto-Updater silently checks GitHub Releases for new versions:
- Checks run every **2 hours** when automatic updates are enabled.
- **Major and minor releases** (e.g. `0.2.0 → 0.3.0`) prompt a persistent forced update dialog.
- **Patch releases** (e.g. `0.2.0 → 0.2.1`) present optional update toasts.

## What is the Active Internet Connectivity Guard?

Before launching cloud tunnels (`cloudflared` or `localtunnel`), Proxync performs real edge ping checks (`checkRealInternetConnection`) to ensure your connection is active, preventing CLI timeout hangs when offline.

## Which frameworks are supported by the Codebase Scanner?

The OpenAPI generator automatically scans **Express**, **Fastify**, **Next.js**, **NestJS**, **FastAPI**, **Spring Boot**, and **Go** codebases to infer routes and produce OpenAPI 3.0 spec files.

## How does the Generic Replay Engine work?

The Playground Replay Engine uses a native Rust HTTP executor (`execute_http_request`) with automatic `gzip`, `deflate`, and `brotli` payload decompression. It executes any HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) without CORS restrictions.
