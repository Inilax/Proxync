"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Download, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { usePlatformDownload } from "@/lib/releases";

const NAV_LINKS = [
  { href: "/#product",       label: "Product" },
  { href: "/#features",      label: "Features" },
  { href: "/#how-it-works",  label: "How it works" },
  { href: "/#faq",           label: "FAQ" },
  { href: "/docs",           label: "Docs" },
];

const ALL_SECTION_IDS = ["product", "features", "tunnels", "traffic", "playground", "postman", "workbench", "swagger", "how-it-works", "faq"];
const FEATURES_SUB_IDS = ["tunnels", "traffic", "playground", "postman", "workbench", "swagger"];

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
  const [scrolled, setScrolled]         = useState(false);
  const [open, setOpen]                 = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pathname  = usePathname();
  const isClicking = useRef(false);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        if (el.getBoundingClientRect().top <= 150) current = id;
      }
      setActiveSection(current);
    };
    compute();
    window.addEventListener("scroll", compute,     { passive: true });
    window.addEventListener("resize", compute);
    window.addEventListener("hashchange", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      window.removeEventListener("hashchange", compute);
    };
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (isRouteHref(href)) return pathname?.startsWith(href) ?? false;
    if (pathname !== "/")  return false;
    const secId = getSectionId(href);
    if (!secId) return false;
    if (secId === "features") return activeSection === "features" || FEATURES_SUB_IDS.includes(activeSection ?? "");
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
    <header className="fixed inset-x-0 top-0 z-50 transition-all duration-300">
      {/* Bottom hairline — always present */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-px transition-opacity duration-300",
          scrolled ? "opacity-100 bg-white/[0.06]" : "opacity-0"
        )}
      />

      <div
        className={cn(
          "relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6 transition-all duration-300",
          scrolled
            ? "bg-[#08090c]/90 backdrop-blur-2xl"
            : "bg-transparent"
        )}
      >
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <LogoMark className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight text-white group-hover:text-primary transition-colors duration-200">
            Proxync
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            v0.2.1
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative px-4 py-1.5 text-sm transition-colors duration-200",
                  active
                    ? "text-white font-medium"
                    : "text-white/50 hover:text-white/80 font-normal"
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-4 -bottom-[1px] h-px bg-primary" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Button
            href={download.url}
            variant="primary"
            size="sm"
            className="rounded-full font-semibold text-xs shadow-none hover:shadow-[0_0_24px_rgba(6,182,212,0.25)] transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </Button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="glass-strong absolute inset-x-0 top-full border-t border-white/[0.06] p-5 shadow-panel lg:hidden"
            >
              <nav aria-label="Mobile" className="flex flex-col gap-0.5">
                {NAV_LINKS.map((link) => {
                  const active = isLinkActive(link.href);
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => handleNavClick(link.href)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <Button href={download.url} variant="primary" size="md" className="w-full" target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
