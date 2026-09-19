---
title: Settings & Domains
description: Manage logging diagnostics, automatic log rotation, auto-updates, telemetry modes, and custom domain verification.
---

The **Settings** screen gives you complete, transparent control over how Proxync runs on your computer—from privacy and logging preferences to domain verification and updates.

---

## Key Settings Panels

### 1. Pro Debugger & Disk Logging
Proxync writes diagnostic information directly to local files on your machine using lightweight, native Rust logging:

- **Application Diagnostics (`app.log`)**  
  *Enabled by default.* Logs application lifecycle events, dev server scans, and tunnel connections. Automatically rotates to `app.log.old` when it reaches **5MB** to prevent filling up your hard drive.
- **Traffic Stream (`traffic.log`)**  
  *Disabled by default.* When turned on, records full HTTP request and response payloads on disk. Automatically rotates to `traffic.log.old` at **10MB**.
- **Automatic Privacy & Credential Redaction**  
  Sensitive authentication headers (`Authorization`, `Bearer`, `Cookie`, `ApiKey`, and `Secret`) are automatically masked with asterisks before writing to disk, ensuring your secrets are never exposed in log files.
- **1-Click Support Bundle Exporter**  
  If you ever run into an issue and need assistance from the community, click **Export Support Bundle**. Proxync packages your sanitized logs and diagnostic info into a clean `proxync-support-bundle.json` file on your desktop.
- **Open Logs Folder**  
  Opens your operating system's file manager (File Explorer on Windows, Finder on macOS) directly to Proxync's log directory with one click.

---

### 2. Smart Auto-Updater & Security Alerts
Proxync keeps itself secure with a privacy-respecting update system:

- **Automatic Background Checks:** Checks for updates upon launch and every **2 hours** (or every 7 days if disabled).
- **Emergency Security Radar:** If a critical zero-day vulnerability patch is released, Proxync immediately notifies you with an urgent update modal and live download progress.
- **Gentle Restart Countdown:** Gives you a clear 2-second countdown before restarting into an update so you never lose unsaved drafts.

---

### 3. Performance & Telemetry Modes
Customize how much CPU Proxync uses to compute performance metrics:

- **Enhanced Telemetry (Default):** Computes full $P50, P90, P99$ latency percentiles and route leaderboards in the Observability Hub. Recommended for standard development setups.
- **Basic Telemetry (Low-CPU Mode):** Bypasses statistical array sorting to minimize CPU and battery usage on older laptops, recording only critical server errors.

---

### 4. Custom Domains & DNS Verification
Want to point your own custom domain (e.g. `api.mybrand.com`) to your local dev server?

- Add your custom domain in the Domains panel.
- Proxync automatically queries **DNS-over-HTTPS (DoH)** via Google and Cloudflare to verify that your DNS CNAME or TXT records are configured correctly before enabling traffic routing.

---

### 5. Enterprise & Cloud Sync (Preview)
For development teams seeking shared team workspaces, persistent team tunnel endpoints, role-based access control (RBAC), and centralized audit logging, preview cards and early-access waitlists are available within this panel.

---

## What to Read Next

- **[Configuration Reference](/docs/configuration)** — Inspect the local `data.json` configuration file schema.
- **[Observability Hub](/docs/observability)** — See how telemetry settings affect your dashboard metrics.
- **[FAQ](/docs/faq)** — Read answers to frequently asked questions.
