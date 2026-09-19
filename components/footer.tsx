"use client";

import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { INILAX_URL } from "@/lib/links";
import { GITHUB_REPO_URL, DEFAULT_TAG, DEFAULT_RELEASE } from "@/lib/release-constants";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Benchmarks", href: "/#benchmarks" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "FAQ", href: "/#faq" },
      { label: `Release ${DEFAULT_TAG}`, href: DEFAULT_RELEASE.releaseUrl, external: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Quickstart Guide", href: "/docs/quickstart" },
      { label: "API Reference", href: "/docs/api-reference" },
      { label: "Architecture", href: "/docs/architecture" },
      { label: "Changelog", href: "/docs/changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Apache 2.0 License", href: `${GITHUB_REPO_URL}/blob/main/LICENSE`, external: true },
      { label: "Inilax Studio", href: INILAX_URL, external: true },
    ],
  },
];

export function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative w-full border-t border-[#1F232E] bg-[#06070A] pt-16 pb-12 overflow-hidden select-none">
      {/* Top Hairline Gradient Highlight */}
      <div aria-hidden="true" className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#1F232E] to-transparent" />
      <div aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Ambient Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-primary/[0.03] blur-3xl -z-10"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 lg:gap-12 items-start">
          {/* Brand & Mission Column */}
          <div className="md:col-span-5 lg:col-span-5 space-y-5">
            <Link href="/" className="group inline-flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-sm transition-transform group-hover:scale-105">
                <LogoMark className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">
                Proxync
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-[#8E93A4] max-w-sm font-normal">
              The local-first API &amp; tunneling studio for developers. Expose, inspect, and collaborate — effortlessly.
            </p>

            {/* Clean Feature Tag Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-[#8E93A4]">
                Open Source
              </span>
              <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-[#8E93A4]">
                Cross Platform
              </span>
              <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-[#8E93A4]">
                Developer First
              </span>
            </div>
          </div>

          {/* Right: 3 Nav Columns */}
          <div className="md:col-span-7 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="space-y-4">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1 text-sm text-[#8E93A4] transition-colors hover:text-white"
                        >
                          <span>{link.label}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 text-primary" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="group inline-flex items-center gap-1 text-sm text-[#8E93A4] transition-colors hover:text-white"
                        >
                          <span>{link.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="h-px w-full bg-[#1F232E]/60 my-10" />

        {/* Subfooter Row */}
        <div className="flex flex-col gap-4 text-xs text-[#8E93A4] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span>&copy; {new Date().getFullYear()} Proxync. All rights reserved.</span>
            <span className="hidden sm:inline text-[#2A2F3D]">|</span>
            <span>
              Built with ❤️ by{" "}
              <a
                href={INILAX_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-primary font-medium underline decoration-transparent hover:decoration-primary underline-offset-4 transition-all"
              >
                Inilax
              </a>
            </span>
          </div>

          {/* Back to top button */}
          <button
            type="button"
            onClick={scrollToTop}
            className="group inline-flex items-center gap-2 text-xs font-medium text-[#8E93A4] hover:text-white transition-colors cursor-pointer w-fit"
            aria-label="Scroll back to top"
          >
            <span>Back to top</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.04] border border-white/[0.08] transition-all group-hover:bg-white/[0.08] group-hover:border-white/[0.15] group-hover:-translate-y-0.5">
              <ArrowUp className="h-3.5 w-3.5 text-[#8E93A4] group-hover:text-white transition-colors" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
