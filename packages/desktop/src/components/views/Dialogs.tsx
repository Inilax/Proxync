/**
 * Dialogs.tsx — Redesigned modal dialogs
 * DiscoverDialog, DomainSelectDialog, RequestDetailDialog
 * with animated backdrop and slide-up animations.
 */
import { useState, useEffect } from 'react';
import type { ProcessCandidate, RequestLog } from './SharedComponents';
import { Icons, SignalBars, useEscape } from './SharedComponents';

/* ────────────────── Discover Dialog ────────────────── */

export function DiscoverDialog({
  processes,
  discovering,
  sharingPort,
  onClose,
  onRefresh,
  onShare,
  onShareLocal,
  onSelectProcess,
}: {
  processes: ProcessCandidate[];
  discovering: boolean;
  sharingPort: number | null;
  onClose: () => void;
  onRefresh: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
  onSelectProcess?: (process: ProcessCandidate) => void;
}) {
  useEscape(onClose);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section className="discover-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>Discover processes</h2>
            <p>Find and share running local development servers.</p>
          </div>
          <button className="icon-btn" onClick={onClose}>{Icons.x}</button>
        </header>
        <div className="scan-toolbar">
          <button className="scan-chip active">Localhost</button>
          <button className="scan-chip" onClick={onRefresh} disabled={discovering}>
            {Icons.refresh} {discovering ? 'Scanning...' : 'Full scan'}
          </button>
        </div>
        <div className="discovery-list">
          {processes.map((process) => (
            <article key={process.id} className="discovery-row hover:bg-surface-container-high/50 cursor-pointer transition-colors" onClick={() => { onSelectProcess?.(process); onClose(); }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <strong className="text-on-surface font-semibold">{process.name}</strong>
                  {process.latency !== undefined && (
                    <SignalBars latency={process.latency} />
                  )}
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Port {process.port} | {process.framework ?? 'HTTP service'}
                  {process.latency !== undefined && (
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', opacity: 0.8 }}>
                      ({process.latency === Infinity ? 'offline' : `${Math.round(process.latency)}ms`})
                    </span>
                  )}
                </span>
                <small>{process.directory && process.directory !== 'unknown' ? process.directory : (process.command ?? 'local process')}</small>
              </div>
              <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-secondary compact"
                  onClick={() => {
                    onSelectProcess?.(process);
                    onClose();
                  }}
                  title="Configure process tunnels"
                >
                  Configure
                </button>
                <button
                  className="btn-secondary compact"
                  disabled={sharingPort === process.port}
                  onClick={() => {
                    onShareLocal(process);
                    onClose();
                  }}
                >
                  {Icons.wifi} Local
                </button>
                <button
                  className="btn-primary compact"
                  disabled={sharingPort === process.port}
                  onClick={() => {
                    onShare(process);
                    onClose();
                  }}
                >
                  {Icons.globe} Public
                </button>
              </div>
            </article>
          ))}
          {processes.length === 0 && <div className="traffic-empty">No processes found.</div>}
        </div>
      </section>
    </div>
  );
}

/* ────────────────── Domain Select Dialog ────────────────── */

