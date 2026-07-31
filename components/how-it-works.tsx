import { Activity, Radar, SquareTerminal, type LucideIcon } from "lucide-react";
import { Card, Container, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";

type Step = {
  number: string;
  icon: LucideIcon;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    number: "01",
    icon: SquareTerminal,
    title: "Install the engine",
    body: "A 12MB native binary. Download once, run everywhere. No sign-up, no telemetry, no cloud.",
  },
  {
    number: "02",
    icon: Radar,
    title: "Point it at localhost",
    body: "Proxync auto-detects running Vite, Node, or Django instances. One click starts the proxy.",
  },
  {
    number: "03",
    icon: Activity,
    title: "Watch the stream",
    body: "Live traffic flows into an inspector you can search, filter, replay, and export to OpenAPI.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-24">
      <Container>
        <SectionHeader
          eyebrow="From install to insight"
          title="Up and running in under a minute."
          description="No cloud account. No config wizard. No ceremony."
        />

        <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-11 hidden border-t border-dashed border-outline-variant/40 md:block"
          />
          {steps.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.1} className="relative">
              <Card className="flex h-full flex-col gap-4 bg-surface-container/95 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-sm font-bold text-primary">
                  {step.number}
                </div>
                <step.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="text-xl font-semibold tracking-tight text-on-surface">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">{step.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-12 flex justify-center">
          <div className="glass rounded-lg px-5 py-3.5 font-mono text-sm text-on-surface-variant">
            <span className="text-tertiary">$</span> proxync tunnel --port 5173
            <span className="ml-1 animate-pulse-dot text-primary">▍</span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
