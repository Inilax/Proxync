---
title: Swagger & OpenAPI Studio
description: Automatic OpenAPI 3.0 spec generation engine and multi-framework codebase route scanner for Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, and Go.
---

In Proxync v0.2.0, the **Swagger Studio** combines live traffic OpenAPI spec generation with an **Automatic Multi-Framework Codebase Scanner**.

## Key Features in v0.2.0

- **Multi-Framework Codebase Scanner** — Automatically scans local codebase repositories (Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, Go) to infer endpoints and generate OpenAPI 3.0 definitions.
- **Traffic-Driven JSON Schema Inferrer** — Infers JSON parameter and response schemas dynamically from live intercepted traffic.
- **Automatic Multi-Framework Codebase Scanner** — Scans local project directories (Express, Fastify, Next.js App/Pages Router, NestJS, FastAPI, Spring Boot, Go Chi/Gin) and extracts routes into an OpenAPI 3.0 schema.
- **Traffic-Driven Schema Inference** — Merges live captured HTTP request/response payloads from Traffic Inspector to automatically populate missing OpenAPI request body and response schemas.
- **2-Way Collection Export/Import** — Export OpenAPI specs directly into Playground collections or import existing OpenAPI YAML/JSON specs.
- **Interactive OpenAPI UI & Spec Generator** — Built-in visual API documentation viewer with instant YAML/JSON copy and download options.

## Codebase Scanner Supported Frameworks

| Framework | Scan Strategy |
| --- | --- |
| Express / Fastify | Inspects route registration (`app.get`, `router.post`). |
| Next.js | Scans `app/api/**/route.ts` and `pages/api/**/*.ts`. |
| NestJS | Parses `@Controller()` and HTTP method decorators (`@Get`, `@Post`). |
| FastAPI | Parses `@app.get()`, `@app.post()`, and Pydantic models. |
| Spring Boot | Parses `@RestController`, `@GetMapping`, `@PostMapping`. |
| Go (Gin/Chi) | Scans router definitions and handler signatures. |

## 2-Way Playground Collection Sync

Clicking **Export to Playground** inside Swagger Studio automatically converts all endpoints into collection items and redirects seamlessly into **Playground**.
