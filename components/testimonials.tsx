import { Quote, Star } from "lucide-react";
import { Container, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
};

const testimonials: Testimonial[] = [
  {
    quote: "I replaced ngrok, Postman, and Wireshark in a single afternoon. My laptop fan finally stopped screaming.",
    name: "Sarah Chen",
    role: "Staff Engineer · Northwind",
    initials: "SC",
  },
  {
    quote: "The auto-generated OpenAPI spec alone is worth the download. Docs now write themselves while I code.",
    name: "Marcus Okafor",
    role: "Backend Lead · Helios",
    initials: "MO",
  },
  {
    quote: "Finally, a tunneling tool that doesn't ship my traffic to a third-party server. Security team approved it day one.",
    name: "Priya Sharma",
    role: "Security Engineer · Latice",
    initials: "PS",
  },
  {
    quote: "We replay production traffic against staging every release now. It caught three regressions last sprint.",
    name: "Tomás Rivera",
    role: "Platform Eng · Fluxir",
    initials: "TR",
  },
];

function Stars() {
  return (
    <div className="flex gap-1" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
      ))}
    </div>
  );
}

export function Testimonials() {
  const cards = testimonials.slice(0, 3);
  const featured = testimonials[3];

  return (
    <section className="bg-surface-container-low/30 py-24">
      <Container>
        <SectionHeader
          eyebrow="Loved by engineers"
          title="Built for the way teams actually ship."
          description="From indie devs to platform teams — Proxync fits into existing workflows."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1} className="h-full">
              <div className="glass relative flex h-full flex-col gap-4 rounded-xl p-6">
                <Quote
                  className="absolute right-4 top-4 h-8 w-8 text-primary/15 sm:right-5 sm:top-5 sm:h-10 sm:w-10 md:h-12 md:w-12"
                  aria-hidden="true"
                />
                <Stars />
                <p className="relative pr-8 text-[15px] leading-relaxed text-on-surface-variant">
                  {t.quote}
                </p>
                <div className="mt-auto flex items-center gap-3 border-t border-outline-variant/20 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-mono text-sm font-bold text-primary">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-on-surface">{t.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-on-surface-muted">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delay={0.4} className="md:col-span-2 lg:col-span-3">
            <div className="glass relative flex flex-col gap-8 rounded-xl p-6 md:flex-row md:items-center md:justify-between md:p-8">
              <Quote
                className="absolute right-4 top-4 h-8 w-8 text-primary/15 sm:right-6 sm:top-6 sm:h-10 sm:w-10 md:h-12 md:w-12"
                aria-hidden="true"
              />
              <div className="relative flex max-w-2xl flex-col gap-4">
                <Stars />
                <p className="text-lg leading-relaxed text-on-surface-variant">{featured.quote}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 md:flex-col md:items-start md:gap-3 md:border-l md:border-outline-variant/20 md:pl-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-mono text-base font-bold text-primary">
                  {featured.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-on-surface">{featured.name}</div>
                  <div className="mt-0.5 font-mono text-xs text-on-surface-muted">
                    {featured.role}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
