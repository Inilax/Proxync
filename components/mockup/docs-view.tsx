"use client";

export function DocsView() {
  return (
    <div className="space-y-6 p-6 fade-in select-none">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Knowledge &amp; Documentation Suite</h1>
          <p className="text-xs text-on-surface-variant mt-1 font-mono">
            Embedded Proxync v0.2.0 architecture specs and tunnel guides
          </p>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
          v0.2.0 Offline Specs
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
          <h3 className="font-bold text-sm text-on-surface">Workspaces</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Link a workspace to your codebase directory to save configs, notes, and custom domains.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">2</div>
          <h3 className="font-bold text-sm text-on-surface">Start Tunnels</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Expose any local HTTP port with 1-click Cloudflare Tunnels or Localtunnel.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-sm">3</div>
          <h3 className="font-bold text-sm text-on-surface">Inspect Traffic</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            View incoming headers, bodies, duration, and auto-generated OpenAPI schemas.
          </p>
        </div>
      </div>
    </div>
  );
}
