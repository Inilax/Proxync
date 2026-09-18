"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";

const faqs = [
  {
    question: "Is Proxync really local-first?",
    answer:
      "Yes. Workspaces, saved request collections, traffic history, and custom settings are serialized locally in a JSON store (%APPDATA%\\Proxync\\data.json on Windows, ~/.config/Proxync on Linux/macOS). There is no cloud account or forced cloud sign-up required.",
  },
  {
    question: "What is the Pro Debugger & Dual-Stream Logging Engine in v0.2.1?",
    answer:
      "Proxync v0.2.1 introduces native Rust disk logging (%APPDATA%/Proxync/logs) with independent dual streams: Application Diagnostics (app.log, enabled by default) and Traffic Stream (traffic.log, on-demand). It features structured AI diagnostic directives, automatic PII/credential redaction, and a 1-click Support Diagnostic Bundle Exporter (proxync-support-bundle.json).",
  },
  {
    question: "How does Dynamic Netstat Full-Port Service Discovery work?",
    answer:
      "Rather than checking a static list of ports, Proxync v0.2.1 executes a single dynamic netstat -ano scan across all IPv4 and IPv6 ports combined with a single bulk WMI/CIM process query. It automatically identifies dev frameworks (Next.js, Vite, FastAPI, NestJS, Go, Spring Boot, Django, Bun) while filtering OS daemons.",
  },
  {
    question: "How do Proxync Native SSH High-Throughput Tunnels work?",
    answer:
      "Proxync Native Tunnels connect over port 2222 with high-speed hardware-accelerated ciphers (chacha20-poly1305, aes128-gcm) and JIT Ed25519 certificate signing. Temporary keys are securely destroyed on close via Rust TempDirGuard, and secure random subdomains (e.g. px-a1b2c3d4.proxync.dev) are auto-generated.",
  },
  {
    question: "What is Resilient Standby Mode?",
    answer:
      "Unlike conventional tunnels that crash whenever you restart your local server (Ctrl+C), Proxync holds your public URL (e.g. px-xxxx.proxync.dev) in Standby. External webhooks from Stripe, GitHub, or Shopify receive a clean branded 502 Standby response while a 1000ms background health probe automatically restores full traffic the moment your local dev server boots back up.",
  },
  {
    question: "What is the Emergency CVE Security Update Radar?",
    answer:
      "An unconditional pre-flight security scan runs on startup to detect critical CVE release tags ([SECURITY-CVE], [TYPE: CVE-PATCH]). It automatically alerts you and streams the update with live progress tracking, ensuring zero-day vulnerabilities are patched immediately.",
  },
  {
    question: "How does the Request Workbench and 1-Click IDE jumping work?",
    answer:
      "Workbench allows you to stage multi-tab HTTP requests, send live replays against local endpoints with millisecond duration tracking, and view side-by-side visual diffs between original captured traffic and new responses. A native Tauri IPC command also allows 1-click jumping straight to the exact endpoint controller file and line number inside VS Code or Cursor (e.g. src/routes/users.ts:42).",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "A native Windows x64 installer (Proxync_0.2.1_x64-setup.exe) ships today via Tauri v2 with built-in version-aware auto-updates and High-DPI setup wizards. Linux (.deb, .AppImage) and macOS (.dmg) support is planned for the upcoming release.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-16 py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />

      <Container>
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          {/* Left sticky header */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
              FAQ
            </p>
            <h2 className="font-display text-4xl font-black tracking-[-0.02em] text-white">
              Questions,
              <br />
              <span className="text-white/30">answered.</span>
            </h2>
            <p className="mt-5 text-[14px] leading-relaxed text-white/35">
              Everything you need to know about running Proxync locally.
            </p>
          </div>

          {/* Right accordion */}
          <div className="lg:col-span-8">
            <div className="divide-y divide-white/[0.04]">
              {faqs.map((item, i) => {
                const isOpen = openIndex === i;
                return (
                  <div key={item.question}>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      className="flex w-full items-start justify-between gap-6 py-6 text-left ring-focus transition-colors hover:text-white"
                    >
                      <span
                        className={cn(
                          "text-[15px] leading-snug transition-colors",
                          isOpen ? "text-white font-medium" : "text-white/55"
                        )}
                      >
                        {item.question}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          isOpen
                            ? "border-primary/40 bg-primary/10 text-primary rotate-45"
                            : "border-white/[0.08] text-white/20"
                        )}
                      >
                        <Plus className="h-3 w-3" />
                      </span>
                    </button>

                    <div
                      id={`faq-panel-${i}`}
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out",
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="pb-7 pr-12 text-[14px] leading-relaxed text-white/35">
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
      </Container>
    </section>
  );
}
