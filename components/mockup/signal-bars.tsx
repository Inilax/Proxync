"use client";

import { cn } from "@/lib/utils";

export function SignalBars({ latency }: { latency: number }) {
  const bars = latency < 40 ? 4 : latency < 90 ? 3 : latency < 150 ? 2 : 1;
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-xs transition-all",
            i === 1 && "h-1.5",
            i === 2 && "h-2.5",
            i === 3 && "h-3",
            i === 4 && "h-3.5",
            i <= bars ? "bg-primary" : "bg-outline/30",
          )}
        />
      ))}
    </div>
  );
}
