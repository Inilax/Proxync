"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileCode,
  FolderOpen,
  Globe,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkbenchView() {
  const [activeSubView, setActiveSubView] = useState<"devtools" | "replay">("devtools");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface-container p-3 gap-2.5 fade-in select-none font-mono text-xs overflow-y-auto">
      {/* Toast Overlay */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 rounded-lg border border-primary/40 bg-surface-container-high/95 backdrop-blur-md px-3.5 py-2 text-primary shadow-xl animate-in fade-in slide-in-from-bottom-2 text-xs flex items-center gap-2 font-bold">
          <Zap className="h-3.5 w-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Top Tab Strip ── */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 px-3 py-1 text-on-surface font-semibold shadow-sm">
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-tertiary/20 text-tertiary border border-tertiary/30">
              GET
            </span>
            <span className="text-xs">/api/v1/user/profile</span>
            <button className="text-outline hover:text-on-surface ml-1 text-xs">✕</button>
          </div>

          <button
            onClick={() => showToast("Opened fresh draft tab")}
            className="p-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-primary transition-colors cursor-pointer"
            title="New Tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Filter tab..."
            className="bg-surface-container-lowest border border-outline-variant/25 rounded-lg px-2.5 py-0.5 text-[11px] text-on-surface focus:outline-none placeholder:text-outline w-32 sm:w-40"
          />
        </div>
      </div>

      {/* ── 2. Sub-Header Controls & Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-on-surface">DevTools &amp; Controller Mapping</h2>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-tertiary/20 text-tertiary border border-tertiary/30">
              GET
            </span>
          </div>
          <p className="text-[10px] text-outline">
            TARGET: <span className="text-on-surface font-semibold">/api/v1/user/profile</span>
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-0.5 text-[11px]">
          <button
            onClick={() => setActiveSubView("devtools")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer",
              activeSubView === "devtools"
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-outline hover:text-on-surface"
            )}
          >
            <Code2 className="h-3 w-3" />
            <span>DevTools &amp; Mapping</span>
          </button>
          <button
            onClick={() => setActiveSubView("replay")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer",
              activeSubView === "replay"
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-outline hover:text-on-surface"
            )}
          >
            <Activity className="h-3 w-3" />
            <span>Traffic &amp; Replay</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => showToast("Exported cURL & Fetch code snippets")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:text-primary hover:border-primary/40 transition-all cursor-pointer text-[10px] font-semibold"
          >
            <Code2 className="h-3 w-3" />
            <span>Export Code</span>
          </button>

          <button
            onClick={() => showToast("Saved to Default Collection")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:text-secondary hover:border-secondary/40 transition-all cursor-pointer text-[10px] font-semibold"
          >
            <Bookmark className="h-3 w-3 text-secondary" />
            <span>Save to Collection</span>
          </button>

          <button
            onClick={() => showToast("Opening in browser...")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:text-primary transition-all cursor-pointer text-[10px] font-semibold"
          >
            <Globe className="h-3 w-3" />
            <span>Browser</span>
          </button>
        </div>
      </div>

      {/* ── 3. Green Optimal Execution Banner ── */}
      <div className="flex items-center justify-between rounded-xl border border-secondary/40 bg-secondary/10 px-3.5 py-2 text-secondary">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />
          <div className="min-w-0">
            <div className="font-bold text-xs uppercase tracking-wide">
              HTTP 200 — 200 OK OPTIMAL EXECUTION
            </div>
            <div className="text-[10.5px] text-secondary/90 truncate">
              Controller responded cleanly in 38ms with zero runtime errors.
            </div>
          </div>
        </div>

        <div className="text-[10.5px] font-bold text-secondary shrink-0 hidden sm:block">
          Heap: 42MB | Latency: 38ms
        </div>
      </div>

      {/* ── 4. Middle Section: IDE Integration & Memory Heap Mini-Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Left: IDE Integration Card (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1.5">
            <div className="flex items-center gap-2">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              <div>
                <span className="font-bold text-xs text-on-surface">IDE Integration</span>
                <span className="text-[10px] text-outline block">Inferred Near-Miss Controller</span>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[9px] font-bold">
              ● INFERRED NEAR-MISS
            </span>
          </div>

          <div className="flex items-center justify-between bg-surface-container p-2 rounded-lg border border-outline-variant/20 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-outline uppercase font-bold text-[9px]">PROJECT ROOT:</span>
              <span className="text-on-surface font-semibold truncate">~/projects/backend-api</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => showToast("Select new project directory")}
                className="px-2 py-0.5 rounded bg-surface-container-lowest text-outline hover:text-on-surface text-[10px]"
              >
                Change
              </button>
              <button
                onClick={() => showToast("Rescanned project root (14 endpoints discovered)")}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest text-primary text-[10px] hover:bg-primary/10"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Rescan</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-surface-container p-2 rounded-lg border border-outline-variant/20 text-[11px]">
            <div className="flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-secondary" />
              <span className="text-on-surface font-bold">server.js:1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => showToast("Opening VS Code at server.js:1")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold hover:bg-primary/30 transition-all cursor-pointer"
              >
                <ExternalLink className="h-3 w-3" />
                <span>VS Code</span>
              </button>
              <button
                onClick={() => showToast("Opening Cursor at server.js:1")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-lowest text-outline hover:text-on-surface border border-outline-variant/30 text-[10px] font-bold transition-all cursor-pointer"
              >
                <Zap className="h-3 w-3" />
                <span>Cursor</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
            <div>
              <span className="text-outline uppercase block font-bold text-[8.5px]">HANDLER FUNCTION</span>
              <span className="text-on-surface font-semibold">getProfile(req, res)</span>
            </div>
            <div>
              <span className="text-outline uppercase block font-bold text-[8.5px]">MIDDLEWARE PIPELINE</span>
              <span className="text-on-surface font-semibold">authMiddleware, rateLimiter</span>
            </div>
          </div>
        </div>

        {/* Right: Memory Heap Waveform & Near-Miss Suggestions */}
        <div className="space-y-2.5">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-outline uppercase font-bold">MEMORY HEAP</span>
              <span className="text-primary font-bold">42MB / 512MB</span>
            </div>

            {/* Smooth SVG wave graph */}
            <div className="h-10 w-full flex items-center justify-center">
              <svg className="w-full h-full text-primary" viewBox="0 0 100 25" preserveAspectRatio="none">
                <path
                  d="M0,15 Q15,5 30,12 T60,8 T85,18 T100,6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="85" cy="18" r="2.5" fill="currentColor" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[9.5px] border-t border-outline-variant/20 pt-1.5">
              <div>
                <span className="text-outline block">REQ/SEC</span>
                <strong className="text-on-surface text-[11px]">1.2k</strong>
              </div>
              <div className="text-right">
                <span className="text-outline block">AVG LATENCY</span>
                <strong className="text-secondary text-[11px]">38ms</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 space-y-1 text-[10px]">
            <div className="text-outline uppercase font-bold flex items-center gap-1.5">
              <Search className="h-3 w-3 text-primary" />
              <span>NEAR-MISS SUGGESTIONS</span>
            </div>
            <p className="text-outline text-[9.5px] leading-relaxed">
              Zero fuzzy routes above calibrated threshold (&ge;15).
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Request Execution Pipeline Graph ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1.5 text-[10px]">
          <div className="flex items-center gap-2">
            <Network className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold text-xs text-on-surface">Request Execution Pipeline Graph</span>
          </div>
          <span className="text-outline font-bold text-[9px]">Live Architecture Flow</span>
        </div>

        <div className="flex items-center justify-around py-2 overflow-x-auto text-[10px]">
          <div className="flex flex-col items-center gap-1">
            <div className="h-10 w-10 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center font-bold text-[9px] text-primary">
              INGRESS
            </div>
            <span className="text-outline text-[9px]">Port 4000</span>
          </div>

          <div className="h-0.5 flex-1 bg-outline-variant/30 mx-2" />

          <div className="flex flex-col items-center gap-1">
            <div className="h-10 w-10 rounded-full border-2 border-amber-500/60 bg-amber-500/10 flex items-center justify-center font-bold text-[8.5px] text-amber-400 text-center">
              MIDDLEWARE
            </div>
            <span className="text-outline text-[9px]">authMiddleware</span>
          </div>

          <div className="h-0.5 flex-1 bg-outline-variant/30 mx-2" />

          <div className="flex flex-col items-center gap-1">
            <div className="h-10 w-10 rounded-full border-2 border-tertiary/60 bg-tertiary/10 flex items-center justify-center font-bold text-[9px] text-tertiary">
              CONTROLLER
            </div>
            <span className="text-outline text-[9px]">:1</span>
          </div>

          <div className="h-0.5 flex-1 bg-outline-variant/30 mx-2" />

          <div className="flex flex-col items-center gap-1">
            <div className="h-10 w-10 rounded-full border-2 border-secondary/60 bg-secondary/10 flex items-center justify-center font-bold text-[9px] text-secondary">
              200
            </div>
            <span className="text-outline text-[9px]">Entity: User</span>
          </div>
        </div>
      </div>

      {/* ── 6. Bottom: Correlated Diagnostic Logs ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1">
          <div className="flex items-center gap-1.5 text-on-surface font-bold">
            <Terminal className="h-3 w-3 text-amber-400" />
            <span>CORRELATED DIAGNOSTIC LOGS</span>
          </div>
          <span className="text-outline text-[9px]">All (20) &middot; Likely (12)</span>
        </div>

        <div className="space-y-1 font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary border border-secondary/30 text-[8.5px] font-bold">
              LIKELY RELATED
            </span>
            <span className="text-outline">[TRAFFIC]</span>
            <span className="text-on-surface">GET /api/todos &rarr; HTTP 200 (12ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary border border-secondary/30 text-[8.5px] font-bold">
              LIKELY RELATED
            </span>
            <span className="text-outline">[TRAFFIC]</span>
            <span className="text-on-surface">POST /api/todos &rarr; HTTP 201 (45ms)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary border border-secondary/30 text-[8.5px] font-bold">
              LIKELY RELATED
            </span>
            <span className="text-outline">[TRAFFIC]</span>
            <span className="text-on-surface">GET /api/todos &rarr; HTTP 304 (2ms)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
