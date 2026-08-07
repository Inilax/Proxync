"use client";

export function ObservabilityView() {
  return (
    <div className="space-y-6 p-6 fade-in select-none">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Observability Hub</h1>
          <p className="text-xs text-on-surface-variant mt-1 font-mono">
            Real-time performance metrics &amp; Webhook stream (Enhanced Telemetry Mode)
          </p>
        </div>
        <span className="rounded-full border border-tertiary/40 bg-tertiary/10 px-3 py-1 font-mono text-xs font-bold text-tertiary">
          ● Live Telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-outline font-bold">Latency P50 / P90 / P99</span>
          <div className="mt-2 font-mono text-lg font-bold text-tertiary">14ms / 38ms / 87ms</div>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-outline font-bold">Bandwidth Meter</span>
          <div className="mt-2 font-mono text-lg font-bold text-primary">1.42 MB Transferred</div>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-outline font-bold">Status Gauge</span>
          <div className="mt-2 font-mono text-lg font-bold text-on-surface">
            <span className="text-secondary">98% 2xx</span> · <span className="text-error">2% 4xx</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-on-surface">
          <span>Incoming Webhook Interception Stream</span>
          <span className="text-tertiary">1-Click Replay Active</span>
        </div>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between rounded-lg bg-surface-container p-3 border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <span className="font-bold text-primary">POST</span>
              <span className="text-on-surface font-semibold">/webhooks/stripe (payment_intent.succeeded)</span>
            </div>
            <button className="rounded border border-primary/40 bg-primary/10 px-3 py-1 font-bold text-primary text-[10px] hover:bg-primary/20 cursor-pointer">
              Replay Webhook
            </button>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-container p-3 border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <span className="font-bold text-primary">POST</span>
              <span className="text-on-surface font-semibold">/webhooks/github (push.event)</span>
            </div>
            <button className="rounded border border-primary/40 bg-primary/10 px-3 py-1 font-bold text-primary text-[10px] hover:bg-primary/20 cursor-pointer">
              Replay Webhook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
