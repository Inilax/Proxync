---
title: Settings & Domains
description: Pro Debugger & Dual-Stream Support Logging, Emergency CVE Radar, telemetry options, custom domain verification, and Enterprise preview cards.
---

The **Settings** view in Proxync v0.2.1 provides complete control over logging diagnostics, emergency security updates, app performance, and domain verification.

## Key Preference Panels in v0.2.1

### 1. Pro Debugger & Dual-Stream Logging Engine
- **Application Diagnostics (`app.log`)** — Enabled by default. Logs engine lifecycle, recon scans, proxy binds, tunnel spawn/closures, and crashes.
- **Traffic Stream (`traffic.log`)** — Disabled by default. Captures full HTTP request/response payloads, headers, and JSONL latencies on demand.
- **AI Agent Directives** — Structured session headers and deterministic `reason`, `target`, and `hint` attributes for automated troubleshooting.
- **1-Click Support Bundle Exporter** — Packages workspace configurations, active tunnels, discovered processes, and sanitized logs into `proxync-support-bundle.json`.
- **Automatic PII Redaction** — Automatically redacts `Authorization`, `Bearer`, `Cookie`, `ApiKey`, and `Secret` tokens across logs.
- **Log Management** — 1-click **Open Logs Folder** and instant log purging in Danger Zone.

### 2. Smart Auto-Updater & Emergency CVE Radar
- **Emergency CVE Radar** — Pre-flight security scan on startup ensuring zero false-positive detection of urgent security releases.
- **Automatic Updates Toggle** — Silent background update checking every 2 hours (or 7 days when disabled).

### 3. Telemetry Options (Enhanced vs Basic)
- **Enhanced Telemetry (Default)** — Computes full $P50, P90, P99$ latency percentiles, route leaderboards, and total bandwidth metrics in the Observability Hub.
- **Basic Telemetry (Low CPU)** — Bypasses non-fatal percentile array sorting to minimize CPU and RAM overhead on resource-constrained systems.

### 4. Custom Domains Verification
- Add custom domains and verify DNS TXT/A/CNAME records with automated DNS-over-HTTPS pre-flight lookups (Google/Cloudflare DoH).

### 5. Enterprise API Keys & Cloud Sync Preview
- Enterprise API Key Management preview card.
- Proxync Enterprise & Cloud Sync preview card with RBAC and Policy guardrails badges.
