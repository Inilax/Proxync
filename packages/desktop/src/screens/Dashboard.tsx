import { useState } from 'react';
import { clearTokens } from '../lib/api';
import { showToast } from '../lib/toast';
import { TunnelsView } from './TunnelsView';
import { ApiKeysView } from './ApiKeysView';
import { MembersView } from './MembersView';
import { DomainsSettings } from '../components/DomainsSettings';

interface DashboardProps {
  workspace: any;
  user: any;
  onLogout: () => void;
  onSwitchWorkspace: () => void;
}

type View = 'tunnels' | 'api-keys' | 'members' | 'domains';

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
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="header-logo">P</div>
          <button
            id="switch-workspace"
            className="header-workspace-select"
            onClick={onSwitchWorkspace}
            title="Click to switch workspace"
          >
            <span>{workspace.name}</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>⇄</span>
          </button>
        </div>

        {/* Tab navigation in center */}
        <nav className="header-tabs">
          <button
            id="nav-tunnels"
            className={`header-tab ${view === 'tunnels' ? 'active' : ''}`}
            onClick={() => setView('tunnels')}
          >
            <span className="header-tab-icon">⚡</span>
            <span>Tunnels</span>
          </button>

          <button
            id="nav-api-keys"
            className={`header-tab ${view === 'api-keys' ? 'active' : ''}`}
            onClick={() => setView('api-keys')}
          >
            <span className="header-tab-icon">🔑</span>
            <span>API Keys</span>
          </button>

          <button
            id="nav-members"
            className={`header-tab ${view === 'members' ? 'active' : ''}`}
            onClick={() => setView('members')}
          >
            <span className="header-tab-icon">👥</span>
            <span>Members</span>
          </button>

          <button
            id="nav-domains"
            className={`header-tab ${view === 'domains' ? 'active' : ''}`}
            onClick={() => setView('domains')}
          >
            <span className="header-tab-icon">🌐</span>
            <span>Custom Domains</span>
          </button>
        </nav>

        {/* User avatar & logout on right */}
        <div className="header-actions">
          <div
            className="header-user"
            onClick={handleLogout}
            id="logout-btn"
            title="Click to sign out"
          >
            <div className="avatar">{initials}</div>
            <span className="avatar-name">{user?.name ?? 'User'}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>↩</span>
          </div>
        </div>
      </header>

      {/* Main panel */}
      <main className="main-panel">
        {view === 'tunnels' && <TunnelsView workspace={workspace} />}
        {view === 'api-keys' && <ApiKeysView workspace={workspace} />}
        {view === 'members' && <MembersView workspace={workspace} />}
        {view === 'domains' && <DomainsSettings workspace={workspace} />}
      </main>
    </div>
  );
}
