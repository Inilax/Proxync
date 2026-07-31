import { Zap } from "lucide-react";
import { Container } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { GITHUB_URL } from "@/lib/links";

type FooterLink = { label: string; href: string; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[] };

const linkColumns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Tunnels", href: "#product" },
      { label: "Traffic", href: "#product" },
      { label: "Postman", href: "#product" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/docs/changelog" },
      { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "Roadmap", href: "/docs/roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

function Logo() {
  return (
    <a href="#" className="inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center">
        <LogoMark className="h-8 w-8" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-on-surface">
        Proxync
      </span>
    </a>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-lowest">
      <Container className="grid gap-10 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-on-surface-variant">
            The developer tunneling workspace studio — tunnels, traffic,
            requests, and Swagger docs in one local-first desktop app.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container px-3 py-1 font-mono text-[11px] text-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary animate-pulse-dot" />
            All systems local
          </span>
        </div>

        {linkColumns.map((col) => (
          <div key={col.title} className="lg:col-span-2">
            <h3 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
              {col.title}
            </h3>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="block py-1.5 text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-outline-variant/20">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="font-mono text-xs text-outline">
            &copy; 2026 Proxync. Developer Tunneling Workspace Studio.
          </p>
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-1.5 font-mono text-[11px] text-on-surface">
            <Zap className="h-3.5 w-3.5 text-tertiary" />
            Built with Rust &amp; Tauri
          </span>
        </Container>
      </div>
    </footer>
  );
}
