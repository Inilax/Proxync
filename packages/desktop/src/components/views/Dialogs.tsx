/**
 * Dialogs.tsx — Redesigned modal dialogs
 * DiscoverDialog, DomainSelectDialog, RequestDetailDialog
 * with animated backdrop and slide-up animations.
 */
import { useState } from 'react';
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
  const [selectedDomain, setSelectedDomain] = useState<string>('default');
  const [customSubdomain, setCustomSubdomain] = useState<string>('');

  const getDescription = () => {
    if (selectedDomain === 'default') {
      return (
        <span className="domain-desc">
          🔌 <strong>Local Loopback:</strong> Exposes the server on a local subdomain (e.g., <code>*.localtest.me</code>). Useful for offline loopback testing on your own machine.
        </span>
      );
    }
    if (selectedDomain === 'localtunnel') {
      return (
        <span className="domain-desc accent">
          🌐 <strong>Localtunnel (Recommended):</strong> Generates a real, secure public HTTPS URL (e.g., <code>https://*.loca.lt</code>) instantly. Accessible from any phone or computer on the internet.
        </span>
      );
    }
    return (
      <span className="domain-desc blue">
        🏷️ <strong>Custom Domain:</strong> Routes traffic through your verified custom domain <code>{selectedDomain}</code>. Note: requires pointing your domain to the active relay.
      </span>
    );
  };

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
          <select
            className="form-select"
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            <option value="default">Default random subdomain (e.g. *.localtest.me)</option>
            <option value="cloudflare">Cloudflare Tunnel (Highly Recommended)</option>
            <option value="localtunnel">Localtunnel (Free Public HTTPS URL)</option>
            {domains.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {selectedDomain === 'localtunnel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
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
