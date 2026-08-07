"use client";

import { ExternalLink, Globe, RefreshCw, Wifi } from "lucide-react";
import { PROCESSES, TUNNEL_URL } from "./types";

export function ProcessView() {
  return (
    <div className="p-5 space-y-4 fade-in select-none">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <div>
          <h1 className="text-lg font-bold text-on-surface">Tunnels &amp; Process Recon</h1>
          <p className="text-xs text-on-surface-variant font-mono mt-0.5">
            Netstat &amp; WMI process scanner · Ephemeral local TCP proxy forwarding
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-1.5 font-mono text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-primary" />
          Rescan Ports
        </button>
      </div>

      {/* Discovered Process Cards */}
      <div className="divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
        {PROCESSES.map((proc, i) => (
          <div key={proc.port} className="flex flex-wrap items-center justify-between gap-3 p-3 hover:bg-surface-container-low/40 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center min-w-[62px] h-9 px-3 rounded-xl bg-surface-container-high border border-primary/20 font-mono text-xs font-bold text-primary shrink-0">
                :{proc.port}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-on-surface">{proc.name}</div>
                <div className="font-mono text-[11px] text-on-surface-variant">
                  PID {proc.pid} · {proc.framework}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
                    Open in Browser
                  </a>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container px-2.5 py-1 font-mono text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
                  >
                    <Wifi className="h-3 w-3 text-tertiary" />
                    LAN Share
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 font-mono text-xs font-bold text-on-primary hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer"
                  >
                    <Globe className="h-3 w-3" />
                    Public Share
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Process Details & Connection Sharing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Left Column: Diagnostics */}
        <div className="space-y-3">
          <div className="p-3.5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-2.5">
            <h3 className="text-[11px] font-bold text-on-surface uppercase tracking-wider font-mono">Process Diagnostics</h3>
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div><span className="text-outline block text-[10px]">Status</span><span className="text-secondary font-bold">Running</span></div>
              <div><span className="text-outline block text-[10px]">Uptime</span><span className="text-on-surface font-bold">00:14:32</span></div>
              <div><span className="text-outline block text-[10px]">PID</span><span className="text-on-surface font-bold">14292</span></div>
              <div><span className="text-outline block text-[10px]">Port</span><span className="text-primary font-bold">5173</span></div>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-2.5">
            <h3 className="text-[11px] font-bold text-on-surface uppercase tracking-wider font-mono">Workspace Integration</h3>
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div><span className="text-outline block text-[10px]">Guardrail auth</span><span className="text-on-surface font-bold">guest</span></div>
              <div><span className="text-outline block text-[10px]">Swagger mode</span><span className="text-tertiary font-bold">auto-updating</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Connection & Expositions */}
        <div className="p-3.5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-2.5 font-mono text-xs">
          <h3 className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Connection &amp; Expositions</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
              <div>
                <span className="text-[9px] text-outline font-bold uppercase block">Local Endpoint</span>
                <span className="text-xs font-bold text-primary">http://localhost:5173</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-outline hover:text-primary cursor-pointer" />
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
              <div>
                <span className="text-[9px] text-outline font-bold uppercase block">LAN Endpoint</span>
                <span className="text-xs font-bold text-tertiary">http://192.168.1.42:5173</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-outline hover:text-tertiary cursor-pointer" />
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
              <div>
                <span className="text-[9px] text-secondary font-bold uppercase block">Public Exposure URL</span>
                <a href={TUNNEL_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-secondary hover:underline truncate block max-w-[180px]">{TUNNEL_URL}</a>
              </div>
              <a href={TUNNEL_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 text-secondary hover:text-secondary/80 cursor-pointer" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
