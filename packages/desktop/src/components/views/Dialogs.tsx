/**
 * Dialogs.tsx — Redesigned modal dialogs
 * DiscoverDialog, DomainSelectDialog, RequestDetailDialog
 * with animated backdrop and slide-up animations.
 */
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ProcessCandidate, RequestLog, Tunnel } from './SharedComponents';
import { Icons, SignalBars, useEscape } from './SharedComponents';

/* ────────────────── Discover Dialog ────────────────── */

export function DiscoverDialog({
  processes,
  discovering,
  sharingPort,
  tunnels = [],
  onClose,
  onRefresh,
  onShare,
  onShareLocal,
  onSelectProcess,
  onInspectTraffic,
}: {
  processes: ProcessCandidate[];
  discovering: boolean;
  sharingPort: number | null;
  tunnels?: Tunnel[];
  onClose: () => void;
  onRefresh: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
  onSelectProcess?: (process: ProcessCandidate) => void;
  onInspectTraffic?: (process: ProcessCandidate) => void;
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
          {processes.map((process) => {
            const activeTunnel = tunnels.find(
              (t) => t.localPort === process.port && t.status === 'ACTIVE'
            );
            const isExposed = Boolean(activeTunnel);

            return (
              <article
                key={process.id}
                className={`discovery-row transition-colors cursor-pointer ${isExposed
                    ? 'bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10'
                    : 'hover:bg-surface-container-high/50'
                  }`}
                onClick={() => {
                  onSelectProcess?.(process);
                  onClose();
                }}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <strong className="text-on-surface font-semibold text-sm leading-none">{process.name}</strong>
                    {isExposed && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                        <span className="uppercase tracking-wider text-[9.5px]">Already Exposed</span>
                      </div>
                    )}
                    {process.latency !== undefined && !isExposed && (
                      <SignalBars latency={process.latency} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <span>Port {process.port} | {process.framework ?? 'HTTP service'}</span>
                    {process.latency !== undefined && !isExposed && (
                      <span className="text-[10px] font-mono opacity-80">
                        ({process.latency === Infinity ? 'offline' : `${Math.round(process.latency)}ms`})
                      </span>
                    )}
                  </div>
                  <small className="text-[11px] text-on-surface-variant/80 truncate block">
                    {process.directory && process.directory !== 'unknown'
                      ? process.directory
                      : (process.command ?? 'local process')}
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                  {isExposed && activeTunnel ? (
                    <button
                      className="btn-primary compact flex items-center gap-1 font-bold"
                      onClick={() => {
                        onInspectTraffic ? onInspectTraffic(process) : onSelectProcess?.(process);
                        onClose();
                      }}
                      title="View live traffic logs for this exposed service"
                    >
                      <span>Inspect Traffic</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </article>
            );
          })}
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
  onConfirm: (customDomainOrOption: string) => void;
}) {
  useEscape(onClose);
  const [selectedDomain, setSelectedDomain] = useState<string>('proxync_native');

  // 3-state probe: 'pinging' | 'online' | 'offline'
  // ponytail: no abstraction layer — 3 fire-and-forget closures, each updates a single key
  type ProbeStatus = 'pinging' | 'online' | 'offline';
  interface ProbeState { status: ProbeStatus; latencyMs?: number; }

  const [probes, setProbes] = useState<Record<string, ProbeState>>({
    proxync_native: { status: 'pinging' },
    default: { status: 'pinging' },
    cloudflare: { status: 'pinging' },
  });

  useEffect(() => {
    let active = true;

    // HTTP probe — used for local app port and Cloudflare edge
    const probeHttp = (id: string, url: string, timeoutMs = 1500) => {
      const start = performance.now();
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), timeoutMs);
      fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
        .then(() => {
          clearTimeout(tid);
          if (active) setProbes(p => ({ ...p, [id]: { status: 'online', latencyMs: Math.round(performance.now() - start) } }));
        })
        .catch(() => {
          clearTimeout(tid);
          if (active) setProbes(p => ({ ...p, [id]: { status: 'offline' } }));
        });
    };

    // TCP probe via Rust IPC — used for Proxync SSH server to bypass CDN overhead
    const probeTcp = (id: string, host: string, port: number) => {
      invoke<number>('probe_tcp_latency', { host, port })
        .then(ms => { if (active) setProbes(p => ({ ...p, [id]: { status: 'online', latencyMs: ms } })); })
        .catch(() => { if (active) setProbes(p => ({ ...p, [id]: { status: 'offline' } })); });
    };

    // Fire all 3 independently — each row updates the moment its probe resolves.
    // one.one.one.one/ → Cloudflare Indian edge, direct 200 OK ~40ms (not 1.1.1.1 which 302-redirects to a 404)
    probeHttp('default', `http://127.0.0.1:${process.port}`);
    probeHttp('cloudflare', 'https://one.one.one.one/');
    probeTcp('proxync_native', 'proxync_native', 0); // Backend resolves to configured Proxync SSH edge

    return () => { active = false; };
  }, [process.port]);

  const getDescription = () => {
    if (selectedDomain === 'proxync_native') {
      return (
        <span className="domain-desc accent">
          ⚡ <strong>Proxync Tunnel (Recommended):</strong> Direct SSH reverse tunnel to Proxync edge hosted on Azure with auto-generated public subdomains (e.g., <code>*.proxync.dev</code>).
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
    if (selectedDomain === 'custom_subdomain_unconnected' || selectedDomain === 'default') {
      return (
        <span className="domain-desc" style={{ color: 'var(--color-error)' }}>
          ⚠️ <strong>Subdomain Not Connected:</strong> No verified custom subdomain found. Add and verify your subdomain under Settings → Custom Domains to go live with a fixed link.
        </span>
      );
    }
    return (
      <span className="domain-desc blue">
        🏷️ <strong>Custom Subdomain:</strong> Routes traffic through your verified custom domain <code>{selectedDomain}</code>. Note: requires pointing your domain to the active relay.
      </span>
    );
  };

  const options = [
    { id: 'proxync_native', title: 'Proxync Tunnel (Beta)', desc: 'High-speed native SSH tunnel with random public subdomains', icon: '⚡', connected: true },
    { id: 'cloudflare', title: 'Cloudflare Tunnel', desc: "Secure TryCloudflare tunnel at Cloudflare's edge", icon: '☁️', connected: true },
    ...(domains.length > 0
      ? domains.map((d) => ({ id: d.name, title: `Custom Subdomain (${d.name})`, desc: 'Route traffic through your own verified apex/subdomain', icon: '🏷️', connected: true }))
      : [{ id: 'custom_subdomain_unconnected', title: 'Custom Subdomain', desc: 'No subdomain connected • Add & verify in Settings', icon: '🏷️', connected: false }]),
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
            <div style={{ padding: '8px 12px', background: 'color-mix(in srgb, var(--color-error) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)', borderRadius: '8px', fontSize: '11px', color: 'var(--color-error)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>wifi_off</span>
              <span><strong>You are offline:</strong> Cloud tunnels (Proxync Tunnel / Cloudflare) require internet connection.</span>
            </div>
          )}
          <label className="field-label">Sharing Target</label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
            {options.map((opt) => {
              const isSelected = selectedDomain === opt.id;
              const isConnected = opt.connected !== false;
              // Custom domains share the 'default' probe (same local relay path)
              const probe = probes[opt.id] ?? probes['default'];
              const label = !isConnected ? 'Not connected'
                : probe.status === 'pinging' ? 'pinging...'
                  : probe.status === 'offline' ? 'Offline'
                    : `${probe.latencyMs} ms`;
              const labelColor = !isConnected ? 'var(--color-error)'
                : probe.status === 'offline' ? 'var(--color-error)'
                  : isSelected ? 'var(--color-primary)'
                    : 'var(--color-on-surface-variant)';
              // Pass a synthetic latency number to the shared SignalBars component:
              // Infinity keeps bars unlit for pinging/offline/unconnected states
              const barsLatency = isConnected && probe.status === 'online' ? (probe.latencyMs ?? Infinity) : Infinity;

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
                    background: isSelected ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--color-surface-container-high)',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                    cursor: 'pointer',
                    transition: 'all var(--dur-fast) var(--ease)',
                    boxShadow: isSelected ? '0 0 16px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
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
                    <span style={{ fontSize: '10px', color: labelColor, fontWeight: !isConnected ? 600 : 400 }}>{label}</span>
                    {isConnected ? (
                      <SignalBars latency={barsLatency} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-error)' }}>link_off</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="domain-desc-box">
            {getDescription()}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(selectedDomain)}
          >
            {selectedDomain === 'custom_subdomain_unconnected' ? 'Connect Subdomain' : 'Go Live'}
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

