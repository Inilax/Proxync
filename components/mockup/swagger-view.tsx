"use client";

import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_BADGE, METHOD_EDGE } from "./types";

const SWAGGER_ENDPOINTS = [
  { method: "GET", path: "/api/v1/users", summary: "List users (Inferred OpenAPI 3.0)", responses: "200 responses" },
  { method: "POST", path: "/api/v1/session", summary: "Create session", responses: "201 responses" },
  { method: "GET", path: "/api/v1/users/{id}", summary: "Get user by id", responses: "200 responses" },
  { method: "DELETE", path: "/api/v1/users/{id}", summary: "Delete a user", responses: "204 responses" },
];

export function SwaggerView() {
  return (
    <div className="p-2 sm:p-4 space-y-2.5 sm:space-y-3.5 fade-in select-none h-full overflow-y-auto overflow-x-hidden font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2.5">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-lg font-bold text-white truncate">Swagger &amp; OpenAPI Studio</h1>
          <p className="text-[10px] sm:text-xs text-white/70 mt-0.5 font-mono truncate">
            Incremental Spec Ingestion &middot; Dynamic Parameterization
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          <span className="rounded-lg sm:rounded-full border border-secondary/40 bg-secondary/10 px-2 sm:px-2.5 py-0.5 font-mono text-[9.5px] sm:text-[11px] font-bold text-secondary whitespace-nowrap shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
            <span>Bot Filter Active</span>
          </span>
          <span className="rounded-lg border border-primary/40 bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 font-mono text-[9.5px] sm:text-xs font-bold text-primary whitespace-nowrap shrink-0">
            OpenAPI 3.0
          </span>
          <button className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2 sm:px-3 py-0.5 sm:py-1 font-mono text-[9.5px] sm:text-xs font-bold text-white hover:bg-surface-container cursor-pointer whitespace-nowrap shrink-0">
            <Copy className="h-3 w-3" />
            <span>Copy JSON</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-3.5">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/60 font-bold">Codebase Recon</span>
          <div className="mt-1 text-xs font-bold text-white truncate">FastAPI (:8000) + Vite (:5173)</div>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-3.5">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/60 font-bold">Route Attribution</span>
          <div className="mt-1 text-xs font-bold text-tertiary">Incremental Deep-Merge</div>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-3.5">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/60 font-bold">Active Server Tunnel</span>
          <div className="mt-1 font-mono text-xs font-bold text-primary truncate">
            https://px-a1b2c3d4.proxync.dev
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-2">
        {SWAGGER_ENDPOINTS.map((endpoint) => (
          <div
            key={`${endpoint.method}-${endpoint.path}`}
            className={cn(
              "rounded-xl border border-outline-variant/30 border-l-4 bg-surface-container-lowest p-2.5 sm:p-3.5",
              METHOD_EDGE[endpoint.method],
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "rounded px-2 py-0.5 font-mono text-[10px] font-bold",
                    METHOD_BADGE[endpoint.method],
                  )}
                >
                  {endpoint.method}
                </span>
                <code className="truncate font-mono text-xs font-bold text-white">{endpoint.path}</code>
              </div>
              <span className="font-mono text-[10px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded shrink-0">
                px-a1b2c3d4
              </span>
            </div>
            <p className="mt-1.5 text-xs text-white/80">{endpoint.summary}</p>
            <small className="font-mono text-[10px] text-white/60 mt-1 block">{endpoint.responses}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
