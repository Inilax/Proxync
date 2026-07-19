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
    list: () => Promise.resolve([]),
    create: (name: string) => Promise.resolve({ id: 'local', name }),
    get: (id: string) => Promise.resolve({ id, name: 'Local' }),
    delete: () => Promise.resolve({ success: true }),
  },
  domains: {
    list: () => Promise.resolve([]),
    create: (name: string) => Promise.resolve({
      id: `domain-${crypto.randomUUID()}`,
      name,
      verificationToken: `proxync-verification-${crypto.randomUUID().substring(0, 8)}`,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    verify: (domainId: string) => Promise.resolve({
      id: domainId,
      name: 'domain',
      verificationToken: 'token',
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    delete: () => Promise.resolve({ success: true }),
  },
  tunnels: {
    list: () => Promise.resolve([]),
    create: (_workspaceId: string, localPort: number, _protocol = 'http', _password?: string, customDomain?: string) =>
      Promise.resolve({
        id: `tunnel-${crypto.randomUUID()}`,
        publicUrl: customDomain ? `https://${customDomain}` : '',
        localPort,
        status: 'ACTIVE',
        subdomain: customDomain ?? '',
        createdAt: new Date().toISOString(),
      }),
    close: () => Promise.resolve({ success: true }),
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
    list: () => Promise.resolve([]),
    get: (_workspaceId: string, _tunnelId: string, _reqId: string) => Promise.resolve(null),
    replay: () => Promise.resolve({ success: true }),
    execute: () => Promise.resolve({ status: 500, headers: {}, body: '' }),
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
