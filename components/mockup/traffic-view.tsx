"use client";

import { useState } from "react";
import { CheckCircle2, Search, Send, Trash2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_BADGE, METHOD_STYLE, ROWS, STATUS_STYLE } from "./types";

export function TrafficView() {
  const [selectedId, setSelectedId] = useState<string>("req-1");
  const selectedRow = ROWS.find((r) => r.id === selectedId) || ROWS[0];

  return (
    <div className="flex h-[490px] w-full p-4 gap-3 fade-in select-none items-stretch">
      {/* Left Table Panel */}
      <div className="min-w-0 flex-1 flex flex-col justify-between rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div>
            <h1 className="text-[15px] font-bold text-on-surface">Traffic Logs &amp; Inspector</h1>
            <p className="text-xs text-on-surface-variant font-mono mt-0.5">
              Capturing live network packages on port :5173
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-on-surface-variant px-2.5 py-1 bg-surface-container-low rounded-lg border border-outline-variant/40 font-bold">
              5 / 5 Logs
            </span>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2.5 py-1 font-mono text-xs text-on-surface-variant hover:text-error hover:border-error/40 transition-all cursor-pointer"
              title="Clear traffic logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
          <div className="flex-1 min-w-[140px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline h-3.5 w-3.5" />
            <input
              type="text"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-8 pr-2 py-1 text-xs text-on-surface placeholder:text-outline focus:outline-none"
              placeholder="Filter by path, port or status..."
              defaultValue="/api/v1"
            />
          </div>
          <select className="text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1 text-on-surface font-mono cursor-pointer">
            <option>All Servers</option>
            <option>Vite (:5173)</option>
            <option>FastAPI (:8000)</option>
            <option>NestJS (:4000)</option>
          </select>
          <select className="text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1 text-on-surface font-mono cursor-pointer">
            <option>All Methods</option>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <select className="text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1 text-on-surface font-mono cursor-pointer">
            <option>All Statuses</option>
            <option>2xx Success</option>
            <option>4xx Client Error</option>
          </select>
        </div>

        {/* Table Container - Fills Height */}
        <div className="flex-1 min-h-0 border border-outline-variant/30 rounded-xl bg-surface-container-lowest overflow-hidden flex flex-col justify-between">
          <div className="flex items-center border-b border-outline-variant bg-surface-container-low font-mono text-[11px] font-bold text-on-surface-variant py-2 px-3 uppercase tracking-wider">
            <div className="w-16 shrink-0">Method</div>
            <div className="w-20 shrink-0">Status</div>
            <div className="flex-1 min-w-0">Request Path</div>
            <div className="w-24 shrink-0 text-right">Server</div>
            <div className="w-14 shrink-0 text-right">Time</div>
            <div className="w-28 shrink-0 text-right">Target</div>
          </div>

          <div className="divide-y divide-outline-variant/20 flex-1 overflow-y-auto">
            {ROWS.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className={cn(
                  "flex items-center px-3 py-2 font-mono text-xs transition-colors cursor-pointer",
                  selectedId === row.id
                    ? "bg-primary/10 border-l-4 border-l-primary font-bold"
                    : "hover:bg-surface-container-low/60",
                )}
              >
                <div className={cn("w-16 shrink-0 font-bold", METHOD_STYLE[row.method])}>
                  {row.method}
                </div>
                <div className={cn("w-20 shrink-0 flex items-center gap-1", STATUS_STYLE[row.status])}>
                  {row.status < 400 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {row.status}
                </div>
                <div className="flex-1 min-w-0 truncate text-on-surface">{row.path}</div>
                <div className="w-24 shrink-0 text-right text-primary text-[11px] font-bold truncate">
                  {row.serverName}
                </div>
                <div className="w-14 shrink-0 text-right text-on-surface-variant text-[11px]">{row.latency}</div>
                <div className="w-28 shrink-0 text-right font-bold text-tertiary text-[10px] truncate">
                  {row.targetBadge}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-outline-variant/20 bg-surface-container-low px-3 py-1.5 font-mono text-[10px] text-outline flex items-center justify-between gap-2">
            <span className="truncate">5 requests intercepted across ports 5173, 8000, 4000</span>
            <span className="hidden md:inline text-secondary font-bold shrink-0">● Multi-Tunnel Segregation Active</span>
          </div>
        </div>
      </div>

      {/* Right Inspector Drawer */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border border-outline-variant/30 p-4 rounded-xl bg-surface-container-low space-y-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
            <span className={cn("rounded px-2 py-0.5 font-mono text-xs font-bold", METHOD_BADGE[selectedRow.method])}>
              {selectedRow.method}
            </span>
            <span className="truncate font-mono text-xs font-bold text-on-surface">{selectedRow.path}</span>
          </div>

          <div className="flex items-center justify-between font-mono text-xs">
            <span className={cn(STATUS_STYLE[selectedRow.status])}>{selectedRow.status} OK</span>
            <span className="text-on-surface-variant font-bold">{selectedRow.latency}</span>
            <span className="text-tertiary text-[10px] font-bold">{selectedRow.targetBadge}</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs border-t border-outline-variant/30 pt-2.5">
            <div className="text-outline uppercase text-[10px] font-bold tracking-wider">Headers</div>
            <div className="bg-surface-container p-2.5 rounded-lg space-y-1 text-[11px]">
              <div><span className="text-outline">content-type:</span> <span className="text-on-surface">application/json</span></div>
              <div><span className="text-outline">authorization:</span> <span className="text-on-surface">Bearer ••••••••</span></div>
              <div><span className="text-outline">user-agent:</span> <span className="text-on-surface">Proxync-Desktop/0.2.1</span></div>
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-xs border-t border-outline-variant/30 pt-2.5">
            <div className="text-outline uppercase text-[10px] font-bold tracking-wider">Body Preview</div>
            <pre className="bg-surface-container p-2.5 rounded-lg text-[11px] text-on-surface leading-relaxed overflow-x-auto border border-outline-variant/20">
              {`{\n  "id": 42,\n  "email": "ada@acme.dev"\n}`}
            </pre>
          </div>
        </div>

        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-mono text-xs font-bold text-on-primary hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          Send to Playground
        </button>
      </aside>
    </div>
  );
}
