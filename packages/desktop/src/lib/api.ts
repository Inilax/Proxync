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
    list: (workspaceId?: string): Promise<DomainRecord[]> => {
      const key = `proxync_custom_domains_${workspaceId ?? 'default'}`;
      const stored = localStorage.getItem(key) || localStorage.getItem('proxync_custom_domains');
      return Promise.resolve(stored ? JSON.parse(stored) : []);
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
      const foundTxtValues: string[] = [];

      const checkHost = async (host: string) => {
        try {
          const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=TXT`);
          if (res.ok) {
            const json = await res.json();
            const answers = json.Answer || [];
            for (const ans of answers) {
              if (typeof ans.data === 'string') {
                const cleanData = ans.data.replace(/^"|"$/g, '').trim();
                if (!foundTxtValues.includes(cleanData)) foundTxtValues.push(cleanData);
              }
            }
          }
        } catch {
          // Ignore fetch errors
        }

        try {
          const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT`, {
            headers: { Accept: 'application/dns-json' },
          });
          if (res.ok) {
            const json = await res.json();
            const answers = json.Answer || [];
            for (const ans of answers) {
              if (typeof ans.data === 'string') {
                const cleanData = ans.data.replace(/^"|"$/g, '').trim();
                if (!foundTxtValues.includes(cleanData)) foundTxtValues.push(cleanData);
              }
            }
          }
        } catch {
          // Ignore fetch errors
        }
      };

      await checkHost(fullTxtHost);
      if (foundTxtValues.length === 0) {
        await checkHost(target.name);
      }

      const isVerified = foundTxtValues.some((val) => val.includes(target.verificationToken));

      if (!isVerified) {
        const newToken = `proxync-verify-${crypto.randomUUID().substring(0, 8)}`;
        const unverifiedDomain = {
          ...target,
          verified: false,
          verificationToken: newToken,
          updatedAt: new Date().toISOString(),
        };
        const newList = list.map((d) => (d.id === domainId ? unverifiedDomain : d));
        localStorage.setItem(key, JSON.stringify(newList));
        localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));

        if (foundTxtValues.length > 0) {
          throw new Error(`Token mismatch! DNS has '${foundTxtValues[0]}', expected '${target.verificationToken}'. Domain reset to Pending.`);
        } else {
          const apex = target.name.split('.').slice(-2).join('.');
          const isSub = target.name !== apex;
          const hostPrefix = isSub ? `_proxync.${target.name.slice(0, -(apex.length + 1))}` : '_proxync';
          throw new Error(`TXT record missing at '${fullTxtHost}'. Ensure Host is '${hostPrefix}' and value includes '${target.verificationToken}'. Domain reset to Pending.`);
        }
      }

      const updated = list.map((d) => (d.id === domainId ? { ...d, verified: true, updatedAt: new Date().toISOString() } : d));
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
      const foundTxtValues: string[] = [];

      try {
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(fullTxtHost)}&type=TXT`);
        if (res.ok) {
          const json = await res.json();
          for (const ans of (json.Answer || [])) {
            if (typeof ans.data === 'string') {
              const clean = ans.data.replace(/^"|"$/g, '').trim();
              if (!foundTxtValues.includes(clean)) foundTxtValues.push(clean);
            }
          }
        }
      } catch {}

      try {
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fullTxtHost)}&type=TXT`, {
          headers: { Accept: 'application/dns-json' },
        });
        if (res.ok) {
          const json = await res.json();
          for (const ans of (json.Answer || [])) {
            if (typeof ans.data === 'string') {
              const clean = ans.data.replace(/^"|"$/g, '').trim();
              if (!foundTxtValues.includes(clean)) foundTxtValues.push(clean);
            }
          }
        }
      } catch {}

      const hasToken = foundTxtValues.some((v) => v.includes(domain.verificationToken));
      const key = `proxync_custom_domains_${workspaceId}`;
      const stored = localStorage.getItem(key) || localStorage.getItem('proxync_custom_domains');
      const list: DomainRecord[] = stored ? JSON.parse(stored) : [];

      if (hasToken) {
        const updatedDomain = { ...domain, verified: true, updatedAt: new Date().toISOString() };
        const newList = list.map((d) => (d.id === domain.id ? updatedDomain : d));
        localStorage.setItem(key, JSON.stringify(newList));
        localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));
        return { verified: true, tokenChanged: false, domain: updatedDomain };
      } else if (domain.verified) {
        const newToken = `proxync-verify-${crypto.randomUUID().substring(0, 8)}`;
        const updatedDomain = {
          ...domain,
          verified: false,
          verificationToken: newToken,
          updatedAt: new Date().toISOString(),
        };
        const newList = list.map((d) => (d.id === domain.id ? updatedDomain : d));
        localStorage.setItem(key, JSON.stringify(newList));
        localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));
        return { verified: false, tokenChanged: true, domain: updatedDomain };
      } else {
        return { verified: false, tokenChanged: false, domain };
      }
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
        } catch {}
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
      const foundTxtValues: string[] = [];
      let googleFetchFailed = false;
      let cloudflareFetchFailed = false;

      // Google DoH
      try {
        const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(fullTxtHost)}&type=TXT`);
        if (r.ok) {
          const json = await r.json();
          for (const ans of (json.Answer || [])) {
            if (typeof ans.data === 'string') {
              const clean = ans.data.replace(/^"|"$/g, '').trim();
              if (!foundTxtValues.includes(clean)) foundTxtValues.push(clean);
            }
          }
        }
      } catch { googleFetchFailed = true; }

      // Cloudflare DoH as fallback
      if (foundTxtValues.length === 0) {
        try {
          const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fullTxtHost)}&type=TXT`, {
            headers: { Accept: 'application/dns-json' },
          });
          if (r.ok) {
            const json = await r.json();
            for (const ans of (json.Answer || [])) {
              if (typeof ans.data === 'string') {
                const clean = ans.data.replace(/^"|"$/g, '').trim();
                if (!foundTxtValues.includes(clean)) foundTxtValues.push(clean);
              }
            }
          }
        } catch { cloudflareFetchFailed = true; }
      }

      // If both fetches failed (network/firewall) — do not silently allow, block the tunnel
      if (googleFetchFailed && cloudflareFetchFailed) {
        return { verified: false, domain };
      }

      const hasToken = foundTxtValues.some((v) => v.includes(domain!.verificationToken));
      const storedRaw = localStorage.getItem(foundKey);
      const list: DomainRecord[] = storedRaw ? JSON.parse(storedRaw) : [];

      if (hasToken) {
        const updated = { ...domain, verified: true, updatedAt: new Date().toISOString() };
        const newList = list.map((d) => (d.id === domain!.id ? updated : d));
        localStorage.setItem(foundKey, JSON.stringify(newList));
        localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));
        return { verified: true, domain: updated };
      } else {
        // DNS record missing or token mismatch — rotate token and mark unverified
        const newToken = `proxync-verify-${crypto.randomUUID().substring(0, 8)}`;
        const updated = {
          ...domain,
          verified: false,
          verificationToken: newToken,
          updatedAt: new Date().toISOString(),
        };
        const newList = list.map((d) => (d.id === domain!.id ? updated : d));
        localStorage.setItem(foundKey, JSON.stringify(newList));
        localStorage.setItem('proxync_custom_domains', JSON.stringify(newList));
        return { verified: false, domain: updated };
      }
    },
  },
  tunnels: {
    list: (_workspaceId?: string): Promise<Tunnel[]> => Promise.resolve([]),
    create: (_workspaceId: string, localPort: number, _protocol = 'http', _password?: string, customDomain?: string): Promise<Tunnel> => {
      let publicUrl = `https://proxync-local-${localPort}.trycloudflare.com`;
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

export function saveTokens(_accessToken: string, _refreshToken: string) {}
export function clearTokens() {}
export function getToken() {
  return 'local-token';
}
export function isLoggedIn() {
  return true;
}
