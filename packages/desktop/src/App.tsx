import { useState, useEffect } from 'react';
import './index.css';
import { AuthScreen } from './screens/AuthScreen';
import { WorkspacePicker } from './screens/WorkspacePicker';
import { Dashboard } from './screens/Dashboard';
import { ToastContainer } from './lib/toast';
import { api, isLoggedIn, clearTokens } from './lib/api';

type AppState = 'loading' | 'auth' | 'workspace-picker' | 'dashboard';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    if (!isLoggedIn()) {
      setAppState('auth');
      return;
    }

    try {
      const me = await api.auth.me();
      setUser(me);

      const savedWs = localStorage.getItem('proxync_workspace');
      if (savedWs) {
        try {
          const ws = await api.workspaces.get(savedWs);
          setWorkspace(ws);
          setAppState('dashboard');
          return;
        } catch {
          localStorage.removeItem('proxync_workspace');
        }
      }
      setAppState('workspace-picker');
    } catch {
      // Token expired or invalid
      clearTokens();
      setAppState('auth');
    }
  }

  async function handleAuthenticated() {
    try {
      const me = await api.auth.me();
      setUser(me);
      setAppState('workspace-picker');
    } catch {
      setAppState('auth');
    }
  }

  function handleWorkspaceSelect(ws: any) {
    setWorkspace(ws);
    setAppState('dashboard');
  }

  function handleLogout() {
    setUser(null);
    setWorkspace(null);
    setAppState('auth');
  }

  function handleSwitchWorkspace() {
    localStorage.removeItem('proxync_workspace');
    setWorkspace(null);
    setAppState('workspace-picker');
  }

  return (
    <div className="app-layout">
      {/* Titlebar */}
      <div className="titlebar">
        <div className="titlebar-logo">
          <div className="titlebar-logo-icon">P</div>
          <span className="titlebar-name">Proxync</span>
        </div>
        {workspace && (
          <span style={{
            marginLeft: 12,
            fontSize: 12,
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}>
            / {workspace.name}
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {appState === 'loading' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, var(--accent), #9c95ff)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: 'white',
              boxShadow: 'var(--shadow-accent)',
            }}>P</div>
            <div className="spinner" style={{ width: 20, height: 20 }} />
          </div>
        )}

        {appState === 'auth' && (
          <AuthScreen onAuthenticated={handleAuthenticated} />
        )}

        {appState === 'workspace-picker' && (
          <WorkspacePicker onSelect={handleWorkspaceSelect} />
        )}

        {appState === 'dashboard' && workspace && user && (
          <Dashboard
            workspace={workspace}
            user={user}
            onLogout={handleLogout}
            onSwitchWorkspace={handleSwitchWorkspace}
          />
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
