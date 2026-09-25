"use client";

import { Download, Terminal, Laptop, ShieldCheck } from "lucide-react";
import { usePlatformDownload, useLatestRelease, getDownloadsForVersion } from "@/lib/releases";

export function Cta() {
  const download = usePlatformDownload();
  const release = useLatestRelease();
  const downloads = getDownloadsForVersion(release.version);

  return (
    <section id="download" className="w-full max-w-5xl mx-auto px-4 py-16 mb-8 scroll-mt-20">
      <div className="rounded-3xl bg-gradient-to-b from-[#11141D] to-[#0A0C10] border border-[#1F232E] p-8 md:p-12 relative overflow-hidden hairline-glow shadow-2xl">
        {/* Subtle Ambient Backlight */}
        <div
          aria-hidden="true"
          className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-primary/[0.08] blur-3xl pointer-events-none"
        />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#8E93A4] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Version {release.tagName} Stable</span>
            </div>

            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
              Upgrade your local tunneling workflow.
            </h2>

            <p className="text-[#8E93A4] text-sm leading-relaxed mb-5">
              Free, local-first, and open source under Apache 2.0. Install the native desktop studio with Resilient Standby Mode and 1-Click IDE jumping.
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-[12px] font-mono text-[#54596B]">
              <span className="flex items-center gap-1.5 text-[#8E93A4]">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                SHA-256 Verified
              </span>
              <span>•</span>
              <span>Windows Authenticode Signed</span>
              <span>•</span>
              <span>Zero Cloud Telemetry</span>
            </div>
          </div>

          {/* Platform Download Options (Dynamically highlight user's OS) */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 w-full lg:w-auto">
            {/* Windows */}
            <a
              href={downloads.windows.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-3.5 rounded-xl bg-[#0E1015] border ${
                download.platform === "windows"
                  ? "border-primary/50 shadow-lg shadow-primary/5"
                  : "border-[#1F232E] hover:border-primary/40"
              } text-white flex items-center gap-3.5 transition-all hover:bg-[#14171E] group min-w-[190px]`}
            >
              <Download className={`h-5 w-5 ${download.platform === "windows" ? "text-primary" : "text-[#8E93A4]"} group-hover:scale-110 transition-transform`} />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Windows</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-mono">
                    {download.platform === "windows" ? "Detected (Latest)" : "Latest"}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-[#8E93A4]">x64 Setup (.exe)</span>
              </div>
            </a>

            {/* macOS */}
            <a
              href={downloads.macos.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-3.5 rounded-xl bg-[#0E1015] border ${
                download.platform === "macos"
                  ? "border-primary/50 shadow-lg shadow-primary/5"
                  : "border-[#1F232E] hover:border-[#2A2F3D]"
              } text-white flex items-center gap-3.5 transition-all hover:bg-[#14171E] group min-w-[180px]`}
            >
              <Laptop className={`h-5 w-5 ${download.platform === "macos" ? "text-primary" : "text-[#8E93A4]"} group-hover:scale-110 transition-transform`} />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>macOS</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-mono">
                    {download.platform === "macos" ? "Detected (Latest)" : "v0.2.3"}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-[#8E93A4]">{downloads.macos.statusNote}</span>
              </div>
            </a>

            {/* Linux */}
            <a
              href={downloads.linux.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-3.5 rounded-xl bg-[#0E1015] border ${
                download.platform === "linux"
                  ? "border-primary/50 shadow-lg shadow-primary/5"
                  : "border-[#1F232E] hover:border-[#2A2F3D]"
              } text-white flex items-center gap-3.5 transition-all hover:bg-[#14171E] group min-w-[180px]`}
            >
              <Terminal className={`h-5 w-5 ${download.platform === "linux" ? "text-primary" : "text-[#8E93A4]"} group-hover:scale-110 transition-transform`} />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Linux</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-mono">
                    {download.platform === "linux" ? "Detected (Latest)" : "v0.2.3"}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-[#8E93A4]">{downloads.linux.statusNote}</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
