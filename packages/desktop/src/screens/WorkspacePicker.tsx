import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';

interface WorkspacePickerProps {
  onSelect: (workspace: any) => void;
}

export function WorkspacePicker({ onSelect }: WorkspacePickerProps) {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const data = await api.workspaces.list();
      setWorkspaces(data);
      const saved = localStorage.getItem('proxync_workspace');
      if (saved) {
        const ws = data.find((w: any) => w.id === saved);
        if (ws) { onSelect(ws); return; }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function selectWorkspace(ws: any) {
    localStorage.setItem('proxync_workspace', ws.id);
    onSelect(ws);
  }

  async function createWorkspace() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await api.workspaces.create(newName.trim());
      showToast(`Workspace "${ws.name}" created`, 'success');
      setNewName('');
      setShowCreate(false);
      selectWorkspace(ws);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ width: 440 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">P</div>
          <span className="auth-logo-text">Proxync</span>
        </div>

        <h1 className="auth-title">Choose a workspace</h1>
        <p className="auth-subtitle">Select an existing workspace or create a new one</p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  id={`workspace-${ws.id}`}
                  className="sidebar-item"
                  style={{
                    padding: '14px 16px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    width: '100%',
                  }}
                  onClick={() => selectWorkspace(ws)}
                >
                  <div className="avatar">{ws.name[0].toUpperCase()}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ws.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {ws.memberships?.length ?? 0} member{(ws.memberships?.length ?? 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>›</span>
                </button>
              ))}

              {workspaces.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🏗️</div>
                  <p className="empty-state-title">No workspaces yet</p>
                  <p className="empty-state-desc">Create your first workspace to get started</p>
                </div>
              )}
            </div>

            {showCreate ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  id="new-workspace-name"
                  className="form-input"
                  placeholder="My Workspace"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button
                  id="create-workspace-confirm"
                  className="btn btn-primary"
                  onClick={createWorkspace}
                  disabled={creating || !newName.trim()}
                  style={{ width: 'auto', padding: '10px 16px' }}
                >
                  {creating ? <span className="spinner" /> : 'Create'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="new-workspace-btn"
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => setShowCreate(true)}
              >
                + New Workspace
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
