---
title: Swagger & OpenAPI Studio
description: Auto-generate interactive OpenAPI 3.0 documentation from your codebase or live traffic without writing manual YAML.
---

Writing and maintaining API documentation by hand is notoriously tedious. You often have to maintain hundreds of lines of complex YAML files or configure heavy decorator libraries.

The **Swagger & OpenAPI Studio** in Proxync creates interactive, beautiful API documentation for you automatically—either by scanning your project files or by learning from live requests passing through your tunnels.

---

## Why Developers Love Swagger Studio

- **Zero Manual YAML:** Proxync generates clean OpenAPI 3.0 specifications automatically.
- **Smart Path Parameterization:** If you make a request to `/api/todos/todo-987654` or `/api/users/42`, Proxync is smart enough to recognize dynamic IDs and automatically parameterize the route as `/api/todos/{id}` with proper path parameters.
- **Bot Probe Filtering:** Malicious automated scans looking for `/.env`, `/.git`, or `/wp-admin` are automatically filtered out, ensuring your documentation only reflects your actual application routes.
- **Multi-Server Dropdown:** If you are running multiple servers or public tunnels, switch between them effortlessly with an intuitive server dropdown.
- **1-Click Export to Playground:** Convert your generated OpenAPI spec into a saved collection in **Playground** with one click so you can test them anytime.

---

## Supported Frameworks for Codebase Scanning

Proxync includes an automatic route scanner that inspects your source code to detect API routes:

| Framework / Stack | How Proxync Discovers Routes |
| :--- | :--- |
| **Next.js** | Scans `app/api/**/route.ts` and `pages/api/**/*.ts`. |
| **FastAPI** | Parses route decorators (`@app.get`, `@app.post`) and Pydantic models. |
| **Express & Fastify** | Inspects route registrations (`app.get(...)`, `router.post(...)`). |
| **NestJS** | Scans `@Controller()` and HTTP method decorators (`@Get()`, `@Post()`). |
| **Spring Boot** | Parses `@RestController`, `@GetMapping`, and `@PostMapping` annotations. |
| **Go (Gin & Chi)** | Identifies router definitions and handler endpoints. |
| **Python HTTP Server** | Detects built-in `python -m http.server` endpoints. |

---

## Two Ways Your Docs Get Built

### 1. By Code Scanning
Click **Scan Project Folder**. Proxync parses your local source code, extracts route methods, and builds an OpenAPI spec in seconds.

### 2. From Live Traffic (Incremental Deep-Merging)
As you click around your app or test features through a tunnel, Proxync observes the requests. It incrementally merges newly captured endpoints into your documentation, preserving previously discovered routes without overwriting them.

---

## What to Read Next

- **[API Playground](/docs/postman)** — Export your Swagger docs directly into a Playground collection.
- **[Traffic Inspector](/docs/traffic)** — Watch the live requests that power automatic Swagger documentation.
- **[Workspaces](/docs/workspaces)** — Keep separate Swagger specs organized per project.
