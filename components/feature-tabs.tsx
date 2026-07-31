"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Check,
  Copy,
  Cpu,
  FileCode,
  Globe,
  Radar,
  Send,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, SectionHeader } from "@/components/ui";

type TabId = "tunnels" | "traffic" | "postman" | "swagger";

const tabs: { id: TabId; label: string; icon: typeof Globe }[] = [
  { id: "tunnels", label: "Tunnels", icon: Globe },
  { id: "traffic", label: "Traffic", icon: Activity },
  { id: "postman", label: "Postman", icon: Send },
  { id: "swagger", label: "Swagger", icon: FileCode },
];

const bullets: Record<TabId, string[]> = {
  tunnels: [
    "Instant Cloudflare Quick Tunnels & Localtunnel",
    "One command, public HTTPS preview",
    "Port and process recon built right in",
  ],
  traffic: [
    "Every request captured live over your tunnel",
    "Method, path, status, and timing at a glance",
    "Send any captured request straight to Postman",
  ],
  postman: [
    "Request builder with saved collections",
    "Starter requests auto-generated from your app",
    "Responses with headers and timing",
  ],
  swagger: [
    "OpenAPI 3.1 generated from live traffic",
    "Preview and JSON export in one workspace",
    "Contract updates as you test",
  ],
};

const chips: { icon: typeof Globe; label: string }[] = [
  { icon: Radar, label: "Port & Process Recon" },
  { icon: Settings2, label: "One-Click Tunnels" },
  { icon: Send, label: "Postman Workbench" },
  { icon: Cpu, label: "Rust-Powered Speed" },
];

function Bullets({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-on-surface-variant">{item}</p>
        </div>
      ))}
    </div>
  );
}

function TunnelsMockup() {
  return (
    <div className="flex min-h-[260px] flex-col justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-on-surface-muted">
        <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse-dot" />
        cloudflared tunnel · running
      </div>
      <div className="mt-3 truncate font-mono text-sm font-semibold text-primary md:text-base">
        https://proxync-1cf8-7a4e.trycloudflare.com
      </div>
      <div className="mt-2 font-mono text-[11px] tracking-wide text-on-surface-muted">
        1,284 req · 40 req/min
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-on-surface-muted">
            Live
          </span>
          <span className="relative h-5 w-9 rounded-full bg-primary/80">
            <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-container-high shadow-card" />
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 px-3 py-1 font-mono text-[11px] text-on-surface-variant">
          <Copy size={11} />
          Copy URL
        </span>
      </div>
    </div>
  );
}

const trafficRows = [
  {
    method: "GET",
    path: "/api/v1/users",
    status: 200,
    latency: "12ms",
    methodClass: "bg-primary/10 text-primary",
  },
  {
    method: "POST",
    path: "/auth/token",
    status: 201,
    latency: "8ms",
    methodClass: "bg-tertiary/10 text-tertiary",
  },
  {
    method: "DELETE",
    path: "/orders",
    status: 404,
    latency: "—",
    methodClass: "bg-error/10 text-error",
  },
];

