import type { LucideIcon } from "lucide-react";
import { Eye, FileCode, Layers, Lock, Zap } from "lucide-react";
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
        <span className="text-on-surface-variant">/users:</span>
      </div>
      <div className="pl-8">
        <span className="text-tertiary">get:</span>
      </div>
      <div className="pl-12">
        <span className="text-on-surface-muted">summary:</span>{" "}
        <span className="text-on-surface">Get users</span>
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
    <section id="features" className="relative py-24 scroll-mt-24">
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
              <CardHeading>Unified Workspace</CardHeading>
              <CardCopy>
                Proxync replaces ngrok, Postman, Wireshark, and half your terminal tabs with a
                single, high-performance engine.
              </CardCopy>
              <div className="mt-auto pt-8">
                <div className="flex items-end gap-3 translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
                  <TabBar name="Postman" className="h-24 bg-surface-variant/50 text-outline" />
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
              <IconTile icon={Lock} tone="tertiary" />
              <CardHeading>Zero Telemetry</CardHeading>
              <CardCopy>
                Your API keys, secrets, and traffic data never leave your machine. Local-first means
                exactly that.
              </CardCopy>
              <div className="mt-auto pt-8">
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3">
                  <div className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-tertiary">
                    <span className="h-1.5 w-1.5 rounded-full bg-tertiary animate-pulse-dot" />
                    Data Residency — Local Only
                  </div>
                  <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-variant">
                    <div className="h-full w-full rounded-full bg-tertiary" />
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.16} className="lg:col-span-2">
            <Card className="group flex h-full flex-col p-6 md:p-8">
              <IconTile icon={Eye} tone="secondary" />
              <CardHeading>Deep Visibility</CardHeading>
              <CardCopy>
                Live intercepting TCP proxy that captures every byte. Search, filter, and replay
                requests instantly.
              </CardCopy>
            </Card>
          </Reveal>

          <Reveal delay={0.24} className="md:col-span-2 lg:col-span-4">
            <Card className="group flex h-full flex-col p-6 md:p-8 lg:flex-row lg:items-center">
              <div className="lg:mr-12 lg:flex-1">
                <IconTile icon={FileCode} tone="primary" />
                <CardHeading>Auto-OpenAPI Gen</CardHeading>
                <CardCopy>
                  Don&apos;t write docs. Proxync observes your local traffic and automatically builds
                  live, interactive OpenAPI specifications as you develop.
                </CardCopy>
              </div>
              <div className="mt-8 hidden shrink-0 lg:mt-0 lg:block">
                <div className="rotate-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[11px] opacity-80 shadow-card">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-error/50" />
                    <span className="h-2 w-2 rounded-full bg-secondary/50" />
                    <span className="h-2 w-2 rounded-full bg-tertiary/50" />
                    <span className="ml-2 text-on-surface-muted">openapi.yaml</span>
                  </div>
                  <YamlSnippet />
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
                <CardHeading>Rust-Powered Speed</CardHeading>
                <CardCopy>
                  Built with Tauri v2. Consumes 90% less RAM than traditional Electron-based API
                  clients.
                </CardCopy>
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-3">
                <Stat value="90%" label="less RAM" />
                <Stat value="Rust" label="core engine" />
                <Stat value="Local" label="only" />
              </div>
            </Card>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
