"use client";

export function DocsView() {
  return (
    <div className="space-y-6 p-6 fade-in select-none">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Knowledge &amp; Documentation Suite</h1>
          <p className="text-xs text-on-surface-variant mt-1 font-mono">
            Embedded Proxync v0.2.1 architecture specs, Native SSH tunnels &amp; Pro Debugger guides
          </p>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
          v0.2.1 Offline Specs
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
          <h3 className="font-bold text-sm text-on-surface">Workspaces &amp; Netstat</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Link a workspace to your codebase directory to scan full listening ports dynamically with bulk WMI recon.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">2</div>
          <h3 className="font-bold text-sm text-on-surface">Native SSH &amp; Cloudflare</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Expose any local HTTP port with Direct Origin Port 2222, JIT Ed25519 certs, or Cloudflare Quick Tunnels.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-sm">3</div>
          <h3 className="font-bold text-sm text-on-surface">Traffic &amp; Pro Debugger</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Multi-tunnel segregation, bot probe noise filtering, dual-stream disk logs (`app.log` / `traffic.log`), and support bundle export.
          </p>
        </div>
      </div>
    </div>
  );
}
