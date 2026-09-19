---
title: Observability Hub
description: Zero-config performance metrics, friendly latency percentiles, error tracking, and public webhook replay.
---

Monitoring how fast your app responds or finding broken endpoints shouldn't require setting up complex cloud monitoring tools or installing heavy npm packages.

The **Observability Hub** is a built-in health dashboard that watches traffic passing through your local tunnels and dev servers. It gives you instant, visual feedback on response times, error rates, and incoming webhooks—with zero setup.

---

## Why Developers Use the Observability Hub

- **Zero-Config Setup:** No SDKs to install, no configuration files to write, and no accounts to connect.
- **Spot Slow Endpoints:** Identify which API calls take 20ms and which ones take 3 seconds because of slow database queries or external API calls.
- **Visual Error Tracking:** See at a glance if your server is returning `404 Not Found` or `500 Internal Server Error` responses.
- **Webhook Stream & Replay:** Inspect real incoming webhooks (from Stripe, Twilio, GitHub, etc.) and replay them with one click.

---

## Understanding the Metrics (In Plain English)

You don't need a degree in statistics to understand your app's performance. Here is how Proxync breaks down your latency:

| Metric | What It Means | Why It Matters |
| :--- | :--- | :--- |
| **P50 (Median)** | Half of all requests were faster than this number. | Represents the typical, everyday speed your users experience. |
| **P90** | 90% of requests were faster than this number. | Shows how slightly slower or busier requests perform. |
| **P99 (Worst-Case)** | 99% of requests were faster than this number. | Uncovers your worst-case outliers (like cold starts or heavy database scans). |

---

## Key Dashboard Panels

### 1. Status Code Health Gauge
A clean visual breakdown showing the percentage of:
- **`2xx Success` (Green):** Healthy, successful responses.
- **`3xx Redirects` (Blue):** URL rewrites or authentication redirects.
- **`4xx Client Errors` (Yellow):** Missing routes (`404`) or bad payloads (`400`).
- **`5xx Server Errors` (Red):** Crashes or uncaught exceptions in your backend code.

### 2. Slowest Routes Leaderboard
Ranks your endpoints by average and peak response times so you immediately know which functions to optimize.

### 3. Incoming Webhook Stream
When an external service sends an event to your public tunnel, it shows up here with timestamp, provider badge, and payload size. Click **Replay** to send the exact same event back to your dev server whenever you want to re-test your webhook logic.

### 4. Bandwidth Counter
Tracks total data transferred (KB and MB) across all active tunnels, helping you see if large images or heavy JSON responses are hogging bandwidth.

---

## Telemetry Modes (Enhanced vs Low-CPU)

You can choose between two performance modes anytime under **Settings**:

- **Enhanced Telemetry (Default):** Computes full latency percentiles ($P50, P90, P99$), route rankings, and bandwidth meters. Recommended for normal development laptops and desktops.
- **Basic Telemetry (Low-CPU Mode):** Bypasses statistical sorting to save CPU and battery power on older laptops or lightweight virtual machines, tracking only critical `5xx` errors.

---

## What to Read Next

- **[Traffic Inspector](/docs/traffic)** — Inspect headers, cookies, and payloads for individual requests.
- **[Request Workbench](/docs/workbench)** — Replay requests and view visual response diffs side-by-side.
- **[Settings & Domains](/docs/settings)** — Toggle telemetry modes and manage log files.
