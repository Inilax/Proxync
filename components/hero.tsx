"use client";

import { Cloud, Download, Terminal, ChevronRight, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button, Container } from "@/components/ui";
import { usePlatformDownload } from "@/lib/releases";
import { AppMockup } from "./app-mockup";
import { useCloudflareLatency } from "./latency";

export function Hero() {
  const download = usePlatformDownload();
  const latency  = useCloudflareLatency();
  const latencyValue =
    latency.status === "ok"
      ? `${latency.ms}ms`
      : latency.status === "offline"
        ? "—"
        : "…";

  return (
    <section
      id="product"
      className="relative min-h-screen overflow-hidden pt-24 pb-0 scroll-mt-16"
    >
      {/* Diagonal grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-100"
      />

      {/* Faint top glow — barely there */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(6,182,212,0.07) 0%, transparent 70%)",
        }}
      />

      <Container className="relative z-10">
        {/* ── Split layout: text left / mockup right ── */}
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-20">

          {/* LEFT — Editorial headline + CTAs */}
          <div className="flex flex-col items-start justify-center pt-8 lg:pt-16 xl:pt-24">

            {/* Eyebrow pill */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                href="/docs/changelog"
                className="group mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1.5 font-mono text-[11px] font-semibold tracking-wider text-primary transition-all hover:border-primary/40 hover:bg-primary/10"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                DEVELOP PREVIEW
                <span className="text-white/30">·</span>
                <span className="text-white/40">Schema Drift Engine</span>
                <ChevronRight className="h-3 w-3 text-primary/40 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-display text-[52px] font-black leading-[1.04] tracking-[-0.03em] text-white sm:text-[64px] lg:text-[56px] xl:text-[68px]"
            >
              The{" "}
              <span className="text-gradient">Local-First</span>
              <br />
              API Studio.
            </motion.h1>

            {/* Subline */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mt-6 max-w-md text-[15px] leading-relaxed text-white/45"
            >
              Instant edge tunnels, real-time schema drift detection, live traffic
              interception, and a Postman-grade API playground — in one native desktop
              studio. Engineered with Rust for zero cloud lock-in.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-3"
            >
              <Button
                href={download.url}
                variant="primary"
                size="lg"
                className="group relative overflow-hidden rounded-full font-bold px-7 py-3 text-sm shadow-[0_0_0_1px_rgba(6,182,212,0.3)] hover:shadow-[0_0_28px_rgba(6,182,212,0.28)] transition-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="absolute inset-0 flex justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-700 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                  <div className="relative h-full w-8 bg-white/20" />
                </div>
                <Download className="h-4 w-4" />
                <span>{download.label}</span>
              </Button>

              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-6 py-3 text-sm font-medium text-white/50 backdrop-blur-sm transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white/80"
              >
                <Terminal className="h-3.5 w-3.5 text-primary/60" />
                Explore Docs
              </Link>
            </motion.div>

            {/* OS / trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.34 }}
              className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-white/25"
            >
              <span className="flex items-center gap-1.5 text-white/35">
                <Shield className="h-3 w-3 text-emerald-500" />
                Stable
              </span>
              <span>Windows (x64)</span>
              <span>macOS (.dmg)</span>
              <span>Linux (.deb · AppImage)</span>
            </motion.div>

            {/* Inline stat chips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="mt-10 flex flex-wrap items-center gap-2"
            >
              {[
                { value: "12MB", label: "Native Binary" },
                { value: latencyValue, label: "Edge Ping", live: true },
                { value: "100%", label: "Local Storage" },
                { value: "0 KB", label: "Cloud Telemetry" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2"
                >
                  <span className="font-mono text-sm font-bold text-white">{s.value}</span>
                  {s.live && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                  )}
                  <span className="text-xs text-white/35">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — App Mockup (preserved exactly) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative w-full lg:pt-8"
          >
            {/* Ambient glow under mockup */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-8 top-1/4 h-1/2 rounded-full bg-primary/6 blur-[80px]"
            />

            {/* Floating badges */}
            <div className="glass absolute -top-4 right-4 z-30 hidden animate-float items-center gap-2 rounded-full border border-white/[0.07] bg-[#08090c]/90 px-4 py-2 font-mono text-[11px] text-white/50 shadow-hairline backdrop-blur-xl md:flex lg:-right-4">
              <Cloud className="h-3.5 w-3.5 text-primary/60" />
              <span>
                <strong className="text-primary/80">px-*.proxync.dev</strong>
                {" "}— Native Edge Tunnel
              </span>
            </div>

            <div className="glass absolute -bottom-4 left-4 z-30 hidden animate-float items-center gap-2 rounded-full border border-white/[0.07] bg-[#08090c]/90 px-4 py-2 font-mono text-[11px] text-white/50 shadow-hairline backdrop-blur-xl md:flex lg:-left-4 [animation-delay:2.8s]">
              <Zap className="h-3.5 w-3.5 text-secondary/60" />
              <span>
                <strong className="text-secondary/80">● Real-Time Inspector</strong>
                {" "}— 1-Click IDE Jump
              </span>
            </div>

            {/* Minimal angled chrome frame */}
            <div className="relative rounded-2xl p-px bg-gradient-to-b from-white/10 via-white/[0.04] to-white/0 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]">
              <div className="relative rounded-[15px] overflow-hidden bg-surface-container-lowest">
                <AppMockup />
              </div>
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Bottom fade into next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface to-transparent"
      />
    </section>
  );
}
