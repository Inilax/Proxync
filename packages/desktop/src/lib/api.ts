// Shared API client for the desktop app
// Uses the Proxync control plane API

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3939';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate: if multiple calls 401 simultaneously, only fire one refresh
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('proxync_refresh');
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem('proxync_token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('proxync_refresh', data.refreshToken);
      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, opts: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const stored = localStorage.getItem('proxync_token');
  const token = opts.token ?? stored;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  // Bug 5 fix: auto-refresh on 401, retry once
  if (res.status === 401 && !isRetry && !opts.token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, opts, true);
    }
    // Refresh failed — force re-login
    localStorage.removeItem('proxync_token');
    localStorage.removeItem('proxync_refresh');
    localStorage.removeItem('proxync_workspace');
    window.location.reload();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    config: () => request<{ requireAuthentication: boolean }>('/auth/config'),
    guest: () =>
      request<{ accessToken: string; refreshToken: string }>('/auth/guest', {
        method: 'POST',
      }),
    signup: (name: string, email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/signup', {
        method: 'POST',
        body: { name, email, password },
      }),
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    me: () => request<{ id: string; name: string; email: string }>('/auth/me'),
  },

  workspaces: {
    list: () => request<any[]>('/workspaces'),
    create: (name: string) =>
      request<any>('/workspaces', { method: 'POST', body: { name } }),
    get: (id: string) => request<any>(`/workspaces/${id}`),
    delete: (id: string) =>
      request<any>(`/workspaces/${id}`, { method: 'DELETE' }),
  },

  domains: {
    list: (workspaceId: string) =>
      request<any[]>(`/workspaces/${workspaceId}/domains`),
    create: (workspaceId: string, name: string) =>
      request<any>(`/workspaces/${workspaceId}/domains`, {
        method: 'POST',
        body: { name },
      }),
    verify: (workspaceId: string, domainId: string) =>
      request<any>(`/workspaces/${workspaceId}/domains/${domainId}/verify`, {
        method: 'POST',
      }),
    delete: (workspaceId: string, domainId: string) =>
      request<any>(`/workspaces/${workspaceId}/domains/${domainId}`, {
        method: 'DELETE',
      }),
  },

  tunnels: {
    list: (workspaceId: string) =>
      request<any[]>(`/workspaces/${workspaceId}/tunnels`),
    create: (workspaceId: string, localPort: number, protocol = 'http', password?: string) =>
      request<any>(`/workspaces/${workspaceId}/tunnels`, {
        method: 'POST',
        body: { localPort, protocol, password },
      }),
    close: (workspaceId: string, tunnelId: string) =>
      request<any>(`/workspaces/${workspaceId}/tunnels/${tunnelId}`, {
        method: 'DELETE',
      }),
    bandwidth: (workspaceId: string, tunnelId: string) =>
      request<any>(`/workspaces/${workspaceId}/tunnels/${tunnelId}/bandwidth`),
  },

  apiKeys: {
    list: (workspaceId: string) =>
      request<any[]>(`/workspaces/${workspaceId}/api-keys`),
    create: (workspaceId: string, name: string, scopes?: string[]) =>
      request<any>(`/workspaces/${workspaceId}/api-keys`, {
        method: 'POST',
        body: { name, scopes },
      }),
    revoke: (workspaceId: string, keyId: string) =>
      request<any>(`/workspaces/${workspaceId}/api-keys/${keyId}`, {
        method: 'DELETE',
      }),
  },

  members: {
    list: (workspaceId: string) =>
      request<any[]>(`/workspaces/${workspaceId}/members`),
    invite: (workspaceId: string, email: string, role = 'MEMBER') =>
      request<any>(`/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        body: { email, role },
      }),
  },

  requests: {
    list: (workspaceId: string, tunnelId: string) =>
      request<any[]>(`/workspaces/${workspaceId}/tunnels/${tunnelId}/requests`),
    get: (workspaceId: string, tunnelId: string, reqId: string) =>
      request<any>(`/workspaces/${workspaceId}/tunnels/${tunnelId}/requests/${reqId}`),
    replay: (workspaceId: string, tunnelId: string, reqId: string) =>
      request<any>(`/workspaces/${workspaceId}/tunnels/${tunnelId}/requests/${reqId}/replay`, {
        method: 'POST',
      }),
    execute: (workspaceId: string, tunnelId: string, method: string, path: string, headers?: Record<string, string>, body?: string) =>
      request<any>(`/workspaces/${workspaceId}/tunnels/${tunnelId}/requests/execute`, {
        method: 'POST',
        body: { method, path, headers, body },
      }),
  },

  channels: {
    list: (workspaceId: string) =>
      request<any[]>(`/workspaces/${workspaceId}/channels`),
    create: (workspaceId: string, name: string) =>
      request<any>(`/workspaces/${workspaceId}/channels`, {
        method: 'POST',
        body: { name, type: 'TEXT' },
      }),
  },

  messages: {
    list: (channelId: string, limit = 50, before?: string) =>
      request<any[]>(`/channels/${channelId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`),
    send: (channelId: string, text: string, kind: 'CHAT' | 'FEEDBACK' = 'CHAT', screenshotUrl?: string) =>
      request<any>(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: { text, kind, screenshotUrl },
      }),
    resolve: (messageId: string, resolved: boolean) =>
      request<any>(`/messages/${messageId}`, {
        method: 'PATCH',
        body: { resolved },
      }),
  },
};

// ─── Auth helpers ──────────────────────────────────────────────
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
  async function loadContext(): Promise<LocalWorkspaceContext> {
    const user = await api.auth.me();
    let workspaces = await api.workspaces.list();

    const savedWorkspaceId = localStorage.getItem('proxync_workspace');
    const workspace =
      workspaces.find((item) => item.id === savedWorkspaceId) ?? workspaces[0];

    if (workspace) {
      localStorage.setItem('proxync_workspace', workspace.id);
    } else {
      localStorage.removeItem('proxync_workspace');
    }
    return { user, workspace };
  }

  if (isLoggedIn()) {
    try {
      return await loadContext();
    } catch {
      clearTokens();
    }
  }

  const config = await api.auth.config().catch(() => ({
    requireAuthentication: false,
  }));

  if (config.requireAuthentication) {
    throw new Error(
      'This backend requires accounts. Set REQUIRE_AUTHENTICATION=false for the open-source local MVP.',
    );
  }

  const tokens = await api.auth.guest();
  saveTokens(tokens.accessToken, tokens.refreshToken);
  return loadContext();
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('proxync_token', accessToken);
  localStorage.setItem('proxync_refresh', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('proxync_token');
  localStorage.removeItem('proxync_refresh');
  localStorage.removeItem('proxync_workspace');
}

export function getToken() {
  return localStorage.getItem('proxync_token');
}

export function isLoggedIn() {
  return !!getToken();
}
