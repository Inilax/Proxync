import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DocsNavItem } from "@/lib/docs-nav";

export function PrevNext({
  prev,
  next,
}: {
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
}) {
  if (!prev && !next) return null;

  return (
    <div className="mt-12 grid gap-4 border-t border-outline-variant/20 pt-6 sm:grid-cols-2">
      {prev ? (
        <a
          href={prev.href}
          className="group flex flex-col gap-1 rounded-lg border border-outline-variant/30 px-4 py-3 transition-colors hover:border-outline-variant hover:bg-surface-container"
        >
          <span className="flex items-center gap-1.5 text-xs text-on-surface-muted">
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </span>
          <span className="text-sm font-medium text-on-surface group-hover:text-primary">
            {prev.title}
          </span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-lg border border-outline-variant/30 px-4 py-3 text-right transition-colors hover:border-outline-variant hover:bg-surface-container"
        >
          <span className="flex items-center gap-1.5 text-xs text-on-surface-muted">
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-medium text-on-surface group-hover:text-primary">
            {next.title}
          </span>
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
