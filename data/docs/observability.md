---
title: Observability Hub
description: Zero-config runtime analytics, latency percentiles (P50/P90/P99), bandwidth metrics, public Webhook stream replay, and Error Center.
---

Proxync v0.2.0 introduces the **Observability Hub**, a zero-config, real-time performance dashboard for monitoring your local servers, edge tunnels, and public webhooks.

## Overview

The Observability Hub analyzes live HTTP traffic running through your local intercepting Rust proxy without requiring extra SDKs, agents, or cloud integrations.

Key observability metrics include:

- **Percentile Latency Metrics** — P50, P90, and P99 latency calculation across active requests.
- **Status Code Distribution Gauge** — Visual heatmap tracking `2xx Success`, `3xx Redirect`, `4xx Client Error`, and `5xx Server Error` response volume.
- **Total Bandwidth Meter** — Real-time payload size tracking (KB/MB transferred through active edge tunnels).
- **Public Webhook Interception Stream** — Captures external incoming webhooks (Stripe, GitHub, Shopify) with 1-click **Webhook Replay** directly into Playground.
- **Error Center** — Consolidates proxy runtime errors (`4xx`, `5xx`, DNS failures, TCP disconnects) into a unified, filterable issue list.
- **Slowest Routes Leaderboard** — Ranks API routes by max and average latency to isolate performance bottlenecks.

## Dashboard Breakdown

The Observability Hub displays telemetry across four core panels:

1. **Metrics Header** — P50, P90, P99 response latencies, total bandwidth served, active tunnel count, and current telemetry mode badge.
2. **Status Code Gauge** — Visual percentage distribution of `2xx`, `3xx`, `4xx`, and `5xx` response codes.
3. **Webhook Interceptor** — Incoming external webhooks with payload previews and 1-click replay.
4. **Playground** — Replay or tweak incoming webhooks and slow API calls instantly.

## Telemetry Modes (Enhanced vs Basic)

You can toggle between two telemetry execution modes under **Settings**:

### 1. Enhanced Telemetry (Default)
Computes full percentile math ($P50, P90, P99$), route performance rankings, and bandwidth meters. Designed for standard development environments.

### 2. Basic Telemetry (Low-CPU Mode)
Bypasses array sorting and non-fatal percentile math to minimize CPU/RAM computational overhead on resource-constrained systems, logging only critical 5xx server errors. An active **Low CPU Mode** banner indicates when Basic telemetry is active.

## 1-Click Debugging Navigation

From the Observability Hub, you can jump directly into:
- **Traffic Inspector** — Inspect complete headers, raw body previews, and timing diagnostics for any flagged request.
- **Playground (Postman Studio)** — Replay or tweak incoming webhooks and slow API calls instantly.
