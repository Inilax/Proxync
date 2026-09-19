"use client";

import { Radar, Globe, Zap, CheckCircle2, ArrowRight, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

function PointerCursor({
  color = "coral",
  className,
}: {
  color?: "coral" | "cyan" | "purple";
  className?: string;
}) {
  const fillColor =
    color === "coral" ? "#FF623D" : color === "cyan" ? "#38BDF8" : "#A855F7";

  return (
    <svg
      className={cn("w-5 h-5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5.5 3.5L18.5 11.5L12 13.5L9.5 20L5.5 3.5Z"
        fill={fillColor}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative w-full max-w-5xl mx-auto px-4 py-20 sm:py-24 scroll-mt-20 select-none overflow-hidden"
    >
      {/* Ambient Atmospheric Glow Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/3 w-96 h-96 rounded-full bg-cyan-500/[0.05] blur-[130px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 right-1/4 w-96 h-96 rounded-full bg-purple-500/[0.05] blur-[130px] -z-10"
      />

      {/* Section Header */}
      <div className="flex flex-col items-start mb-12 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1015] border border-[#1F232E] text-[11px] font-mono text-primary mb-3 shadow-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <span className="uppercase tracking-widest text-[10.5px]">Zero Friction Workflow</span>
        </div>
        <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-xl">
          Up and running in under 60 seconds.
        </h2>
        <p className="mt-3 text-[#8E93A4] text-base max-w-lg leading-relaxed">
          No mandatory cloud account. No YAML configuration wizards. No credit card required.
        </p>
      </div>

      {/* 3 Step Visual Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── STEP 1: Auto-Detect Local Server ── */}
        <div className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-7 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.12)] overflow-hidden">
          {/* Top Step Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold">
                  01
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-medium">
                  Smart Recon
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8E93A4] bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">
                Zero Config
              </span>
            </div>

            <h3 className="font-sans text-lg sm:text-xl font-bold text-white tracking-tight mb-2 group-hover:text-primary transition-colors">
              Auto-Detect Local Server
            </h3>
          </div>

          {/* Visual Canvas 1: Terminal & Scanned Port Node */}
          <div className="relative my-5 h-44 w-full rounded-2xl bg-[#06070A]/90 border border-white/[0.06] p-3.5 overflow-hidden flex flex-col justify-between shadow-inner">
            {/* Ambient canvas glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-cyan-500/[0.08] blur-2xl pointer-events-none" />

            {/* Simulated Server Card */}
            <div className="relative z-10 p-2.5 rounded-xl bg-[#0E1015] border border-white/[0.08] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-sans text-[12px] font-semibold text-white truncate">Vite Dev Server</span>
                  <span className="font-mono text-[10px] text-[#54596B]">localhost:5173</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9.5px] font-mono text-[#8E93A4] shrink-0 ml-2">
                PID 4829
              </span>
            </div>

            {/* Connecting Scan Beam */}
            <div className="flex items-center justify-center my-1 relative">
              <div className="h-4 w-px border-l border-dashed border-cyan-500/40" />
              <div className="absolute px-2 py-0.5 rounded-full bg-[#12141D] border border-cyan-500/30 text-[9px] font-mono text-cyan-400 flex items-center gap-1 shadow-sm">
                <Radar className="h-2.5 w-2.5 animate-spin text-cyan-400" />
                <span>Scanning Sockets</span>
              </div>
            </div>

            {/* One-Click Share Action Card with Pointer */}
            <div className="relative z-10 p-2 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/20 flex items-center justify-between">
              <span className="font-mono text-[10.5px] text-cyan-300 font-medium">1-Click Share Ready</span>
              <div className="relative">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black font-semibold text-[10.5px] tracking-tight shadow-sm inline-flex items-center gap-1">
                  <span>Share</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
                {/* Pointer Cursor */}
                <PointerCursor
                  color="coral"
                  className="absolute -bottom-3 -right-2 transform translate-x-1 translate-y-1"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[#8E93A4] text-[13px] sm:text-sm leading-relaxed">
            Proxync inspects listening ports on your machine in milliseconds, automatically discovering Vite, Next.js, or FastAPI servers without manual port flags.
          </p>
        </div>

        {/* ── STEP 2: Launch Resilient Tunnel ── */}
        <div className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-7 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(245,158,11,0.12)] overflow-hidden">
          {/* Top Step Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
                  02
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-medium">
                  Instant Link
                </span>
              </div>
              <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                0 Drops
              </span>
            </div>

            <h3 className="font-sans text-lg sm:text-xl font-bold text-white tracking-tight mb-2 group-hover:text-amber-300 transition-colors">
              Launch Resilient Tunnel
            </h3>
          </div>

          {/* Visual Canvas 2: Local Server -> Relay Tunnel Connection */}
          <div className="relative my-5 h-44 w-full rounded-2xl bg-[#06070A]/90 border border-white/[0.06] p-3.5 overflow-hidden flex flex-col justify-between shadow-inner">
            {/* Ambient canvas glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-amber-500/[0.08] blur-2xl pointer-events-none" />

            {/* Origin Node */}
            <div className="relative z-10 p-2.5 rounded-xl bg-[#0E1015] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-sans text-[11.5px] font-semibold text-white truncate">Local Port</span>
                  <span className="font-mono text-[10px] text-[#54596B]">:5173 (Origin)</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9.5px] font-mono text-emerald-400 font-medium">
                Live
              </span>
            </div>

            {/* Curved Connector Beam with Standby Badge */}
            <div className="flex items-center justify-center my-1 relative">
              <div className="h-4 w-px border-l border-dashed border-amber-500/40" />
              <div className="absolute px-2 py-0.5 rounded-full bg-[#12141D] border border-amber-500/30 text-[9px] font-mono text-amber-400 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Standby Socket Guard</span>
              </div>
            </div>

            {/* Public HTTPS Endpoint Node with Pointer */}
            <div className="relative z-10 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/[0.08] to-cyan-500/[0.08] border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-[11px] text-white truncate">px-a1b2c3.proxync.dev</span>
              </div>
              <div className="relative shrink-0 ml-2">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[9.5px] font-mono text-[#8E93A4] border border-white/[0.08]">
                  HTTPS
                </span>
                {/* Pointer Cursor */}
                <PointerCursor
                  color="cyan"
                  className="absolute -bottom-3 -right-2 transform translate-x-1 translate-y-1"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[#8E93A4] text-[13px] sm:text-sm leading-relaxed">
            Generate a fast public HTTPS link with hardware-signed certs. When your server restarts on save, Standby Mode holds the URL so webhooks never fail.
          </p>
        </div>

        {/* ── STEP 3: Inspect & 1-Click Jump to Code ── */}
        <div className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-7 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.12)] overflow-hidden">
          {/* Top Step Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-xs font-bold">
                  03
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-medium">
                  Deep Linking
                </span>
              </div>
              <span className="font-mono text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                VS Code / Cursor
              </span>
            </div>

            <h3 className="font-sans text-lg sm:text-xl font-bold text-white tracking-tight mb-2 group-hover:text-purple-300 transition-colors">
              Inspect &amp; Jump to Code
            </h3>
          </div>

          {/* Visual Canvas 3: Webhook Event -> 1-Click Code Jump */}
          <div className="relative my-5 h-44 w-full rounded-2xl bg-[#06070A]/90 border border-white/[0.06] p-3.5 overflow-hidden flex flex-col justify-between shadow-inner">
            {/* Ambient canvas glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-500/[0.08] blur-2xl pointer-events-none" />

            {/* Webhook Log Item */}
            <div className="relative z-10 p-2.5 rounded-xl bg-[#0E1015] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold text-[9px] shrink-0 font-mono">
                  POST
                </span>
                <span className="font-mono text-[11px] text-white truncate">/api/webhooks/stripe</span>
              </div>
              <span className="text-primary font-mono text-[10px] font-medium shrink-0 ml-1">
                200 OK
              </span>
            </div>

            {/* Connecting Jump Link */}
            <div className="flex items-center justify-center my-1 relative">
              <div className="h-4 w-px border-l border-dashed border-purple-500/40" />
              <div className="absolute px-2 py-0.5 rounded-full bg-[#12141D] border border-purple-500/30 text-[9px] font-mono text-purple-300 flex items-center gap-1 shadow-sm">
                <Terminal className="h-2.5 w-2.5 text-purple-400" />
                <span>1-Click Controller Jump</span>
              </div>
            </div>

            {/* Code Target File with Pointer */}
            <div className="relative z-10 p-2 rounded-xl bg-purple-500/[0.08] border border-purple-500/20 flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-[10.5px] text-white truncate">src/routes/webhooks.ts</span>
                <span className="font-mono text-[9px] text-[#54596B]">Cursor Line :42</span>
              </div>
              <div className="relative shrink-0 ml-2">
                <span className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[10.5px] tracking-tight shadow-sm inline-flex items-center gap-1 transition-colors">
                  <span>Open</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
                {/* Pointer Cursor */}
                <PointerCursor
                  color="purple"
                  className="absolute -bottom-3 -right-2 transform translate-x-1 translate-y-1"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[#8E93A4] text-[13px] sm:text-sm leading-relaxed">
            Watch live request payloads stream in. Spot an error or unexpected value? Click once to jump directly to that controller file and line in your code editor.
          </p>
        </div>
      </div>

      {/* Honest CLI Roadmap Footnote (No Fake CLI Command) */}
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0E1015] border border-[#1F232E] text-xs font-mono text-[#8E93A4] shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>Runs 100% via desktop GUI — zero terminal command flags required</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-[#1F232E] text-[11px] font-mono text-[#54596B]">
          <span>Terminal CLI Companion</span>
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-[10px]">
            Coming in v0.3.0
          </span>
        </div>
      </div>
    </section>
  );
}
