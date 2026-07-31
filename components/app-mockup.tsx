"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Cloud,
  Code2,
  Copy,
  Globe,
  Home,
  LayoutGrid,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Send,
  Settings,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { LatencyReadout } from "./latency";

const TUNNEL_URL = "https://edge-42.trycloudflare.com";

const VIEWS = [
  { id: "lobby", icon: LayoutGrid, label: "Lobby" },
  { id: "overview", icon: Home, label: "Overview" },
  { id: "traffic", icon: Activity, label: "Traffic" },
  { id: "postman", icon: Send, label: "Postman" },
  { id: "swagger", icon: Code2, label: "Swagger" },
  { id: "settings", icon: Settings, label: "Settings" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const PROCESSES = [
  { name: "Vite server", port: 5173 },
  { name: "Next.js app", port: 3000 },
  { name: "FastAPI app", port: 8000 },
];

type Row = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  status: number;
  latency: string;
  active?: boolean;
};

const ROWS: Row[] = [
  { method: "GET", path: "/api/v1/users", status: 200, latency: "34ms", active: true },
  { method: "POST", path: "/api/v1/session", status: 201, latency: "87ms" },
  { method: "GET", path: "/api/v1/users/42", status: 200, latency: "41ms" },
  { method: "PUT", path: "/api/v1/users/42", status: 301, latency: "3ms" },
  { method: "DELETE", path: "/api/v1/users/42", status: 404, latency: "12ms" },
  { method: "GET", path: "/api/v1/health", status: 200, latency: "2ms" },
];

const METHOD_STYLE: Record<Row["method"], string> = {
  GET: "text-tertiary",
  POST: "text-primary",
  PUT: "text-secondary",
  DELETE: "text-error",
};

const METHOD_BADGE: Record<string, string> = {
  GET: "border-tertiary/40 bg-tertiary/10 text-tertiary",
  POST: "border-primary/40 bg-primary/10 text-primary",
  PUT: "border-secondary/40 bg-secondary/10 text-secondary",
  PATCH: "border-secondary/40 bg-secondary/10 text-secondary",
  DELETE: "border-error/40 bg-error/10 text-error",
};

const METHOD_EDGE: Record<string, string> = {
  GET: "border-l-tertiary/60",
  POST: "border-l-primary/60",
  PUT: "border-l-secondary/60",
  PATCH: "border-l-secondary/60",
  DELETE: "border-l-error/60",
};

function Label({ children }: { children: string }) {
  return (
    <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-outline">
      {children}
    </div>
  );
}

function Input({
  placeholder,
  value,
  className,
}: {
  placeholder: string;
  value?: string;
  className?: string;
}) {
  return (
    <input
      defaultValue={value}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 font-mono text-[12px] text-on-surface placeholder:text-on-surface-muted/60 focus:outline-none",
        className,
      )}
    />
  );
}

/* ─────────────────────────── Traffic ─────────────────────────── */

