"use client";

import { Activity, Copy, Check, Radar, SquareTerminal, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { useState } from "react";

type Step = {
  number: string;
  icon: LucideIcon;
  title: string;
  body: string;
  tag: string;
};

const steps: Step[] = [
  {
    number: "01",
    icon: SquareTerminal,
    title: "Install the engine",
    body: "A 12MB native binary. Download once, run everywhere. No sign-up, no telemetry, no cloud accounts. First launch brings you straight into the workspace.",
    tag: "12MB · Native Rust",
  },
  {
    number: "02",
    icon: Radar,
    title: "Instant Port Recon",
    body: "Proxync executes a single dynamic netstat scan across all IPv4 and IPv6 ports with bulk WMI/CIM process lookup. Dev frameworks auto-identified in milliseconds.",
    tag: "Dynamic Netstat",
  },
  {
    number: "03",
    icon: Activity,
    title: "Inspect & Replay",
    body: "Live traffic flows into an inspector you can filter, replay in Workbench with visual diffs, and jump straight to the exact endpoint controller in VS Code or Cursor.",
    tag: "1-Click IDE Jump",
  },
];

export function HowItWorks() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText("proxync tunnel --port 5173");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="how-it-works" className="relative scroll-mt-16 py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />

      <Container className="relative z-10">
        {/* Header */}
        <div className="mb-20 max-w-xl">
          <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
            Zero Friction Deployment
          </p>
          <h2 className="font-display text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
            Up and running
            <br />
            <span className="text-white/30">in under 60 seconds.</span>
          </h2>
        </div>

        {/* Vertical timeline */}
        <div className="relative">
          {/* Vertical spine */}
          <div
            aria-hidden="true"
            className="absolute left-[19px] top-6 bottom-6 hidden w-px bg-gradient-to-b from-primary/40 via-white/[0.05] to-transparent md:block"
          />

          <div className="space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.number} delay={i * 0.1}>
                  <div className="group relative grid grid-cols-1 gap-6 border-b border-white/[0.04] py-10 transition-colors last:border-0 hover:bg-white/[0.015] md:grid-cols-[40px_1fr] md:gap-12">
                    {/* Node circle */}
                    <div className="hidden md:flex flex-col items-center gap-2 pt-1">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-surface-container-lowest font-mono text-[13px] font-black text-primary transition-all group-hover:border-primary/40 group-hover:bg-primary/8">
                        {step.number}
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full border border-[#08090c] bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col md:flex-row md:items-start md:gap-12">
                      {/* Text */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 md:hidden">
                          <span className="font-mono text-[11px] font-black text-primary/60">{step.number}</span>
                        </div>

                        <div className="flex items-center gap-2.5 mt-1 md:mt-0">
                          <Icon className="h-4 w-4 text-white/30 shrink-0" />
                          <h3 className="font-display text-xl font-bold tracking-[-0.015em] text-white">
                            {step.title}
                          </h3>
                          <span className="hidden sm:inline-flex rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-0.5 font-mono text-[10px] text-white/30">
                            {step.tag}
                          </span>
                        </div>

                        <p className="mt-3 text-[15px] leading-relaxed text-white/40">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* CLI command strip */}
        <Reveal delay={0.3}>
          <div className="mt-16 flex justify-center">
            <div className="group inline-flex items-center gap-5 rounded-xl border border-white/[0.06] bg-[#06070a] px-6 py-4 font-mono text-sm shadow-[0_12px_48px_rgba(0,0,0,0.7)] transition-all hover:border-white/[0.1]">
              <div className="flex items-center gap-2">
                <span className="text-tertiary font-bold">$</span>
                <span className="text-white/70">proxync tunnel --port 5173</span>
                <span className="inline-block h-4 w-[7px] animate-blink bg-primary/70 ml-1" />
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-white/35 transition-colors hover:bg-white/[0.07] hover:text-white/60"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-tertiary" />
                    <span className="text-tertiary font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
