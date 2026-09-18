"use client";

import { Star } from "lucide-react";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/reveal";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  accent: string;
};

const testimonials: Testimonial[] = [
  {
    quote: "I replaced ngrok, Postman, and Wireshark in a single afternoon. My laptop fan finally stopped screaming and our API tests are 10x faster.",
    name: "Sarah Chen",
    role: "Staff Infrastructure Engineer",
    company: "Northwind Cloud",
    initials: "SC",
    accent: "bg-primary/20 text-primary",
  },
  {
    quote: "The auto-generated OpenAPI spec alone is worth the download. Documentation now writes itself while I build routes in FastAPI.",
    name: "Marcus Okafor",
    role: "Backend Architecture Lead",
    company: "Helios Systems",
    initials: "MO",
    accent: "bg-secondary/20 text-secondary",
  },
  {
    quote: "Finally, a tunneling tool that doesn't route my customer data through a third-party server. Our SOC2 security auditor approved it immediately.",
    name: "Priya Sharma",
    role: "Principal Security Engineer",
    company: "Latice Security",
    initials: "PS",
    accent: "bg-tertiary/20 text-tertiary",
  },
  {
    quote: "We replay production webhook traffic against local dev without manual cURL scripts. It caught three catastrophic regressions last sprint before deployment.",
    name: "Tomás Rivera",
    role: "VP of Engineering",
    company: "Fluxir Fintech",
    initials: "TR",
    accent: "bg-violet-500/20 text-violet-400",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-primary/60 text-primary/60" aria-hidden="true" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="relative bg-[#060709] py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />

      <Container className="relative z-10">
        {/* Header */}
        <div className="mb-20 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
            <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
              Developer Love
            </p>
            <h2 className="font-display text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
              Built for teams
              <br />
              <span className="text-white/30">that actually ship.</span>
            </h2>
          </div>
          <p className="max-w-xs text-[14px] leading-relaxed text-white/30 lg:text-right">
            From high-growth startups to enterprise platform teams — Proxync is the local API engine.
          </p>
        </div>

        {/* 2-column masonry grid — no card borders */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div className="group relative flex flex-col gap-6">
                {/* Pull-quote accent line */}
                <div className="h-px w-10 bg-white/10 transition-all duration-500 group-hover:w-16 group-hover:bg-primary/40" />

                <Stars />

                <blockquote className="text-lg font-medium leading-relaxed text-white/70 italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${t.accent}`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white/80">{t.name}</div>
                    <div className="font-mono text-[11px] text-white/30">
                      {t.role} · {t.company}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
