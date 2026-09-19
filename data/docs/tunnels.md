---
title: Tunnels & Sharing
description: Securely share local web servers with high-speed Proxync Native SSH tunnels, Cloudflare Quick Tunnels, custom domains, or local network sharing.
---

Sharing your local web app should be effortless. Whether you need to test a mobile layout on your smartphone, share a live preview with a client, or receive real webhooks from Stripe, Proxync makes sharing your local server as simple as clicking a button.

> **What is a tunnel?**  
> When you run an app on your computer, it usually listens on `localhost:3000`, which only you can see. A tunnel gives your local app a secure, temporary public HTTPS web address (like `https://px-a1b2c3d4.proxync.dev`) so external services and remote devices can access it over the internet.

---

## 4 Ways to Share Your App

Proxync provides four flexible sharing methods depending on what you're working on:

### 1. Proxync Native Relay (Recommended)
Our built-in, low-latency tunneling engine powered by direct origin SSH relays:
- **Instant Setup:** Click **Share** and get a clean, secure HTTPS link (e.g. `https://px-a1b2c3d4.proxync.dev`) in less than a second.
- **Fast Throughput:** Routes directly through our optimized origin relay (`relay.proxync.dev:2222`) with ephemeral cryptographic keys.
- **Free & Unlimited:** No accounts, no token limits, and no restrictive paywalls.

### 2. Cloudflare Quick Tunnels
Connects your local server to Cloudflare's global edge network:
- Produces a public `*.trycloudflare.com` URL.
- Useful if you are working behind strict corporate firewalls that block standard SSH outbound ports.
- Completely free with zero configuration required.

### 3. Custom Domains
Want to use your own branded domain (like `api.myproject.com`) instead of a random subdomain?
- Proxync includes built-in **DNS-over-HTTPS (DoH)** pre-flight verification using Google and Cloudflare DNS.
- It tests your DNS TXT and CNAME records before enabling traffic to guarantee smooth routing.

### 4. Local LAN Sharing
Want to test your app on your mobile phone or another computer connected to your home or office Wi-Fi?
- Proxync generates a clean local IP address (e.g., `http://192.168.1.42:3000`).
- Traffic stays 100% inside your local Wi-Fi router, with zero data passing through the public internet.

---

## Key Features That Make Proxync Different

### Resilient Standby Mode (No More Broken Webhook Links)
When you are coding with AI assistants (like Cursor or Claude) or running tools with hot module reloading, your backend server restarts constantly.

With traditional tunneling tools, every restart crashes the tunnel, destroys your public URL, and forces you to copy-paste a brand-new webhook link into Stripe or Twilio.

**How Proxync fixes this:**  
Proxync detects when your local server restarts. Instead of terminating the public tunnel, it puts your URL into **Standby Mode**. External requests are patiently held for a few seconds, and traffic resumes flowing smoothly the millisecond your dev server finishes recompiling.

### Clean Background Teardown (Zero Leftover Zombie Processes)
Have you ever closed a tunneling tool, only to find that port `3000` or `2222` is still mysteriously locked by a background process?

Proxync spawns every tunnel as the leader of an isolated process group. When you stop a tunnel or quit Proxync, the operating system kernel cleanly and completely terminates every child process. No ghost processes, no locked ports, and no battery drain.

### 1-Click "Stop All" Button
Running multiple backend microservices or test servers simultaneously? When you finish your coding session, click the prominent **Stop All** button in the dashboard to cleanly terminate all active tunnels in one shot.

### Active Internet Connectivity Guard
If your Wi-Fi briefly drops or you're working offline on an airplane, Proxync verifies active internet connectivity before launching tunnels. This prevents annoying CLI timeout freezes and gives you a clear, friendly status message.

---

## Under the Hood (Technical Details)

For engineers interested in security and networking specifications:

| Feature | Technical Implementation |
| :--- | :--- |
| **Origin Relay** | Dynamic DNS resolution to `relay.proxync.dev` on Direct Origin Port `2222`. |
| **Key Exchange** | Ephemeral Ed25519 TLS keys signed just-in-time via API; wiped immediately on session exit (`TempDirGuard`). |
| **Process Isolation** | POSIX `setpgid(0, 0)` process grouping on Unix; process tree termination on Windows. |
| **Intranet SSRF Shield** | Strict loopback whitelisting (`is_permitted_probe_host`) prevents tunnels from probing private subnets (`192.168.x.x`, `10.x.x.x`, `169.254.169.254`). |
| **Handshake Polling** | 1500ms stabilization loop with 50ms early-crash detection to verify socket readiness before browser launch. |

---

## What to Read Next

- **[Traffic Inspector](/docs/traffic)** — Watch incoming requests and inspect payloads in real time.
- **[Request Workbench](/docs/workbench)** — Replay webhooks and diff responses against live code changes.
- **[Settings & Domains](/docs/settings)** — Configure custom domain records and manage logging options.
