import type { WorkspaceConfig, ProcessCandidate, Tunnel } from './SharedComponents';

export function ObservabilityView({
  workspace,
  process,
  tunnel,
  requestCount,
}: {
  workspace: WorkspaceConfig | null;
  process: ProcessCandidate | null;
  tunnel: Tunnel | null;
  requestCount: number;
}) {
  const cards = [
    {
      label: 'Environment Health',
      value: tunnel ? 'Healthy' : 'Waiting for tunnel',
      note: 'Monitors public tunnel uptime',
      status: tunnel ? 'good' : 'neutral',
    },
    {
      label: 'Synthetic Journeys',
      value: '4 passing / 1 flaky',
      note: 'Checkout, onboarding, auth, dashboard',
      status: 'good',
    },
    {
      label: 'Request Load',
      value: `${requestCount} captured`,
      note: 'Captured request/response logs',
      status: requestCount > 0 ? 'good' : 'neutral',
    },
    {
      label: 'Workspace Posture',
      value: workspace?.guardrails.piiRedaction ? 'Redaction active' : 'Open capture',
      note: process?.framework ?? 'No process running',
      status: workspace?.guardrails.piiRedaction ? 'good' : 'warn',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 fade-in select-none">
      {/* Page Heading */}
      <div className="border-b border-outline-variant/30 pb-6">
        <h1 className="font-display-sm text-display-sm text-on-surface">Observability Hub</h1>
        <p className="text-on-surface-variant font-body-md mt-1">
          Monitor deployment health, active request streams, and contract adherence in real-time.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const dotColor =
            card.status === 'good'
              ? 'bg-secondary'
              : card.status === 'warn'
                ? 'bg-tertiary'
                : 'bg-outline';

          return (
            <div
              key={card.label}
              className="p-5 bg-surface-container rounded-xl border border-outline-variant/30 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                    {card.label}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                </div>
                <strong className="font-headline-sm text-lg text-on-surface block pt-1">
                  {card.value}
                </strong>
              </div>
              <p className="text-[10px] text-outline mt-3 truncate">{card.note}</p>
            </div>
          );
        })}
      </div>

      {/* Observability Details Panel */}
      <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/30 space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">insights</span>
            </span>
            <div>
              <h3 className="font-headline-sm text-sm text-on-surface font-bold">Active Telemetry Stream</h3>
              <p className="text-xs text-on-surface-variant">Live metrics & inspection stats for active workspace</p>
            </div>
          </div>
          <span className="text-xs font-mono text-secondary px-3 py-1 bg-secondary/10 rounded-full border border-secondary/20">
            ● Streaming
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-1">
            <span className="text-on-surface-variant font-mono">Captured Requests</span>
            <p className="text-lg font-bold text-on-surface">{requestCount}</p>
          </div>
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-1">
            <span className="text-on-surface-variant font-mono">PII Filter Status</span>
            <p className="text-lg font-bold text-primary">
              {workspace?.guardrails.piiRedaction ? 'Active (Masked)' : 'Disabled'}
            </p>
          </div>
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-1">
            <span className="text-on-surface-variant font-mono">Rate Limit Ceiling</span>
            <p className="text-lg font-bold text-tertiary">
              {workspace?.guardrails.rateLimit ?? '250 req/min'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
