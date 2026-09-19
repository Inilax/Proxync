"use client";

import { useCloudflareLatency } from "./latency";
import { Cpu, HardDrive, ShieldCheck, Zap, Radio, Lock } from "lucide-react";

export function Stats() {
  const latency = useCloudflareLatency();
  const latencyValue =
    latency.status === "ok"
      ? `${latency.ms}ms`
      : latency.status === "offline"
        ? "—"
        : "…";

  const tickerItems = [
    { label: "Engine", value: "12MB Native Rust", sub: "Zero-Orphan PGID", icon: Cpu, accent: "text-primary" },
    { label: "Edge Ping", value: latencyValue, sub: "Live Edge", icon: Radio, accent: "text-secondary", live: true },
    { label: "Standby", value: "0 Drops", sub: "50ms Fast-Crash Poll", icon: Zap, accent: "text-amber-400" },
    { label: "Privacy", value: "100% Local State", sub: "Zero Cloud Logs", icon: HardDrive, accent: "text-emerald-400" },
    { label: "Security", value: "SSRF Shield", sub: "Hardware Signed", icon: Lock, accent: "text-primary" },
    { label: "Origin Relay", value: "Encrypted Edge Mesh", sub: "Dynamic Routing", icon: ShieldCheck, accent: "text-primary" },
  ];

  // Tripled for smooth, continuous infinite marquee loop
  const displayItems = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <section aria-label="System Telemetry Ticker" className="relative border-y border-[#1F232E] bg-[#07080B]/80 backdrop-blur-md py-3.5 overflow-hidden select-none">
      {/* Soft Vignette Edge Masks */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-[#060709] via-[#060709]/90 to-transparent z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-[#060709] via-[#060709]/90 to-transparent z-10"
      />

      {/* Marquee Track */}
      <div className="flex w-max items-center animate-marquee hover:[animation-play-state:paused]">
        {displayItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center shrink-0 px-2 sm:px-2.5">
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0E1015] border border-[#1F232E] hover:border-[#2A2F3D] hover:bg-[#14171E] transition-all shadow-sm group">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-[#54596B] font-medium">
                    {item.label}
                  </span>
                </div>
                <span className="h-3 w-px bg-[#1F232E]" />
                <span className="font-sans font-semibold text-[12px] text-white">
                  {item.value}
                </span>
                {item.sub && (
                  <span className="font-mono text-[11px] text-[#8E93A4]">
                    {item.sub}
                  </span>
                )}
                {item.live && (
                  <span className="relative flex h-2 w-2 ml-0.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
