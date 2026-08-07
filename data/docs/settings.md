---
title: Settings & Domains
description: Telemetry options, auto-updater preferences, developer inspect tools, custom domain management, and Enterprise preview cards.
---

The **Settings** view in Proxync v0.2.0 provides control over app performance, automatic background updates, domain verification, and developer tools.

## Key Preference Panels in v0.2.0

### 1. Telemetry Options (Enhanced vs Basic)
- **Enhanced Telemetry (Default)** — Computes full $P50, P90, P99$ latency percentiles, route leaderboards, and total bandwidth metrics in the Observability Hub.
- **Basic Telemetry (Low CPU)** — Bypasses non-fatal percentile array sorting to minimize CPU and RAM overhead on resource-constrained systems, logging only critical 5xx errors.

### 2. Smart Version-Aware Auto-Updater
- **Automatic Updates Toggle** — When **ON**, silent updates check every **2 hours**. When **OFF**, updates check every **7 days**.
- **Forced Major/Minor Dialogs** — Enforces immediate updates on breaking/feature version bumps.

### 3. Developer Inspect Tools
- Toggle DevTools inspect modes and context menu overrides in Danger Zone settings.

### 4. Custom Domains Verification
- Add custom domains and verify DNS A/CNAME/TXT records (`proxync-verification-<uuid8>`).
- Direct DNS resolution options to verify propagation.

### 5. Enterprise API Keys & Cloud Sync Preview
- Enterprise API Key Management preview card.
- Proxync Enterprise & Cloud Sync preview card.
- Enterprise RBAC and Policy guardrails badges.
