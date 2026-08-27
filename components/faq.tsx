"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, SectionHeader } from "@/components/ui";

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
    question: "What is Resilient Standby Mode and how does it protect webhook testing?",
    answer:
      "Unlike conventional tunnels that crash whenever you restart your local server (Ctrl+C), Proxync holds your public URL (e.g. px-xxxx.proxync.dev) in Standby. External webhooks from Stripe, GitHub, or Shopify receive a clean branded 502 Standby response while a 1000ms background health probe automatically restores full traffic the moment your local dev server boots back up.",
  },
  {
    question: "How does the Workspace Command Palette (Ctrl+K) work?",
    answer:
      "Pressing Ctrl+K (or Cmd+K) brings up a global floating command palette allowing you to search across all active and saved workspaces, inspect active server processes, open ports, and switch workspaces in 1 click with automatic background tunnel lifecycle cleanup.",
  },
  {
    question: "Which platforms and installer versions are supported?",
    answer:
      "A native Windows x64 installer (Proxync_0.2.1_x64-setup.exe) ships today via Tauri v2 with built-in version-aware auto-updates and High-DPI setup wizards. Linux (.deb, .AppImage) and macOS (.dmg) support is planned for the upcoming release.",
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
