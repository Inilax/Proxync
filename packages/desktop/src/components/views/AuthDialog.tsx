import React, { useState } from 'react';
import { api, type AuthUser, BACKEND_URL } from '../../lib/api';
import { showToast } from '../../lib/toast';
import { openUrl } from '@tauri-apps/plugin-opener';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export function AuthDialog({ isOpen, onClose, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          throw new Error('Please enter your name');
        }
        const res = await api.auth.register(name.trim(), email.trim(), password);
        showToast(`🎉 Welcome to Proxync, ${res.user.name}! (PRO unlocked)`, 'success');
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.auth.login(email.trim(), password);
        showToast(`👋 Welcome back, ${res.user.name}!`, 'success');
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials or backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const googleAuthUrl = `${BACKEND_URL}/api/v1/auth/google`;
      await openUrl(googleAuthUrl);
      showToast('Opening Google Sign-In in your browser...', 'info');
      onClose();
    } catch (err: any) {
      // Fallback for non-tauri or popup
      window.open(`${BACKEND_URL}/api/v1/auth/google`, '_blank');
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div 
        className="auth-dialog slide-up bg-surface-container-high border border-outline-variant/80 rounded-2xl shadow-2xl p-6 w-[420px] max-w-[90vw] text-on-surface select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-primary text-[20px]">
                {mode === 'signin' ? 'login' : 'person_add'}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-surface">
                {mode === 'signin' ? 'Sign In to Proxync' : 'Create Free Account'}
              </h2>
              <p className="text-[11px] text-on-surface-variant">
                {mode === 'signin' 
                  ? 'Access your cloud features & reserved subdomains' 
                  : 'Get immediate free PRO access & workbench'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-surface-container rounded-lg p-1 my-4 border border-outline-variant/40">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'signin' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'signup' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-error/10 border border-error/30 text-error flex items-start gap-2 text-xs">
            <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Developer"
                className="w-full bg-surface-container px-3 py-2 rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full bg-surface-container px-3 py-2 rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-surface-container px-3 py-2 rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            ) : (
              <span>{mode === 'signin' ? 'Sign In' : 'Claim Free PRO Account'}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/50"></div>
          </div>
          <span className="relative bg-surface-container-high px-2 text-[10px] uppercase font-bold text-outline tracking-wider">
            or
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-2 px-4 rounded-lg bg-surface-container hover:bg-surface-container-highest border border-outline-variant text-on-surface font-semibold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:border-primary/50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Footer info */}
        <p className="text-[10px] text-center text-outline mt-4">
          Local mode: Works 100% offline if you choose not to log in.
        </p>
      </div>
    </div>
  );
}
