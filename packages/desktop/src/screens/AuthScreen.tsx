import { useState, useEffect } from 'react';
import { api, saveTokens } from '../lib/api';
import { showToast } from '../lib/toast';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requireAuth, setRequireAuth] = useState(true);

  useEffect(() => {
    api.auth.config()
      .then((cfg) => setRequireAuth(cfg.requireAuthentication))
      .catch(() => setRequireAuth(true));
  }, []);

  async function handleContinueAsGuest() {
    setError('');
    setLoading(true);
    try {
      const tokens = await api.auth.guest();
      saveTokens(tokens.accessToken, tokens.refreshToken);
      showToast('Welcome to Proxync (Guest Session)!', 'success');
      onAuthenticated();
    } catch (err: any) {
      setError(err.message ?? 'Failed to start guest session');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let tokens;
      if (tab === 'login') {
        tokens = await api.auth.login(email, password);
      } else {
        if (name.length < 2) { setError('Name must be at least 2 characters'); setLoading(false); return; }
        tokens = await api.auth.signup(name, email, password);
      }
      saveTokens(tokens.accessToken, tokens.refreshToken);
      showToast('Welcome to Proxync!', 'success');
      onAuthenticated();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">P</div>
          <span className="auth-logo-text">Proxync</span>
        </div>

        <h1 className="auth-title">
          {tab === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="auth-subtitle">
          {tab === 'login'
            ? 'Sign in to your workspace'
            : 'Start sharing in seconds'}
        </p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                id="name"
                className="form-input"
                type="text"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={tab === 'login'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder={tab === 'signup' ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <p className="form-error">⚠ {error}</p>}

          <button
            id="auth-submit"
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {!requireAuth && (
            <>
              <div className="auth-guest-divider">
                <span>or</span>
              </div>
              <button
                id="auth-guest-submit"
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={handleContinueAsGuest}
                disabled={loading}
              >
                Continue as Guest
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
