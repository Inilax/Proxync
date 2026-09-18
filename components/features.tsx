"use client";

import { motion } from "motion/react";
import {
  GitCompare,
  Globe,
  Activity,
  Send,
  Zap,
  FileCode,
  Radar,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/reveal";

type Feature = {
  id?: string;
  icon: typeof Globe;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  accentBg: string;
  visual: React.ReactNode;
};

function TerminalBlock({ lines }: { lines: { color: string; text: string }[] }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#06070a] p-5 font-mono text-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="space-y-1.5">
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.color }} className="leading-relaxed">
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function DriftBadge({ field, from, to, type }: { field: string; from: string; to: string; type: "rename" | "type" | "missing" }) {
  const colors = {
    rename:  { bg: "bg-amber-500/8",  border: "border-amber-500/20",  text: "text-amber-400",  label: "RENAME" },
    type:    { bg: "bg-red-500/8",    border: "border-red-500/20",    text: "text-red-400",    label: "TYPE MISMATCH" },
    missing: { bg: "bg-orange-500/8", border: "border-orange-500/20", text: "text-orange-400", label: "MISSING KEY" },
  }[type];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3 font-mono text-[11px]`}>
      <div className={`mb-1.5 flex items-center gap-1.5 ${colors.text} font-bold`}>
        <AlertTriangle className="h-3 w-3" />
        {colors.label}
      </div>
      <div className="text-white/50">
        <span className="text-white/70">{field}</span>: <span className="line-through opacity-40">{from}</span>{" "}
        <span className="text-white/30">→</span> <span className={colors.text}>{to}</span>
      </div>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    id: "drift",
    icon: GitCompare,
    eyebrow: "Schema Drift Engine",
    title: "Real-Time API Contract Diff",
    body: "Every response is diffed against the baseline schema in-flight. Field renames, type mismatches, and missing required keys surface instantly — before they reach production.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/8 border-amber-500/20",
    visual: (
      <div className="space-y-2.5">
        <DriftBadge field="user.id" from="number" to="string" type="type" />
        <DriftBadge field="created_at" from="created_at" to="createdAt" type="rename" />
        <DriftBadge field="metadata.plan" from="present" to="missing" type="missing" />
      </div>
    ),
  },
  {
    id: "tunnels",
    icon: Globe,
    eyebrow: "Native SSH Tunnels",
    title: "Resilient Standby Mode",
    body: "When your local dev server restarts, the public URL stays alive. Stripe webhooks hit a clean 502 Standby page — not a dead socket. Traffic resumes automatically the moment your server is back.",
    accent: "text-primary",
    accentBg: "bg-primary/8 border-primary/20",
    visual: (
      <TerminalBlock
        lines={[
          { color: "#4ade80", text: "$ proxync tunnel --port 5173" },
          { color: "#06b6d4", text: "● Tunnel active  px-a1b2c3d4.proxync.dev" },
          { color: "#64748b", text: "  Ed25519 JIT cert · chacha20-poly1305" },
          { color: "#f59e0b", text: "⏸ Server down — Standby mode active" },
          { color: "#818cf8", text: "  Holding URL · probe interval 1000ms" },
          { color: "#06b6d4", text: "● Server recovered — traffic restored" },
        ]}
      />
    ),
  },
  {
    id: "traffic",
    icon: Activity,
    eyebrow: "Traffic Inspector",
    title: "Live Request Stream + Replay",
    body: "Capture every HTTP request across all tunnels simultaneously. Filter by status, method, or latency. Replay any request into the Workbench for visual diffs — and jump straight to the controller in VS Code.",
    accent: "text-secondary",
    accentBg: "bg-secondary/8 border-secondary/20",
    visual: (
      <TerminalBlock
        lines={[
          { color: "#4ade80",  text: "[12:31:02]  200  GET  /api/users          14ms" },
          { color: "#4ade80",  text: "[12:31:04]  201  POST /api/session        42ms" },
          { color: "#4ade80",  text: "[12:31:07]  200  GET  /api/health          2ms" },
          { color: "#f87171",  text: "[12:31:11]  404  DEL  /api/users/42       11ms" },
          { color: "#f59e0b",  text: "[12:31:14] DRIFT ⚠  POST /api/orders — type mismatch" },
          { color: "#818cf8",  text: "[12:31:15]  200  GET  /api/products       18ms" },
        ]}
      />
    ),
  },
  {
    id: "playground",
    icon: Send,
    eyebrow: "API Playground",
    title: "Postman-Grade Request Studio",
    body: "Multi-tab request builder with bidirectional query params, 4-run response comparison history, and full keyboard shortcuts. Your local dev collection — saved locally, never uploaded.",
    accent: "text-tertiary",
    accentBg: "bg-tertiary/8 border-tertiary/20",
    visual: (
      <div className="rounded-xl border border-white/[0.06] bg-[#06070a] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-0 border-b border-white/[0.06]">
          {["GET /users", "POST /auth", "GET /health"].map((t, i) => (
            <div
              key={t}
              className={`px-4 py-2.5 font-mono text-[11px] border-r border-white/[0.05] cursor-pointer ${i === 0 ? "text-white/80 bg-white/[0.04]" : "text-white/25"}`}
            >
              {t}
            </div>
          ))}
        </div>
        <div className="p-4 space-y-2 font-mono text-[11px]">
          <div className="flex items-center gap-3">
            <span className="rounded bg-tertiary/15 px-2 py-0.5 text-[10px] font-bold text-tertiary">GET</span>
            <span className="text-white/50">http://localhost:3000/api/v1/users</span>
          </div>
          <div className="mt-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-white/35 text-[10px]">
            {"{"} <span className="text-tertiary">"status"</span>: <span className="text-amber-400">"ok"</span>, <span className="text-tertiary">"count"</span>: <span className="text-primary">42</span> {"}"}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/25">
            <span className="text-tertiary/70">200 OK</span>
            <span>·</span>
            <span>14ms</span>
            <span>·</span>
            <span>248 B</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "workbench",
    icon: Zap,
    eyebrow: "Request Workbench",
    title: "Live Diff + IDE Jump",
    body: "Replay captured traffic against your local endpoint and see a side-by-side visual diff between original and new response. Jump straight to the exact file and line in VS Code or Cursor.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/8 border-amber-500/20",
    visual: (
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/[0.06] bg-[#06070a] p-3 font-mono text-[10px]">
          <div className="mb-2 font-bold text-white/30 uppercase tracking-wider text-[9px]">Original</div>
          <div className="space-y-1 text-white/45">
            <div>  "id": <span className="text-amber-400">42</span></div>
            <div>  "name": <span className="text-tertiary">"Alice"</span></div>
            <div className="bg-red-500/10 -mx-1 px-1 rounded">  "role": <span className="text-red-400">"admin"</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-[#06070a] p-3 font-mono text-[10px]">
          <div className="mb-2 font-bold text-white/30 uppercase tracking-wider text-[9px]">Replayed</div>
          <div className="space-y-1 text-white/45">
            <div>  "id": <span className="text-amber-400">42</span></div>
            <div>  "name": <span className="text-tertiary">"Alice"</span></div>
            <div className="bg-green-500/10 -mx-1 px-1 rounded">  "role": <span className="text-secondary">"user"</span></div>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-2 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2 font-mono text-[10px] text-secondary/70">
          <Zap className="h-3 w-3" />
          1 change detected · <span className="text-secondary">Jump to routes/users.ts:42 ↗</span>
        </div>
      </div>
    ),
  },
  {
    id: "swagger",
    icon: FileCode,
    eyebrow: "Swagger Generator",
    title: "Auto-Generated OpenAPI Docs",
    body: "Proxync scans your running server, discovers all routes via dynamic port recon, and continuously updates your OpenAPI spec. Contract health score updates in real time as your API evolves.",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/8 border-violet-500/20",
    visual: (
      <TerminalBlock
        lines={[
          { color: "#a78bfa",  text: "Scanning localhost:3000 for OpenAPI routes…" },
          { color: "#64748b",  text: "  Found: Next.js App Router · 18 endpoints" },
          { color: "#4ade80",  text: "  ✓ GET  /api/users        → 200 {User[]}" },
          { color: "#4ade80",  text: "  ✓ POST /api/auth/login   → 201 {Token}" },
          { color: "#f59e0b",  text: "  ⚠ DEL  /api/posts/{id}  → undocumented" },
          { color: "#a78bfa",  text: "Contract health: 89%  (+2 routes unresolved)" },
        ]}
      />
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-28 scroll-mt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />

      <Container className="relative z-10">
        {/* Section header */}
        <div className="mb-20 max-w-xl">
          <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
            Unreleased v0.2.2 Architecture
          </p>
          <h2 className="font-display text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
            Engineered for real
            <br />
            <span className="text-white/30">engineering teams.</span>
          </h2>
        </div>

        {/* Alternating editorial rows */}
        <div className="space-y-px">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            const isEven = i % 2 === 0;

            return (
              <Reveal key={feat.title} delay={0}>
                <div
                  id={feat.id}
                  className={`group relative grid grid-cols-1 gap-12 border-t border-white/[0.05] py-16 scroll-mt-20 transition-colors hover:bg-white/[0.015] lg:grid-cols-2 lg:gap-20 ${
                    isEven ? "" : "lg:direction-rtl"
                  }`}
                >
                  {/* Content */}
                  <div className={`flex flex-col justify-center ${isEven ? "lg:order-1" : "lg:order-2"}`}>
                    {/* Eyebrow */}
                    <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold w-fit ${feat.accentBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${feat.accent}`} />
                      <span className={feat.accent}>{feat.eyebrow}</span>
                    </div>

                    <h3 className="font-display text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
                      {feat.title}
                    </h3>

                    <p className="mt-4 text-[15px] leading-relaxed text-white/45">
                      {feat.body}
                    </p>

                    {/* Left accent line */}
                    <div
                      className={`mt-8 h-px w-12 transition-all duration-500 group-hover:w-20 ${feat.accent.replace("text-", "bg-")}`}
                    />
                  </div>

                  {/* Visual */}
                  <div className={`flex items-center ${isEven ? "lg:order-2" : "lg:order-1"}`}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      {feat.visual}
                    </motion.div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
