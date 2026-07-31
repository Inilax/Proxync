"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, SectionHeader } from "@/components/ui";

const faqs = [
  {
    question: "Is Proxync really local-first?",
    answer:
      "Yes. Workspaces, saved requests, and captured traffic live in a JSON store on your machine. Public tunnel URLs terminate at your own box through Cloudflare Quick Tunnels or Localtunnel over HTTPS. There is no cloud storage, no telemetry, and no account required.",
  },
  {
    question: "Can I share over my local network?",
    answer:
      "Yes. Every shared process gets a LAN address that colleagues on the same network can hit instantly (http://<your-ip>:3939), and a public HTTPS URL whenever you start a tunnel.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "A native Windows x64 installer ships today. Proxync runs entirely on-device via Tauri v2 — no Electron runtime required. macOS and Linux builds are in progress.",
  },
  {
    question: "Does it work with Cloudflare or Localtunnel?",
    answer:
      "Yes. One-click tunnels support Cloudflare Quick Tunnels (trycloudflare.com) and Localtunnel, so you can test webhooks and share previews in seconds. Proxync even measures both providers' latency before you pick one.",
  },
  {
    question: "What are the system requirements?",
    answer:
      "A 64-bit OS with 2GB+ RAM. Proxync is built with Rust and consumes roughly 90% less memory than Electron-based API clients.",
  },
  {
    question: "Is Proxync free?",
    answer:
      "The engine is free to download and use locally. Pro features — like team collections and extended tunnel bandwidth — are coming soon.",
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
