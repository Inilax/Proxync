---
title: Traffic Inspector
description: A live log of every HTTP request flowing through your tunnels, with status and timing.
---

The **Traffic** view is a real-time table of HTTP requests captured by Proxync's proxy. It is the fastest way to see what is actually hitting your development server.

## What is captured

For each request, Proxync records:

| Field | Description |
| --- | --- |
| `method` | HTTP method (GET, POST, ...). |
| `path` | The request path. |
| `status` | The response status code. |
| `duration` | Time to receive the response. |
| `headers` | Request and response headers. |
| `timestamp` | When the request was captured. |

Bodies are **not** stored — the log and OpenAPI generation are built from metadata only.

## Reading the log

- Rows are prepended live as requests arrive.
- A request is marked **pending** until its response event arrives. A row that stays pending suggests the target server accepted the connection but stalled.
- The log is capped at **150 entries** per workspace; the oldest are dropped.

## Request detail

Clicking a row opens a detail dialog showing the parsed request line, headers, and response status/headers captured by the proxy.

## Send to Postman

Each captured request can be sent to the [Postman Runner](/docs/postman). It becomes a `SavedRequest` with `source: "captured"` in the active workspace's collection, ready to replay or edit.

## Events behind the scenes

The frontend subscribes to these Tauri events to build the log:

- `request:log` — `{ id, method, path, headers, timestamp }` (proxy path) or `{ requestId, method, path, timestamp }` (relay path).
- `request:log:response` — `{ requestId, status, timestamp }`, matched to the pending entry.
- `tunnel:auto-closed` — `{ tunnelId }`, flags the related tunnel as closed.

See [API Reference](/docs/api-reference) for event payload details.
