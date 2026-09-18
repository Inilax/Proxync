import type { LucideIcon } from "lucide-react";
import { Bug, Cpu, FileCode, Globe, Layers, Lock, Radar, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Container, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/reveal";

type IconTone = "primary" | "tertiary" | "secondary";

function IconTile({ icon: Icon, tone = "primary" }: { icon: LucideIcon; tone?: IconTone }) {
  const tones: Record<IconTone, string> = {
    primary: "bg-primary/10 text-primary",
    tertiary: "bg-tertiary/10 text-tertiary",
    secondary: "bg-secondary/10 text-secondary",
  };
  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", tones[tone])}>
      <Icon size={22} strokeWidth={1.75} />
    </div>
  );
}

function CardHeading({ children }: { children: string }) {
  return (
    <h3 className="mt-5 text-lg font-semibold tracking-tight text-on-surface">{children}</h3>
  );
}

function CardCopy({ children }: { children: string }) {
  return (
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">{children}</p>
  );
}

function TabBar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-end rounded-t-lg border-x border-t border-outline-variant/30 px-2 pb-2.5 pt-2 font-mono text-[11px] font-semibold tracking-[0.14em]",
        className,
      )}
    >
      <span className="truncate">{name}</span>
    </div>
  );
}

function YamlSnippet() {
  return (
    <div className="space-y-1 leading-relaxed">
      <div>
        <span className="text-secondary">paths:</span>
      </div>
      <div className="pl-4">
        <span className="text-on-surface-variant">/users/&#123;id&#125;:</span>
      </div>
      <div className="pl-8">
        <span className="text-tertiary">get:</span>
      </div>
      <div className="pl-12">
        <span className="text-on-surface-muted">summary:</span>{" "}
        <span className="text-on-surface">Get user by ID</span>
      </div>
      <div className="pl-12">
        <span className="text-on-surface-muted">responses:</span>
      </div>
      <div className="pl-16">
        <span className="text-primary">&quot;200&quot;:</span>
      </div>
      <div className="pl-20">
        <span className="text-on-surface-muted">description:</span>{" "}
        <span className="text-primary">OK</span>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
      <span className="font-mono text-sm font-bold text-primary">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-muted">
        {label}
      </span>
    </div>
  );
}

export function FeaturesBento() {
  return (
    <section id="features-bento" className="relative py-24 scroll-mt-24">
      <Container>
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col items-start gap-4">
            <Eyebrow>The New Standard</Eyebrow>
            <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
              Stop context-switching between terminal tabs and fragile cloud tools.
            </h2>
          </div>
          <p className="hidden shrink-0 font-mono text-sm text-on-surface-muted lg:block">
            {"// Performance > Convenience"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Reveal delay={0} className="md:col-span-2 lg:col-span-4">
            <Card className="group flex h-full flex-col p-6 md:p-8">
              <IconTile icon={Layers} tone="primary" />
              <CardHeading>Unified Developer Workspace</CardHeading>
              <CardCopy>
                Proxync replaces ngrok, Postman, Wireshark, and terminal tabs with a single,
                high-performance local-first studio.
              </CardCopy>
              <div className="mt-auto pt-8">
                <div className="flex items-end gap-3 translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
                  <TabBar name="Playground" className="h-24 bg-surface-variant/50 text-outline" />
                  <TabBar name="ngrok" className="h-20 bg-surface-variant/50 text-outline" />
                  <TabBar
                    name="Proxync"
                    className="h-32 border-primary/40 bg-primary/20 font-bold text-primary"
                  />
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-2">
            <Card className="group flex h-full flex-col p-6 md:p-8">
              <IconTile icon={Radar} tone="tertiary" />
              <CardHeading>Dynamic Netstat Discovery</CardHeading>
              <CardCopy>
                Scans all listening services across IPv4 and IPv6 on any port. Single bulk WMI recon identifies frameworks with zero port hardcoding.
              </CardCopy>
              <div className="mt-auto pt-8">
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-tertiary">
                    <span className="font-bold">netstat -ano</span>
                    <span className="text-[10px] text-outline">IPv4 + IPv6</span>
                  </div>
                  <div className="mt-2 text-on-surface truncate">
                    → Next.js (:3000), Vite (:5173), FastAPI (:8000)
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.12} className="lg:col-span-2">
            <Card className="group flex h-full flex-col p-6 md:p-8">
              <IconTile icon={Globe} tone="primary" />
              <CardHeading>Resilient Standby Tunnels</CardHeading>
              <CardCopy>
                Server restarts (`Ctrl+C` or hot reload) won&apos;t kill your public URL. Proxync holds webhook URLs in standby with branded 502 fallbacks and instant auto-recovery.
              </CardCopy>
              <div className="mt-auto pt-6">
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2.5 font-mono text-[10px] space-y-1">
                  <div className="text-primary font-bold">● Standby · URL Preserved</div>
                  <div className="text-outline">Auto-Reconnects on server reboot</div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.16} className="lg:col-span-2">
            <Card className="group flex h-full flex-col p-6 md:p-8">
              <IconTile icon={Bug} tone="secondary" />
              <CardHeading>Pro Debugger &amp; Dual-Stream Logs</CardHeading>
              <CardCopy>
                Native Rust disk logging with structured AI diagnostic directives, automatic PII token redaction, and 1-click support bundle export.
              </CardCopy>
              <div className="mt-auto pt-6">
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2.5 font-mono text-[10px] space-y-1">
                  <div className="text-secondary font-bold">● app.log (Diagnostics Enabled)</div>
                  <div className="text-outline">● traffic.log (Stream On-Demand)</div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.24} className="md:col-span-2 lg:col-span-4">
            <Card className="group flex h-full flex-col p-6 md:p-8 lg:flex-row lg:items-center">
              <div className="lg:mr-12 lg:flex-1">
                <IconTile icon={Zap} tone="primary" />
                <CardHeading>Request Workbench &amp; 1-Click IDE Jumping</CardHeading>
                <CardCopy>
                  Stage multi-tab HTTP drafts, benchmark latency in milliseconds, diff live replay payloads against captured production traffic, and jump directly to the controller source code in VS Code or Cursor at the exact line number.
                </CardCopy>
              </div>
              <div className="mt-8 hidden shrink-0 lg:mt-0 lg:block">
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[11px] opacity-90 shadow-card space-y-2">
                  <div className="flex items-center justify-between text-secondary font-bold">
                    <span>⚡ Replay #3 (200 OK · 18ms)</span>
                    <span className="text-[10px] text-outline">VS Code :42</span>
                  </div>
                  <div className="text-[10px] text-outline">
                    Diff: <span className="text-secondary">+ &quot;refreshed&quot;: true</span>
                  </div>
                  <div className="text-[10px] text-primary">
                    Export: cURL · Fetch · Python · Go · Rust
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.32} className="md:col-span-2 lg:col-span-6">
            <Card className="group flex h-full flex-col items-start gap-6 p-6 md:p-8 lg:flex-row lg:items-center">
              <div className="shrink-0">
                <IconTile icon={Zap} tone="primary" />
              </div>
              <div className="lg:mr-auto">
                <CardHeading>Modular Rust Engine & Native SSH Tunnels</CardHeading>
                <CardCopy>
                  Built with Tauri v2 and decoupled domain modules. Direct origin port 2222 routing, Ed25519 JIT TLS certs, and 90% less RAM than Electron.
                </CardCopy>
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-3">
                <Stat value="90%" label="less RAM" />
                <Stat value="Ed25519" label="Zero-Trace SSH" />
                <Stat value="v0.2.1" label="Modular Core" />
              </div>
            </Card>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
