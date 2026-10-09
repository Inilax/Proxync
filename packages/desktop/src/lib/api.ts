import type { Tunnel, RequestLog, DomainRecord } from '../components/views/SharedComponents';
import { logApp } from './logger';
import { BACKEND_URL } from './config';
import { fetchTxtRecords, matchVerificationToken } from './dns';
import {
  saveAuthSession,
  getAuthSession,
  notifySessionRevoked,
  getToken,
  type AuthUser,
  type AuthResponse,
  type ConnectedProvider,
} from './session';

// Connected API client for Proxync desktop app
export const api = {
  auth: {
    config: () => Promise.resolve({ requireAuthentication: true }),
    register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(errorData.error || `Registration failed with status ${res.status}`);
      }
      const data: AuthResponse = await res.json();
      saveAuthSession(data.user, data.accessToken, data.refreshToken);
      return data;
    },
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Invalid credentials' }));
        throw new Error(errorData.error || `Login failed with status ${res.status}`);
      }
      const data: AuthResponse = await res.json();
      saveAuthSession(data.user, data.accessToken, data.refreshToken);
      return data;
    },
    getProfile: async (): Promise<AuthUser> => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const session = getAuthSession();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (session?.deviceId) headers['x-device-id'] = session.deviceId;
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/profile`, { headers });
      if (!res.ok) {
        if (res.status === 401) notifySessionRevoked();
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch profile' }));
        throw new Error(errorData.error || `Failed to fetch profile with status ${res.status}`);
      }
      const data = await res.json();
      const current = getAuthSession();
      if (current && data.user) {
        saveAuthSession(data.user, current.accessToken, current.refreshToken, current.deviceId);
      }
      return data.user;
    },
    getProviders: async (includeAll = false): Promise<ConnectedProvider[]> => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/providers${includeAll ? '?include_all=true' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch providers' }));
        throw new Error(errorData.error || `Failed to fetch providers with status ${res.status}`);
      }
      const data = await res.json();
      return data.providers;
    },
    updateProfile: async (name: string): Promise<AuthUser> => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to update username' }));
        throw new Error(errorData.error || `Update failed with status ${res.status}`);
      }
      const data = await res.json();
      const current = getAuthSession();
      if (current) {
        saveAuthSession(data.user, current.accessToken, current.refreshToken);
      }
      return data.user;
    },
    changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to change password' }));
        throw new Error(errorData.error || `Failed to change password with status ${res.status}`);
      }
      return res.json();
    },
    entitlements: async (): Promise<{ workbench: boolean; dashboard_sharing: boolean; admin_panel: boolean }> => {
      const token = getToken();
      if (!token) return { workbench: false, dashboard_sharing: false, admin_panel: false };
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me/entitlements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { workbench: false, dashboard_sharing: false, admin_panel: false };
      return res.json();
    },
    me: (): Promise<AuthUser | null> => {
      const session = getAuthSession();
      return Promise.resolve(session ? session.user : null);
    },
  },
  workspaces: {
    list: (): Promise<{ id: string; name: string }[]> => Promise.resolve([]),
    create: (name: string) => Promise.resolve({ id: `ws-${Date.now()}`, name }),
    get: (id: string) => Promise.resolve({ id, name: 'Local Workspace' }),
    delete: (_id: string) => Promise.resolve({ success: true }),
  },
  domains: {
    list: (_workspaceId?: string): Promise<DomainRecord[]> => {
      // Scan ALL proxync_custom_domains keys so workspace ID mismatch never returns empty
      const seen = new Map<string, DomainRecord>();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('proxync_custom_domains')) continue;
        try {
          const items: DomainRecord[] = JSON.parse(localStorage.getItem(k) || '[]');
          for (const d of items) { if (d.id && !seen.has(d.id)) seen.set(d.id, d); }
        } catch (err) {
          logApp('STORAGE', 'WARN', `Failed to parse custom domains from key: ${k}`, err);
        }
      }
      return Promise.resolve(Array.from(seen.values()));
    },
    create: (workspaceId: string, name: string): Promise<DomainRecord> => {
      const newDomain: DomainRecord = {
        id: `domain-${crypto.randomUUID()}`,
        name,
        verificationToken: `proxync-verify-${crypto.randomUUID().substring(0, 8)}`,
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const key = `proxync_custom_domains_${workspaceId}`;
      const stored = localStorage.getItem(key) || localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];
      const updated = [...list.filter((d) => d.name !== name), newDomain];
      localStorage.setItem(key, JSON.stringify(updated));
      localStorage.setItem('proxync_custom_domains', JSON.stringify(updated));
      return Promise.resolve(newDomain);
    },
    verify: async (workspaceId: string, domainId: string): Promise<DomainRecord> => {
      const key = `proxync_custom_domains_${workspaceId}`;
      const stored = localStorage.getItem(key) || localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];
      const target = list.find((d) => d.id === domainId);

      if (!target) {
        throw new Error('Domain record not found');
      }

      // Bypass DNS check for local testing TLDs (.test, .local, .localhost, .localtest.me)
      const isLocalDevDomain = /\.(test|local|localhost|localtest\.me)$/i.test(target.name);
      if (isLocalDevDomain) {
        const updated = list.map((d) => (d.id === domainId ? { ...d, verified: true, updatedAt: new Date().toISOString() } : d));
        localStorage.setItem(key, JSON.stringify(updated));
        localStorage.setItem('proxync_custom_domains', JSON.stringify(updated));
        return updated.find((d) => d.id === domainId)!;
      }

      const fullTxtHost = `_proxync.${target.name}`;
      let foundTxtValues = await fetchTxtRecords(fullTxtHost);
      if (foundTxtValues.length === 0) {
        foundTxtValues = await fetchTxtRecords(target.name);
      }

      const match = matchVerificationToken(foundTxtValues, target.verificationToken);

      if (!match.verified) {
        // ponytail: Keep token stable — never rotate on failure so DNS has time to propagate
        const unverifiedDomain: DomainRecord = {
          ...target,
          verified: false,
          updatedAt: new Date().toISOString(),
        };
        const newList = list.map((d) => (d.id === domainId ? unverifiedDomain : d));
        localStorage.setItem(key, JSON.stringify(newList));
        localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));

        if (foundTxtValues.length > 0) {
          throw new Error(`Token mismatch! DNS has '${foundTxtValues[0]}', expected '${target.verificationToken}'.`);
        } else {
          const apex = target.name.split('.').slice(-2).join('.');
          const isSub = target.name !== apex;
          const hostPrefix = isSub ? `_proxync.${target.name.slice(0, -(apex.length + 1))}` : '_proxync';
          throw new Error(`TXT record missing at '${fullTxtHost}'. Ensure Host is '${hostPrefix}' and value includes '${target.verificationToken}'.`);
        }
      }

      const updated = list.map((d) => (d.id === domainId ? { ...d, verificationToken: match.token, verified: true, updatedAt: new Date().toISOString() } : d));
      localStorage.setItem(key, JSON.stringify(updated));
      localStorage.setItem('proxync_custom_domains', JSON.stringify(updated));
      return updated.find((d) => d.id === domainId)!;
    },
    delete: (workspaceId: string, domainId: string): Promise<{ success: boolean }> => {
      const key = `proxync_custom_domains_${workspaceId}`;
      const stored = localStorage.getItem(key) || localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter((d) => d.id !== domainId);
      localStorage.setItem(key, JSON.stringify(updated));
      localStorage.setItem('proxync_custom_domains', JSON.stringify(updated));
      return Promise.resolve({ success: true });
    },
    checkDomainStatus: async (workspaceId: string, domain: DomainRecord): Promise<{ verified: boolean; tokenChanged: boolean; domain: DomainRecord }> => {
      const isLocalDevDomain = /\.(test|local|localhost|localtest\.me)$/i.test(domain.name);
      if (isLocalDevDomain) {
        return { verified: true, tokenChanged: false, domain: { ...domain, verified: true } };
      }

      const fullTxtHost = `_proxync.${domain.name}`;
      let foundTxtValues = await fetchTxtRecords(fullTxtHost);
      if (foundTxtValues.length === 0) {
        foundTxtValues = await fetchTxtRecords(domain.name);
      }

      const match = matchVerificationToken(foundTxtValues, domain.verificationToken);
      const key = `proxync_custom_domains_${workspaceId}`;
      const stored = localStorage.getItem(key) || localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];

      const tokenChanged = match.token !== domain.verificationToken;
      const updatedDomain: DomainRecord = {
        ...domain,
        verificationToken: match.token,
        verified: match.verified,
        updatedAt: new Date().toISOString(),
      };
      const newList = list.map((d) => (d.id === domain.id ? updatedDomain : d));
      localStorage.setItem(key, JSON.stringify(newList));
      localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));

      return { verified: match.verified, tokenChanged, domain: updatedDomain };
    },
    // --- Requirement 2 fix: reads localStorage directly by domain name, no React state dependency ---
    verifyByName: async (workspaceId: string, domainName: string): Promise<{ verified: boolean; domain: DomainRecord | null }> => {
      // Scan ALL localStorage keys that start with proxync_custom_domains
      // so no workspace ID variant ever causes a silent bypass
      let domain: DomainRecord | null = null;
      let foundKey = `proxync_custom_domains_${workspaceId}`;

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('proxync_custom_domains')) continue;
        try {
          const list: DomainRecord[] = JSON.parse(localStorage.getItem(k) || '[]');
          const match = list.find((d) => d.name === domainName);
          if (match) { domain = match; foundKey = k; break; }
        } catch (err) {
          logApp('STORAGE', 'WARN', `Failed to parse custom domains from key: ${k}`, err);
        }
      }

      if (!domain) {
        // Domain not in any storage key — block sharing to be safe
        return { verified: false, domain: null };
      }

      const isLocalDevDomain = /\.(test|local|localhost|localtest\.me)$/i.test(domain.name);
      if (isLocalDevDomain) {
        return { verified: true, domain: { ...domain, verified: true } };
      }

      const fullTxtHost = `_proxync.${domain.name}`;
      let foundTxtValues = await fetchTxtRecords(fullTxtHost);
      if (foundTxtValues.length === 0) {
        foundTxtValues = await fetchTxtRecords(domain.name);
      }

      const match = matchVerificationToken(foundTxtValues, domain.verificationToken);
      const storedRaw = localStorage.getItem(foundKey);
      const list: DomainRecord[] = storedRaw ? JSON.parse(storedRaw) : [];

      const updated: DomainRecord = {
        ...domain,
        verificationToken: match.token,
        verified: match.verified,
        updatedAt: new Date().toISOString(),
      };
      const newList = list.map((d) => (d.id === domain!.id ? updated : d));
      localStorage.setItem(foundKey, JSON.stringify(newList));
      localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));
      return { verified: match.verified, domain: updated };
    },
  },
  tunnels: {
    list: (_workspaceId?: string): Promise<Tunnel[]> => Promise.resolve([]),
    create: (_workspaceId: string, localPort: number, _protocol = 'http', _password?: string, customDomain?: string): Promise<Tunnel> => {
      let publicUrl = `http://127.0.0.1:${localPort}`;
      if (customDomain) {
        if (customDomain.startsWith('http://') || customDomain.startsWith('https://')) {
          publicUrl = customDomain.includes(':', 7) ? customDomain : `${customDomain}:${localPort}`;
        } else {
          publicUrl = `http://${customDomain}:${localPort}`;
        }
      }
      return Promise.resolve({
        id: `tunnel-${crypto.randomUUID()}`,
        publicUrl,
        localPort,
        status: 'ACTIVE',
        subdomain: customDomain ?? '',
        customDomain,
        provider: customDomain ? 'custom' : 'local',
        createdAt: new Date().toISOString(),
      });
    },
    close: (_workspaceId?: string, _tunnelId?: string) => Promise.resolve({ success: true }),
    bandwidth: () => Promise.resolve({ bytesIn: 0, bytesOut: 0 }),
  },
  apiKeys: {
    list: () => Promise.resolve([]),
    create: () => Promise.resolve({ id: 'key', name: 'key', token: 'token' }),
    revoke: () => Promise.resolve({ success: true }),
  },
  members: {
    list: () => Promise.resolve([]),
    invite: () => Promise.resolve({ id: 'invite' }),
  },
  requests: {
    list: (_workspaceId?: string, _tunnelId?: string): Promise<RequestLog[]> => Promise.resolve([]),
    get: (_workspaceId: string, _tunnelId: string, _reqId: string): Promise<RequestLog | null> => Promise.resolve(null),
    replay: (_workspaceId?: string, _tunnelId?: string, _reqId?: string) => Promise.resolve({ success: true }),
    execute: (_workspaceId?: string, _tunnelId?: string, _method?: string, _path?: string, _headers?: Record<string, string>, _body?: string) =>
      Promise.resolve({ status: 200, headers: {}, body: '' }),
  },
  channels: {
    list: () => Promise.resolve([]),
    create: () => Promise.resolve({ id: 'channel' }),
  },
  messages: {
    list: () => Promise.resolve([]),
    send: () => Promise.resolve({ id: 'msg' }),
    resolve: () => Promise.resolve({ success: true }),
  },
};

export interface LocalWorkspaceContext {
  user: {
    id: string;
    name: string;
    email: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
}

export async function ensureLocalWorkspace(): Promise<LocalWorkspaceContext> {
  return {
    user: { id: 'local', name: 'Local Developer', email: 'local@proxync.dev' },
    workspace: { id: 'local-workspace', name: 'Local Workspace' },
  };
}

// Re-export all modularized domain modules for clean architecture and 100% backward compatibility
export * from './config';
export * from './dns';
export * from './device';
export * from './session';
export * from './dashboard';


