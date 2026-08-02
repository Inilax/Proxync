"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Download, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { DOCS_NAV } from "@/lib/docs-nav";
import { DOWNLOAD_URL, GITHUB_URL } from "@/lib/links";
import { useLatestRelease } from "@/lib/releases";

function isActive(pathname: string, href: string): boolean {
  return pathname === href;
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
      {DOCS_NAV.map((group) => (
        <div key={group.group}>
          <p className="mb-2 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
            {group.group}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                    )}
                  >
                    {item.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function DocsHeader({
  onMenuClick,
  menuOpen,
}: {
  onMenuClick: () => void;
  menuOpen: boolean;
}) {
  const release = useLatestRelease();

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/20 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant ring-focus transition-colors hover:bg-surface-container hover:text-on-surface lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/docs" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="text-base font-semibold tracking-tight text-on-surface">
              Proxync
            </span>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="text-on-surface-muted">/</span>
              <span className="font-mono text-sm text-on-surface-muted">Docs</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden items-center gap-1.5 text-sm text-on-surface-muted transition-colors hover:text-on-surface md:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 text-sm text-on-surface-muted transition-colors hover:text-on-surface sm:inline-flex"
          >
            GitHub
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <Button href={release.downloadUrl} variant="primary" size="sm" target="_blank" rel="noopener noreferrer">
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>
    </header>
  );
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <DocsHeader
        onMenuClick={() => setMenuOpen((v) => !v)}
        menuOpen={menuOpen}
      />

      <div className="mx-auto flex w-full max-w-[90rem] flex-1">
        <aside className="sticky top-16 hidden max-h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-outline-variant/20 py-8 pl-4 pr-3 lg:block">
          <SidebarNav pathname={pathname} />
        </aside>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-outline-variant/20 bg-surface px-4 py-6 lg:hidden">
              <SidebarNav pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </aside>
          </>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
