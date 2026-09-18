"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  Globe,
  Radio,
  RefreshCw,
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
    <div className="flex h-full w-full flex-col bg-surface-container p-3.5 gap-3 fade-in select-none font-mono text-xs overflow-y-auto">
      {/* ── 1. Title Row & Quick Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-on-surface">Observability Hub</h1>
            <span className="rounded-full bg-surface-container-high border border-outline-variant/30 px-2 py-0.5 text-[9px] font-bold text-on-surface-variant">
              Enhanced Telemetry
            </span>
            <span className="rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 text-[9px] font-bold text-primary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Real-Time Telemetry
            </span>
          </div>
          <p className="text-[10.5px] text-outline">
            Zero-config local performance metrics, public tunnel health, log soup elimination, and webhook stream.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:text-primary hover:border-primary/40 transition-all cursor-pointer text-xs font-semibold">
            <Terminal className="h-3.5 w-3.5" />
            <span>Inspect Traffic Logs</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:text-secondary hover:border-secondary/40 transition-all cursor-pointer text-xs font-semibold">
            <Send className="h-3.5 w-3.5 text-secondary" />
            <span>Open REST Client</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top 4 Metric Cards Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Tunnel Status */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-1">
          <div className="flex items-center justify-between text-[9.5px] uppercase font-bold text-outline">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-outline" />
              TUNNEL STATUS
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-outline" />
          </div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span>Waiting for Tunnel</span>
          </div>
          <p className="text-[10px] text-outline">No active public tunnel</p>
        </div>

        {/* Card 2: P90 Latency */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-1">
          <div className="flex items-center justify-between text-[9.5px] uppercase font-bold text-outline">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary" />
              P90 LATENCY
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-base font-bold text-primary">13 ms</div>
          <p className="text-[10px] text-outline">P50: 4ms | P99: 45ms</p>
        </div>

        {/* Card 3: Success Rate */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-1">
          <div className="flex items-center justify-between text-[9.5px] uppercase font-bold text-outline">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-secondary" />
              SUCCESS RATE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          </div>
          <div className="text-base font-bold text-secondary">100.0%</div>
          <p className="text-[10px] text-outline">12 pass / 0 fail</p>
        </div>

        {/* Card 4: Bandwidth & Posture */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-1">
          <div className="flex items-center justify-between text-[9.5px] uppercase font-bold text-outline">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-tertiary" />
              BANDWIDTH &amp; POSTURE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
          </div>
          <div className="text-base font-bold text-on-surface">11.8 KB</div>
          <p className="text-[10px] text-secondary font-semibold">PII Redaction Active</p>
        </div>
      </div>

      {/* ── 3. Sub-Tabs Strip ── */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1 text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-bold transition-all cursor-pointer",
            activeTab === "overview"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-outline hover:text-on-surface"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Overview &amp; Tunnel</span>
        </button>

        <button
          onClick={() => setActiveTab("errors")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-bold transition-all cursor-pointer",
            activeTab === "errors"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-outline hover:text-on-surface"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Error Center (0)</span>
        </button>

        <button
          onClick={() => setActiveTab("webhooks")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-bold transition-all cursor-pointer",
            activeTab === "webhooks"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-outline hover:text-on-surface"
          )}
        >
          <Webhook className="h-3.5 w-3.5" />
          <span>Webhook Stream (0)</span>
        </button>

        <button
          onClick={() => setActiveTab("endpoints")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-bold transition-all cursor-pointer",
            activeTab === "endpoints"
              ? "border-b-2 border-primary text-primary bg-surface-container-lowest"
              : "text-outline hover:text-on-surface"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Slowest Routes</span>
        </button>
      </div>

      {/* ── 4. Shared Tunnel & Network Telemetry Card ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <h3 className="font-bold text-xs text-on-surface">Shared Tunnel &amp; Network Telemetry</h3>
              <p className="text-[10px] text-outline">Full visibility into public tunnel traffic, forwarding port, and guardrails</p>
            </div>
          </div>

          <span className="text-[10px] text-outline font-semibold">● No Public Tunnel</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-outline block">PUBLIC ENDPOINT</span>
            <div className="font-bold text-xs text-on-surface">Local Proxy Only (127.0.0.1)</div>
            <span className="text-[10px] text-outline">Target Port: 4000</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-outline block">STATUS CODE HEATMAP</span>
            <div className="font-mono text-xs font-semibold text-on-surface">
              <span className="text-secondary">2xx: 8</span> | <span className="text-primary">3xx: 4</span> | <span className="text-outline">4xx: 0</span> | <span className="text-error">5xx: 0</span>
            </div>
            <span className="text-[10px] text-outline">Average Duration: 8 ms</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-outline block">SECURITY GUARDRAILS</span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span>PII Redaction Active</span>
            </div>
            <span className="text-[10px] text-outline">Rate Limit: 250 req/min</span>
          </div>
        </div>
      </div>

      {/* ── 5. Response Time Percentiles Card ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-secondary" />
            <h3 className="font-bold text-xs text-on-surface">Response Time Percentiles</h3>
          </div>
          <span className="text-[10px] text-outline">Evaluated across 12 captured requests</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="rounded-lg bg-surface-container p-2 space-y-0.5">
            <span className="text-[8.5px] uppercase font-bold text-outline block">AVERAGE LATENCY</span>
            <div className="text-sm font-bold text-on-surface">8 ms</div>
          </div>

          <div className="rounded-lg bg-surface-container p-2 space-y-0.5">
            <span className="text-[8.5px] uppercase font-bold text-outline block">P50 (MEDIAN)</span>
            <div className="text-sm font-bold text-secondary">4 ms</div>
          </div>

          <div className="rounded-lg bg-surface-container p-2 space-y-0.5">
            <span className="text-[8.5px] uppercase font-bold text-outline block">P90 (90TH PERCENTILE)</span>
            <div className="text-sm font-bold text-amber-400">13 ms</div>
          </div>

          <div className="rounded-lg bg-surface-container p-2 space-y-0.5">
            <span className="text-[8.5px] uppercase font-bold text-outline block">P99 (TAIL LATENCY)</span>
            <div className="text-sm font-bold text-amber-400">45 ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
