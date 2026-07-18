/**
 * LobbyView.tsx — Redesigned workspace lobby
 * Clean workspace cards with onboarding flow.
 */
import { useState } from 'react';
import type { WorkspaceConfig } from './SharedComponents';
import { Icons } from './SharedComponents';

export function LobbyView({
  workspaces,
  activeWorkspaceId,
  newWorkspaceName,
  onWorkspaceNameChange,
  onCreateWorkspace,
  onSelectWorkspace,
  onDeleteWorkspace,
}: {
  workspaces: WorkspaceConfig[];
  activeWorkspaceId: string | null;
  newWorkspaceName: string;
  onWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
}) {
  const [onboardingStep, setOnboardingStep] = useState(1);

  if (workspaces.length === 0) {
    return (
      <div className="lobby-view fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '12px' }}>
        {onboardingStep === 1 ? (
          <div className="onboarding-welcome" style={{ margin: 0, width: '100%', maxWidth: '540px' }}>
            <div className="welcome-icon">🚀</div>
            <h2>Welcome to Proxync!</h2>
            <p style={{ marginBottom: '24px' }}>
              Isolated workspaces keep your projects, shares, guardrails, and APIs organized. Make one workspace per repository or service context.
            </p>
            <button
              className="btn-primary"
              onClick={() => setOnboardingStep(2)}
              style={{ width: '100%', padding: '14px 24px', fontSize: '13px' }}
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
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                className="form-input"
                value={newWorkspaceName}
                onChange={(event) => onWorkspaceNameChange(event.target.value)}
                placeholder="e.g. ecommerce-api"
                aria-label="New workspace"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newWorkspaceName.trim()) {
                    onCreateWorkspace();
                  }
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
                <button
                  className="btn-ghost"
                  onClick={() => setOnboardingStep(1)}
                  style={{ flex: 1, padding: '12px', fontWeight: 'bold' }}
                >
                  ← Back
                </button>
                <button
                  className="btn-primary"
                  onClick={onCreateWorkspace}
                  disabled={!newWorkspaceName.trim()}
                  style={{ flex: 2, padding: '12px', fontWeight: 'bold' }}
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
    <div className="lobby-view fade-in">
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
            className="form-input"
            value={newWorkspaceName}
            onChange={(event) => onWorkspaceNameChange(event.target.value)}
            placeholder="New workspace"
            aria-label="New workspace"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newWorkspaceName.trim()) {
                onCreateWorkspace();
              }
            }}
          />
          <button className="btn-primary compact" onClick={onCreateWorkspace}>
            {Icons.plus} Create
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
              <span className={workspace.id === activeWorkspaceId ? 'badge accent' : 'badge muted'}>
                {workspace.id === activeWorkspaceId ? 'Current' : 'Saved'}
              </span>
            </div>
            <div className="lobby-card-meta">
              <span>{workspace.profiles.length} saved shares</span>
              <span>{workspace.savedRequests.length} requests</span>
              <span>{workspace.guardrails.authMode} auth</span>
            </div>
            <p>{workspace.notes || 'No notes yet. This workspace is ready for project-specific context.'}</p>
            <div className="lobby-card-actions">
              <button
                className="btn-primary compact"
                onClick={() => onSelectWorkspace(workspace.id)}
              >
                Open workspace
              </button>
              <button
                className="btn-danger-ghost compact"
                onClick={() => onDeleteWorkspace(workspace.id)}
              >
                {Icons.trash} Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
