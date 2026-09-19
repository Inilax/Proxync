"use client";

import { HelpCircle, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { NAV_CATEGORIES, ViewId } from "./types";

export function Sidebar({
  active,
  onSelect,
}: {
  active: ViewId;
  onSelect: (view: ViewId) => void;
}) {
  return (
    <aside className="flex flex-col w-11 min-w-[44px] max-w-[44px] sm:w-14 sm:min-w-[56px] sm:max-w-[56px] lg:w-[230px] lg:min-w-[230px] lg:max-w-[230px] shrink-0 border-r border-outline-variant/30 bg-surface-container-low px-1 sm:px-1.5 lg:px-3 py-2 sm:py-3 select-none justify-between h-full overflow-hidden">
      <div className="space-y-3">
        {/* Brand Header */}
        <div className="pb-2.5 pt-0.5 border-b border-outline-variant/20 px-1 flex flex-col items-center lg:items-start">
          <div className="lg:hidden flex items-center justify-center py-0.5">
            <LogoMark className="h-4 w-4 shrink-0" />
          </div>
          <div className="hidden lg:block">
            <span className="block text-xs font-bold text-on-surface leading-tight">Proxync Engine</span>
            <span className="block font-mono text-[9px] text-white/60 leading-tight">
              v0.2.2-stable
            </span>
          </div>
        </div>

        {/* Active Workspace Selector */}
        <div className="hidden lg:block space-y-1">
          <div className="flex items-center justify-between px-1 text-[9px] font-mono uppercase tracking-wider text-white/60 font-bold">
            <span>ACTIVE WORKSPACE</span>
            <LayoutGrid className="h-3 w-3 text-white/60" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container px-2.5 py-1.5 cursor-pointer hover:border-primary/40 transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-bold text-white truncate">Local Workspace</span>
          </div>
        </div>

        {/* Categorized Nav Rail */}
        <nav className="flex flex-col gap-2.5" aria-label="Primary">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.category} className="flex flex-col gap-0.5">
              <div className="hidden lg:block px-2 py-0.5 text-[8.5px] font-mono font-bold tracking-wider text-white/50 uppercase">
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
                        ? "bg-primary/15 text-primary font-bold shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-surface-container-high",
                    )}
                  >
                    {isActive && (
                      <span className="absolute right-0 top-1 bottom-1 w-0.5 rounded-l-full bg-primary hidden lg:block" />
                    )}
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-white/60 group-hover:text-white",
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
          className="flex items-center gap-2 px-2 py-1 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <HelpCircle className="h-3.5 w-3.5 text-white/70" />
          <span>Support</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-container border border-outline-variant/30 px-2.5 py-1.5 font-mono text-[10px] text-white/70 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-white/80 font-medium">100% Local &middot; Zero Cloud</span>
        </div>
      </div>
    </aside>
  );
}
