---
title: Settings & Domains
description: Project scanning, custom domain verification, and app-wide preferences.
---

The **Settings** view groups workspace-level project scanning, custom domain management, and global notes.

## Project scan

A project scan walks your workspace's root path recursively to understand the codebase:

- **Excluded directories:** `node_modules`, `target`, `.git`, `build`, `bin`, `.gradle`.
- **Collected extensions:** `java`, `ts`, `js`, `py`, `go`, `cs`, `controller`.
- Files are returned as relative paths and can be read safely (path traversal is blocked).

The scan feeds the **language hint** — the language inferred from the collected file counts — which is used when generating OpenAPI documents.

## Custom domains

You can register domains to use when sharing processes.

1. Add a domain. Proxync issues a verification token:
   ```text
   proxync-verification-<uuid8>
   ```
2. Add the required DNS records:
   - **TXT** — `_proxync.<domain>` = `proxync-verification=<token>`
   - **A** (or CNAME) — routing to `127.0.0.1`
3. Press **Verify**. The domain is marked `verified` in the workspace.

> Verification currently flips the domain's `verified` flag locally; it does not perform a live DNS check. Registrar examples in the UI cover Namesilo and GoDaddy.

Verified domains unlock the **custom domain** share mode in [Tunnels & Sharing](/docs/tunnels).

## Preferences

- **Default project root path** — a default used when creating new workspaces.
- **Notes** — global notes stored in `AppSettings`.
