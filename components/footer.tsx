import Link from "next/link";
import { Zap } from "lucide-react";
import { Container } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { INILAX_URL } from "@/lib/links";

const FOOTER_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Comparison", href: "/#comparison" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
  { label: "Docs", href: "/docs" },
  { label: "Changelog", href: "/docs/changelog" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#060709] py-12">
      <Container className="space-y-8">
        {/* Row 1: Wordmark & Tagline + Horizontal Nav */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <LogoMark className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-tight text-white group-hover:text-primary transition-colors">
                Proxync
              </span>
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-xs text-white/40">
              The Local-First Developer Workspace Studio
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-white/40 transition-colors hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Hairline Divider */}
        <div className="h-px w-full bg-white/[0.04]" />

        {/* Row 2: Copyright & Inilax link + Platform badge */}
        <div className="flex flex-col gap-4 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Proxync.</span>
            <span>
              Crafted by{" "}
              <a
                href={INILAX_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 underline decoration-white/20 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
              >
                Inilax
              </a>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 font-mono text-[11px] text-white/50">
              <Zap className="h-3 w-3 text-primary" />
              Rust &amp; Tauri Engine
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 font-mono text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Local
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
