import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';

interface MembersViewProps {
  workspace: any;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'var(--accent)',
  ADMIN: 'var(--yellow)',
  MEMBER: 'var(--green)',
  VIEWER: 'var(--text-muted)',
};

export function MembersView({ workspace }: MembersViewProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<any | null>(null);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await api.members.list(workspace.id);
      setMembers(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function invite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await api.members.invite(workspace.id, inviteEmail.trim(), inviteRole);
      setInviteResult(result);
      setInviteEmail('');
      setShowInvite(false);
      showToast(`Invite sent to ${inviteEmail}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setInviting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">
            {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
          </p>
        </div>
        <button
          id="invite-member-btn"
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 18px' }}
          onClick={() => setShowInvite(true)}
        >
          + Invite
        </button>
      </div>

      {/* Invite result */}
      {inviteResult && (
        <div className="card">
          <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 8 }}>
            ✓ Invite link created
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-sm)',
            color: 'var(--text-accent)', wordBreak: 'break-all',
          }}>
            {inviteResult.inviteUrl}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '8px 16px' }}
              onClick={() => {
                navigator.clipboard.writeText(inviteResult.inviteUrl);
                showToast('Invite link copied!', 'success');
              }}
            >
              📋 Copy Link
            </button>
            <button className="btn btn-ghost" onClick={() => setInviteResult(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="card">
          <div className="card-title">Invite Member</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <input
                id="invite-email-input"
                className="form-input"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && invite()}
                autoFocus
              />
            </div>
            <select
              id="invite-role-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: 14,
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="VIEWER">Viewer</option>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              id="send-invite-btn"
              className="btn btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={invite}
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? <span className="spinner" /> : 'Send Invite'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" style={{ width: 20, height: 20 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map((m) => (
              <div key={m.id} className="port-item">
                <div className="avatar">
                  {(m.user?.name ?? '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {m.user?.name ?? '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {m.user?.email}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: ROLE_COLORS[m.role] ?? 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
