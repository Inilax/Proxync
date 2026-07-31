"use client";

import { Container } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { useCloudflareLatency } from "./latency";

type Stat = {
  value: string;
  label: string;
  prefix?: string;
};

export function Stats() {
  const latency = useCloudflareLatency();
  const latencyValue =
    latency.status === "ok"
      ? `${latency.ms}ms`
      : latency.status === "offline"
        ? "—"
        : "…";

  const stats: Stat[] = [
    { value: "12MB", label: "Binary size" },
    { value: latencyValue, label: "Cloud latency" },
    { value: "100%", label: "Local storage" },
    { prefix: "−", value: "90%", label: "RAM vs Electron" },
  ];

  return (
    <section className="border-y border-outline-variant/20 bg-surface-container-low/40 py-20">
      <Container>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-outline-variant/20 bg-outline-variant/40 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal
              key={stat.label}
              delay={i * 0.08}
              className="flex flex-col items-center justify-center bg-surface-container-lowest py-10"
            >
              <div className="flex items-center justify-center">
                {stat.prefix ? (
                  <span className="mr-1 text-2xl text-on-surface-muted">{stat.prefix}</span>
                ) : null}
                <span className="text-4xl font-semibold tracking-tight text-gradient md:text-5xl">
                  {stat.value}
                </span>
              </div>
              <span className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-muted">
                {stat.label}
              </span>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
