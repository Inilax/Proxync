"use client";

import { Download, Star } from "lucide-react";
import { Button, Container, Eyebrow } from "@/components/ui";
import { DOWNLOAD_URL, GITHUB_URL } from "@/lib/links";
import { useLatestRelease } from "@/lib/releases";
import { useCloudflareLatency } from "./latency";

export function Cta() {
  const release = useLatestRelease();
  const latency = useCloudflareLatency();
  const latencyLabel =
    latency.status === "ok"
      ? `${latency.ms}ms live`
      : latency.status === "offline"
        ? "offline"
        : "measuring…";
  const stats = ["12MB", latencyLabel, "100% local"];

  return (
    <section className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-tertiary/5 blur-3xl" />
      </div>

      <Container className="relative">
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container/60 p-10 shadow-panel backdrop-blur-xl md:p-16">
          <div
            className="pointer-events-none absolute inset-0 bg-grid mask-fade-b"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <Eyebrow tone="primary">Ready when you are</Eyebrow>

            <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-on-surface sm:text-5xl md:text-6xl">
              Stop context-switching.
              <br />
              <span className="text-gradient">Start syncing.</span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-lg text-on-surface-variant">
              Join thousands of developers who reclaimed their local environment
              with Proxync. Download the engine today.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                href={release.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Get Started for Free
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Star className="h-4 w-4" />
                Star on GitHub
              </Button>
            </div>

            <p className="mt-6 font-mono text-xs text-on-surface-muted">
              {release.tagName} &mdash; Windows x64 installer · macOS · Linux (soon)
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {stats.map((stat, i) => (
                <span key={stat} className="inline-flex items-center gap-2">
                  {i > 0 ? (
                    <span className="text-on-surface-muted/60" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full border border-outline-variant/40 bg-surface-container px-3 py-1 font-mono text-[11px] text-on-surface-muted">
                    {stat}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
