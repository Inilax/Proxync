---
title: Workspaces
description: Isolated project contexts that group processes, requests, traffic, domains, and notes.
---

A **workspace** is Proxync's unit of organization. It gives each project its own isolated context so nothing bleeds between projects.

## What a workspace contains

- `ProcessProfile[]` — discovered development servers (process name, port, framework, command, directory, executable).
- `SavedRequest[]` — your Postman-style request collection.
- `RequestLog[]` — captured traffic for the workspace.
- `DomainRecord[]` — custom domains and their verification status.
- A language hint (inferred from scanned source files).
- Notes, scanned files, and the project root path.

## Creating a workspace

From **Lobby**, the two-step onboarding wizard asks for:

1. A project name.
2. The project root path (used for the source scan and language inference).

The workspace is persisted immediately and becomes the active workspace.

## Switching workspaces

The sidebar shows your workspaces. Selecting one makes it active; all views — Lobby, Traffic, Postman, Swagger, Settings — operate on the active workspace's data.

## Persistence

The entire app state — `{ workspaces, activeWorkspaceId, appSettings }` — is written to a single JSON file on every change:

```text
%APPDATA%\Proxync\data.json
```

See [Configuration](/docs/configuration) for the full schema, including the automatic migration from the legacy `localStorage` keys used in early versions.

## Deleting a workspace

Removing a workspace deletes its profiles, requests, and traffic from the state file. It does **not** touch your project files on disk.
