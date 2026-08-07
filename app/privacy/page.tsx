import type { Metadata } from "next";
import { Lock, ShieldCheck, HardDrive, Globe, EyeOff, Server, RefreshCw, Mail, Users } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy Policy — Proxync by Inilax",
  description:
    "Proxync Privacy Policy. Local-first developer workspace studio provided by Inilax. Covers Community (Free Standalone) and Enterprise Team collaboration features.",
};

const SECTIONS = [
  {
    id: "overview",
    title: "1. Overview & Architecture (Community & Enterprise)",
    icon: ShieldCheck,
    content: `Proxync is a developer tunneling workspace studio operated and maintained by Inilax ("Inilax", "we", "us", or "our"). We are committed to protecting the privacy and security of individual software engineers, development teams, and enterprise organizations who rely on Proxync.

Proxync is offered under a dual-tier model:
• Community Edition (Standalone Free) — Operating 100% local-first on your machine. API payloads, headers, secrets, and traffic logs remain stored exclusively on your device.
• Enterprise & Team Edition (Paid Collaboration) — Providing advanced team tunnel sharing, extended tunneling duration, Proxync Self-Tunnels & managed relays, inter-team voice & chat collaboration, and organization access control.

Inilax does not sell, profile, or monetize your API traffic, source code, or personal data under any tier.`,
  },
  {
    id: "standalone-storage",
    title: "2. Local Data Processing & Storage (Standalone Free Edition)",
    icon: HardDrive,
    content: `When using Proxync as a standalone developer studio, all operational data is processed and stored exclusively on your local computer filesystem (%APPDATA%\\Proxync or platform equivalent):

• Workspaces & Process Cache — Discovered local server PIDs, working directories, and workspace notes.
• Playground Saved Collections — API request definitions, query parameters, header HashMaps, JSON body schemas, and bearer tokens.
• Traffic Interceptor Logs — HTTP & WebSocket traffic, response timing metrics, and status code distributions.
• OpenAPI Specifications — Automatically inferred OpenAPI 3.0 specs and codebase scanner exports.

None of this standalone data is transmitted to or monitored by Inilax servers.`,
  },
  {
    id: "enterprise-cloud",
    title: "3. Enterprise Features, Team Sharing & Voice/Chat (Paid Tiers)",
    icon: Users,
    content: `When team members activate Enterprise or Paid Team Tier features, Proxync provides secure cloud relay and inter-team collaboration tools:

• Team Tunnel Sharing & Extended Limits — Allows developers to share active public tunnels with authenticated team members and access extended tunnel quotas. Meta-signaling for shared tunnels is routed through secure relay protocols.
• Proxync Self-Tunnels & Custom Relays — When using Proxync Self-Tunnels or custom organization relays, tunnel traffic is forwarded through high-speed relay nodes without inspecting or storing payload contents.
• Inter-Team Voice & Chat — Real-time team voice streams and text chat are transmitted over encrypted peer-to-peer or relay connections solely to facilitate active team debugging sessions.
• Account & Billing Information — For paid accounts, payment details, organization seats, and invoicing information are handled through PCI-compliant payment processors (such as Stripe). Inilax does not store raw credit card numbers.`,
  },
  {
    id: "traffic-interception",
    title: "4. Local Network Traffic & Interception",
    icon: EyeOff,
    content: `When Proxync operates as a local intercepting proxy (for live traffic inspection, Playground request replay, or Observability analytics), all packet processing occurs strictly in-memory on your local loopback interface (127.0.0.1).

Proxync does not capture traffic outside the development ports or tunnels you explicitly configure. Payload parsing (including gzip, deflate, and brotli decompression) is executed by our native Rust binary locally on your machine without external third-party routing.`,
  },
  {
    id: "tunnels-edge",
    title: "5. Edge Tunnels & Third-Party Infrastructure",
    icon: Globe,
    content: `Proxync allows you to optionally expose local dev servers to public HTTPS URLs using third-party tunneling providers, including Cloudflare Quick Tunnels (*.trycloudflare.com) and Localtunnel (*.loca.lt), as well as native Proxync Tunnels.

When an edge tunnel is active:
• Inbound public internet traffic to your public tunnel URL is routed through the respective third-party provider's or Proxync's edge network directly to your local machine.
• Interactions with third-party providers are subject to their respective terms and privacy policies (e.g. Cloudflare Privacy Policy).

Before initiating edge connections, Proxync performs automated edge pings (Active Internet Connectivity Guard) solely to verify internet reachability and prevent CLI execution hangs.`,
  },
  {
    id: "telemetry",
    title: "6. Telemetry & Application Diagnostics",
    icon: Server,
    content: `Proxync provides user-configurable, on-device telemetry options under Settings:

• Enhanced Telemetry Mode (Default) — Computes latency percentiles (P50, P90, P99), bandwidth rates, and route rankings locally on your machine.
• Basic Low-CPU Telemetry Mode — Disables on-device sorting and percentile math to conserve hardware resources on lower-spec machines.

Inilax does not collect continuous behavioral analytics or application session tracking. Standard background update checks query official release feeds to notify you of software updates. Update requests include basic non-identifiable parameters (e.g., application version and operating system platform) required to deliver the correct release binary.`,
  },
  {
    id: "ownership-control",
    title: "7. Data Ownership & User Control",
    icon: Lock,
    content: `You retain 100% full legal and operational ownership of all source code, API payloads, workspace definitions, and collections used with Proxync.

You have total control to manage or purge your data at any time:
• Clear individual traffic logs, collections, or workspace states via the application UI.
• Perform a full data purge via Purge All Data in Settings.
• Manually delete the application data directory from your filesystem.`,
  },
  {
    id: "changes",
    title: "8. Updates to this Privacy Policy",
    icon: RefreshCw,
    content: `Inilax may update this Privacy Policy from time to time to reflect product enhancements, enterprise feature launches, legal compliance, or architectural modifications. When updates are published, the "Last Updated" date at the top of this page will be updated accordingly.

Continued use of Proxync following the posting of an updated policy constitutes your agreement to the revised terms.`,
  },
  {
    id: "contact",
    title: "9. Contact Inilax",
    icon: Mail,
    content: `If you have questions, feedback, or privacy inquiries regarding Proxync or Inilax software products, please contact our legal and support team:

• Product: Proxync Developer Tunneling Workspace Studio
• Organization: Inilax
• Support & Issues: https://github.com/Inilax/proxync
• Website: https://proxync.dev`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          {/* Header */}
          <div className="mx-auto max-w-4xl text-center">
            <Eyebrow tone="primary">Inilax Legal &amp; Compliance</Eyebrow>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-balance text-base text-on-surface-variant sm:text-lg">
              Proxync is developed by <strong className="text-on-surface">Inilax</strong>. Engineered local-first for standalone developers, with end-to-end encrypted collaboration for Enterprise teams.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 font-mono text-xs text-on-surface-muted">
              <span>Last Updated: August 7, 2026</span>
              <span>•</span>
              <span className="text-primary font-medium">Effective Version 0.2.0+ (Free &amp; Enterprise)</span>
            </div>
          </div>

          {/* Core Highlights Grid */}
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HardDrive size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-on-surface">Local-First Standalone</h3>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Standalone free mode stores workspaces, collections, and traffic logs locally on your computer with zero cloud telemetry.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
                <Users size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-on-surface">Enterprise Team Sharing</h3>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Optional paid Enterprise tier enables team tunnel sharing, extended quotas, self-tunnels, and encrypted inter-team voice &amp; chat.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Lock size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-on-surface">Zero Data Harvesting</h3>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Inilax does not sell, profile, or monetize your API traffic, bearer tokens, or codebases across any tier.
              </p>
            </div>
          </div>

          {/* Main Legal Content */}
          <div className="mx-auto mt-16 max-w-4xl space-y-10">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/60 p-6 md:p-8 shadow-card"
                >
                  <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon size={18} />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-on-surface">
                      {sec.title}
                    </h2>
                  </div>
                  <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant font-sans">
                    {sec.content}
                  </div>
                </section>
              );
            })}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
