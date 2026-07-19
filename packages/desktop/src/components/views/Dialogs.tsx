/**
 * Dialogs.tsx — Redesigned modal dialogs
 * DiscoverDialog, DomainSelectDialog, RequestDetailDialog
 * with animated backdrop and slide-up animations.
 */
import { useState, useEffect } from 'react';
import type { ProcessCandidate, RequestLog } from './SharedComponents';
import { Icons } from './SharedComponents';

/* ────────────────── Discover Dialog ────────────────── */

export function DiscoverDialog({
  processes,
  discovering,
  sharingPort,
  onClose,
  onRefresh,
  onShare,
  onShareLocal,
}: {
  processes: ProcessCandidate[];
  discovering: boolean;
  sharingPort: number | null;
  onClose: () => void;
  onRefresh: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
}) {
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
            <article key={process.id} className="discovery-row">
              <div>
                <strong>{process.name}</strong>
                <span>
                  Port {process.port} | {process.framework ?? 'HTTP service'}
                </span>
                <small>{process.command ?? 'local process'}</small>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
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

export function SignalBars({ latency }: { latency: number }) {
  let activeBars = 0;
  let barColor = 'var(--muted)';
  
  if (latency < 50) {
    activeBars = 4;
    barColor = '#10B981'; // Green
  } else if (latency < 150) {
    activeBars = 3;
    barColor = '#34D399'; // Teal/Light Green
  } else if (latency < 300) {
    activeBars = 2;
    barColor = '#F5B04A'; // Amber/Orange
  } else if (latency < Infinity) {
    activeBars = 1;
    barColor = '#FF7180'; // Red
  }

  return (
    <div 
      style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '14px', width: '18px' }} 
      title={latency === Infinity ? 'Unreachable' : `${Math.round(latency)}ms`}
    >
      {[1, 2, 3, 4].map((bar) => {
        const isActive = bar <= activeBars;
        return (
          <div
            key={bar}
            style={{
              width: '3px',
              height: `${bar * 25}%`,
              background: isActive ? barColor : 'rgba(255,255,255,0.15)',
              borderRadius: '1px',
              transition: 'background 0.3s ease'
            }}
          />
        );
      })}
    </div>
  );
}

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
  const [selectedDomain, setSelectedDomain] = useState<string>('cloudflare');
  const [customSubdomain, setCustomSubdomain] = useState<string>('');
  const [latencies, setLatencies] = useState<Record<string, number>>({
    cloudflare: Infinity,
    localtunnel: Infinity,
  });

  useEffect(() => {
    let active = true;

    const ping = async (url: string): Promise<number> => {
      const start = performance.now();
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
        return performance.now() - start;
      } catch (e) {
        try {
          await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
          return performance.now() - start;
        } catch (err) {
          return Infinity;
        }
      }
    };

    const measureAll = async () => {
      const endpoints = {
        cloudflare: 'https://1.1.1.1/cdn-cgi/trace',
        localtunnel: 'https://loca.lt',
      };

      const results = await Promise.all([
        ping(endpoints.cloudflare),
        ping(endpoints.localtunnel),
      ]);

      if (active) {
        setLatencies({
          cloudflare: results[0],
          localtunnel: results[1],
        });
      }
    };

    void measureAll();
    return () => {
      active = false;
    };
  }, []);

  const getDescription = () => {
    if (selectedDomain === 'cloudflare') {
      return (
        <span className="domain-desc accent">
          ☁️ <strong>Cloudflare Tunnel (Highly Recommended):</strong> Generates a high-performance public HTTPS URL (e.g., <code>https://*.trycloudflare.com</code>) routed through Cloudflare's secure edge.
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
      latency: Infinity,
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
          <label className="field-label">Sharing Target</label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px', marginBottom: '4px' }}>
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
                    background: isSelected ? 'var(--teal-dim)' : 'var(--surface-2)',
                    border: isSelected ? '1px solid var(--teal)' : '1px solid var(--line)',
                    cursor: 'pointer',
                    transition: 'all var(--dur-fast) var(--ease)',
                    boxShadow: isSelected ? '0 0 12px var(--teal-dim)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '18px', minWidth: '24px', textAlign: 'center' }}>{opt.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, textAlign: 'left' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.desc}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                    <span style={{ fontSize: '10px', color: hasMeasured ? 'var(--text-secondary)' : 'var(--faint)' }}>
                      {hasMeasured ? `${Math.round(opt.latency)} ms` : 'pinging...'}
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
                placeholder="e.g. clueliq-demo-port-3000"
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
  return (
    <div className="dialog-backdrop" onClick={onClose}>
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
            {Icons.send} Send to Postman
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
