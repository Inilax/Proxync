/**
 * ObservabilityView.tsx — Redesigned observability dashboard
 * Dashboard-style cards with status indicators.
 */
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
      label: 'Environment health',
      value: tunnel ? 'Healthy' : 'Waiting for tunnel',
      note: 'Static mock for now',
      status: tunnel ? 'good' : 'neutral',
    },
    {
      label: 'Synthetic journeys',
      value: '4 passing / 1 flaky',
      note: 'Checkout, onboarding, auth, dashboards, uploads',
      status: 'good',
    },
    {
      label: 'Request load',
      value: `${requestCount} captured`,
      note: 'Useful once we wire real telemetry',
      status: requestCount > 0 ? 'good' : 'neutral',
    },
    {
      label: 'Workspace posture',
      value: workspace?.guardrails.piiRedaction ? 'Redaction enabled' : 'Open capture',
      note: process?.framework ?? 'No process selected',
      status: workspace?.guardrails.piiRedaction ? 'good' : 'warn',
    },
  ];

  return (
    <div className="observability-view fade-in">
      <div className="page-heading">
        <div>
          <h1>Observability</h1>
          <p>
            A static environment dashboard for now. This is where live health,
            performance, and scenario testing will land next.
          </p>
        </div>
      </div>

      <div className="observability-grid">
        {cards.map((card) => (
          <article key={card.label} className="metric-card observability-card">
            <div className={`obs-status-dot ${card.status}`} />
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <small>{card.note}</small>
          </article>
        ))}
      </div>

      <section className="console-section">
        <h2>Scenario queue</h2>
        <div className="scenario-list">
          <div>
            <strong>Landing page smoke</strong>
            <span>Ensures main route returns content and key assets.</span>
          </div>
          <div>
            <strong>API contract drift</strong>
            <span>Compares generated OpenAPI against last saved workspace snapshot.</span>
          </div>
          <div>
            <strong>Rate-limit pressure</strong>
            <span>Future synthetic traffic test based on the workspace guardrails.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
