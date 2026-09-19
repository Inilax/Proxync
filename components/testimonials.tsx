import { Star } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      quote:
        "As a freelance developer, I used to waste 20 minutes deploying WIP code to a remote staging server just so my client or QA could test a 5-minute UI fix on their phone. With Proxync, I just click Share, send them the link on Slack, and they test live while it's still running on my laptop.",
      name: "Liam Vance",
      role: "Freelance Full-Stack Developer",
      company: "Independent Contractor",
      initials: "LV",
      accent: "bg-primary/10 text-primary border-primary/20",
    },
    {
      quote:
        "Standby Mode is the killer feature every solo dev needs. When you're vibe coding in Cursor and your dev server restarts on every file save, traditional tunnels die and break your Stripe and Clerk webhooks. Proxync quietly holds the connection alive. Haven't had a 502 error in weeks.",
      name: "Maya Lin",
      role: "Indie SaaS Founder",
      company: "Formcraft Labs",
      initials: "ML",
      accent: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      quote:
        "Our QA team can test PRs against our local backend in real time without waiting for heavy Docker builds or cloud staging pipelines. If a test fails, I see the raw webhook payload immediately in the Traffic Inspector and jump straight to the exact line in VS Code.",
      name: "David Thorne",
      role: "Lead Engineer",
      company: "Apex Digital Studio",
      initials: "DT",
      accent: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    {
      quote:
        "Having an API testing studio built directly into the desktop app that bypasses browser CORS issues is huge. Best part is zero cloud tracking—our agency signs strict client NDAs, and with Proxync all test auth tokens and customer payloads stay 100% on my machine.",
      name: "Alex Rivera",
      role: "Senior Backend Consultant",
      company: "Rivera Tech Solutions",
      initials: "AR",
      accent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <section className="relative w-full max-w-5xl mx-auto px-4 py-20 sm:py-24 select-none">
      {/* Ambient Atmospheric Glow Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 left-1/4 w-96 h-96 rounded-full bg-cyan-500/[0.04] blur-[130px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-purple-500/[0.04] blur-[130px] -z-10"
      />

      {/* Header */}
      <div className="flex flex-col items-start mb-12 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1015] border border-[#1F232E] text-[11px] font-mono text-primary mb-3 shadow-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <span className="uppercase tracking-widest text-[10.5px]">Developer Stories</span>
        </div>
        <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-xl">
          Loved by builders who ship fast.
        </h2>
        <p className="mt-3 text-[#8E93A4] text-base max-w-xl leading-relaxed">
          From freelance full-stack engineers and agency dev teams to solo indie SaaS founders.
        </p>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="group relative rounded-3xl bg-[#0A0D14]/85 border border-white/[0.08] hover:border-white/[0.18] p-6 sm:p-7 flex flex-col justify-between backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.08)] overflow-hidden"
          >
            <div>
              {/* Star Rating */}
              <div className="flex items-center gap-1 mb-4" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <blockquote className="text-[#F1F2F6] text-[13.5px] sm:text-sm leading-relaxed mb-6 font-normal">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-bold ${t.accent}`}
              >
                {t.initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                <div className="font-mono text-[11px] text-[#8E93A4] truncate">
                  {t.role} · {t.company}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
