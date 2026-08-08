"use client";

import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const WORKSPACES = [
  {
    name: "proxync-workspace",
    language: "TypeScript / Node",
    shares: 1,
    requests: 24,
    notes: "React + Vite client with a FastAPI backend. Tunneling dev server for webhook testing.",
    activity: "Just now",
    status: "active",
  },
  {
    name: "ecommerce-api",
    language: "Python (FastAPI)",
    shares: 0,
    requests: 14,
    notes: "Storefront API. Playground collection seeded from starter scan.",
    activity: "18h ago",
    status: "active",
  },
  {
    name: "legacy-portal",
    language: "Go (Gin)",
    shares: 0,
    requests: 8,
    notes: "Dormant legacy backend automatically filtered by 7-day inactivity rule.",
    activity: "12d ago",
    status: "inactive",
  },
];

export function LobbyView() {
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const filteredWorkspaces = WORKSPACES.filter((w) =>
    tab === "active" ? w.status === "active" : w.status === "inactive",
  );

  return (
    <div className="space-y-4 p-5 fade-in select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/30 pb-3 gap-3">
        <div>
          <h1 className="text-lg font-bold text-on-surface">Workspaces Hub</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Isolated contexts per project. Features dynamic activity tracking &amp; 7-day inactivity filtering.
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-outline-variant/30 bg-surface-container p-1 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "rounded-md px-2.5 py-1 font-mono text-xs font-bold transition-all cursor-pointer",
              tab === "active" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            Active (2)
          </button>
          <button
            type="button"
            onClick={() => setTab("inactive")}
            className={cn(
              "rounded-md px-2.5 py-1 font-mono text-xs font-bold transition-all cursor-pointer",
              tab === "inactive" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            Inactive (1)
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container p-3.5 gap-3">
        <div>
          <div className="text-xs font-bold text-on-surface">Create a new workspace</div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Inline creation with global Esc key dismissal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            defaultValue="microservice-gateway"
            className="flex-1 sm:w-44 bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary font-mono min-w-0"
          />
          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 font-mono text-xs font-bold text-on-primary transition-all hover:bg-primary/90 shadow-sm shadow-primary/25 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filteredWorkspaces.map((workspace) => (
          <div
            key={workspace.name}
            className={cn(
              "rounded-xl border p-3.5 transition-all",
              workspace.status === "active"
                ? "border-primary/40 bg-surface-container-lowest hover:border-primary"
                : "border-outline-variant/20 bg-surface-container-low/50 opacity-75",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-on-surface">{workspace.name}</div>
                <div className="mt-0.5 font-mono text-[11px] text-on-surface-variant">
                  {workspace.language}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold",
                  workspace.status === "active"
                    ? "border-tertiary/40 bg-tertiary/10 text-tertiary"
                    : "border-outline-variant/40 text-on-surface-muted",
                )}
              >
                Active {workspace.activity}
              </span>
            </div>
            <div className="mt-2 flex gap-3 font-mono text-[11px] text-on-surface-variant">
              <span>{workspace.shares} saved shares</span>
              <span>{workspace.requests} requests</span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">
              {workspace.notes}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 font-mono text-xs font-bold text-on-primary transition-all hover:bg-primary/90 cursor-pointer"
              >
                Open workspace
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
