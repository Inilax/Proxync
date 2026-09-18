"use client";

import { useCloudflareLatency } from "./latency";
import { Activity, Cpu, HardDrive, ShieldCheck, Zap } from "lucide-react";

export function Stats() {
  const latency = useCloudflareLatency();
  const latencyValue =
    latency.status === "ok"
      ? `${latency.ms}ms`
      : latency.status === "offline"
        ? "—"
        : "…";

  const tickerItems = [
    { label: "ENGINE", value: "12MB Native Rust", icon: Cpu, accent: "text-cyan-400" },
    { label: "EDGE PING", value: latencyValue, icon: Activity, accent: "text-emerald-400", live: true },
    { label: "STORAGE", value: "100% Local JSON", icon: HardDrive, accent: "text-purple-400" },
    { label: "TELEMETRY", value: "0 KB Cloud", icon: ShieldCheck, accent: "text-indigo-400" },
    { label: "ARCHITECTURE", value: "Tauri v2 + Tokio", icon: Zap, accent: "text-amber-400" },
    { label: "SECURITY", value: "Ed25519 JIT Signing", icon: ShieldCheck, accent: "text-cyan-400" },
  ];

  return (
    <section className="relative border-y border-white/[0.06] bg-[#060709] py-3.5 overflow-hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-y-3 gap-x-6 text-[12px] font-mono">
          {tickerItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-white/30 uppercase tracking-wider">{item.label}</span>
                <span className="text-white/10">::</span>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                  <span className="font-semibold text-white/85">{item.value}</span>
                  {item.live && (
                    <span className="relative flex h-1.5 w-1.5 ml-0.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
