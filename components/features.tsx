"use client";

import { ShieldCheck, Terminal, Activity, Lock, CheckCircle2, Zap } from "lucide-react";

export function Features() {
  return (
    <section id="features" className="relative w-full max-w-5xl mx-auto px-4 py-20 sm:py-24 scroll-mt-20 select-none overflow-hidden">
      {/* Ambient Atmospheric Background Gradient Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/4 w-[420px] h-[420px] rounded-full bg-cyan-500/[0.06] blur-[130px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-24 w-[420px] h-[420px] rounded-full bg-purple-500/[0.05] blur-[140px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 w-[420px] h-[420px] rounded-full bg-emerald-500/[0.05] blur-[130px] -z-10"
      />

      {/* Section Header */}
      <div className="flex flex-col items-start mb-12 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1015] border border-[#1F232E] text-[11px] font-mono text-primary mb-3 shadow-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <span className="uppercase tracking-widest text-[10.5px]">Core Capabilities</span>
        </div>
        <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-2xl">
          Engineered to eradicate webhook and API friction.
        </h2>
        <p className="mt-3 text-[#8E93A4] text-base max-w-xl leading-relaxed">
          Everything you need to expose, inspect, and debug local services — in one unified, lightweight desktop workspace.
        </p>
      </div>

      {/* 2x2 Refined Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* ── CARD 1: Resilient Standby Tunnels ── */}
        <div
          id="standby"
          className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-8 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.12)] overflow-hidden"
        >
          {/* Card Corner Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-52 h-52 rounded-full bg-primary/[0.09] blur-3xl group-hover:bg-primary/[0.18] transition-all duration-500"
          />

          <div>
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 shadow-inner">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-primary font-medium mb-1.5">
              Zero-RTT Failover
            </div>
            <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white mb-2.5 group-hover:text-primary transition-colors">
              Resilient Standby Tunnels
            </h3>
            <p className="text-[#8E93A4] text-[13.5px] sm:text-sm leading-relaxed mb-6">
              When your dev server restarts during code editing (HMR) or crashes, Proxync holds incoming webhooks in standby and delivers them the instant localhost rebinds. Zero broken links, zero 502 errors.
            </p>
          </div>

          {/* Minimal Status Capsule Preview */}
          <div className="rounded-2xl bg-[#06070A]/80 border border-white/[0.06] p-4 space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-xs truncate">px-stage.proxync.dev</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10.5px] font-semibold shrink-0 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Holding Standby
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-[#54596B]">
                <span>Dev Server Hot-Reload</span>
                <span className="text-primary font-medium">Reconnected in 4ms</span>
              </div>
              <div className="w-full h-1.5 bg-[#14171E] rounded-full overflow-hidden flex">
                <div className="w-1/4 bg-primary/80" />
                <div className="w-1/2 bg-amber-400/80 animate-pulse" />
                <div className="w-1/4 bg-primary/80" />
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.04] flex items-center gap-2 text-[10.5px] text-[#8E93A4]">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>100% of buffered webhooks delivered in sequence</span>
            </div>
          </div>
        </div>

        {/* ── CARD 2: Traffic Inspector & Bot Shield ── */}
        <div className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-8 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.12)] overflow-hidden">
          {/* Card Corner Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-52 h-52 rounded-full bg-purple-500/[0.08] blur-3xl group-hover:bg-purple-500/[0.18] transition-all duration-500"
          />

          <div>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5 shadow-inner">
              <Activity className="h-5 w-5" />
            </div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-purple-400 font-medium mb-1.5">
              Real-Time Inspector
            </div>
            <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white mb-2.5 group-hover:text-purple-300 transition-colors">
              Traffic Inspector &amp; Bot Shield
            </h3>
            <p className="text-[#8E93A4] text-[13.5px] sm:text-sm leading-relaxed mb-6">
              Capture live HTTP and WebSocket traffic flowing into your local services. Built-in heuristic filtering automatically strips out automated bot scans (/.env, /.git) so your feed stays clean.
            </p>
          </div>

          {/* Minimal Stream Preview */}
          <div className="rounded-2xl bg-[#06070A]/80 border border-white/[0.06] p-4 space-y-2.5 font-mono text-[11px]">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] text-[10.5px]">
              <span className="text-[#54596B]">Active Stream: 0 Drops</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-medium">
                Bot Shield Active
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <span className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold text-[9px]">POST</span>
                  <span className="text-white text-xs truncate">/api/webhooks/stripe</span>
                </span>
                <span className="text-primary text-[10.5px] font-medium shrink-0 ml-2">200 OK · 18ms</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01]">
                <span className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold text-[9px]">GET</span>
                  <span className="text-[#8E93A4] text-xs truncate">/api/v1/user/profile</span>
                </span>
                <span className="text-primary text-[10.5px] font-medium shrink-0 ml-2">200 OK · 6ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: 1-Click IDE Jump ── */}
        <div className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-8 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(245,158,11,0.12)] overflow-hidden">
          {/* Card Corner Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-52 h-52 rounded-full bg-amber-500/[0.08] blur-3xl group-hover:bg-amber-500/[0.18] transition-all duration-500"
          />

          <div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 shadow-inner">
              <Terminal className="h-5 w-5" />
            </div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-amber-400 font-medium mb-1.5">
              Instant Navigation
            </div>
            <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white mb-2.5 group-hover:text-amber-300 transition-colors">
              1-Click IDE Deep Linking
            </h3>
            <p className="text-[#8E93A4] text-[13.5px] sm:text-sm leading-relaxed mb-6">
              Bridge runtime traffic with your editor. Click directly on any captured request or stack trace to open the exact route handler file and line number inside Cursor or VS Code.
            </p>
          </div>

          {/* Minimal Editor Capsule Preview */}
          <div className="rounded-2xl bg-[#06070A]/80 border border-white/[0.06] p-4 space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Zap className="h-3.5 w-3.5" />
                <span>cursor://file/...</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-[#8E93A4]">
                Line :42
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] text-[11px] text-[#8E93A4] truncate">
              <span className="text-[#54596B]">Target: </span>
              <span className="text-white">src/routes/webhooks/stripe.ts:42</span>
            </div>

            <div className="flex items-center justify-between text-[10.5px] text-[#54596B] pt-1">
              <span>Sub-millisecond route resolution</span>
              <span className="text-amber-400 font-medium">Jump to Code →</span>
            </div>
          </div>
        </div>

        {/* ── CARD 4: Local-First Storage & SSRF Shield ── */}
        <div className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-8 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.12)] overflow-hidden">
          {/* Card Corner Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-52 h-52 rounded-full bg-emerald-500/[0.08] blur-3xl group-hover:bg-emerald-500/[0.18] transition-all duration-500"
          />

          <div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 shadow-inner">
              <Lock className="h-5 w-5" />
            </div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-emerald-400 font-medium mb-1.5">
              100% Private By Design
            </div>
            <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white mb-2.5 group-hover:text-emerald-300 transition-colors">
              Local-First &amp; SSRF Shield
            </h3>
            <p className="text-[#8E93A4] text-[13.5px] sm:text-sm leading-relaxed mb-6">
              Your workspaces, keys, and traffic payloads stay on your computer in local JSON and SQLite storage. Strict loopback whitelisting blocks SSRF attempts against private subnets.
            </p>
          </div>

          {/* Minimal Privacy Capsule Preview */}
          <div className="rounded-2xl bg-[#06070A]/80 border border-white/[0.06] p-4 space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-medium text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Zero Cloud Logs
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px]">
                Local State
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] text-[10.5px] text-[#8E93A4] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#54596B]">Loopback Probe:</span>
                <span className="text-white font-medium">127.0.0.1 Whitelisted</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#54596B]">Private Subnets:</span>
                <span className="text-emerald-400 font-medium">192.168.x Blocked</span>
              </div>
            </div>

            <div className="text-[10px] text-[#54596B]">
              Dynamic DNS relay · Ed25519 certs · Zero-Orphan PGID
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
