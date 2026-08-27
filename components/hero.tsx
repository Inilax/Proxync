"use client";

import { Cloud, Download, Star, Zap } from "lucide-react";
import { Button, Container } from "@/components/ui";
import { GITHUB_URL } from "@/lib/links";
import { useLatestRelease } from "@/lib/releases";
import { AppMockup } from "./app-mockup";
import { useCloudflareLatency } from "./latency";

const STATS = [
  { value: "12MB", label: "Binary Size" },
  { value: "—", label: "Edge Ping" },
  { value: "100%", label: "Local Storage" },
  { value: "4 Modes", label: "Tunnel Providers" },
];

export function Hero() {
  const release = useLatestRelease();
  const latency = useCloudflareLatency();
  const latencyValue =
    latency.status === "ok"
      ? `${latency.ms}ms`
      : latency.status === "offline"
        ? "—"
        : "…";

  return (
    <section id="product" className="relative overflow-hidden pb-32 pt-40 scroll-mt-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid mask-fade-b"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-10%] h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-12%] left-[-8%] h-[420px] w-[420px] rounded-full bg-tertiary/8 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/8 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-low px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
              v0.2.1-stable &middot; Native Tunneling &amp; Developer Studio
            </span>
          </div>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-on-surface sm:text-5xl xl:text-6xl animate-fade-up [animation-delay:80ms]">
            The <span className="text-gradient">Local-First</span> Developer
            Studio for API Integration.
          </h1>

          <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-on-surface-variant animate-fade-up [animation-delay:160ms]">
            Instant public tunnels, live traffic interception, OpenAPI generation, and request workbench in one private, native desktop app. Built with Rust for zero cloud lock-in.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 animate-fade-up [animation-delay:240ms]">
            <Button
              href={release.downloadUrl}
              variant="primary"
              size="lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
              Download for Windows
            </Button>
            <Button
              href={GITHUB_URL}
              variant="secondary"
              size="lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Star className="h-4 w-4" />
              Star on GitHub
            </Button>
          </div>

          <p className="mt-4 font-mono text-xs text-on-surface-muted animate-fade-up [animation-delay:320ms]">
            Version {release.tagName}&nbsp;&middot;&nbsp;Windows x64 setup &middot; Linux &amp; macOS coming soon
          </p>

          <div className="mt-10 grid w-full max-w-lg grid-cols-2 gap-y-4 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/20 border-t border-outline-variant/20 pt-6 animate-fade-up [animation-delay:400ms]">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1.5 px-3 first:pl-0">
                <span className="text-2xl font-semibold text-on-surface">
                  {stat.label === "Edge Ping" ? latencyValue : stat.value}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-outline">
                  {stat.label === "Edge Ping" && latency.status !== "pinging"
                    ? `${stat.label} (live)`
                    : stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-16 w-full animate-fade-up scroll-mt-24 [animation-delay:480ms]">
          {/* Floating Glass Badges */}
          <div className="glass absolute -top-5 right-4 z-20 hidden animate-float items-center gap-2 rounded-full border border-primary/30 bg-surface-container-low/90 px-3.5 py-2 font-mono text-[11px] text-on-surface-variant shadow-xl backdrop-blur-md md:flex lg:-right-8">
            <Cloud className="h-3.5 w-3.5 text-primary" />
            <span>
              <strong className="font-bold text-primary">px-*.proxync.dev</strong> — Native Edge &amp; Resilient Standby
            </span>
          </div>

          <div className="glass absolute -bottom-4 left-4 z-20 hidden animate-float items-center gap-2 rounded-full border border-secondary/30 bg-surface-container-low/90 px-3.5 py-2 font-mono text-[11px] text-on-surface-variant shadow-xl backdrop-blur-md md:flex lg:-left-4 lg:-bottom-4 [animation-delay:2.5s]">
            <Zap className="h-3.5 w-3.5 text-secondary" />
            <span>
              <strong className="font-bold text-secondary">● Real-Time Traffic Inspector</strong> — Dual-Stream Logs &amp; 1-Click IDE Jump
            </span>
          </div>

          <AppMockup />
        </div>
      </Container>
    </section>
  );
}
