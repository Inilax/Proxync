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
}: {
  workspace: WorkspaceConfig | null;
  processCount: number;
  tunnelCount: number;
  requestCount: number;
  onDiscover: () => void;
}) {
  return (
    <div className="welcome-view fade-in">
      <div className="terminal-orb">
        <span className="orb-text">PX</span>
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
    </div>
  );
}
