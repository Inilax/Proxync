import { logApp } from './logger';

/**
 * Shared DNS-over-HTTPS (DoH) resolver bypassing browser HTTP caching
 */
export async function fetchTxtRecords(host: string): Promise<string[]> {
  const values: string[] = [];
  const t = Date.now();

  // 1. Google DoH
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=TXT&_t=${t}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      for (const ans of json.Answer || []) {
        if (typeof ans.data === 'string') {
          const clean = ans.data.replace(/^"|"$/g, '').trim();
          if (!values.includes(clean)) values.push(clean);
        }
      }
    }
  } catch (err) {
    logApp('SYSTEM', 'WARN', `Google DoH lookup failed for ${host}`, err);
  }

  // 2. Cloudflare DoH fallback
  if (values.length === 0) {
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT&_t=${t}`, {
        headers: { Accept: 'application/dns-json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        for (const ans of json.Answer || []) {
          if (typeof ans.data === 'string') {
            const clean = ans.data.replace(/^"|"$/g, '').trim();
            if (!values.includes(clean)) values.push(clean);
          }
        }
      }
    } catch (err) {
      logApp('SYSTEM', 'WARN', `Cloudflare DoH lookup failed for ${host}`, err);
    }
  }

  return values;
}

/**
 * Matches either exact token or any valid proxync-verify-* hash published in DNS
 */
export function matchVerificationToken(values: string[], expectedToken: string): { verified: boolean; token: string } {
  if (values.some((v) => v.includes(expectedToken))) {
    return { verified: true, token: expectedToken };
  }
  for (const v of values) {
    const m = v.match(/proxync-verification=(proxync-verify-[a-f0-9-]+)/i);
    if (m && m[1]) {
      return { verified: true, token: m[1] };
    }
  }
  return { verified: false, token: expectedToken };
}
