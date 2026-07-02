import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';

interface ApiKeysViewProps {
  workspace: any;
}

const ALL_SCOPES = ['tunnels:read', 'tunnels:write', 'tunnels:delete', 'requests:read', 'workspace:read'];

export function ApiKeysView({ workspace }: ApiKeysViewProps) {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...ALL_SCOPES]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    setLoading(true);
    try {
      const data = await api.apiKeys.list(workspace.id);
      setKeys(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await api.apiKeys.create(workspace.id, newKeyName.trim(), selectedScopes);
      setNewKey(result.key);
      setNewKeyName('');
      setShowCreate(false);
      await loadKeys();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: string, name: string) {
    if (!confirm(`Revoke key "${name}"? This cannot be undone.`)) return;
    try {
      await api.apiKeys.revoke(workspace.id, keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      showToast('API key revoked', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">API Keys</h1>
          <p className="page-subtitle">
            Drive tunnels from CI pipelines using the same Bearer auth as your session
          </p>
        </div>
        <button
          id="create-api-key-btn"
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 18px' }}
          onClick={() => setShowCreate(true)}
        >
          + New Key
        </button>
      </div>

      {/* One-time key display */}
      {newKey && (
        <div className="card">
          <div className="new-key-box">
            <div className="new-key-warning">
              ✓ Key created — copy it now. It will never be shown again.
            </div>
            <div className="new-key-value">{newKey}</div>
          </div>
          <button
            id="copy-api-key"
            className="btn btn-primary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={copyKey}
          >
            {copiedKey ? '✓ Copied!' : '📋 Copy Key'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 8, width: 'auto', padding: '10px 18px' }}
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="card">
          <div className="card-title">New API Key</div>
          <div className="form-group">
            <label className="form-label">Key Name</label>
            <input
              id="api-key-name-input"
              className="form-input"
              placeholder="e.g. CI Pipeline"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Scopes</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {ALL_SCOPES.map((scope) => (
                <label
                  key={scope}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px',
                    background: selectedScopes.includes(scope) ? 'var(--accent-dim)' : 'var(--bg-base)',
                    border: `1px solid ${selectedScopes.includes(scope) ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: 12,
                    color: selectedScopes.includes(scope) ? 'var(--text-accent)' : 'var(--text-secondary)',
                    transition: 'all 0.12s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    style={{ display: 'none' }}
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              id="confirm-create-key"
              className="btn btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              onClick={createKey}
              disabled={creating || !newKeyName.trim() || selectedScopes.length === 0}
            >
              {creating ? <span className="spinner" /> : 'Generate Key'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="card">
        <div className="card-title">Active Keys ({keys.length})</div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" style={{ width: 20, height: 20 }} />
          </div>
        ) : keys.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔑</div>
            <p className="empty-state-title">No API keys yet</p>
            <p className="empty-state-desc">
              Create an API key to open tunnels from CI pipelines or scripts
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keys.map((key) => (
              <div key={key.id} className="key-card">
                <span className="key-prefix">{key.keyPrefix}…</span>
                <div style={{ flex: 1 }}>
                  <div className="key-name">{key.name}</div>
                  <div className="key-meta">
                    {key.scopes.join(', ')} •{' '}
                    {key.lastUsedAt
                      ? `Last used ${formatAge(key.lastUsedAt)}`
                      : 'Never used'}
                  </div>
                </div>
                <button
                  id={`revoke-key-${key.id}`}
                  className="btn btn-danger"
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => revokeKey(key.id, key.name)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Usage hint */}
        <div style={{
          marginTop: 20, padding: '12px 14px',
          background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
          borderLeft: '3px solid var(--accent)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 6 }}>
            Usage Example
          </div>
          <code style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-secondary)', display: 'block', lineHeight: 1.8,
          }}>
            curl -X POST http://localhost:3000/workspaces/{workspace.id}/tunnels \<br />
            &nbsp;&nbsp;-H "Authorization: Bearer opk_…" \<br />
            &nbsp;&nbsp;-d {'{"localPort": 5173}'}
          </code>
        </div>
      </div>
    </>
  );
}

function formatAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
