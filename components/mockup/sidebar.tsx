"use client";

import { HelpCircle, LayoutGrid, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CATEGORIES, PROCESSES, TUNNEL_URL, ViewId } from "./types";

export function Sidebar({
  active,
  onSelect,
}: {
  active: ViewId;
  onSelect: (view: ViewId) => void;
}) {
  return (
    <aside className="flex flex-col w-14 min-w-[56px] max-w-[56px] lg:w-[230px] lg:min-w-[230px] lg:max-w-[230px] shrink-0 border-r border-outline-variant/30 bg-surface-container-low px-1.5 lg:px-3 py-3 select-none justify-between h-full overflow-hidden">
      <div className="space-y-3">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 pb-2.5 pt-0.5 border-b border-outline-variant/20 justify-center lg:justify-start px-0.5 lg:px-1">
          <div className="h-7 w-7 lg:h-8 lg:w-8 shrink-0 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
            PX
          </div>
          <div className="hidden lg:block">
            <span className="block text-xs font-bold text-on-surface leading-tight">Proxync Engine</span>
            <span className="block font-mono text-[9px] text-outline leading-tight">
              v0.2.1-stable
            </span>
          </div>
        </div>

        {/* Active Workspace Selector */}
        <div className="hidden lg:block space-y-1">
          <div className="flex items-center justify-between px-1 text-[9px] font-mono uppercase tracking-wider text-outline font-bold">
            <span>ACTIVE WORKSPACE</span>
            <LayoutGrid className="h-3 w-3 text-outline" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container px-2.5 py-1.5 cursor-pointer hover:border-primary/40 transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-bold text-on-surface truncate">Local Workspace</span>
          </div>
        </div>

        {/* Categorized Nav Rail */}
        <nav className="flex flex-col gap-2.5" aria-label="Primary">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.category} className="flex flex-col gap-0.5">
              <div className="hidden lg:block px-2 py-0.5 text-[8.5px] font-mono font-bold tracking-wider text-outline uppercase">
                {cat.category}
              </div>
              {cat.items.map((item) => {
                const isActive = active === item.view;
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => onSelect(item.view)}
                    aria-pressed={isActive}
                    title={item.label}
                    className={cn(
                      "group relative flex items-center justify-center lg:justify-start gap-2.5 rounded-lg px-0 lg:px-2.5 py-1.5 text-xs font-medium transition-all text-left w-full cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
                    )}
                  >
                    {isActive && (
                      <span className="absolute right-0 top-1 bottom-1 w-0.5 rounded-l-full bg-primary hidden lg:block" />
                    )}
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-outline group-hover:text-on-surface",
                      )}
                    />
                    <span className="hidden lg:inline truncate text-[11.5px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer: Support & Sign In */}
      <div className="hidden lg:flex flex-col gap-2 pt-2.5 border-t border-outline-variant/20 mt-2">
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1 text-xs text-outline hover:text-on-surface transition-colors cursor-pointer"
        >
          <HelpCircle className="h-3.5 w-3.5 text-outline" />
          <span>Support</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary/80 to-secondary/80 px-3 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>
      </div>
    </aside>
  );
}
