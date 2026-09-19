"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Download, Menu, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { GITHUB_REPO_URL } from "@/lib/release-constants";
import { usePlatformDownload } from "@/lib/releases";

const NAV_LINKS = [
  { href: "/#features",     label: "Features" },
  { href: "/#benchmarks",   label: "Benchmarks" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq",          label: "FAQ" },
  { href: "/docs",          label: "Docs" },
];

const ALL_SECTION_IDS = ["product", "features", "benchmarks", "how-it-works", "faq"];

function getSectionId(href: string) {
  if (href.startsWith("/#")) return href.slice(2);
  if (href.startsWith("#"))  return href.slice(1);
  return null;
}

function isRouteHref(href: string) {
  return href.startsWith("/") && !href.startsWith("/#");
}

export function Navbar() {
  const download = usePlatformDownload();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pathname = usePathname();
  const isClicking = useRef(false);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    const compute = () => {
      if (isClicking.current) return;
      if (window.scrollY < 120) { setActiveSection("product"); return; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) { setActiveSection("faq"); return; }
      let current: string | null = null;
      for (const id of ALL_SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 160) current = id;
      }
      setActiveSection(current);
    };
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          compute();
          ticking = false;
        });
        ticking = true;
      }
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);
    window.addEventListener("hashchange", compute);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
      window.removeEventListener("hashchange", compute);
      if (clickTimeout.current) clearTimeout(clickTimeout.current);
    };
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (isRouteHref(href)) return pathname?.startsWith(href) ?? false;
    if (pathname !== "/")  return false;
    const secId = getSectionId(href);
    if (!secId) return false;
    return secId === activeSection;
  };

  const handleNavClick = (href: string) => {
    const secId = getSectionId(href);
    if (secId) {
      isClicking.current = true;
      setActiveSection(secId);
      if (clickTimeout.current) clearTimeout(clickTimeout.current);
      clickTimeout.current = setTimeout(() => { isClicking.current = false; }, 1000);
    }
    setOpen(false);
  };

  return (
    <>
      {/* Top Edge Blur Veil: blurs & fades content passing above/behind the floating navbar */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-20 pointer-events-none z-40 backdrop-blur-md bg-gradient-to-b from-[#08090C] via-[#08090C]/70 to-transparent"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
        }}
      />

      <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none w-full max-w-full">
      <div className="pointer-events-auto w-full max-w-4xl rounded-full bg-[#0E1015]/90 backdrop-blur-xl border border-[#1F232E] px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shadow-2xl shadow-black/70 transition-all duration-300 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <Link href="/" className="group flex items-center gap-2 sm:gap-2.5">
            <LogoMark className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:scale-105 shrink-0" />
            <span className="font-sans font-semibold tracking-tight text-[15px] sm:text-[17px] text-white group-hover:text-primary transition-colors">
              Proxync
            </span>
          </Link>
        </div>

        {/* Center Nav Links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-1.5 lg:gap-2.5">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative px-3.5 py-1.5 text-[14px] font-medium transition-colors duration-200 rounded-md",
                  active
                    ? "text-white bg-white/[0.04]"
                    : "text-[#8E93A4] hover:text-white hover:bg-white/[0.02]"
                )}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* GitHub Star Pill: visible on desktop */}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-[#1F232E] hover:border-[#2A2F3D] hover:bg-white/[0.06] text-[13px] font-mono text-[#8E93A4] hover:text-white transition-all"
            title="Star on GitHub"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="text-amber-400 text-[11px]">★</span>
            <span>Star</span>
          </a>

          {/* Download CTA Button: visible on desktop (md+) */}
          <a
            href={download.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary-strong text-black font-semibold text-[13px] sm:text-sm tracking-tight transition-transform active:scale-95 shadow-md shadow-primary/20"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </a>

          {/* Mobile Menu Button: visible on mobile (< md) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#1F232E] bg-white/[0.04] text-[#8E93A4] transition-colors hover:bg-white/10 hover:text-white md:hidden shrink-0"
          >
            {open ? <X className="h-4 w-4 text-white" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto absolute top-[72px] inset-x-4 max-w-md mx-auto rounded-2xl bg-[#0E1015] border border-[#1F232E] p-4 shadow-2xl shadow-black/80 md:hidden z-50"
          >
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => handleNavClick(link.href)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-colors flex items-center justify-between",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-[#8E93A4] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span>{link.label}</span>
                    {isRouteHref(link.href) && <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />}
                  </a>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-[#1F232E] pt-3 flex flex-col gap-2">
              <a
                href={download.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary hover:bg-primary-strong text-black font-semibold text-xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{download.label}</span>
              </a>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.03] border border-[#1F232E] text-[#8E93A4] hover:text-white text-xs font-mono transition-colors"
              >
                <span>GitHub Repository</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
}
