import { BACKEND_URL } from './config';

export interface ConnectedProvider {
  id: string;
  name: string;
  type: 'credentials' | 'oauth';
  connected: boolean;
  enabled: boolean;
  identifier: string | null;
  status: 'connected' | 'not_connected' | 'available_soon';
  badge: 'Active' | 'Connected' | 'Not Linked' | 'Available Soon';
  description: string;
  connectUrl?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'PRO' | 'ADMIN';
  authProvider?: string;
  googleConnected?: boolean;
  githubConnected?: boolean;
  hasPassword?: boolean;
  providers?: ConnectedProvider[];
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const AUTH_SESSION_KEY = 'proxync_auth_session_v1';

export interface StoredSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  deviceId?: string;
  savedAt: number;
}

export function saveAuthSession(
  user: AuthUser,
  accessToken: string,
  refreshToken: string,
  deviceId?: string
) {
  if (typeof window === 'undefined') return;
  const current = getAuthSession();
  const session: StoredSession = {
    user,
    accessToken,
    refreshToken,
    deviceId: deviceId || current?.deviceId,
    savedAt: Date.now(),
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function getDeviceId(): string | null {
  const session = getAuthSession();
  return session?.deviceId || null;
}

type SessionRevokeCallback = () => void;
let sessionRevokeListeners: SessionRevokeCallback[] = [];

export function onSessionRevoked(cb: SessionRevokeCallback) {
  sessionRevokeListeners.push(cb);
  return () => {
    sessionRevokeListeners = sessionRevokeListeners.filter((l) => l !== cb);
  };
}

export function notifySessionRevoked() {
  clearAuthSession();
  sessionRevokeListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

let lastValidateTime = 0;
let validatePromise: Promise<boolean> | null = null;

export async function validateSession(force = false): Promise<boolean> {
  const session = getAuthSession();
  if (!session?.accessToken) return false;

  const now = Date.now();
  if (!force && now - lastValidateTime < 15000) {
    return true;
  }

  if (validatePromise) {
    return validatePromise;
  }

  validatePromise = (async () => {
    try {
      lastValidateTime = Date.now();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.accessToken}`,
      };
      if (session.deviceId) {
        headers['x-device-id'] = session.deviceId;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/validate-session`, {
        method: 'GET',
        headers,
      });

      if (res.status === 401) {
        notifySessionRevoked();
        return false;
      }

      return res.ok;
    } catch {
      return true;
    } finally {
      validatePromise = null;
    }
  })();

  return validatePromise;
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  const current = getAuthSession();
  if (current?.refreshToken || current?.accessToken) {
    fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: current.accessToken ? `Bearer ${current.accessToken}` : '',
      },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    }).catch(() => {});
  }
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string, deviceId?: string) {
  const current = getAuthSession();
  if (current) {
    saveAuthSession(current.user, accessToken, refreshToken, deviceId || current.deviceId);
  }
}

export function clearTokens() {
  clearAuthSession();
}

export function getToken(): string | null {
  const session = getAuthSession();
  return session?.accessToken ?? null;
}

export function isLoggedIn(): boolean {
  return getAuthSession() !== null;
}
