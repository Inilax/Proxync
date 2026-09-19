"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Is Proxync compliant with enterprise security and client NDAs?",
      answer:
        "Yes. Proxync is built on a strict 100% local-first architecture: zero customer payloads, tokens, headers, or request histories are ever transmitted to or stored on third-party cloud infrastructure. All data resides strictly on your machine in local JSON and SQLite storage. An integrated SSRF Intranet Shield blocks private network scanning, and diagnostic logs automatically redact Authorization headers and API keys, making Proxync safe under strict enterprise NDAs, SOC 2 compliance, and healthcare environments.",
    },
    {
      question: "Can clients or QA testers view my app on their phone without installing Proxync?",
      answer:
        "Yes! When you click Share, Proxync assigns an instant HTTPS public web link (like https://px-*.proxync.dev). Anyone on iOS, Android, or desktop can open that link directly in their standard mobile browser to test your local app in real time. They never have to install Proxync, configure DNS, or create an account.",
    },
    {
      question: "What is Resilient Standby Mode and how does it protect webhooks?",
      answer:
        "Unlike traditional tunneling CLI tools that crash and return 502 Bad Gateway when you restart your server or hot-reload code, Proxync holds your public URL in Standby. External webhooks from Stripe, GitHub, or Shopify receive a temporary holding response, and buffered requests are delivered the moment your dev server boots back up.",
    },
    {
      question: "Why do I never get CORS errors when testing APIs in Proxync's Playground?",
      answer:
        "Browser extensions and web-based API tools run inside your web browser's security sandbox, which strictly enforces Cross-Origin Resource Sharing (CORS) rules. Proxync's Playground executes requests natively through our desktop Rust networking engine directly at the OS socket level, where browser CORS restrictions do not apply.",
    },
    {
      question: "Can I run and share multiple local dev servers at the same time?",
      answer:
        "Yes. You can run Next.js on port 3000, FastAPI on port 8000, and a backend service on 4000 simultaneously. Proxync automatically discovers each listening port, assigns independent public URLs, and tags every incoming request in the Traffic Inspector with deterministic port and server metadata so logs never get mixed up.",
    },
    {
      question: "Is Proxync really free? Are there any hidden limits or subscription paywalls?",
      answer:
        "Proxync is 100% free and open-source under the permissive Apache 2.0 license. There are no monthly subscriptions, no tunnel session duration limits, no rate limits, and no credit card required. You download the app and start building.",
    },
  ];

  return (
    <section id="faq" className="relative w-full max-w-5xl mx-auto px-4 py-20 sm:py-24 scroll-mt-20 overflow-hidden">
      {/* Ambient Atmospheric Glow Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-12 left-1/4 w-96 h-96 rounded-full bg-cyan-500/[0.04] blur-[130px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 right-1/4 w-96 h-96 rounded-full bg-purple-500/[0.04] blur-[130px] -z-10"
      />

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Left Sticky Header */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1015] border border-[#1F232E] text-[11px] font-mono text-primary mb-3 shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="uppercase tracking-widest text-[10.5px]">Knowledge Base</span>
          </div>
          <h2 className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Questions,
            <br />
            <span className="text-[#8E93A4]">answered.</span>
          </h2>
          <p className="mt-4 text-[#8E93A4] text-sm leading-relaxed max-w-xs">
            Everything you need to know about running Proxync locally on your workstation.
          </p>
        </div>

        {/* Right Accordion List */}
        <div className="lg:col-span-8">
          <div className="divide-y divide-[#1F232E] border-y border-[#1F232E]">
            {faqs.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={item.question} className="py-2">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-start justify-between gap-6 py-4 text-left transition-colors hover:text-white group"
                  >
                    <span
                      className={cn(
                        "text-[15px] leading-snug font-medium transition-colors",
                        isOpen ? "text-white font-semibold" : "text-[#8E93A4] group-hover:text-white"
                      )}
                    >
                      {item.question}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all",
                        isOpen
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-[#1F232E] text-[#54596B] group-hover:border-[#2A2F3D] group-hover:text-[#8E93A4]"
                      )}
                    >
                      {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </span>
                  </button>

                  <div
                    id={`faq-panel-${i}`}
                    className={cn(
                      "grid transition-[grid-template-rows] duration-250 ease-out",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-8 text-[14px] leading-relaxed text-[#8E93A4]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
