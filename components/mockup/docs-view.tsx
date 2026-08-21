"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, ExternalLink, FileCode, Layers, ShieldCheck, Terminal, Zap } from "lucide-react";

export function DocsView() {
  return (
    <div className="space-y-3.5 p-4 fade-in select-none font-mono text-xs h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <div>
          <h1 className="text-base font-bold text-on-surface">Offline Documentation Suite</h1>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Embedded Proxync v0.2.1 architecture specs, Native SSH tunnels, Workbench &amp; Pro Debugger guides
          </p>
        </div>
        <Link
          href="/docs"
          className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-all flex items-center gap-1"
        >
          <span>Full Web Docs</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
            <h3 className="font-bold text-xs text-on-surface">Dynamic Netstat Recon</h3>
          </div>
          <p className="text-[10.5px] text-on-surface-variant leading-relaxed">
            Full IPv4/IPv6 port auto-discovery via bulk WMI process queries. Automatically classifies Vite, Next.js, FastAPI, NestJS, and Go.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs">2</span>
            <h3 className="font-bold text-xs text-on-surface">Native SSH Tunnels</h3>
          </div>
          <p className="text-[10.5px] text-on-surface-variant leading-relaxed">
            Direct origin port 2222 routing, Ed25519 JIT TLS certificate signing, and Zero-Trace TempDirGuard security.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">3</span>
            <h3 className="font-bold text-xs text-on-surface">Request Workbench</h3>
          </div>
          <p className="text-[10.5px] text-on-surface-variant leading-relaxed">
            Multi-tab HTTP draft staging, live side-by-side response diffing, and 1-click IDE jumping to controller lines in VS Code / Cursor.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">4</span>
            <h3 className="font-bold text-xs text-on-surface">Pro Debugger &amp; Logs</h3>
          </div>
          <p className="text-[10.5px] text-on-surface-variant leading-relaxed">
            Independent dual-stream disk logs (`app.log` &amp; `traffic.log`), automatic credential redaction, and 1-click support bundle export.
          </p>
        </div>
      </div>
    </div>
  );
}
