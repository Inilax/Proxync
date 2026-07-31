"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CLOUDFLARE_ENDPOINT = "https://1.1.1.1/cdn-cgi/trace";

export type LatencyState =
  | { status: "pinging" }
  | { status: "ok"; ms: number }
  | { status: "offline" };

export function useCloudflareLatency(intervalMs = 15000): LatencyState {
  const [state, setState] = useState<LatencyState>({ status: "pinging" });

  useEffect(() => {
    let active = true;

    const ping = async (url: string): Promise<number> => {
      const start = performance.now();
      try {
        await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
        return performance.now() - start;
      } catch {
        try {
          await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" });
          return performance.now() - start;
        } catch {
          return Infinity;
        }
      }
    };

    const measure = async () => {
      const ms = await ping(CLOUDFLARE_ENDPOINT);
      if (!active) return;
      setState(
        ms === Infinity
          ? { status: "offline" }
          : { status: "ok", ms: Math.round(ms) },
      );
    };

    void measure();
    const timer = setInterval(measure, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return state;
}

const BAR_COLORS = {
  4: "#10B981",
  3: "#34D399",
  2: "#F5B04A",
  1: "#FF7180",
  0: "rgba(255,255,255,0.15)",
} as const;

export function SignalBars({ latency, className }: { latency: number; className?: string }) {
  let activeBars = 0;
  if (latency < 50) activeBars = 4;
  else if (latency < 150) activeBars = 3;
  else if (latency < 300) activeBars = 2;
  else if (latency < Infinity) activeBars = 1;

  const barColor = BAR_COLORS[activeBars as keyof typeof BAR_COLORS];

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-end gap-[3px]", className)}
      style={{ height: 14, width: 18 }}
    >
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          style={{
            width: 3,
            height: `${bar * 25}%`,
            background: bar <= activeBars ? barColor : "rgba(255,255,255,0.15)",
            borderRadius: 1,
          }}
        />
      ))}
    </span>
  );
}

export function LatencyReadout({
  label = "Cloudflare Latency",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const state = useCloudflareLatency();

  return (
    <span
      className={cn("inline-flex items-center gap-2 font-mono text-[11px]", className)}
      title={`Measured against ${CLOUDFLARE_ENDPOINT}`}
    >
      {state.status === "pinging" && (
        <>
          <SignalBars latency={Infinity} />
          <span className="text-on-surface-muted">{label} — pinging…</span>
        </>
      )}
      {state.status === "ok" && (
        <>
          <SignalBars latency={state.ms} />
          <span
            className={cn(
              state.ms < 150 ? "text-tertiary" : state.ms < 300 ? "text-primary" : "text-error",
            )}
          >
            {state.ms} ms {label}
          </span>
        </>
      )}
      {state.status === "offline" && (
        <>
          <SignalBars latency={Infinity} />
          <span className="text-on-surface-muted">{label} — unreachable</span>
        </>
      )}
    </span>
  );
}