export function DomainSelectDialog({
  process,
  domains,
  onClose,
  onConfirm,
}: {
  process: ProcessCandidate;
  domains: any[];
  onClose: () => void;
  onConfirm: (customDomainOrOption: string, ltSubdomain?: string) => void;
}) {
  useEscape(onClose);
  const [selectedDomain, setSelectedDomain] = useState<string>('proxync_native');
  const [customSubdomain, setCustomSubdomain] = useState<string>('');
  const [latencies, setLatencies] = useState<Record<string, number>>({
    default: Infinity,
    cloudflare: Infinity,
    localtunnel: Infinity,
    proxync_native: Infinity,
  });

  useEffect(() => {
    let active = true;

    const ping = async (url: string): Promise<number> => {
      const start = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300);
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        clearTimeout(timeoutId);
        return performance.now() - start;
      } catch (e) {
        clearTimeout(timeoutId);
        return Infinity;
      }
    };

    const measureAll = async () => {
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const endpoints = {
        default: `${apiBase.replace(/\/$/, '')}/health`,
        cloudflare: 'https://1.1.1.1/cdn-cgi/trace',
        localtunnel: 'https://loca.lt',
        proxync_native: 'http://proxync.dev',
      };

      const results = await Promise.all([
        ping(endpoints.default),
        ping(endpoints.cloudflare),
        ping(endpoints.localtunnel),
        ping(endpoints.proxync_native),
      ]);

      if (active) {
        setLatencies({
          default: results[0],
          cloudflare: results[1],
          localtunnel: results[2],
          proxync_native: results[3],
        });
      }
    };

    void measureAll();
    return () => {
      active = false;
    };
  }, []);

  const getDescription = () => {
    if (selectedDomain === 'proxync_native') {
      return (
        <span className="domain-desc accent" style={{ color: '#8b5cf6' }}>
          ⚡ <strong>Proxync Tunnel (Recommended):</strong> Direct SSH reverse tunnel to Proxync edge hosted on Azure with auto-generated public subdomains (e.g., <code>*.proxync.dev</code>).
        </span>
      );
    }
    if (selectedDomain === 'default') {
      return (
        <span className="domain-desc">
          🔌 <strong>Local Loopback:</strong> Exposes the server on a local subdomain (e.g., <code>*.localtest.me</code>). Useful for offline loopback testing on your own machine.
        </span>
      );
    }
    if (selectedDomain === 'cloudflare') {
      return (
        <span className="domain-desc accent">
          ☁️ <strong>Cloudflare Tunnel:</strong> Generates a high-performance public HTTPS URL (e.g., <code>https://*.trycloudflare.com</code>) routed through Cloudflare's secure edge.
        </span>
      );
    }
    if (selectedDomain === 'localtunnel') {
      return (
        <span className="domain-desc accent">
          🌐 <strong>Localtunnel:</strong> Generates a real, secure public HTTPS URL (e.g., <code>https://*.loca.lt</code>) instantly. Accessible from any phone or computer on the internet.
        </span>
      );
    }
    return (
      <span className="domain-desc blue">
        🏷️ <strong>Custom Domain:</strong> Routes traffic through your verified custom domain <code>{selectedDomain}</code>. Note: requires pointing your domain to the active relay.
      </span>
    );
  };

  const options = [
    {
      id: 'proxync_native',
      title: 'Proxync Tunnel (Beta)',
      desc: 'High-speed native SSH tunnel with random public subdomains',
      icon: '⚡',
      latency: latencies.proxync_native,
    },
    {
      id: 'default',
      title: 'Default Relay Subdomain',
      desc: 'Expose server on default localtest.me tunnel',
      icon: '🔌',
      latency: latencies.default,
    },
    {
      id: 'cloudflare',
      title: 'Cloudflare Tunnel',
      desc: 'Secure TryCloudflare tunnel at Cloudflare\'s edge',
      icon: '☁️',
      latency: latencies.cloudflare,
    },
    {
      id: 'localtunnel',
      title: 'Localtunnel',
      desc: 'Free public HTTPS URL via localtunnel.me proxy',
      icon: '🌐',
      latency: latencies.localtunnel,
    },
    ...domains.map((d) => ({
      id: d.name,
      title: `Custom Domain (${d.name})`,
      desc: 'Route traffic through your own verified apex/subdomain',
      icon: '🏷️',
      latency: latencies.default,
    })),
  ];

  return (
    <div className="dialog-backdrop glass" onClick={onClose}>
      <section className="discover-dialog domain-select-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>Expose public tunnel</h2>
            <p>Select the domain target for <strong>{process.name}</strong> (Port {process.port}).</p>
          </div>
          <button className="icon-btn" onClick={onClose}>{Icons.x}</button>
        </header>

        <div className="dialog-body">
          {!navigator.onLine && (
            <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '11px', color: '#f87171', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>wifi_off</span>
              <span><strong>You are offline:</strong> Cloud tunnels (Cloudflare / Localtunnel) require internet connection.</span>
            </div>
          )}
          <label className="field-label">Sharing Target</label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
            {options.map((opt) => {
              const isSelected = selectedDomain === opt.id;
              const hasMeasured = opt.latency !== Infinity;
              
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedDomain(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(192, 193, 255, 0.12)' : 'var(--color-surface-container-high)',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                    cursor: 'pointer',
                    transition: 'all var(--dur-fast) var(--ease)',
                    boxShadow: isSelected ? '0 0 16px rgba(192, 193, 255, 0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '18px', minWidth: '24px', textAlign: 'center' }}>{opt.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, textAlign: 'left' }}>
                      <strong style={{ fontSize: '12px', color: isSelected ? 'var(--color-primary)' : 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.desc}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                    <span style={{ fontSize: '10px', color: (opt.id === 'cloudflare' || opt.id === 'localtunnel') && opt.latency === Infinity ? '#f87171' : isSelected ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                      {hasMeasured ? `${Math.round(opt.latency)} ms` : (opt.id === 'cloudflare' || opt.id === 'localtunnel') ? 'Offline' : 'pinging...'}
                    </span>
                    <SignalBars latency={opt.latency} />
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDomain === 'localtunnel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <label className="field-label">Localtunnel Subdomain (Optional)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. demo-port-3000"
                value={customSubdomain}
                onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
            </div>
          )}

          <div className="domain-desc-box">
            {getDescription()}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(selectedDomain, selectedDomain === 'localtunnel' ? (customSubdomain || undefined) : undefined)}
          >
            Go Live
          </button>
        </div>
      </section>
    </div>
  );
}

/* ────────────────── Request Detail Dialog ────────────────── */

export function RequestDetailDialog({
  request,
  onClose,
  onReplay,
  onSendToPostman,
}: {
  request: RequestLog;
  onClose: () => void;
  onReplay: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
}) {
  useEscape(onClose);

  return (
    <div className="dialog-backdrop glass" onClick={onClose}>
      <section className="request-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>
              <span className={`method ${request.method.toLowerCase()}`}>{request.method}</span>
              {' '}{request.path}
            </h2>
            <p>
              Status {request.status ?? 'pending'} | {request.durationMs ?? '-'}ms
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>{Icons.x}</button>
        </header>
        <div className="dialog-actions">
          <button className="btn-secondary compact" onClick={() => onSendToPostman(request)}>
            {Icons.send} Send to Playground
          </button>
          <button className="btn-ghost compact" onClick={() => onReplay(request)}>
            {Icons.play} Replay
          </button>
        </div>
        <h3>Request headers</h3>
        <pre>{JSON.stringify(request.headers ?? {}, null, 2)}</pre>
        <h3>Body</h3>
        <pre>{request.bodyPreview || '[empty body]'}</pre>
        <h3>Response headers</h3>
        <pre>{JSON.stringify(request.responseHeaders ?? {}, null, 2)}</pre>
      </section>
    </div>
  );
}

/* ────────────────── Confirm Delete Dialog ────────────────── */

export function ConfirmDeleteDialog({
  workspaceName,
  onClose,
  onConfirm,
}: {
  workspaceName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEscape(onClose);

  return (
    <div className="dialog-backdrop glass" onClick={onClose}>
      <section className="workspace-settings-dialog slide-up max-w-md p-6 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
          <div className="w-10 h-10 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">delete_forever</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface">Delete Workspace</h2>
            <p className="text-xs text-on-surface-variant">Permanent deletion confirmation</p>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Are you sure you want to delete workspace <strong className="text-on-surface">"{workspaceName}"</strong>? All active tunnels, saved requests, captured history, and workspace configurations will be permanently removed.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button className="btn-ghost compact cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-danger compact cursor-pointer flex items-center gap-1.5"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Delete Workspace
          </button>
        </div>
      </section>
    </div>
  );
}

/* ────────────────── Confirm Purge Engine Data Dialog ────────────────── */

export function ConfirmPurgeDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEscape(onClose);

  return (
    <div className="dialog-backdrop glass" onClick={onClose}>
      <section className="workspace-settings-dialog slide-up max-w-md p-6 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
          <div className="w-10 h-10 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">delete_sweep</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface">Purge Engine Data</h2>
            <p className="text-xs text-on-surface-variant">High-risk action confirmation</p>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Are you sure you want to clear all Proxync app data? This action will permanently remove all local workspaces, saved process profiles, diagnostic log files (<code className="font-mono text-error">app.log</code>, <code className="font-mono text-error">traffic.log</code>), captured requests, and app settings. <strong className="text-error">This action cannot be undone.</strong>
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button className="btn-ghost compact cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-danger compact cursor-pointer flex items-center gap-1.5"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            Purge All Data
          </button>
        </div>
      </section>
    </div>
  );
}

