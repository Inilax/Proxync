"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, PROCESSES, TUNNEL_URL, ViewId } from "./types";

export function Sidebar({
  active,
  onSelect,
}: {
  active: ViewId;
  onSelect: (view: ViewId) => void;
}) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-outline-variant/30 bg-surface-container-low p-3 sm:block select-none">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 pb-4 pt-2 border-b border-outline-variant/20">
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
          PX
        </div>
        <div>
          <span className="block text-sm font-bold text-on-surface">Proxync</span>
          <span className="block font-mono text-[9px] uppercase tracking-widest text-outline">
            workspace studio
          </span>
        </div>
      </div>

      {/* Active Workspace Selector */}
      <div className="mt-3 rounded-lg border border-outline-variant/40 bg-surface-container p-3 transition-all cursor-pointer hover:border-primary/40">
        <div className="font-mono text-[9px] uppercase tracking-wider text-outline font-bold">Active workspace</div>
        <div className="mt-1 truncate text-xs font-bold text-on-surface">proxync-workspace</div>
        <div className="font-mono text-[10px] text-on-surface-variant">TypeScript / Node</div>
      </div>

      {/* Active Tunnel Status */}
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-secondary animate-pulse-dot" />
        <span className="truncate font-mono text-xs font-bold text-secondary">{TUNNEL_URL}</span>
      </div>

      {/* Nav Rail */}
      <nav className="mt-3 flex flex-col gap-0.5" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onSelect(item.view)}
              aria-pressed={isActive}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left w-full cursor-pointer",
                isActive
                  ? "bg-surface-container-highest text-on-surface font-bold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
              )}
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-outline group-hover:text-on-surface")} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live Processes */}
      <div className="mt-4 border-t border-outline-variant/20 pt-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-outline">Live processes</span>
          <RefreshCw className="h-3 w-3 text-outline cursor-pointer hover:text-on-surface" />
        </div>
        <div className="flex flex-col gap-1">
          {PROCESSES.map((proc, i) => (
            <div
              key={proc.port}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                i === 0 ? "bg-surface-container text-on-surface font-semibold" : "text-on-surface-variant",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-on-surface">{proc.name}</div>
                <div className="font-mono text-[9px] text-outline">:{proc.port}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