function TrafficMockup() {
  return (
    <div className="flex min-h-[260px] flex-col justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
      <div className="overflow-hidden rounded-lg border border-outline-variant/20">
        {trafficRows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 font-mono text-[11px]",
              i !== trafficRows.length - 1 && "border-b border-outline-variant/20",
            )}
          >
            <span
              className={cn(
                "w-14 rounded px-1.5 py-0.5 text-center font-bold",
                row.methodClass,
              )}
            >
              {row.method}
            </span>
            <span className="truncate text-on-surface">{row.path}</span>
            <span
              className={cn(
                "font-bold",
                row.status >= 200 && row.status < 300 ? "text-tertiary" : "text-error",
              )}
            >
              {row.status}
            </span>
            <span className="ml-auto text-on-surface-muted">{row.latency}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3 font-mono text-[11px]">
        <div className="text-primary">GET /api/v1/users</div>
        <div className="mt-2 space-y-1 text-on-surface-muted">
          <div>
            Content-Type: <span className="text-on-surface">application/json</span>
          </div>
          <div>
            Authorization: <span className="text-on-surface">Bearer ••••••••</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostmanMockup() {
  return (
    <div className="flex min-h-[260px] flex-col justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
      <div className="flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 font-mono text-[11px]">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-bold text-primary">GET</span>
        <span className="truncate text-on-surface">/api/v1/users</span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 font-bold text-on-primary"
        >
          <Send size={11} />
          Send
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 font-mono text-[11px]">
        <span className="flex items-center gap-2">
          <Check size={12} className="text-tertiary" />
          <span className="text-tertiary">200 OK</span>
          <span className="text-on-surface-muted">12 ms</span>
        </span>
        <span className="text-on-surface-muted">application/json</span>
      </div>
      <div className="mt-3 space-y-1 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3 font-mono text-[11px] leading-relaxed">
        <div>
          <span className="text-on-surface-variant">{"{"}</span>
        </div>
        <div className="pl-3">
          <span className="text-primary">&quot;id&quot;</span>
          <span className="text-on-surface-variant">: </span>
          <span className="text-tertiary">42</span>
          <span className="text-on-surface-variant">,</span>
        </div>
        <div className="pl-3">
          <span className="text-primary">&quot;email&quot;</span>
          <span className="text-on-surface-variant">: </span>
          <span className="text-tertiary">&quot;ada@acme.dev&quot;</span>
        </div>
        <div>
          <span className="text-on-surface-variant">{"}"}</span>
        </div>
      </div>
    </div>
  );
}

function SwaggerMockup() {
  return (
    <div className="flex min-h-[260px] flex-col justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-error/50" />
        <span className="h-2 w-2 rounded-full bg-secondary/50" />
        <span className="h-2 w-2 rounded-full bg-tertiary/50" />
        <span className="ml-2 font-mono text-[11px] text-on-surface-muted">openapi.json</span>
      </div>
      <div className="space-y-1 font-mono text-[11px] leading-relaxed">
        <div>
          <span className="text-secondary">openapi:</span> <span className="text-primary">3.1.0</span>
        </div>
        <div className="pl-4">
          <span className="text-on-surface-variant">info:</span>
        </div>
        <div className="pl-8">
          <span className="text-on-surface-muted">title:</span>{" "}
          <span className="text-on-surface">Proxync generated API</span>
        </div>
        <div className="pl-8">
          <span className="text-on-surface-muted">servers:</span>{" "}
          <span className="text-tertiary">https://*.trycloudflare.com</span>
        </div>
        <div>
          <span className="text-on-surface-variant">paths:</span>
        </div>
        <div className="pl-4">
          <span className="text-tertiary">/users:</span>
        </div>
        <div className="pl-8">
          <span className="text-primary">get:</span>
        </div>
        <div className="pl-12">
          <span className="text-on-surface-muted">summary:</span>{" "}
          <span className="text-on-surface">List users</span>
        </div>
      </div>
    </div>
  );
}

function Mockup({ id }: { id: TabId }) {
  switch (id) {
    case "tunnels":
      return <TunnelsMockup />;
    case "traffic":
      return <TrafficMockup />;
    case "postman":
      return <PostmanMockup />;
    case "swagger":
      return <SwaggerMockup />;
  }
}

export function FeatureTabs() {
  const [active, setActive] = useState<TabId>("tunnels");

  return (
    <section id="product" className="relative py-24 scroll-mt-24">
      <Container>
        <SectionHeader
          eyebrow="Precision-Engineered Tooling"
          title="A suite of tools that feel native because they are."
          description="Tunnels, traffic, requests, and docs — engineered as one continuous workflow."
        />

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-lg border border-outline-variant/40 bg-surface-container-low p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary font-medium text-on-primary"
                      : "text-on-surface-muted hover:text-on-surface",
                  )}
                >
                  <Icon size={15} strokeWidth={2} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <div className="glass rounded-2xl border border-outline-variant/30 p-6 shadow-card md:p-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="grid gap-8 lg:grid-cols-2 lg:items-center"
              >
                <div className="flex flex-col justify-center">
                  <Bullets items={bullets[active]} />
                </div>
                <Mockup id={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-low px-4 py-2 font-mono text-xs text-on-surface-variant"
              >
                <Icon size={13} />
                {chip.label}
              </span>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
