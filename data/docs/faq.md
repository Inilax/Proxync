---
title: FAQ
description: Frequently asked questions about Proxync v0.2.1 — features, privacy, Pro Debugger, Native SSH tunnels, auto-updater, and system requirements.
---

## Does Proxync require an account?

No. Proxync runs 100% locally on your machine with local file serialization. No cloud account is required.

## What is the Pro Debugger & Dual-Stream Support Logging Engine in v0.2.1?

Proxync v0.2.1 introduces a native Rust disk logger in `%APPDATA%/Proxync/logs` with independent dual streams:
- **`app.log`** (Application Diagnostics, enabled by default): Captures engine lifecycle, recon scans, proxy binds, tunnel events, and crashes with bounded memory ring buffers ($<500\text{ KB}$).
- **`traffic.log`** (Traffic Stream, on-demand): Records full HTTP request/response payloads, headers, and latencies.
- **Support Diagnostic Bundle**: 1-click exporter bundling workspace state, discovered services, and sanitized logs into `proxync-support-bundle.json`.
- **Automatic PII Redaction**: Sanitizes `Authorization`, `Bearer`, `Cookie`, `ApiKey`, and `Secret` tokens.

## How does Dynamic Netstat Full-Port Service Discovery work?

Rather than scanning a hardcoded list of ports, Proxync v0.2.1 runs a single dynamic `netstat -ano` scan across all IPv4 and IPv6 ports combined with a single bulk WMI/CIM process query (`Get-CimInstance Win32_Process`). It automatically detects dev frameworks (Next.js, Vite, FastAPI, NestJS, Go, Spring Boot, Bun, Django) while filtering system noise.

## How do Proxync Native SSH High-Throughput Tunnels work?

Proxync Native Tunnels connect over port 2222 with hardware-accelerated cipher suites (`chacha20-poly1305`, `aes128-gcm`) and zero-RTT JIT Ed25519 TLS cert signing. Ephemeral keys are protected with single-user OS ACL permissions and securely erased on close via Rust `TempDirGuard`.

## What is the Emergency CVE Security Update Radar?

An unconditional pre-flight security scan runs on app launch to detect critical CVE release tags (`[SECURITY-CVE]`, `[TYPE: CVE-PATCH]`). It automatically alerts you and streams the update with live progress tracking, ensuring zero-day vulnerabilities are patched immediately.

## Which frameworks are supported by the Codebase Scanner?

The OpenAPI generator automatically scans **Next.js**, **Vite / React**, **NestJS**, **FastAPI**, **Express**, **Spring Boot**, and **Go** codebases to infer routes, parameterize dynamic paths (`/api/todos/{id}`), and produce OpenAPI 3.0 spec files.
