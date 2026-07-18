import { useState } from 'react';
import type { WorkspaceConfig } from '../lib/types';

export function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={emphasis ? 'metric-card emphasis' : 'metric-card'}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

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
    <div className="welcome-view">
      <div className="terminal-orb">PX</div>
      <h1>Keep each project isolated, share faster, and let contracts evolve with the code.</h1>
      <p>
        Every workspace stores its own process profile, guardrails, captured traffic,
        Postman collection, and generated Swagger. When the project changes, the
        contract updates with it.
      </p>
      <button className="primary-command" onClick={onDiscover}>
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

interface LobbyViewProps {
  workspaces: WorkspaceConfig[];
  activeWorkspaceId: string | null;
  newWorkspaceName: string;
  onWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
}

export function LobbyView({
  workspaces,
  activeWorkspaceId,
  newWorkspaceName,
  onWorkspaceNameChange,
  onCreateWorkspace,
  onSelectWorkspace,
  onDeleteWorkspace,
}: LobbyViewProps) {
  const [onboardingStep, setOnboardingStep] = useState(1);

  if (workspaces.length === 0) {
    return (
      <div className="lobby-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '12px' }}>
        {onboardingStep === 1 ? (
          <div className="onboarding-welcome" style={{ margin: 0, width: '100%', maxWidth: '540px' }}>
            <div className="welcome-icon">🚀</div>
            <h2>Welcome to Proxync!</h2>
            <p style={{ marginBottom: '24px' }}>
              Isolated workspaces keep your projects, shares, guardrails, and APIs organized. Make one workspace per repository or service context.
            </p>
            <button 
              className="primary-command" 
              onClick={() => setOnboardingStep(2)}
              style={{ width: '100%', padding: '12px 24px', fontSize: '13px' }}
            >
              Get Started →
            </button>
          </div>
        ) : (
          <div className="onboarding-welcome" style={{ margin: 0, width: '100%', maxWidth: '540px' }}>
            <div className="welcome-icon">🏗️</div>
            <h2>Name your first workspace</h2>
            <p style={{ marginBottom: '20px' }}>
              Usually, this matches your repository or project name (e.g. <code>my-react-app</code>).
            </p>
            <div className="workspace-create" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                value={newWorkspaceName}
                onChange={(event) => onWorkspaceNameChange(event.target.value)}
                placeholder="e.g. ecommerce-api"
                aria-label="New workspace"
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  background: 'rgba(4, 10, 14, 0.86)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newWorkspaceName.trim()) {
                    onCreateWorkspace();
                  }
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
                <button 
                  className="sidebar-action secondary" 
                  onClick={() => setOnboardingStep(1)}
                  style={{ flex: 1, padding: '12px', height: 'auto', fontWeight: 'bold' }}
                >
                  ← Back
                </button>
                <button 
                  className="sidebar-action" 
                  onClick={onCreateWorkspace}
                  disabled={!newWorkspaceName.trim()}
                  style={{ flex: 2, padding: '12px', height: 'auto', fontWeight: 'bold' }}
                >
                  Create Workspace
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lobby-view">
      <div className="page-heading">
        <div>
          <h1>Workspace lobby</h1>
          <p>
            Keep each project isolated here. Every workspace carries its own saved
            share profile, guardrails, Postman collection, Swagger contract, and notes.
          </p>
        </div>
      </div>

      <section className="console-section lobby-create">
        <div>
          <h2>Create a workspace</h2>
          <p>
            Make one workspace per project so you can come back to the same setup
            later without mixing configs.
          </p>
        </div>
        <div className="workspace-create">
          <input
            value={newWorkspaceName}
            onChange={(event) => onWorkspaceNameChange(event.target.value)}
            placeholder="New workspace"
            aria-label="New workspace"
          />
          <button className="sidebar-action" onClick={onCreateWorkspace}>
            Create
          </button>
        </div>
      </section>

      <section className="lobby-grid">
        {workspaces.map((workspace) => (
          <article
            key={workspace.id}
            className={
              workspace.id === activeWorkspaceId
                ? 'lobby-card active'
                : 'lobby-card'
            }
          >
            <div className="lobby-card-head">
              <div>
                <strong>{workspace.name}</strong>
                <small>{workspace.languageHint}</small>
              </div>
              <span className="badge neutral">
                {workspace.id === activeWorkspaceId ? 'Current' : 'Saved'}
              </span>
            </div>
            <div className="lobby-card-meta">
              <span>{workspace.profiles.length} saved shares</span>
              <span>{workspace.savedRequests.length} requests</span>
              <span>{workspace.guardrails.authMode} auth</span>
            </div>
            <p>{workspace.notes || 'No notes yet. This workspace is ready for project-specific context.'}</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                className="primary-command small"
                onClick={() => onSelectWorkspace(workspace.id)}
              >
                Open workspace
              </button>
              <button
                className="danger-command small"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ff8b8b',
                  cursor: 'pointer'
                }}
                onClick={() => onDeleteWorkspace(workspace.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
