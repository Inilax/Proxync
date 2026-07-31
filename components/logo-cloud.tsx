import { Container } from "@/components/ui";

const BRANDS = [
  {
    name: "Cloudflare",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
      </svg>
    ),
  },
  {
    name: "Rust",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    ),
  },
  {
    name: "Docker",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3h-2v3h2V3zm-4 4H7v3h2V7zm8 0h-2v3h2V7zm-4 0h-2v3h2V7zM5 11H3v3h2v-3zm16 0h-2v3h2v-3zm-4 0h-2v3h2v-3zm-4 0h-2v3h2v-3zm-4 0H7v3h2v-3zm12.5 4H2.5c-.3 0-.5.2-.5.5v.5c0 3.6 2.9 6.5 6.5 6.5h7c3.6 0 6.5-2.9 6.5-6.5v-.5c0-.3-.2-.5-.5-.5z" />
      </svg>
    ),
  },
  {
    name: "Vite",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 22h20L12 2zm0 3.8l6.7 13.2H5.3L12 5.8z" />
      </svg>
    ),
  },
  {
    name: "Postman",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.8 6.8l-3.2 6.4-1.6-3.2-3.2 1.6 6.4-6.4 1.6 1.6z" />
      </svg>
    ),
  },
  {
    name: "FastAPI",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3 13h7v9l9-11h-7V2z" />
      </svg>
    ),
  },
  {
    name: "Supabase",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.35 2.1a1.2 1.2 0 0 0-1.8 1.25l1.02 6.15H4.2a1.2 1.2 0 0 0-1.01 1.84l8.46 10.56a1.2 1.2 0 0 0 1.8-1.25l-1.02-6.15h8.37a1.2 1.2 0 0 0 1.01-1.84L13.35 2.1z" />
      </svg>
    ),
  },
  {
    name: "Next.js",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2A10 10 0 1 0 22 12 10 10 0 0 0 12 2zm4.5 13.5l-5.3-7.5H9.5v7.5H8v-9h2.2l5.3 7.5h.2v-7.5h1.5v9h-0.7z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    svg: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
];

export function LogoCloud() {
  const doubleBrands = [...BRANDS, ...BRANDS];

  return (
    <section className="relative overflow-hidden border-y border-outline-variant/15 bg-surface-container-lowest/40 py-12">
      <Container>
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-muted/70">
          Trusted by engineering teams building with
        </p>
      </Container>

      <div className="relative mt-7 flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex shrink-0 animate-marquee items-center gap-12 sm:gap-16 pr-12 sm:pr-16">
          {doubleBrands.map((brand, idx) => (
            <div
              key={`${brand.name}-${idx}`}
              className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-wide text-on-surface-muted/80 transition-all duration-300 hover:text-primary hover:scale-105"
            >
              <div className="text-primary/70">{brand.svg}</div>
              <span>{brand.name}</span>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 animate-marquee items-center gap-12 sm:gap-16 pr-12 sm:pr-16" aria-hidden="true">
          {doubleBrands.map((brand, idx) => (
            <div
              key={`${brand.name}-dup-${idx}`}
              className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-wide text-on-surface-muted/80 transition-all duration-300 hover:text-primary hover:scale-105"
            >
              <div className="text-primary/70">{brand.svg}</div>
              <span>{brand.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
