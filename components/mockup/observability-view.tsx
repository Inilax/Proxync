"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Globe,
  Radio,
  Send,
  ShieldCheck,
  Terminal,
  Webhook,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ObservabilityView() {
  const [activeTab, setActiveTab] = useState<"overview" | "errors" | "webhooks" | "endpoints">("overview");

  return (
    <div className="flex h-full w-full flex-col bg-surface-container p-2 sm:p-3.5 gap-2 sm:gap-3 fade-in select-none font-mono text-xs overflow-y-auto overflow-x-hidden">
      {/* ── 1. Title Row & Quick Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-outline-variant/30 pb-2 sm:pb-2.5 shrink-0">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-base font-bold text-white truncate">Observability Hub</h1>
            <span className="hidden xs:inline-flex rounded-full bg-surface-container-high border border-outline-variant/30 px-1.5 sm:px-2 py-0.5 text-[9px] font-bold text-white/80">
              Enhanced Telemetry
            </span>
            <span className="rounded-full bg-primary/20 border border-primary/40 px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-primary flex items-center gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Real-Time
            </span>
          </div>
          <p className="text-[9.5px] sm:text-[10.5px] text-white/70 truncate sm:line-clamp-none">
            Zero-config local performance metrics, public tunnel health &amp; webhook stream.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-white hover:text-primary hover:border-primary/40 transition-all cursor-pointer text-[10.5px] sm:text-xs font-semibold whitespace-nowrap"
          >
            <Terminal className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
            <span className="hidden xs:inline">Inspect </span><span>Logs</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-white hover:text-secondary hover:border-secondary/40 transition-all cursor-pointer text-[10.5px] sm:text-xs font-semibold whitespace-nowrap"
          >
            <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-secondary shrink-0" />
            <span>REST Client</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top 4 Metric Cards Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5 shrink-0">
        {/* Card 1: Tunnel Status */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-3 space-y-0.5 sm:space-y-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] uppercase font-bold text-white/60 gap-1">
            <span className="flex items-center gap-1 sm:gap-1.5 truncate">
              <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/70 shrink-0" />
              <span className="truncate">TUNNEL STATUS</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white truncate">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white shrink-0" />
            <span className="truncate">Waiting for Tunnel</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-white/60 truncate">No active public tunnel</p>
        </div>

        {/* Card 2: P90 Latency */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-3 space-y-0.5 sm:space-y-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] uppercase font-bold text-white/60 gap-1">
            <span className="flex items-center gap-1 sm:gap-1.5 truncate">
              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary shrink-0" />
              <span className="truncate">P90 LATENCY</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-bold text-primary truncate">13 ms</div>
          <p className="text-[9px] sm:text-[10px] text-white/60 truncate">P50: 4ms · P99: 45ms</p>
        </div>

        {/* Card 3: Success Rate */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-3 space-y-0.5 sm:space-y-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] uppercase font-bold text-white/60 gap-1">
            <span className="flex items-center gap-1 sm:gap-1.5 truncate">
              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-secondary shrink-0" />
              <span className="truncate">SUCCESS RATE</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-bold text-secondary truncate">100.0%</div>
          <p className="text-[9px] sm:text-[10px] text-white/60 truncate">12 pass / 0 fail</p>
        </div>

        {/* Card 4: Bandwidth & Posture */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-3 space-y-0.5 sm:space-y-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] uppercase font-bold text-white/60 gap-1">
            <span className="flex items-center gap-1 sm:gap-1.5 truncate">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-tertiary shrink-0" />
              <span className="truncate">BANDWIDTH</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate">11.8 KB</div>
          <p className="text-[9px] sm:text-[10px] text-secondary font-semibold truncate">PII Redaction Active</p>
        </div>
      </div>

      {/* ── 3. Sub-Tabs Strip (Horizontally Scrollable without blowing container) ── */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-outline-variant/30 pb-1 text-xs overflow-x-auto no-scrollbar scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-t-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap text-[11px] sm:text-xs",
            activeTab === "overview"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-white/60 hover:text-white"
          )}
        >
          <Activity className="h-3.5 w-3.5 shrink-0" />
          <span>Overview<span className="hidden xs:inline"> &amp; Tunnel</span></span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("errors")}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-t-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap text-[11px] sm:text-xs",
            activeTab === "errors"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-white/60 hover:text-white"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Error Center<span className="hidden xs:inline"> (0)</span></span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("webhooks")}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-t-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap text-[11px] sm:text-xs",
            activeTab === "webhooks"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-white/60 hover:text-white"
          )}
        >
          <Webhook className="h-3.5 w-3.5 shrink-0" />
          <span>Webhook Stream<span className="hidden xs:inline"> (0)</span></span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("endpoints")}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-t-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap text-[11px] sm:text-xs",
            activeTab === "endpoints"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-white/60 hover:text-white"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5 shrink-0" />
          <span>Slowest Routes</span>
        </button>
      </div>

      {/* ── 4. Dynamic Tab Panels ── */}
      {activeTab === "overview" && (
        <div className="space-y-2 sm:space-y-3 min-w-0">
          {/* Shared Tunnel & Network Telemetry Card */}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-3.5 space-y-2 sm:space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-outline-variant/20 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-white truncate">Shared Tunnel &amp; Network Telemetry</h3>
                  <p className="text-[9.5px] sm:text-[10px] text-white/60 truncate hidden sm:block">
                    Full visibility into public tunnel traffic, forwarding port, and guardrails
                  </p>
                </div>
              </div>

              <span className="text-[9.5px] sm:text-[10px] text-white/60 font-semibold shrink-0 whitespace-nowrap">
                ● No Public Tunnel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-white/60 block">PUBLIC ENDPOINT</span>
                <div className="font-bold text-xs text-white truncate">Local Proxy Only (127.0.0.1)</div>
                <span className="text-[9.5px] sm:text-[10px] text-white/60 block">Target Port: 4000</span>
              </div>

              <div className="space-y-0.5 min-w-0">
                <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-white/60 block">STATUS CODE HEATMAP</span>
                <div className="font-mono text-[11px] sm:text-xs font-semibold text-white truncate">
                  <span className="text-secondary">2xx: 8</span> · <span className="text-primary">3xx: 4</span> · <span className="text-white/50">4xx: 0</span> · <span className="text-rose-400">5xx: 0</span>
                </div>
                <span className="text-[9.5px] sm:text-[10px] text-white/60 block">Average Duration: 8 ms</span>
              </div>

              <div className="space-y-0.5 min-w-0">
                <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-white/60 block">SECURITY GUARDRAILS</span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-secondary truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                  <span className="truncate">PII Redaction Active</span>
                </div>
                <span className="text-[9.5px] sm:text-[10px] text-white/60 block">Rate Limit: 250 req/min</span>
              </div>
            </div>
          </div>

          {/* Response Time Percentiles Card */}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-3.5 space-y-2 sm:space-y-2.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-outline-variant/20 pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary shrink-0" />
                <h3 className="font-bold text-xs text-white truncate">Response Time Percentiles</h3>
              </div>
              <span className="text-[9.5px] sm:text-[10px] text-white/60 truncate">
                Evaluated across 12 requests
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3 text-center">
              <div className="rounded-lg bg-surface-container p-1.5 sm:p-2 space-y-0.5 min-w-0">
                <span className="text-[8px] sm:text-[8.5px] uppercase font-bold text-white/60 block truncate">AVG LATENCY</span>
                <div className="text-xs sm:text-sm font-bold text-white truncate">8 ms</div>
              </div>

              <div className="rounded-lg bg-surface-container p-1.5 sm:p-2 space-y-0.5 min-w-0">
                <span className="text-[8px] sm:text-[8.5px] uppercase font-bold text-white/60 block truncate">P50 (MEDIAN)</span>
                <div className="text-xs sm:text-sm font-bold text-secondary truncate">4 ms</div>
              </div>

              <div className="rounded-lg bg-surface-container p-1.5 sm:p-2 space-y-0.5 min-w-0">
                <span className="text-[8px] sm:text-[8.5px] uppercase font-bold text-white/60 block truncate">P90 (90TH)</span>
                <div className="text-xs sm:text-sm font-bold text-amber-400 truncate">13 ms</div>
              </div>

              <div className="rounded-lg bg-surface-container p-1.5 sm:p-2 space-y-0.5 min-w-0">
                <span className="text-[8px] sm:text-[8.5px] uppercase font-bold text-white/60 block truncate">P99 (TAIL)</span>
                <div className="text-xs sm:text-sm font-bold text-amber-400 truncate">45 ms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "errors" && (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 sm:p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-emerald-400 shrink-0" />
              <h3 className="font-bold text-xs text-white">Error Center &amp; Panic Isolation</h3>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9.5px] font-bold text-emerald-400">
              0 Errors Captured
            </span>
          </div>
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <div className="text-xs font-bold text-white">All local proxy routes healthy</div>
            <p className="text-[10px] text-white/60 max-w-sm">
              0 unhandled 5xx exceptions, 0 dead upstream sockets, and 0 dropped connections over the past 24 hours.
            </p>
          </div>
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 sm:p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-bold text-xs text-white">Live Webhook Ingestion Pipe</h3>
            </div>
            <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[9.5px] font-bold text-primary">
              Stream Standby
            </span>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="rounded-lg bg-surface-container p-2.5 flex items-center justify-between">
              <span className="text-white/80 font-bold">Listening Route</span>
              <span className="text-primary font-mono font-bold">POST /api/v1/webhooks/*</span>
            </div>
            <div className="rounded-lg bg-surface-container p-2.5 flex items-center justify-between">
              <span className="text-white/80 font-bold">Signature Verification</span>
              <span className="text-secondary font-mono font-bold">HMAC-SHA256 Ready</span>
            </div>
            <p className="text-[10px] text-white/60 pt-1">
              Forward external webhook events from Stripe, GitHub, or Shopify directly to your localhost with zero public DNS lag.
            </p>
          </div>
        </div>
      )}

      {activeTab === "endpoints" && (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-4 space-y-2.5 min-w-0">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-secondary shrink-0" />
              <h3 className="font-bold text-xs text-white">Slowest Routes Leaderboard</h3>
            </div>
            <span className="text-[10px] text-white/60 font-semibold">P90 Sorted</span>
          </div>
          <div className="space-y-1.5">
            {[
              { method: "POST", path: "/api/v1/session", status: "201", time: "42 ms", color: "text-primary" },
              { method: "GET", path: "/api/v1/users", status: "200", time: "14 ms", color: "text-secondary" },
              { method: "DELETE", path: "/api/v1/users/42", status: "404", time: "11 ms", color: "text-rose-400" },
              { method: "GET", path: "/api/v1/health", status: "200", time: "2 ms", color: "text-secondary" },
            ].map((route) => (
              <div
                key={route.path}
                className="flex items-center justify-between rounded-lg bg-surface-container p-2 text-[10.5px] sm:text-xs min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-bold text-white/80 shrink-0 w-12">{route.method}</span>
                  <span className="font-mono text-white truncate">{route.path}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("font-bold text-[10px]", route.color)}>{route.status}</span>
                  <span className="font-mono text-white/70 font-bold">{route.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

