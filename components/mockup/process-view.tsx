"use client";

import { ExternalLink, Globe, RefreshCw, Wifi } from "lucide-react";
import { PROCESSES, TUNNEL_URL } from "./types";

export function ProcessView() {
  return (
    <div className="p-2.5 sm:p-4 space-y-2.5 sm:space-y-3.5 fade-in select-none h-full overflow-y-auto overflow-x-hidden font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/30 pb-2.5 sm:pb-3 gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="text-base sm:text-lg font-bold text-on-surface">Tunnels &amp; Process Recon</h1>
            <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[9px] sm:text-[10px] font-bold shrink-0">
              Kernel FFI
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-on-surface-variant font-mono mt-0.5 leading-relaxed">
            Dynamic Netstat &amp; proc_pidpath FFI · Zero-Orphan PGID
          </p>
        </div>
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-1.5 font-mono text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5 text-primary" />
          <span>Rescan Ports</span>
        </button>
      </div>

      {/* Discovered Process Cards */}
      <div className="divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
        {PROCESSES.map((proc, i) => (
          <div key={proc.port} className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 hover:bg-surface-container-low/40 transition-colors">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex items-center justify-center min-w-[54px] sm:min-w-[62px] h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-surface-container-high border border-primary/20 font-mono text-xs font-bold text-primary shrink-0">
                :{proc.port}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-on-surface truncate">{proc.name}</div>
                <div className="font-mono text-[10px] sm:text-[11px] text-on-surface-variant truncate">
                  PID {proc.pid} · {proc.framework}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-outline-variant/15">
              {i === 0 ? (
                <>
                  <span className="hidden font-mono text-xs font-bold text-secondary sm:inline truncate max-w-[200px]">
                    {TUNNEL_URL}
                  </span>
                  <a
                    href={TUNNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container px-2.5 py-1 font-mono text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all"
                  >
                    <ExternalLink className="h-3 w-3 text-secondary" />
                    <span>Open in Browser</span>
                  </a>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container px-2.5 py-1 font-mono text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer text-center"
                  >
                    <Wifi className="h-3 w-3 text-tertiary" />
                    <span>LAN</span>
                  </button>
                  <button
                    type="button"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1 font-mono text-xs font-bold text-on-primary hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer text-center"
                  >
                    <Globe className="h-3 w-3" />
                    <span>Public</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Process Details & Connection Sharing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Left Column: Diagnostics */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="p-2.5 sm:p-3.5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-2 sm:space-y-2.5">
            <h3 className="text-[10.5px] sm:text-[11px] font-bold text-on-surface uppercase tracking-wider font-mono">Process Diagnostics</h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div><span className="text-outline block text-[9.5px] sm:text-[10px]">Status</span><span className="text-secondary font-bold">Running</span></div>
              <div><span className="text-outline block text-[9.5px] sm:text-[10px]">Uptime</span><span className="text-on-surface font-bold">00:14:32</span></div>
              <div><span className="text-outline block text-[9.5px] sm:text-[10px]">PID</span><span className="text-on-surface font-bold">14292</span></div>
              <div><span className="text-outline block text-[9.5px] sm:text-[10px]">Port</span><span className="text-primary font-bold">5173</span></div>
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-2 sm:space-y-2.5">
            <h3 className="text-[10.5px] sm:text-[11px] font-bold text-on-surface uppercase tracking-wider font-mono">Workspace Integration</h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div><span className="text-outline block text-[9.5px] sm:text-[10px]">Guardrail auth</span><span className="text-on-surface font-bold">guest</span></div>
              <div><span className="text-outline block text-[9.5px] sm:text-[10px]">Swagger mode</span><span className="text-tertiary font-bold">auto-updating</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Connection & Expositions */}
        <div className="p-2.5 sm:p-3.5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-2 sm:space-y-2.5 font-mono text-xs">
          <h3 className="text-[10.5px] sm:text-[11px] font-bold text-on-surface uppercase tracking-wider">Connection &amp; Expositions</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg gap-2">
              <div className="min-w-0">
                <span className="text-[8.5px] sm:text-[9px] text-outline font-bold uppercase block">Local Endpoint</span>
                <span className="text-xs font-bold text-primary truncate block">http://localhost:5173</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-outline hover:text-primary cursor-pointer shrink-0" />
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg gap-2">
              <div className="min-w-0">
                <span className="text-[8.5px] sm:text-[9px] text-outline font-bold uppercase block">LAN Endpoint</span>
                <span className="text-xs font-bold text-tertiary truncate block">http://192.168.1.42:5173</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-outline hover:text-tertiary cursor-pointer shrink-0" />
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[8.5px] sm:text-[9px] text-secondary font-bold uppercase block">Public Exposure URL</span>
                <a href={TUNNEL_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-secondary hover:underline truncate block">{TUNNEL_URL}</a>
              </div>
              <a href={TUNNEL_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <ExternalLink className="h-3.5 w-3.5 text-secondary hover:text-secondary/80 cursor-pointer" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