function TrafficView() {
  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-outline">
          <span className="w-14 shrink-0">Method</span>
          <span className="flex-1">Path</span>
          <span className="w-12 shrink-0">Status</span>
          <span className="w-14 shrink-0">Time</span>
          <span className="hidden w-28 shrink-0 sm:block">Action</span>
        </div>

        {ROWS.map((row) => (
          <div
            key={`${row.method}-${row.path}`}
            className={cn(
              "relative flex items-center gap-3 border-l-2 px-4 py-2.5 font-mono text-[11px] transition-colors",
              row.active
                ? "border-primary bg-primary/5"
                : "border-transparent hover:bg-surface-container-low",
            )}
          >
            {row.active && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 right-0 animate-scan bg-gradient-to-b from-transparent via-primary/25 to-transparent"
              />
            )}
            <span className={cn("w-14 shrink-0 font-bold", METHOD_STYLE[row.method])}>
              {row.method}
            </span>
            <span className="flex-1 truncate text-on-surface-variant">{row.path}</span>
            <span className={cn("w-12 shrink-0", STATUS_STYLE[row.status])}>{row.status}</span>
            <span className="w-14 shrink-0 text-on-surface-muted">{row.latency}</span>
            <span className="hidden w-28 shrink-0 items-center gap-1 text-[10px] text-primary sm:flex">
              Send to Postman
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        ))}

        <div className="flex items-center gap-2 border-t border-outline-variant/30 bg-surface-container/40 px-4 py-2 font-mono text-[10px] text-on-surface-muted">
          <Globe className="h-3.5 w-3.5 text-tertiary" />
          Listening on
          <span className="text-tertiary">{TUNNEL_URL}</span>
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 border-l border-outline-variant/30 p-4 lg:block">
        <div className="flex items-center gap-2">
          <span className="rounded border border-tertiary/40 bg-tertiary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-tertiary">
            GET
          </span>
          <span className="truncate font-mono text-[12px] text-on-surface">/api/v1/users</span>
        </div>
        <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-on-surface-muted">
          <span className="text-tertiary">200 OK</span>
          <span>34 ms</span>
          <span className="ml-auto text-outline">captured live</span>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 font-mono text-[11px]">
          <div className="flex gap-2">
            <span className="text-outline">Content-Type:</span>
            <span className="text-on-surface-variant">application/json</span>
          </div>
          <div className="flex gap-2">
            <span className="text-outline">Authorization:</span>
            <span className="text-on-surface-variant">Bearer ••••••••</span>
          </div>
          <div className="flex gap-2">
            <span className="text-outline">Accept:</span>
            <span className="text-on-surface-variant">*/*</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-surface-container p-3 font-mono text-[11px] leading-relaxed">
          <div>
            <span className="text-on-surface-variant">{"{"}</span>
          </div>
          <div className="pl-3">
            <span className="text-primary">&quot;id&quot;</span>
            <span className="text-on-surface-variant">: </span>
            <span className="text-tertiary">42</span>
            <span className="text-on-surface-variant">,</span>
          </div>
          <div className="pl-3">
            <span className="text-primary">&quot;email&quot;</span>
            <span className="text-on-surface-variant">: </span>
            <span className="text-tertiary">&quot;ada@acme.dev&quot;</span>
            <span className="text-on-surface-variant">,</span>
          </div>
          <div className="pl-3">
            <span className="text-primary">&quot;role&quot;</span>
            <span className="text-on-surface-variant">: </span>
            <span className="text-tertiary">&quot;admin&quot;</span>
            <span className="text-on-surface-variant">,</span>
          </div>
          <div className="pl-3">
            <span className="text-primary">&quot;verified&quot;</span>
            <span className="text-on-surface-variant">: </span>
            <span className="text-secondary">true</span>
          </div>
          <div>
            <span className="text-on-surface-variant">{"}"}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-3 py-1.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Repeat className="h-3.5 w-3.5" />
            Replay
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-tertiary/40 bg-tertiary/10 px-3 py-1.5 font-mono text-[11px] font-bold text-tertiary transition-colors hover:bg-tertiary/20"
          >
            <Play className="h-3.5 w-3.5" />
            Send to Postman
          </button>
        </div>
      </aside>
    </div>
  );
}

const STATUS_STYLE: Record<number, string> = {
  200: "text-tertiary",
  201: "text-tertiary",
  301: "text-secondary",
  404: "text-error",
};

/* ─────────────────────────── Postman ─────────────────────────── */

const COLLECTION = [
  { method: "GET", name: "Probe /", source: "starter-scan" },
  { method: "GET", name: "List users", source: "captured" },
  { method: "POST", name: "Create session", source: "captured" },
  { method: "GET", name: "Health check", source: "starter-scan" },
];

