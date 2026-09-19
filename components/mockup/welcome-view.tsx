"use client";

import { ExternalLink, Globe, Radio, Share2, Shield, Terminal } from "lucide-react";
import { SignalBars } from "./signal-bars";
import { TUNNEL_URL, ViewId } from "./types";

export function WelcomeView({
  onNavigate,
}: {
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="flex flex-col justify-between h-full p-2.5 sm:p-4 fade-in select-none overflow-y-auto overflow-x-hidden">
      <div className="space-y-2.5 sm:space-y-3.5">
        {/* Hero Card */}
        <section className="relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="font-mono text-[9.5px] sm:text-[11px] font-bold text-primary uppercase tracking-wider truncate">
                  Service: Active · Dynamic Relay DNS
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface">Network Hub</h2>
              <p className="text-on-surface-variant text-[11px] sm:text-xs mt-0.5 max-w-md leading-relaxed">
                Monitoring 1 active tunnel · Dynamic DNS resolution &amp; 50ms handshake polling.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={TUNNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 sm:px-3.5 py-1.5 font-mono text-xs font-bold text-on-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in Browser</span>
              </a>
            </div>
          </div>
        </section>

        {/* Latency Cards */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9.5px] sm:text-[10px] uppercase tracking-wider text-white/60 font-bold truncate">Mesh Relay</span>
              <SignalBars latency={28} />
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-primary">28 ms</div>
            <div className="font-mono text-[9px] sm:text-[9.5px] text-tertiary truncate">relay.proxync.dev</div>
          </div>

          <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9.5px] sm:text-[10px] uppercase tracking-wider text-white/60 font-bold truncate">Cloudflare Quick</span>
              <SignalBars latency={42} />
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-secondary">42 ms</div>
            <div className="font-mono text-[9px] sm:text-[9.5px] text-secondary truncate">Active Edge · CWE-20</div>
          </div>

          <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9.5px] sm:text-[10px] uppercase tracking-wider text-white/60 font-bold truncate">Loopback Edge</span>
              <SignalBars latency={1} />
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-tertiary">&lt;1 ms</div>
            <div className="font-mono text-[9px] sm:text-[9.5px] text-tertiary truncate">127.0.0.1 (Local)</div>
          </div>
        </div>

        {/* Active Tunnels */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center justify-between border-b border-outline-variant/20 pb-2 gap-1.5">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              Active Tunnels
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[9px] sm:text-[9.5px] text-emerald-400 font-bold px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                1 Active
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[9.5px] sm:text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                title="Stop All Active Tunnels"
              >
                Stop All
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Globe className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-on-surface truncate">Vite dev server (:5173)</div>
                <div className="font-mono text-[10.5px] sm:text-[11px] text-secondary truncate">https://px-a1b2c3d4.proxync.dev</div>
                <div className="font-mono text-[8.5px] sm:text-[9px] text-[#54596B] mt-0.5 truncate">Handshake: 4ms · PGID Isolated</div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-outline-variant/20">
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-bold text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Mesh Relay
              </span>
              <a
                href={TUNNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 px-2.5 py-0.5 font-mono text-[10.5px] sm:text-[11px] font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </div>
          </div>
        </div>

        {/* Quick Action Tiles — v0.2.2 Hardened Workflows */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
          <button
            onClick={() => onNavigate("process")}
            className="text-left rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 hover:border-primary/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-primary mb-1">
              <Share2 className="h-3.5 w-3.5" /> Kernel Port Recon
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">Darwin proc_pidpath FFI &amp; ghost daemon noise filtering (ignoring system daemons).</p>
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className="text-left rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 hover:border-primary/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-secondary mb-1">
              <Radio className="h-3.5 w-3.5" /> Custom Domain DoH
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">DNS-over-HTTPS token verification with Google DoH &amp; Cloudflare fallback.</p>
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className="text-left rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 hover:border-primary/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-tertiary mb-1">
              <Shield className="h-3.5 w-3.5" /> SSRF Intranet Shield
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">Strict TCP probe whitelist blocks 192.168.x &amp; 10.x intranet scanning attacks.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
