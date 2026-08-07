"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, SectionHeader } from "@/components/ui";

const faqs = [
  {
    question: "Is Proxync really local-first?",
    answer:
      "Yes. Workspaces, saved request collections, traffic history, and custom settings are serialized locally in a JSON store (%APPDATA%\\Proxync\\data.json). There is no cloud sign-up or forced cloud account required.",
  },
  {
    question: "How does Telemetry work in v0.2.0?",
    answer:
      "Telemetry is processed 100% on-device. You can choose Enhanced Telemetry (live P50/P90/P99 latency calculations and bandwidth meters for the Observability Hub) or Basic Telemetry (low CPU mode that bypasses percentile sorting to save system resources).",
  },
  {
    question: "What is the Active Internet Connectivity Guard?",
    answer:
      "Before launching Cloudflare or Localtunnel edge tunnels, Proxync performs real edge pings (checkRealInternetConnection) to verify internet connectivity, preventing CLI timeout hangs when working offline.",
  },
  {
    question: "Does the OpenAPI generator support my framework?",
    answer:
      "Yes! The v0.2.0 Automatic Multi-Framework Codebase Scanner supports Express, Fastify, Next.js, NestJS, FastAPI, Spring Boot, and Go codebases to infer OpenAPI 3.0 specs and export 2-way Playground collections.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "A native Windows x64 installer (Proxync_0.2.0_x64-setup.exe) ships today via Tauri v2 with built-in Smart Version-Aware Auto-Updates. macOS and Linux support is currently in development.",
  },
  {
    question: "What are Target Route Badges in Playground?",
    answer:
      "Playground request builders feature visual Target Route Badges (Cloudflare Edge, Public Tunnel, or Local Loopback) next to the Send button so you immediately know where your traffic is traveling.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            align="left"
            eyebrow="FAQ"
            title="Questions, answered."
            description="Everything you need to know about running Proxync locally."
          />
        </div>

        <div className="lg:col-span-7">
          <div className="divide-y divide-outline-variant/20 border-y border-outline-variant/20">
            {faqs.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left ring-focus"
                  >
                    <span className="text-base font-medium text-on-surface">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-on-surface-muted transition-transform duration-300",
                        isOpen && "rotate-180 text-primary",
                      )}
                    />
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-8 text-[15px] leading-relaxed text-on-surface-variant">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
