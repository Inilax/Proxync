---
title: Swagger & OpenAPI
description: Generate an OpenAPI 3.1.0 document from your captured traffic and saved requests.
---

The **Swagger** view generates an OpenAPI document for your workspace without you writing a single line of YAML.

## What it produces

An **OpenAPI 3.1.0** JSON document built from:

- **Captured requests** — every path and method seen in the traffic log.
- **Saved requests** — the methods and normalized paths in your collection.

Observed response status codes are recorded per path/operation. The document includes:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Proxync generated API",
    "version": "0.1.0"
  },
  "servers": [{ "url": "https://your-tunnel.trycloudflare.com" }]
}
```

The `servers[0].url` is set to your active tunnel's public URL (falling back to `http://localhost` when no tunnel is active). The workspace's inferred language hint is included as metadata.

## Using it

Open **Swagger** to preview the generated document. You can copy the JSON to feed it into tools like Swagger UI, Redoc, or your API client of choice.

## Limits

- Generation is **metadata-only**: because Proxync does not capture request/response bodies, the document describes paths, methods, and observed statuses rather than request/response schemas.
- The document reflects the workspace's current captured + saved state at generation time. Re-generate after capturing more traffic to refresh it.

## Example

A workspace that captured `GET /users` and saved `POST /users` produces an OpenAPI document with a `/users` path, `get` and `post` operations, and the observed status codes.
