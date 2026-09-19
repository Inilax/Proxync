"use client";

import { useState } from "react";
import {
  Activity,
  Bookmark,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileCode,
  FolderOpen,
  Globe,
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
    <div className="flex h-full w-full flex-col bg-surface-container p-2 sm:p-3 gap-1.5 sm:gap-2 fade-in select-none font-mono text-xs overflow-y-auto overflow-x-hidden">
      {/* Toast Overlay */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 rounded-lg border border-primary/40 bg-surface-container-high/95 backdrop-blur-md px-3.5 py-2 text-primary shadow-xl animate-in fade-in slide-in-from-bottom-2 text-xs flex items-center gap-2 font-bold">
          <Zap className="h-3.5 w-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Top Tab Strip ── */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1.5 shrink-0 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 px-2 sm:px-3 py-0.5 sm:py-1 text-white font-semibold shadow-sm min-w-0">
            <span className="text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              GET
            </span>
            <span className="text-[11px] sm:text-xs text-white truncate max-w-[140px] sm:max-w-none">
              /api/v1/user/profile
            </span>
            <button className="text-white/60 hover:text-white ml-0.5 text-xs shrink-0">✕</button>
          </div>

          <button
            onClick={() => showToast("Opened fresh draft tab")}
            className="p-1 rounded-lg hover:bg-surface-container-high text-white/70 hover:text-primary transition-colors cursor-pointer shrink-0"
            title="New Tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative hidden sm:block shrink-0">
          <input
            type="text"
            placeholder="Filter tab..."
            className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-2.5 py-0.5 text-[11px] text-white focus:outline-none placeholder:text-white/40 w-32 sm:w-40"
          />
        </div>
      </div>

      {/* ── 2. Sub-Header Controls & Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate">DevTools &amp; Mapping</h2>
            <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              GET
            </span>
          </div>
          <p className="text-[9.5px] sm:text-[10px] text-white/70 font-medium truncate">
            TARGET: <span className="text-white font-bold">/api/v1/user/profile</span>
          </p>
        </div>

        {/* Toolbar: Switcher + Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-0.5 text-[10px] sm:text-[10.5px]">
            <button
              onClick={() => setActiveSubView("devtools")}
              className={cn(
                "flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap",
                activeSubView === "devtools"
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-white/70 hover:text-white"
              )}
            >
              <Code2 className="h-3 w-3" />
              <span>DevTools<span className="hidden sm:inline"> &amp; Mapping</span></span>
            </button>
            <button
              onClick={() => setActiveSubView("replay")}
              className={cn(
                "flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap",
                activeSubView === "replay"
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-white/70 hover:text-white"
              )}
            >
              <Activity className="h-3 w-3" />
              <span>Traffic<span className="hidden sm:inline"> &amp; Replay</span></span>
            </button>
          </div>

          <button
            onClick={() => showToast("Exported cURL & Fetch code snippets")}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-white/90 hover:text-primary hover:border-primary/40 transition-all cursor-pointer text-[10px] font-semibold shrink-0"
            title="Export Code"
          >
            <Code2 className="h-3 w-3 text-primary" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => showToast("Saved to Default Collection")}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-white/90 hover:text-secondary hover:border-secondary/40 transition-all cursor-pointer text-[10px] font-semibold shrink-0"
            title="Save to Collection"
          >
            <Bookmark className="h-3 w-3 text-secondary" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={() => showToast("Opening in browser...")}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-white/90 hover:text-primary transition-all cursor-pointer text-[10px] font-semibold shrink-0"
            title="Open in Browser"
          >
            <Globe className="h-3 w-3 text-white/80" />
            <span className="hidden sm:inline">Browser</span>
          </button>
        </div>
      </div>

      {/* ── 3. Green Optimal Execution Banner ── */}
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 sm:px-3 py-1 sm:py-1.5 text-emerald-400 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span className="font-bold text-[10.5px] sm:text-[11px] uppercase tracking-wide text-emerald-300 truncate">
            HTTP 200 OK <span className="hidden sm:inline">&mdash; OPTIMAL EXECUTION</span>
          </span>
        </div>

        <div className="text-[9.5px] sm:text-[10px] font-mono font-bold text-emerald-300 shrink-0 ml-2">
          42MB <span className="text-emerald-500/50">|</span> 38ms
        </div>
      </div>

      {/* ── 4. Middle Section: IDE Integration & Memory Heap Mini-Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 sm:gap-2">
        {/* Left: IDE Integration Card (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-2.5 space-y-1.5">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Code2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-xs text-white truncate block">IDE Integration</span>
                <span className="text-[9px] text-white/70 truncate block">Inferred Near-Miss Controller</span>
              </div>
            </div>

            <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[8.5px] sm:text-[9px] font-bold shrink-0">
              ● INFERRED<span className="hidden sm:inline"> NEAR-MISS</span>
            </span>
          </div>

          <div className="flex items-center justify-between bg-surface-container px-2 sm:px-2.5 py-1 rounded-lg border border-outline-variant/20 text-[10px] sm:text-[10.5px] gap-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-white/60 uppercase font-bold text-[8px] sm:text-[8.5px] shrink-0">ROOT:</span>
              <span className="text-white font-semibold truncate font-mono min-w-0">~/projects/backend-api</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => showToast("Select new project directory")}
                className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-white/80 hover:text-white border border-outline-variant/30 text-[9px] cursor-pointer"
              >
                Change
              </button>
              <button
                onClick={() => showToast("Rescanned project root (14 endpoints discovered)")}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container-lowest text-primary text-[9px] border border-primary/30 hover:bg-primary/10 cursor-pointer font-bold"
              >
                <RefreshCw className="h-2 w-2" />
                <span>Rescan</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-surface-container px-2 sm:px-2.5 py-1 rounded-lg border border-outline-variant/20 text-[10px] sm:text-[10.5px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileCode className="h-3.5 w-3.5 text-secondary shrink-0" />
              <span className="text-white font-bold font-mono truncate">server.js:1</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => showToast("Opening VS Code at server.js:1")}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 text-[9px] sm:text-[9.5px] font-bold hover:bg-primary/30 transition-all cursor-pointer"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                <span>VS Code</span>
              </button>
              <button
                onClick={() => showToast("Opening Cursor at server.js:1")}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest text-white/90 hover:text-white border border-outline-variant/40 text-[9px] sm:text-[9.5px] font-bold transition-all cursor-pointer"
              >
                <Zap className="h-2.5 w-2.5 text-amber-400" />
                <span>Cursor</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
            <div className="min-w-0">
              <span className="text-white/60 uppercase block font-bold text-[8px]">HANDLER FUNCTION</span>
              <span className="text-white font-semibold font-mono truncate block">getProfile(req, res)</span>
            </div>
            <div className="min-w-0">
              <span className="text-white/60 uppercase block font-bold text-[8px]">MIDDLEWARE PIPELINE</span>
              <span className="text-white font-semibold font-mono truncate block">authMiddleware, rateLimiter</span>
            </div>
          </div>
        </div>

        {/* Right: Memory Heap Waveform & Near-Miss Suggestions */}
        <div className="space-y-1.5">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60 uppercase font-bold text-[8px] sm:text-[8.5px]">MEMORY HEAP</span>
              <span className="text-primary font-bold font-mono text-[9.5px]">42MB / 512MB</span>
            </div>

            {/* Smooth SVG wave graph */}
            <div className="h-7 sm:h-8 w-full flex items-center justify-center">
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

            <div className="flex items-center justify-between text-[9px] border-t border-outline-variant/20 pt-1">
              <div>
                <span className="text-white/60 block text-[8px]">REQ/SEC</span>
                <strong className="text-white text-[10px]">1.2k</strong>
              </div>
              <div className="text-right">
                <span className="text-white/60 block text-[8px]">AVG LATENCY</span>
                <strong className="text-emerald-400 text-[10px]">38ms</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1.5 sm:p-2 space-y-0.5 text-[10px]">
            <div className="text-white/60 uppercase font-bold flex items-center gap-1 text-[8px] sm:text-[8.5px]">
              <Search className="h-2.5 w-2.5 text-primary" />
              <span>NEAR-MISS SUGGESTIONS</span>
            </div>
            <p className="text-white/70 text-[8.5px] sm:text-[9px] leading-relaxed">
              Zero fuzzy routes above calibrated threshold (&ge;15).
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Request Execution Pipeline Graph ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-2.5 space-y-1 shrink-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1 text-[10px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Network className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-bold text-[11px] sm:text-xs text-white truncate">Execution Pipeline</span>
          </div>
          <span className="text-white/60 font-bold text-[8px] sm:text-[8.5px] shrink-0">Live Architecture Flow</span>
        </div>

        <div className="flex items-center justify-between py-1 text-[10px] w-full">
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-primary/70 bg-primary/15 flex items-center justify-center font-bold text-[7.5px] sm:text-[8px] text-primary">
              <span className="sm:hidden">IN</span>
              <span className="hidden sm:inline">INGRESS</span>
            </div>
            <span className="text-white/80 text-[8px] sm:text-[8.5px]">Port 4000</span>
          </div>

          <div className="h-0.5 flex-1 bg-white/20 mx-1 sm:mx-2 min-w-[8px]" />

          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-amber-400/70 bg-amber-400/15 flex items-center justify-center font-bold text-[7.5px] sm:text-[8px] text-amber-300 text-center">
              <span className="sm:hidden">MID</span>
              <span className="hidden sm:inline">MIDDLE</span>
            </div>
            <span className="text-white/80 text-[8px] sm:text-[8.5px] truncate max-w-[60px] sm:max-w-none">authMid</span>
          </div>

          <div className="h-0.5 flex-1 bg-white/20 mx-1 sm:mx-2 min-w-[8px]" />

          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-purple-400/70 bg-purple-400/15 flex items-center justify-center font-bold text-[7.5px] sm:text-[8px] text-purple-300">
              CTRL
            </div>
            <span className="text-white/80 text-[8px] sm:text-[8.5px]">server:1</span>
          </div>

          <div className="h-0.5 flex-1 bg-white/20 mx-1 sm:mx-2 min-w-[8px]" />

          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-emerald-400/70 bg-emerald-400/15 flex items-center justify-center font-bold text-[7.5px] sm:text-[8px] text-emerald-300">
              200
            </div>
            <span className="text-white/80 text-[8px] sm:text-[8.5px]">HTTP 200</span>
          </div>
        </div>
      </div>

      {/* ── 6. Bottom: Correlated Diagnostic Logs ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1.5 sm:p-2 space-y-1 text-[10px] shrink-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-0.5">
          <div className="flex items-center gap-1.5 text-white font-bold text-[9.5px] sm:text-[10px] truncate min-w-0">
            <Terminal className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="truncate">CORRELATED LOGS</span>
          </div>
          <span className="text-white/60 text-[8px] sm:text-[8.5px] shrink-0">All (20) &middot; Likely (12)</span>
        </div>

        <div className="space-y-0.5 font-mono text-[9px] sm:text-[9.5px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[7.5px] sm:text-[8px] font-bold shrink-0">
              LIKELY
            </span>
            <span className="text-sky-400 font-semibold text-[8.5px] shrink-0">[TRAFFIC]</span>
            <span className="text-white/90 truncate min-w-0">GET /api/todos &rarr; 200 (12ms)</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[7.5px] sm:text-[8px] font-bold shrink-0">
              LIKELY
            </span>
            <span className="text-sky-400 font-semibold text-[8.5px] shrink-0">[TRAFFIC]</span>
            <span className="text-white/90 truncate min-w-0">POST /api/todos &rarr; 201 (45ms)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
