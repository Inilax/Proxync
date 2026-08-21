"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Check,
  Code2,
  Copy,
  Cpu,
  FileCode,
  Globe,
  Radar,
  Send,
  Settings2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, SectionHeader } from "@/components/ui";

type TabId = "tunnels" | "traffic" | "postman" | "workbench" | "swagger";

const tabs: { id: TabId; label: string; icon: typeof Globe }[] = [
  { id: "tunnels", label: "Tunnels", icon: Globe },
  { id: "traffic", label: "Traffic", icon: Activity },
  { id: "postman", label: "Playground", icon: Send },
  { id: "workbench", label: "Workbench", icon: Zap },
  { id: "swagger", label: "Swagger", icon: FileCode },
];

const bullets: Record<TabId, string[]> = {
  tunnels: [
    "Proxync Native SSH High-Throughput Tunnels (Ed25519, 2222 direct origin)",
    "Active Internet Connectivity Guard with live edge ping verification",
    "Zero-Trace TempDirGuard security & 1-click Stop All batch teardown",
  ],
  traffic: [
    "Multi-tunnel traffic segregation with deterministic port & server attribution",
    "Automated bot probe & vulnerability scanner noise filter (/.env, /.git)",
    "Headers HashMap, body preview, and 1-click Playground & Workbench request replay",
  ],
  postman: [
    "Generic Replay Engine executing native Rust HTTP requests across all methods",
    "Target Route Badges (Proxync Native, Cloudflare Edge, Public Tunnel, Local Loopback)",
    "Glass right-click context menu, collections rail, and hotkeys modal (Ctrl+/)",
  ],
  workbench: [
    "Multi-tab live execution engine with ms-precision latency & status benchmarking",
    "Side-by-side & unified visual response diffing comparing captured vs live replay payloads",
    "1-Click IDE jumping (VS Code / Cursor at exact file:line) & 5-language code export (cURL, Fetch, Python, Go, Rust)",
  ],
  swagger: [
    "Dynamic Netstat Full-Port Discovery across IPv4/IPv6 & single bulk WMI recon",
    "Incremental OpenAPI 3.0 spec ingestion with dynamic URL path parameterization",
    "Multi-framework scanner (Next.js, Vite, FastAPI, NestJS, Go, Spring Boot)",
  ],
};

const chips: { icon: typeof Globe; label: string }[] = [
  { icon: Radar, label: "Dynamic Netstat Port Scanner" },
  { icon: Globe, label: "Native SSH & Cloudflare Tunnels" },
  { icon: Zap, label: "Request Workbench & Live Diff" },
  { icon: Send, label: "Playground Replay Engine" },
  { icon: Cpu, label: "Pro Debugger & Rust Core" },
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
    <div className="flex min-h-[260px] w-full min-w-0 flex-col justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-on-surface-muted min-w-0">
        <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse-dot" />
        <span className="truncate">proxync native ssh · running (origin :2222)</span>
      </div>
      <div className="mt-3 font-mono text-xs font-semibold text-primary break-all sm:text-sm md:text-base max-w-full leading-tight">
        https://px-a1b2c3d4.proxync.dev/
      </div>
      <div className="mt-2 font-mono text-[11px] tracking-wide text-on-surface-muted">
        1,284 req · 40 req/min
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
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
          <span className="text-tertiary">https://px-*.proxync.dev</span>
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

function WorkbenchMockup() {
  return (
    <div className="flex min-h-[260px] flex-col justify-between rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[11px]">
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-tertiary/20 text-tertiary border border-tertiary/30 px-2 py-0.5 font-bold text-[10px]">
            GET
          </span>
          <span className="font-semibold text-on-surface">/api/v1/user/profile</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-secondary font-bold">
          <Check size={12} />
          <span>HTTP 200 OK · 38ms</span>
        </div>
      </div>

      {/* Controller & Architecture Node Conduit */}
      <div className="my-2.5 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container p-2">
          <div className="flex items-center gap-2">
            <FileCode size={13} className="text-primary" />
            <span className="text-on-surface font-bold text-[10.5px]">server.js:1</span>
            <span className="text-outline text-[9px]">getProfile(req, res)</span>
          </div>
          <span className="rounded bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-[9px] font-bold">
            ● INFERRED NEAR-MISS
          </span>
        </div>

        {/* Mini Architecture Flow */}
        <div className="flex items-center justify-between px-2 py-1 bg-surface-container/50 rounded-lg text-[9px] text-outline">
          <span className="text-primary font-bold">(INGRESS :4000)</span>
          <span>&rarr;</span>
          <span className="text-amber-400 font-semibold">authMiddleware</span>
          <span>&rarr;</span>
          <span className="text-tertiary font-semibold">:1 Controller</span>
          <span>&rarr;</span>
          <span className="text-secondary font-bold">200 Entity: User</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2 text-[10px] text-on-surface-variant">
        <span>1-Click IDE Jump: <strong className="text-primary">VS Code &middot; Cursor</strong></span>
        <span className="rounded bg-surface-container px-2 py-0.5 text-outline">cURL &middot; Fetch &middot; Python &middot; Rust</span>
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
    case "workbench":
      return <WorkbenchMockup />;
    case "swagger":
      return <SwaggerMockup />;
  }
}

export function FeatureTabs() {
  const [active, setActive] = useState<TabId>("tunnels");

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (hash === "tunnels") setActive("tunnels");
      else if (hash === "traffic") setActive("traffic");
      else if (hash === "playground" || hash === "postman") setActive("postman");
      else if (hash === "workbench") setActive("workbench");
      else if (hash === "swagger") setActive("swagger");
      else if (hash === "product") setActive("tunnels");
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <section id="features" className="relative py-24 scroll-mt-24">
      <div id="tunnels" className="absolute -top-24" />
      <div id="traffic" className="absolute -top-24" />
      <div id="playground" className="absolute -top-24" />
      <div id="postman" className="absolute -top-24" />
      <div id="workbench" className="absolute -top-24" />
      <div id="swagger" className="absolute -top-24" />
      <Container>
        <SectionHeader
          eyebrow="Precision-Engineered Tooling"
          title="A suite of tools that feel native because they are."
          description="Tunnels, traffic, requests, and docs — engineered as one continuous workflow."
        />

        <div className="mt-10 flex justify-center w-full min-w-0">
          <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-outline-variant/40 bg-surface-container-low p-1 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActive(tab.id);
                    const hash = tab.id === "postman" ? "playground" : tab.id;
                    if (window.location.hash !== `#${hash}`) {
                      window.history.replaceState(null, "", `#${hash}`);
                    }
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm transition-colors",
                    isActive
                      ? "bg-primary font-medium text-on-primary"
                      : "text-on-surface-muted hover:text-on-surface",
                  )}
                >
                  <Icon size={15} strokeWidth={2} className="shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 w-full min-w-0">
          <div className="glass rounded-2xl border border-outline-variant/30 p-4 sm:p-6 shadow-card md:p-10 min-w-0 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="grid gap-8 lg:grid-cols-2 lg:items-center min-w-0"
              >
                <div className="flex flex-col justify-center min-w-0">
                  <Bullets items={bullets[active]} />
                </div>
                <div className="min-w-0 w-full">
                  <Mockup id={active} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 min-w-0">
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <span
                key={chip.label}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-low px-3.5 py-1.5 sm:px-4 sm:py-2 font-mono text-[11px] sm:text-xs text-on-surface-variant"
              >
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{chip.label}</span>
              </span>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
