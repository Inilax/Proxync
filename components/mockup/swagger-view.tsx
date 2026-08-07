"use client";

import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_BADGE, METHOD_EDGE, TUNNEL_URL } from "./types";

const SWAGGER_ENDPOINTS = [
  { method: "GET", path: "/api/v1/users", summary: "List users (Inferred OpenAPI 3.0)", responses: "200 responses" },
  { method: "POST", path: "/api/v1/session", summary: "Create session", responses: "201 responses" },
  { method: "GET", path: "/api/v1/users/{id}", summary: "Get user by id", responses: "200 responses" },
  { method: "DELETE", path: "/api/v1/users/{id}", summary: "Delete a user", responses: "204 responses" },
];

export function SwaggerView() {
  return (
    <div className="space-y-6 p-6 fade-in select-none">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Swagger &amp; OpenAPI Studio</h1>
          <p className="text-xs text-on-surface-variant mt-1 font-mono">
            Multi-Framework Codebase Scanner (Express, NestJS, FastAPI, Go)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
            OpenAPI 3.0
          </span>
          <button className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 px-3 py-1.5 font-mono text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer">
            <Copy className="h-3 w-3" />
            Copy JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-outline">Codebase Scanner</span>
          <div className="mt-1 text-sm font-bold text-on-surface">FastAPI + Vite (TypeScript)</div>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-outline">Export Target</span>
          <div className="mt-1 text-sm font-bold text-tertiary">2-Way Playground Export</div>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-outline">Server Endpoint</span>
          <div className="mt-1 font-mono text-xs font-bold text-primary truncate">{TUNNEL_URL}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {SWAGGER_ENDPOINTS.map((endpoint) => (
          <div
            key={`${endpoint.method}-${endpoint.path}`}
            className={cn(
              "rounded-xl border border-outline-variant/30 border-l-4 bg-surface-container-lowest p-4",
              METHOD_EDGE[endpoint.method],
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded px-2 py-0.5 font-mono text-[10px] font-bold",
                  METHOD_BADGE[endpoint.method],
                )}
              >
                {endpoint.method}
              </span>
              <code className="truncate font-mono text-xs font-bold text-on-surface">{endpoint.path}</code>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">{endpoint.summary}</p>
            <small className="font-mono text-[10px] text-outline mt-1 block">{endpoint.responses}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
