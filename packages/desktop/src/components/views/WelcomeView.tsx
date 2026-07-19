/**
 * WelcomeView.tsx — Redesigned overview/welcome screen
 * Shows workspace summary with animated hero and metric cards.
 */
import type { WorkspaceConfig } from './SharedComponents';
import { Metric } from './SharedComponents';

export function WelcomeView({
  workspace,
  processCount,
  tunnelCount,
  requestCount,
  onDiscover,
  onUpdateNotes,
}: {
  workspace: WorkspaceConfig | null;
  processCount: number;
  tunnelCount: number;
  requestCount: number;
  onDiscover: () => void;
  onUpdateNotes: (notes: string) => void;
}) {
  return (
    <div className="welcome-view fade-in">
      <div className="terminal-orb">
        <img className="orb-text" src="/logo.svg" alt="Proxync Logo" style={{ width: '48px', height: '48px' }} />
        <div className="orb-ring" />
      </div>
      <h1>Keep each project isolated, share faster, and let contracts evolve with the code.</h1>
      <p>
        Every workspace stores its own process profile, guardrails, captured traffic,
        Postman collection, and generated Swagger. When the project changes, the
        contract updates with it.
      </p>
      <button className="btn-primary" onClick={onDiscover}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Discover running processes
      </button>
      <div className="metric-row">
        <Metric label="Workspace" value={workspace?.name ?? 'No active'} emphasis />
        <Metric label="Live processes" value={String(processCount)} />
        <Metric label="Active tunnels" value={String(tunnelCount)} />
        <Metric label="Captured requests" value={String(requestCount)} />
      </div>

      {workspace && (
        <section className="console-section" style={{ width: '100%', maxWidth: '800px', marginTop: '24px', textAlign: 'left' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workspace notes</h2>
          <textarea
            className="form-textarea"
            value={workspace.notes ?? ''}
            onChange={(event) => onUpdateNotes(event.target.value)}
            placeholder="Keep project-specific notes, handoff context, or testing reminders here."
            style={{ minHeight: '120px' }}
          />
        </section>
      )}
    </div>
  );
}
