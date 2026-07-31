"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DocHeading } from "@/lib/docs-nav";

export function PageToc({ headings }: { headings: DocHeading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;
    const ids = headings.map((heading) => heading.id);

    const onScroll = () => {
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 100) current = id;
      }
      setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="sticky top-16 hidden max-h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-l border-outline-variant/20 py-8 pl-4 xl:block">
      <nav aria-label="On this page" className="flex flex-col gap-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
          On this page
        </p>
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={cn(
              "border-l text-[13px] leading-snug transition-colors",
              heading.level === 3 && "pl-3",
              heading.level === 2 && "pl-1",
              active === heading.id
                ? "border-primary font-medium text-on-surface"
                : "border-outline-variant/40 text-on-surface-muted hover:border-outline-variant hover:text-on-surface-variant",
            )}
          >
            <span className="block py-1">{heading.text}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
