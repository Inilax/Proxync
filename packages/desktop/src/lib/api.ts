import type { Tunnel, RequestLog, DomainRecord } from '../components/views/SharedComponents';

// Standalone mock API client for local-only desktop app
export const api = {
  auth: {
    config: () => Promise.resolve({ requireAuthentication: false }),
    guest: () => Promise.resolve({ accessToken: 'local', refreshToken: 'local' }),
    signup: () => Promise.resolve({ accessToken: 'local', refreshToken: 'local' }),
    login: () => Promise.resolve({ accessToken: 'local', refreshToken: 'local' }),
    me: () => Promise.resolve({ id: 'local', name: 'Local Developer', email: 'local@proxync.dev' }),
  },
  workspaces: {
    list: (): Promise<{ id: string; name: string }[]> => Promise.resolve([]),
    create: (name: string) => Promise.resolve({ id: `ws-${Date.now()}`, name }),
    get: (id: string) => Promise.resolve({ id, name: 'Local Workspace' }),
    delete: (_id: string) => Promise.resolve({ success: true }),
  },
  domains: {
    list: (_workspaceId?: string): Promise<DomainRecord[]> => {
      const stored = localStorage.getItem('proxync_custom_domains');
      return Promise.resolve(stored ? JSON.parse(stored) : []);
    },
    create: (_workspaceId: string, name: string): Promise<DomainRecord> => {
      const newDomain: DomainRecord = {
        id: `domain-${crypto.randomUUID()}`,
        name,
        verificationToken: `proxync-verification-${crypto.randomUUID().substring(0, 8)}`,
        verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const stored = localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];
      const updated = [...list.filter((d) => d.name !== name), newDomain];
      localStorage.setItem('proxync_custom_domains', JSON.stringify(updated));
      return Promise.resolve(newDomain);
    },
    verify: (_workspaceId: string, domainId: string): Promise<DomainRecord> => {
      const stored = localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];
      const updated = list.map((d) => (d.id === domainId ? { ...d, verified: true } : d));
      localStorage.setItem('proxync_custom_domains', JSON.stringify(updated));
      return Promise.resolve(updated.find((d) => d.id === domainId) || { id: domainId, name: 'custom.domain', verified: true, verificationToken: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    },
    delete: (_workspaceId: string, domainId: string): Promise<{ success: boolean }> => {
      const stored = localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter((d) => d.id !== domainId);
      localStorage.setItem('proxync_custom_domains', JSON.stringify(updated));
      return Promise.resolve({ success: true });
    },
  },
  tunnels: {
    list: (_workspaceId?: string): Promise<Tunnel[]> => Promise.resolve([]),
    create: (_workspaceId: string, localPort: number, _protocol = 'http', _password?: string, customDomain?: string): Promise<Tunnel> =>
      Promise.resolve({
        id: `tunnel-${crypto.randomUUID()}`,
        publicUrl: customDomain ? `https://${customDomain}` : `https://proxync-local-${localPort}.trycloudflare.com`,
        localPort,
        status: 'ACTIVE',
        subdomain: customDomain ?? '',
        createdAt: new Date().toISOString(),
      }),
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

export function saveTokens(_accessToken: string, _refreshToken: string) {}
export function clearTokens() {}
export function getToken() {
  return 'local-token';
}
export function isLoggedIn() {
  return true;
}
