"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Download, Menu, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { DOWNLOAD_URL, GITHUB_URL } from "@/lib/links";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
  { href: "/docs", label: "Docs" },
];

const SCROLL_SPY_OFFSET = 160;

function getSectionId(href: string) {
  return href.startsWith("#") ? href.slice(1) : null;
}

function isRouteHref(href: string) {
  return href.startsWith("/");
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const sectionIds = NAV_LINKS.flatMap((link) => {
      const id = getSectionId(link.href);
      return id ? [id] : [];
    });

    const compute = () => {
      let current: string | null = null;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY + SCROLL_SPY_OFFSET >= top) current = id;
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (isRouteHref(href)) return pathname?.startsWith(href) ?? false;
    if (pathname !== "/") return false;
    return href === `#${activeSection}`;
  };

  const handleNavClick = (href: string) => {
    if (getSectionId(href)) setActiveSection(getSectionId(href));
    setOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "glass-strong shadow-card"
          : "border-b border-transparent",
      )}
    >
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-semibold tracking-tight text-on-surface">
            Proxync
          </span>
        </a>

        <nav
          aria-label="Primary"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex"
        >
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "text-sm transition-colors",
                  active
                    ? "font-medium text-primary"
                    : "text-on-surface-muted hover:text-on-surface",
                )}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button href={DOWNLOAD_URL} variant="primary" size="sm" target="_blank" rel="noopener noreferrer">
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            href={GITHUB_URL}
            variant="ghost"
            size="sm"
            className="hidden h-8 w-8 justify-center rounded-lg p-0 sm:inline-flex"
            aria-label="Star on GitHub"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Star className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant ring-focus transition-colors hover:bg-surface-container hover:text-on-surface lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="glass-strong absolute inset-x-0 top-full rounded-b-xl border-t-0 p-4 shadow-panel lg:hidden"
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
                        "rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-on-surface-muted hover:bg-surface-container hover:text-on-surface",
                      )}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-3 border-t border-outline-variant/30 pt-3">
                <Button
                  href={DOWNLOAD_URL}
                  variant="primary"
                  size="md"
                  className="w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
