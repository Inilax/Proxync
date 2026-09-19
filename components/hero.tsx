"use client";

import { useState, useRef, useEffect } from "react";
import { Download, BookOpen, Shield, Zap, Cloud, ArrowRight, ChevronDown, Monitor, Laptop, Terminal, ExternalLink } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { usePlatformDownload, useLatestRelease, getAllReleaseAssets } from "@/lib/releases";
import { cn } from "@/lib/utils";
import { AppMockup } from "./app-mockup";
import { useCloudflareLatency } from "./latency";

export function Hero() {
  const download = usePlatformDownload();
  const latency = useCloudflareLatency();
  const release = useLatestRelease();
  const allAssets = getAllReleaseAssets(release.version);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "macos":
        return <Laptop className="h-4 w-4 text-primary shrink-0" />;
      case "linux":
        return <Terminal className="h-4 w-4 text-primary shrink-0" />;
      case "windows":
      default:
        return <Monitor className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  const latencyValue =
    latency.status === "ok"
      ? `${latency.ms}ms`
      : latency.status === "offline"
        ? "—"
        : "…";

  return (
    <section
      id="product"
      className="relative min-h-screen overflow-hidden pt-32 sm:pt-36 pb-16 flex flex-col items-center justify-center scroll-mt-16"
    >
      {/* Background Grid Pattern & Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid-pattern opacity-50 -z-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[620px] -z-10"
        style={{
          background:
            "radial-gradient(circle 600px at 50% 120px, rgba(56,189,248,0.08), transparent 70%), radial-gradient(circle 450px at 70% 80px, rgba(14,165,233,0.05), transparent 65%)",
        }}
      />

      <div className="w-full max-w-4xl mx-auto px-4 text-center flex flex-col items-center">
        {/* YC / Craft Style Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-full"
        >
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-[#0E1015] border border-[#1F232E] text-[#8E93A4] text-[11px] sm:text-[12px] font-medium tracking-tight mb-6 shadow-sm hover:border-[#2A2F3D] transition-colors max-w-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="text-[#F1F2F6] font-semibold hidden sm:inline">Proxync Studio</span>
            <span className="text-[#1F232E] hidden sm:inline">/</span>
            <span>Local-First API Tunneling</span>
            <span className="text-[#1F232E]">·</span>
            <span className="font-mono text-[10.5px] sm:text-[11px] text-primary font-medium shrink-0">v0.2.2</span>
          </div>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="font-sans text-3xl sm:text-6xl md:text-7xl font-bold tracking-[-0.04em] text-white max-w-4xl leading-[1.08] mb-6 break-words"
        >
          The tunneling studio developers{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F1F2F6] to-[#8E93A4]">
            actually want to open.
          </span>
        </motion.h1>

        {/* Subheadline with Crystal Clear Product Definition */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="font-sans text-base sm:text-lg md:text-xl text-[#8E93A4] max-w-2xl font-normal leading-relaxed mb-8 text-balance"
        >
          Instant zero-config public tunnels with Resilient Standby Mode, automatic Vite and FastAPI port sniffing, live traffic inspection, and 1-click IDE jumping. Native Rust binary, 12MB RAM, zero cloud telemetry.
        </motion.p>

        {/* Action Row: Dynamic Primary Download Split-Button + Secondary Docs CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="flex flex-col items-center gap-3 w-full max-w-xl justify-center mb-10"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            {/* Split Download Button with Dropdown Toggle */}
            <div className="relative w-full sm:w-auto" ref={dropdownRef}>
              <div className="flex w-full sm:w-auto items-stretch rounded-xl bg-white text-black shadow-lg shadow-white/5 transition-all">
                {/* Main Download CTA (Detected OS) */}
                <a
                  href={download.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-5 py-3 font-semibold text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 rounded-l-xl active:scale-[0.99]"
                >
                  <Download className="h-4 w-4 text-black" />
                  <span>{download.label}</span>
                </a>

                {/* Dropdown Toggle Chevron */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-label="Select alternative operating system"
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                  className={cn(
                    "px-3 py-3 border-l border-black/15 hover:bg-neutral-200 transition-colors rounded-r-xl flex items-center justify-center cursor-pointer",
                    isDropdownOpen && "bg-neutral-200"
                  )}
                  title="Choose other operating system or package format"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-black transition-transform duration-200",
                      isDropdownOpen && "rotate-180"
                    )}
                  />
                </button>
              </div>

              {/* Floating Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-full sm:w-[350px] z-50 rounded-2xl bg-[#0E1015]/95 backdrop-blur-xl border border-[#1F232E] p-2 shadow-2xl shadow-black/80 text-left divide-y divide-[#1F232E]/60"
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#8E93A4] font-semibold">
                        Select Platform
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        v{release.version}
                      </span>
                    </div>

                    <div className="py-1.5 space-y-1">
                      {allAssets.map((asset) => {
                        const isDetected = asset.platform === download.platform && asset.isPrimary;
                        return (
                          <a
                            key={asset.id}
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsDropdownOpen(false)}
                            className="group flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-[#14171E] transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {getPlatformIcon(asset.platform)}
                              <div className="flex flex-col min-w-0 text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-white group-hover:text-primary transition-colors truncate">
                                    {asset.label}
                                  </span>
                                  {isDetected && (
                                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-mono">
                                      Detected
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-[#8E93A4] truncate">
                                  {asset.sublabel}
                                </span>
                              </div>
                            </div>
                            <Download className="h-3.5 w-3.5 text-[#54596B] group-hover:text-primary group-hover:scale-110 transition-all shrink-0" />
                          </a>
                        );
                      })}
                    </div>

                    <div className="pt-1.5">
                      <a
                        href={release.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-mono text-[#8E93A4] hover:text-white hover:bg-white/[0.02] transition-colors"
                      >
                        <span>GitHub Release Assets &amp; Checksums</span>
                        <ExternalLink className="h-3 w-3 text-primary" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Secondary Documentation CTA */}
            <Link
              href="/docs"
              className="group w-full sm:w-auto px-5 py-3 rounded-xl bg-[#0E1015] border border-[#1F232E] hover:border-[#2A2F3D] hover:bg-[#14171E] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Read Documentation</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#54596B] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </Link>
          </div>

          {/* Dynamic OS Note */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#54596B]">
            {download.platform === "macos" ? (
              <span>
                Detected macOS (v{release.version}) ·{" "}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(true)}
                  className="text-[#8E93A4] hover:text-primary underline decoration-[#1F232E] underline-offset-2 transition-colors cursor-pointer"
                >
                  Universal .dmg or other OS
                </button>
              </span>
            ) : download.platform === "linux" ? (
              <span>
                Detected Linux (v{release.version}) ·{" "}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(true)}
                  className="text-[#8E93A4] hover:text-primary underline decoration-[#1F232E] underline-offset-2 transition-colors cursor-pointer"
                >
                  .deb, AppImage, or other OS
                </button>
              </span>
            ) : (
              <span>
                Detected Windows (v{release.version}) ·{" "}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(true)}
                  className="text-[#8E93A4] hover:text-primary underline decoration-[#1F232E] underline-offset-2 transition-colors cursor-pointer"
                >
                  macOS &amp; Linux options
                </button>
              </span>
            )}
          </div>
        </motion.div>

        {/* Quick Metrics Line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="flex flex-wrap items-center justify-center gap-y-2 gap-x-3 sm:gap-x-5 text-[11px] sm:text-[12px] font-mono text-[#54596B] mb-12 max-w-full px-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-primary">●</span>
            <span>12MB RAM Footprint</span>
          </div>
          <div className="hidden sm:block text-[#1F232E]">•</div>
          <div className="flex items-center gap-1.5">
            <span className="text-primary">●</span>
            <span>Zero Cloud Account Required</span>
          </div>
          <div className="hidden sm:block text-[#1F232E]">•</div>
          <div className="flex items-center gap-1.5">
            <span className="text-primary">●</span>
            <span>Resilient Standby Socket</span>
          </div>
          <div className="hidden sm:block text-[#1F232E]">•</div>
          <div className="flex items-center gap-1.5">
            <span className="text-secondary">●</span>
            <span>Edge Ping: {latencyValue}</span>
          </div>
        </motion.div>
      </div>

      {/* The Crown Jewel: Interactive Desktop Studio Simulator */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.38 }}
        className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative mt-12 sm:mt-16"
      >
        {/* Ambient Studio Backlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-8 h-3/4 rounded-full bg-primary/[0.04] blur-3xl -z-10"
        />

        {/* Floating Badges */}
        <div className="glass absolute -top-9 sm:-top-11 right-6 lg:-right-4 z-30 hidden animate-float items-center gap-2 rounded-full border border-primary/30 bg-[#08090C]/90 px-4 py-2 font-mono text-[11px] text-[#8E93A4] shadow-hairline backdrop-blur-xl md:flex">
          <Cloud className="h-3.5 w-3.5 text-primary" />
          <span>
            <strong className="text-primary">px-*.proxync.dev</strong> &mdash; Native Edge Tunnel
          </span>
        </div>

        <div className="glass absolute -bottom-9 sm:-bottom-11 left-6 lg:-left-4 z-30 hidden animate-float items-center gap-2 rounded-full border border-secondary/30 bg-[#08090C]/90 px-4 py-2 font-mono text-[11px] text-[#8E93A4] shadow-hairline backdrop-blur-xl md:flex [animation-delay:2.5s]">
          <Zap className="h-3.5 w-3.5 text-secondary" />
          <span>
            <strong className="text-secondary">&bull; Real-Time Inspector</strong> &mdash; 1-Click IDE Jump
          </span>
        </div>

        <AppMockup />
      </motion.div>
    </section>
  );
}
