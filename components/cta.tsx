"use client";

import { Download, Terminal, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { usePlatformDownload, useLatestRelease } from "@/lib/releases";
import { useCloudflareLatency } from "./latency";

export function Cta() {
  const download = usePlatformDownload();
  const release  = useLatestRelease();
  const latency  = useCloudflareLatency();
  const latencyLabel =
    latency.status === "ok"
      ? `${latency.ms}ms Edge`
      : latency.status === "offline"
        ? "Offline"
        : "Measuring…";

  const badges = [
    "12MB Native Binary",
    latencyLabel,
    "100% Local Storage",
    "Zero Cloud Required",
  ];

  return (
    <section className="relative overflow-hidden py-32">
      {/* Single diagonal accent line at top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      {/* Very faint ambient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 30% at 50% 100%, rgba(6,182,212,0.04) 0%, transparent 70%)",
        }}
      />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-24">
          {/* Left — Headline */}
          <div>
            <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">
              Developer-First · Ready in Seconds
            </p>
            <h2 className="font-display text-5xl font-black leading-[1.03] tracking-[-0.03em] text-white sm:text-6xl lg:text-[64px]">
              Stop context-switching.
              <br />
              <span className="text-white/25">Start shipping faster.</span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/35">
              Join high-velocity engineers who reclaimed their local dev workflow. Download the engine today and test your webhooks instantly.
            </p>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <div
                  key={badge}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 font-mono text-[11px] text-white/35"
                >
                  <CheckCircle2 size={12} className="text-tertiary/70" />
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* Right — CTA stack */}
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <Button
              variant="primary"
              size="lg"
              href={download.url}
              className="group relative overflow-hidden rounded-full font-bold px-8 py-4 text-sm shadow-[0_0_0_1px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="absolute inset-0 flex justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-700 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                <div className="relative h-full w-10 bg-white/25" />
              </div>
              <Download className="h-4 w-4" />
              <span>{download.label}</span>
            </Button>

            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-6 py-3.5 text-sm font-medium text-white/40 transition-all hover:border-white/[0.1] hover:text-white/65"
            >
              <Terminal className="h-3.5 w-3.5 text-primary/50" />
              Explore Technical Docs
            </Link>

            <p className="font-mono text-[11px] text-white/20 lg:text-right">
              {release.tagName} · Windows · macOS · Linux
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
