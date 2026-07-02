import { useState } from 'react';
import { clearTokens } from '../lib/api';
import { showToast } from '../lib/toast';
import { TunnelsView } from './TunnelsView';
import { ApiKeysView } from './ApiKeysView';
import { MembersView } from './MembersView';

interface DashboardProps {
  workspace: any;
  user: any;
  onLogout: () => void;
  onSwitchWorkspace: () => void;
}

type View = 'tunnels' | 'api-keys' | 'members';

export function Dashboard({ workspace, user, onLogout, onSwitchWorkspace }: DashboardProps) {
  const [view, setView] = useState<View>('tunnels');

  function handleLogout() {
    clearTokens();
    onLogout();
    showToast('Signed out', 'info');
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '4px 8px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>
            WORKSPACE
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {workspace.name}
          </div>
        </div>

        <div className="sidebar-divider" />

        <button
          id="nav-tunnels"
          className={`sidebar-item ${view === 'tunnels' ? 'active' : ''}`}
          onClick={() => setView('tunnels')}
        >
          <span className="sidebar-item-icon">⚡</span>
          Tunnels
        </button>

        <button
          id="nav-api-keys"
          className={`sidebar-item ${view === 'api-keys' ? 'active' : ''}`}
          onClick={() => setView('api-keys')}
        >
          <span className="sidebar-item-icon">🔑</span>
          API Keys
        </button>

        <button
          id="nav-members"
          className={`sidebar-item ${view === 'members' ? 'active' : ''}`}
          onClick={() => setView('members')}
        >
          <span className="sidebar-item-icon">👥</span>
          Members
        </button>

        <div className="sidebar-divider" />

        <button
          id="switch-workspace"
          className="sidebar-item"
          onClick={onSwitchWorkspace}
        >
          <span className="sidebar-item-icon">⇄</span>
          Switch Workspace
        </button>

        <div className="sidebar-user" onClick={handleLogout} id="logout-btn" title="Click to sign out">
          <div className="avatar">{initials}</div>
          <span className="avatar-name">{user?.name ?? 'User'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>↩</span>
        </div>
      </aside>

      {/* Main panel */}
      <main className="main-panel">
        {view === 'tunnels' && <TunnelsView workspace={workspace} user={user} />}
        {view === 'api-keys' && <ApiKeysView workspace={workspace} />}
        {view === 'members' && <MembersView workspace={workspace} />}
      </main>
    </div>
  );
}
