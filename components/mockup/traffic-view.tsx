"use client";

import { useState } from "react";
import { CheckCircle2, Search, Send, Trash2, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_BADGE, METHOD_STYLE, ROWS, STATUS_STYLE } from "./types";

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  301: "Moved",
  404: "Not Found",
  500: "Internal Error",
};

export function TrafficView() {
  const [selectedId, setSelectedId] = useState<string>("req-1");
  const selectedRow = ROWS.find((r) => r.id === selectedId) || ROWS[0];

  return (
    <div className="flex h-full w-full p-2 sm:p-3.5 gap-2 sm:gap-3 fade-in select-none items-stretch overflow-hidden font-mono">
      {/* Left Table Panel */}
      <div className="min-w-0 flex-1 flex flex-col justify-between rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-4 space-y-2 sm:space-y-3 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-outline-variant/30 pb-2 gap-1.5 shrink-0">
          <div className="min-w-0">
            <h1 className="text-xs sm:text-[15px] font-bold text-white truncate">Traffic Logs &amp; Inspector</h1>
            <p className="text-[10px] sm:text-xs text-white/70 font-mono mt-0.5 truncate">
              Capturing live network packages (:5173)
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[10px] sm:text-xs text-white/80 px-2 py-0.5 bg-surface-container-low rounded-lg border border-outline-variant/40 font-bold whitespace-nowrap">
              5 / 5 Logs
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 py-0.5 font-mono text-[10px] sm:text-xs text-white/80 hover:text-rose-400 hover:border-rose-400/40 transition-all cursor-pointer whitespace-nowrap"
              title="Clear traffic logs"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-surface-container-lowest rounded-lg border border-outline-variant/30 shrink-0">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <input
              type="text"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-7 sm:pl-8 pr-2 py-1 text-[10.5px] sm:text-xs text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Filter path, port..."
              defaultValue="/api/v1"
            />
          </div>
          <select className="text-[10px] sm:text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-1.5 sm:px-2 py-1 text-white font-mono cursor-pointer shrink-0 max-w-[85px] sm:max-w-none">
            <option>Methods</option>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <select className="hidden sm:block text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1 text-white font-mono cursor-pointer shrink-0">
            <option>All Servers</option>
            <option>Vite (:5173)</option>
            <option>FastAPI (:8000)</option>
            <option>NestJS (:4000)</option>
          </select>
          <select className="hidden md:block text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1 text-white font-mono cursor-pointer shrink-0">
            <option>All Statuses</option>
            <option>2xx Success</option>
            <option>4xx Error</option>
          </select>
        </div>

        {/* Table Container - Fills Height */}
        <div className="flex-1 min-h-0 border border-outline-variant/30 rounded-xl bg-surface-container-lowest overflow-hidden flex flex-col justify-between">
          <div className="flex items-center border-b border-outline-variant bg-surface-container-low font-mono text-[9.5px] sm:text-[11px] font-bold text-white/70 py-1.5 sm:py-2 px-2 sm:px-3 uppercase tracking-wider shrink-0">
            <div className="w-11 sm:w-16 shrink-0">Method</div>
            <div className="w-12 sm:w-20 shrink-0">Status</div>
            <div className="flex-1 min-w-0">Request Path</div>
            <div className="hidden sm:block w-24 shrink-0 text-right">Server</div>
            <div className="w-10 sm:w-14 shrink-0 text-right">Time</div>
            <div className="hidden md:block w-28 shrink-0 text-right">Target</div>
          </div>

          <div className="divide-y divide-outline-variant/20 flex-1 overflow-y-auto">
            {ROWS.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className={cn(
                  "flex items-center px-2 sm:px-3 py-1.5 sm:py-2 font-mono text-[10.5px] sm:text-xs transition-colors cursor-pointer",
                  selectedId === row.id
                    ? "bg-primary/10 border-l-2 sm:border-l-4 border-l-primary font-bold"
                    : "hover:bg-surface-container-low/60",
                )}
              >
                <div className={cn("w-11 sm:w-16 shrink-0 font-bold text-[10px] sm:text-xs", METHOD_STYLE[row.method])}>
                  {row.method}
                </div>
                <div className={cn("w-12 sm:w-20 shrink-0 flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs", STATUS_STYLE[row.status])}>
                  <span className="hidden sm:inline">{row.status < 400 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}</span>
                  <span>{row.status}</span>
                </div>
                <div className="flex-1 min-w-0 truncate text-white text-[10.5px] sm:text-xs pr-1">{row.path}</div>
                <div className="hidden sm:block w-24 shrink-0 text-right text-primary text-[11px] font-bold truncate">
                  {row.serverName}
                </div>
                <div className="w-10 sm:w-14 shrink-0 text-right text-white/70 text-[9.5px] sm:text-[11px]">{row.latency}</div>
                <div className="hidden md:block w-28 shrink-0 text-right font-bold text-tertiary text-[10px] truncate">
                  {row.targetBadge}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-outline-variant/20 bg-surface-container-low px-2 sm:px-3 py-1 sm:py-1.5 font-mono text-[9px] sm:text-[10px] text-white/70 flex items-center justify-between gap-2 shrink-0">
            <span className="truncate">5 requests intercepted</span>
            <span className="hidden md:inline text-secondary font-bold shrink-0">● Multi-Tunnel Segregation</span>
          </div>
        </div>
      </div>

      {/* Right Inspector Drawer (Desktop only) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border border-outline-variant/30 p-4 rounded-xl bg-surface-container-low space-y-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
            <span className={cn("rounded px-2 py-0.5 font-mono text-xs font-bold", METHOD_BADGE[selectedRow.method])}>
              {selectedRow.method}
            </span>
            <span className="truncate font-mono text-xs font-bold text-white">{selectedRow.path}</span>
          </div>

          <div className="flex items-center justify-between font-mono text-xs">
            <span className={cn(STATUS_STYLE[selectedRow.status])}>
              {selectedRow.status} {STATUS_TEXT[selectedRow.status] ?? (selectedRow.status < 400 ? "OK" : "Error")}
            </span>
            <span className="text-white/80 font-bold">{selectedRow.latency}</span>
            <span className="text-tertiary text-[10px] font-bold">{selectedRow.targetBadge}</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs border-t border-outline-variant/30 pt-2.5">
            <div className="text-white/60 uppercase text-[10px] font-bold tracking-wider">Headers</div>
            <div className="bg-surface-container p-2.5 rounded-lg space-y-1 text-[11px]">
              <div><span className="text-white/70">content-type:</span> <span className="text-white">application/json</span></div>
              <div><span className="text-white/70">authorization:</span> <span className="text-white">Bearer ••••••••</span></div>
              <div><span className="text-white/70">user-agent:</span> <span className="text-white">Proxync-Desktop/0.2.3</span></div>
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-xs border-t border-outline-variant/30 pt-2.5">
            <div className="text-white/60 uppercase text-[10px] font-bold tracking-wider">Body Preview</div>
            <pre className="bg-surface-container p-2.5 rounded-lg text-[11px] text-white leading-relaxed overflow-x-auto border border-outline-variant/20">
              {`{\n  "id": 42,\n  "email": "ada@acme.dev"\n}`}
            </pre>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-mono text-xs font-bold text-on-primary hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            Replay in Workbench
          </button>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-1.5 font-mono text-[11px] font-bold text-secondary hover:bg-secondary/20 transition-all cursor-pointer"
          >
            <span>⚡ Open in VS Code (:42)</span>
          </button>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-1.5 font-mono text-[11px] font-medium text-white/80 hover:text-white hover:bg-surface-container-high transition-all cursor-pointer"
          >
            <Send className="h-3 w-3" />
            Send to Playground
          </button>
        </div>
      </aside>
    </div>
  );
}