function PostmanView() {
  return (
    <div className="flex h-full">
      <aside className="hidden w-44 shrink-0 border-r border-outline-variant/30 p-3 sm:block">
        <Label>Collection</Label>
        <div className="mt-2 flex flex-col gap-0.5">
          {COLLECTION.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-container"
            >
              <span className="font-mono text-[10px] font-bold">{methodColor(item.method)}</span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-on-surface">{item.name}</span>
                <span className="block font-mono text-[9px] text-on-surface-muted">{item.source}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 font-mono text-[9px] text-primary">
          Starter scan available — import
        </div>
      </aside>

      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-center gap-2">
          <Input placeholder="Request name" value="List users" className="flex-1" />
          <button
            type="button"
            className="rounded-lg border border-outline-variant/40 px-3 py-2 font-mono text-[11px] text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Save
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 font-mono text-[12px] font-bold text-tertiary">
            GET
          </span>
          <Input placeholder="/api/users" value="/api/v1/users" className="flex-1" />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-mono text-[11px] font-bold text-on-primary transition-colors hover:bg-primary-strong"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <Label>Headers</Label>
            <textarea
              readOnly
              defaultValue={"Content-Type: application/json\nAuthorization: Bearer ••••••••"}
              className="mt-1 h-28 w-full resize-none rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3 font-mono text-[11px] text-on-surface-variant"
            />
          </div>
          <div>
            <Label>Body</Label>
            <textarea
              readOnly
              defaultValue={'{\n  "email": "ada@acme.dev"\n}'}
              className="mt-1 h-28 w-full resize-none rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3 font-mono text-[11px] text-on-surface-variant"
            />
          </div>
        </div>
      </div>

      <aside className="hidden w-64 shrink-0 border-l border-outline-variant/30 p-4 md:block">
        <Label>Response</Label>
        <div className="mt-2 flex items-center gap-3 font-mono text-[10px]">
          <span className="font-bold text-tertiary">200 OK</span>
          <span className="text-on-surface-muted">12 ms</span>
          <span className="ml-auto text-outline">application/json</span>
        </div>
        <pre className="mt-3 overflow-hidden rounded-lg bg-surface-container p-3 font-mono text-[11px] leading-relaxed text-on-surface-variant">
          {`{
  "id": 42,
  "email": "ada@acme.dev",
  "role": "admin",
  "verified": true
}`}
        </pre>
      </aside>
    </div>
  );
}

function methodColor(method: string) {
  if (method === "GET") return <span className="text-tertiary">{method}</span>;
  if (method === "POST") return <span className="text-primary">{method}</span>;
  if (method === "DELETE") return <span className="text-error">{method}</span>;
  return <span className="text-secondary">{method}</span>;
}

/* ─────────────────────────── Swagger ─────────────────────────── */

const SWAGGER_ENDPOINTS = [
  { method: "GET", path: "/api/v1/users", summary: "List users", responses: "200 responses" },
  { method: "POST", path: "/api/v1/session", summary: "Create session", responses: "201 responses" },
  { method: "GET", path: "/api/v1/users/{id}", summary: "Get user by id", responses: "200 responses" },
  { method: "DELETE", path: "/api/v1/users/{id}", summary: "Delete a user", responses: "204 responses" },
];

function SwaggerView() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-on-surface">Swagger</h3>
          <p className="mt-0.5 font-mono text-[10px] text-on-surface-muted">
            TypeScript / JavaScript project detected · updates from live traffic
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold text-primary">
            Preview
          </span>
          <span className="rounded-md border border-outline-variant/30 px-2.5 py-1 font-mono text-[10px] text-on-surface-muted">
            JSON
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-2.5 py-1 font-mono text-[10px] text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Copy className="h-3 w-3" />
            Copy JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-outline">Language hint</span>
          <div className="mt-0.5 truncate text-[12px] font-semibold text-on-surface">
            TypeScript / JavaScript
          </div>
        </div>
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-outline">Generated</span>
          <div className="mt-0.5 truncate text-[12px] font-semibold text-on-surface">just now</div>
        </div>
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-outline">Servers</span>
          <div className="mt-0.5 truncate font-mono text-[11px] font-semibold text-tertiary">
            {TUNNEL_URL}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {SWAGGER_ENDPOINTS.map((endpoint) => (
          <div
            key={`${endpoint.method}-${endpoint.path}`}
            className={cn(
              "rounded-lg border border-outline-variant/30 border-l-2 bg-surface-container-lowest p-3",
              METHOD_EDGE[endpoint.method],
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold",
                  METHOD_BADGE[endpoint.method],
                )}
              >
                {endpoint.method}
              </span>
              <code className="truncate font-mono text-[12px] text-on-surface">{endpoint.path}</code>
            </div>
            <p className="mt-1.5 text-[11px] text-on-surface-variant">{endpoint.summary}</p>
            <small className="font-mono text-[9px] text-on-surface-muted">{endpoint.responses}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Overview ─────────────────────────── */

function OverviewView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="relative grid h-14 w-14 place-items-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-primary/30"
        />
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full border border-primary/10"
        />
        <LogoMark className="h-8 w-8" />
      </div>
      <h3 className="max-w-md text-[17px] font-semibold leading-snug tracking-tight text-on-surface">
        Keep each project isolated, share faster, and let contracts evolve with the code.
      </h3>
      <p className="max-w-md text-[12px] leading-relaxed text-on-surface-variant">
        Every workspace stores its own process profile, captured traffic, Postman collection, and
        generated Swagger. When the project changes, the contract updates with it.
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-mono text-[11px] font-bold text-on-primary transition-colors hover:bg-primary-strong"
      >
        <Search className="h-3.5 w-3.5" />
        Discover running processes
      </button>
      <div className="mt-2 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { value: "proxync-workspace", label: "Workspace", emphasis: true },
          { value: "3", label: "Live processes" },
          { value: "1", label: "Active tunnels" },
          { value: "128", label: "Captured requests" },
        ].map((metric) => (
          <div
            key={metric.label}
            className={cn(
              "rounded-lg border px-3 py-2.5",
              metric.emphasis
                ? "border-primary/30 bg-primary/5"
                : "border-outline-variant/30 bg-surface-container-low",
            )}
          >
            <strong
              className={cn(
                "block truncate text-[14px] font-semibold",
                metric.emphasis ? "text-primary" : "text-on-surface",
              )}
            >
              {metric.value}
            </strong>
            <span className="font-mono text-[9px] uppercase tracking-wider text-outline">
              {metric.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Lobby ─────────────────────────── */

const WORKSPACES = [
  {
    name: "proxync-workspace",
    language: "TypeScript / JavaScript",
    shares: 1,
    requests: 12,
    notes: "React + Vite client with a FastAPI backend. Tunneling the dev server for webhook testing.",
    active: true,
  },
  {
    name: "ecommerce-api",
    language: "Python",
    shares: 0,
    requests: 4,
    notes: "Django storefront API. Postman collection seeded from the starter scan.",
    active: false,
  },
];

function LobbyView() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-base font-semibold text-on-surface">Workspace lobby</h3>
        <p className="mt-0.5 max-w-md text-[11px] leading-relaxed text-on-surface-muted">
          Keep each project isolated here. Every workspace carries its own saved share profile,
          Postman collection, Swagger contract, and notes.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5">
        <div>
          <div className="text-[12px] font-semibold text-on-surface">Create a workspace</div>
          <p className="text-[10px] text-on-surface-muted">
            One workspace per project, so configs never mix.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="New workspace" value="api-gateway" className="w-40" />
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 font-mono text-[11px] font-bold text-on-primary transition-colors hover:bg-primary-strong"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {WORKSPACES.map((workspace) => (
          <div
            key={workspace.name}
            className={cn(
              "rounded-lg border p-3",
              workspace.active
                ? "border-primary/30 bg-primary/5"
                : "border-outline-variant/30 bg-surface-container-lowest",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-on-surface">{workspace.name}</div>
                <div className="mt-0.5 font-mono text-[9px] text-on-surface-muted">
                  {workspace.language}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px]",
                  workspace.active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-outline-variant/40 text-on-surface-muted",
                )}
              >
                {workspace.active ? "Current" : "Saved"}
              </span>
            </div>
            <div className="mt-2 flex gap-3 font-mono text-[9px] text-on-surface-muted">
              <span>{workspace.shares} saved shares</span>
              <span>{workspace.requests} requests</span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-on-surface-variant">
              {workspace.notes}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-mono text-[10px] font-bold text-on-primary transition-colors hover:bg-primary-strong"
              >
                Open workspace
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 px-2.5 py-1.5 font-mono text-[10px] text-on-surface-variant transition-colors hover:text-error"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Settings ─────────────────────────── */

function SettingsView() {
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-base font-semibold text-on-surface">Settings</h3>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { label: "Workspace", value: "proxync-workspace" },
          { label: "Mode", value: "Standalone (Local-First)" },
          { label: "Active tunnel", value: TUNNEL_URL, mono: true },
        ].map((tile) => (
          <div key={tile.label} className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-outline">
              {tile.label}
            </span>
            <div
              className={cn(
                "mt-0.5 truncate text-[12px] font-semibold text-on-surface",
                tile.mono && "font-mono text-[11px] text-tertiary",
              )}
            >
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
        <Label>Project scan</Label>
        <div className="mt-2 flex items-center gap-2">
          <Input placeholder="E:\\path\\to\\project" value="E:\\dev\\proxync-workspace" className="flex-1" />
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 font-mono text-[10px] font-bold text-on-primary transition-colors hover:bg-primary-strong"
          >
            Scan project folder
          </button>
          <span className="shrink-0 font-mono text-[10px] text-on-surface-muted">128 files indexed</span>
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
        <Label>Custom domains</Label>
        <div className="mt-2 flex items-center gap-2">
          <Input placeholder="demo.example.com" value="demo.example.com" className="flex-1" />
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 font-mono text-[10px] font-bold text-on-primary transition-colors hover:bg-primary-strong"
          >
            Add domain
          </button>
        </div>
        <div className="mt-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[12px] font-semibold text-on-surface">demo.example.com</span>
              <span className="ml-2 font-mono text-[9px] text-tertiary">✓ Ownership Verified</span>
            </div>
            <span className="rounded-full border border-tertiary/40 bg-tertiary/10 px-2 py-0.5 font-mono text-[9px] text-tertiary">
              Live
            </span>
          </div>
          <div className="mt-2 overflow-hidden rounded-lg border border-outline-variant/20">
            <div className="grid grid-cols-4 gap-2 border-b border-outline-variant/20 bg-surface-container px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-outline">
              <span>Host</span>
              <span>Type</span>
              <span>Value</span>
              <span>TTL</span>
            </div>
            {[
              ["@", "A", "127.0.0.1", "30 min"],
              ["_proxync", "TXT", "proxync-verification=1f4a9c2d", "30 min"],
            ].map(([host, type, value, ttl]) => (
              <div
                key={host}
                className="grid grid-cols-4 items-center gap-2 border-b border-outline-variant/10 bg-surface-container-lowest px-3 py-1.5 font-mono text-[10px] last:border-0"
              >
                <span className="text-on-surface">{host}</span>
                <span className="text-primary">{type}</span>
                <span className="truncate text-on-surface-variant">{value}</span>
                <span className="text-on-surface-muted">{ttl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
        <Label>Global notes</Label>
        <textarea
          readOnly
          defaultValue={"Keep app-wide relay or deployment notes here."}
          className="mt-1 h-16 w-full resize-none rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3 font-mono text-[11px] text-on-surface-variant"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Sidebar ─────────────────────────── */

function Sidebar({
  active,
  onSelect,
}: {
  active: ViewId;
  onSelect: (view: ViewId) => void;
}) {
  return (
    <aside className="hidden w-52 shrink-0 border-r border-outline-variant/30 p-2.5 sm:block">
      <div className="flex items-center gap-2 px-1 pb-3 pt-1">
        <LogoMark className="h-6 w-6" />
        <span className="leading-none">
          <span className="block text-[12px] font-bold text-on-surface">Proxync</span>
          <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-muted">
            workspace studio
          </span>
        </span>
      </div>

      <div className="rounded-lg border border-outline-variant/30 bg-surface-container/60 px-2.5 py-2">
        <Label>Active workspace</Label>
        <div className="mt-0.5 truncate text-[12px] font-semibold text-on-surface">
          proxync-workspace
        </div>
        <div className="truncate font-mono text-[10px] text-on-surface-muted">
          TypeScript / JavaScript
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-tertiary/30 bg-tertiary/5 px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary animate-pulse-dot" />
        <span className="truncate font-mono text-[10px] text-tertiary">{TUNNEL_URL}</span>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5" aria-label="Primary">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelect(view.id)}
            aria-pressed={active === view.id}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors",
              active === view.id
                ? "bg-primary/10 font-medium text-primary"
                : "text-on-surface-muted hover:text-on-surface",
            )}
          >
            <view.icon className="h-3.5 w-3.5" />
            {view.label}
          </button>
        ))}
      </nav>

      <div className="mt-2 flex items-center gap-2 rounded-md border border-outline-variant/30 px-2 py-1.5 text-[11px] text-on-surface-variant">
        <Search className="h-3.5 w-3.5" />
        Discover process
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between px-1">
          <Label>Live processes</Label>
          <RefreshCw className="h-3 w-3 text-outline" />
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {PROCESSES.map((process, i) => (
            <span
              key={process.port}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5",
                i === 0 ? "bg-surface-container" : "text-on-surface-variant",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-on-surface">
                  {process.name}
                </span>
                <span className="block font-mono text-[9px] text-on-surface-muted">
                  :{process.port}
                </span>
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="px-1">
          <Label>Saved shares</Label>
        </div>
        <div className="mt-1 rounded-md bg-surface-container px-2 py-1.5">
          <span className="block text-[11px] font-medium text-on-surface">vite-frontend</span>
          <span className="block truncate font-mono text-[9px] text-on-surface-muted">
            Vite server · TypeScript / JavaScript
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-outline-variant/30 px-2.5 py-1.5">
        <span className="truncate text-[11px] font-medium text-on-surface">proxync-workspace</span>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-tertiary">
          Ready
        </span>
      </div>
    </aside>
  );
}

/* ─────────────────────────── App mockup ─────────────────────────── */

export function AppMockup() {
  const [active, setActive] = useState<ViewId>("traffic");

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -top-8 h-40 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-10 bottom-6 h-24 rounded-full bg-primary/10 blur-2xl"
      />

      <div className="relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-panel">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-mono text-[11px] text-on-surface-muted">
            Proxync — Developer Tunneling Workspace Studio
          </div>
          <div className="font-mono text-[11px] text-on-surface-muted">v0.1.7</div>
        </div>

        <div className="flex">
          <Sidebar active={active} onSelect={setActive} />

          <div className="min-w-0 flex-1">
            <div className="min-h-[460px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="h-full"
                >
                  {active === "traffic" && <TrafficView />}
                  {active === "postman" && <PostmanView />}
                  {active === "swagger" && <SwaggerView />}
                  {active === "overview" && <OverviewView />}
                  {active === "lobby" && <LobbyView />}
                  {active === "settings" && <SettingsView />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container/40 px-4 py-2 font-mono text-[11px]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-tertiary">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary animate-pulse-dot" />
                  1 tunnel active
                </span>
                <span className="hidden items-center gap-1.5 text-on-surface-variant sm:flex">
                  <Cloud className="h-3.5 w-3.5 text-primary" />
                  Cloudflare Quick Tunnel
                </span>
                <span className="hidden text-on-surface-muted md:inline">Local proxy :8080</span>
              </div>
              <LatencyReadout />
            </div>
          </div>
        </div>
      </div>

      <div className="glass absolute -top-5 right-4 z-10 hidden animate-float items-center gap-2 rounded-full px-3 py-2 font-mono text-[11px] text-on-surface-variant md:flex lg:-right-8">
        <Cloud className="h-3.5 w-3.5 text-primary" />
        trycloudflare.com — instant public HTTPS
      </div>
      <div
        className="glass absolute -bottom-5 left-4 z-10 hidden animate-float items-center gap-2 rounded-full px-3 py-2 font-mono text-[11px] text-on-surface-variant md:flex lg:-left-8"
        style={{ animationDelay: "-3s" }}
      >
        <RefreshCw className="h-3.5 w-3.5 text-tertiary" />
        <LatencyReadout label="Cloudflare Latency" />
      </div>
    </div>
  );
}
