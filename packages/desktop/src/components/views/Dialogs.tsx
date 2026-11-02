/**
 * Dialogs.tsx — Redesigned modal dialogs
 * DiscoverDialog, DomainSelectDialog, RequestDetailDialog
 * with animated backdrop and slide-up animations.
 */
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ProcessCandidate, RequestLog, Tunnel } from './SharedComponents';
import type { BasicAuthConfig } from '../../lib/types';
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

const LAST_AUTH_USERNAME_KEY = 'proxync_last_tunnel_username';

export function DomainSelectDialog({
  process,
  domains,
  processes = [],
  onClose,
  onConfirm,
}: {
  process: ProcessCandidate;
  domains: any[];
  processes?: ProcessCandidate[];
  onClose: () => void;
  onConfirm: (customDomainOrOption: string, basicAuth?: BasicAuthConfig, routes?: string[]) => void;
}) {
  useEscape(onClose);
  const otherProcesses = (processes || []).filter((p) => p.port !== process.port);
  const [selectedDomain, setSelectedDomain] = useState<string>('proxync_native');
  const [authEnabled, setAuthEnabled] = useState<boolean>(false);
  const [routingEnabled, setRoutingEnabled] = useState<boolean>(false);
  const [extraRoutes, setExtraRoutes] = useState<Array<{ prefix: string; port: number | string }>>([]);
  const [authUsername, setAuthUsername] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_AUTH_USERNAME_KEY) || 'dev';
    } catch (err) {
      console.warn('[Dialogs] localStorage operation failed:', err);
      return 'dev';
    }
  });
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    setAuthEnabled(false);
    setAuthPassword('');
  }, [process.id, process.port]);

  // ponytail: ephemeral in-memory password generator and dialog-scoped credentials caching.
  // Ceiling: Passwords reset on app restart and are not persisted across desktop sessions.
  // Upgrade path: Integrate with OS keychain / secure enclave vault when credential management is implemented.
  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = 'px-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

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

          {/* HTTP Basic Auth Protection Accordion */}
          <div style={{
            marginTop: '10px',
            marginBottom: '4px',
            background: authEnabled ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-container-high))' : 'var(--color-surface-container-high)',
            border: authEnabled ? '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)' : '1px solid var(--color-outline-variant)',
            borderRadius: '8px',
            padding: '10px 14px',
            transition: 'all var(--dur-fast) var(--ease)',
          }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => {
                const next = !authEnabled;
                setAuthEnabled(next);
                if (next && !authPassword) {
                  setAuthPassword(generateRandomPassword());
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>🛡️</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '12px', color: authEnabled ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>
                    Password Protect Tunnel
                  </strong>
                  <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>
                    HTTP Basic Auth challenge for incoming web visitors
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={authEnabled}
                aria-label="Password Protect Tunnel"
                style={{
                  width: '34px',
                  height: '18px',
                  borderRadius: '10px',
                  background: authEnabled ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                  position: 'relative',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: 'none',
                  padding: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !authEnabled;
                  setAuthEnabled(next);
                  if (next && !authPassword) {
                    setAuthPassword(generateRandomPassword());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    const next = !authEnabled;
                    setAuthEnabled(next);
                    if (next && !authPassword) {
                      setAuthPassword(generateRandomPassword());
                    }
                  }
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--color-on-primary, #ffffff)',
                  position: 'absolute',
                  top: '2px',
                  left: authEnabled ? '18px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {authEnabled && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid color-mix(in srgb, var(--color-outline-variant) 40%, transparent)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={authUsername}
                      onChange={(e) => {
                        const val = e.target.value.replace(/:/g, '');
                        setAuthUsername(val);
                      }}
                      onBlur={() => {
                        try {
                          localStorage.setItem(LAST_AUTH_USERNAME_KEY, authUsername.trim());
                        } catch (err) {
                          console.warn('[Dialogs] localStorage operation failed:', err);
                        }
                      }}
                      placeholder="dev"
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '6px', background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newPass = generateRandomPassword();
                          setAuthPassword(newPass);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                        title="Generate random password"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>autorenew</span>
                        <span>Random</span>
                      </button>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input-field"
                        value={authPassword}
                        onChange={(e) => {
                          setAuthPassword(e.target.value);
                        }}
                        placeholder="Enter password..."
                        style={{ width: '100%', fontSize: '12px', padding: '6px 28px 6px 8px', borderRadius: '6px', background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-on-surface-variant)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                        }}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                {authEnabled && (!authUsername.trim() || !authPassword.trim()) ? (
                  <div style={{ fontSize: '10.5px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>error</span>
                    <span>Both username and password are required to protect this tunnel.</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>verified_user</span>
                    <span>Credentials verified locally on your machine before reaching port {process.port}.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Path-Based Multi-Port Routing (Microservices) Accordion */}
          <div style={{
            marginTop: '10px',
            marginBottom: '4px',
            background: routingEnabled ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-container-high))' : 'var(--color-surface-container-high)',
            border: routingEnabled ? '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)' : '1px solid var(--color-outline-variant)',
            borderRadius: '8px',
            padding: '10px 14px',
            transition: 'all var(--dur-fast) var(--ease)',
          }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setRoutingEnabled(!routingEnabled)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>?</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '12px', color: routingEnabled ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>
                    Multi-Port Path Routing (Microservices)
                  </strong>
                  <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>
                    Multiplex backend API or extra ports through this single URL (no CORS)
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={routingEnabled}
                aria-label="Toggle Path Routing"
                style={{
                  width: '34px',
                  height: '18px',
                  borderRadius: '10px',
                  background: routingEnabled ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                  position: 'relative',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: 'none',
                  padding: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setRoutingEnabled(!routingEnabled);
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--color-on-primary, #ffffff)',
                  position: 'absolute',
                  top: '2px',
                  left: routingEnabled ? '18px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {routingEnabled && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid color-mix(in srgb, var(--color-outline-variant) 40%, transparent)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--color-surface-container-lowest)', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--color-outline-variant)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="font-mono text-primary font-bold">/</span>
                    <span className="text-on-surface-variant text-[10px]">?</span>
                    <span className="font-mono font-bold text-on-surface">:{process.port}</span>
                    <span className="text-[10px] text-on-surface-variant">({process.name})</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    Primary Root
                  </span>
                </div>
                {extraRoutes.map((rt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="/api"
                      value={rt.prefix}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExtraRoutes((curr) => curr.map((r, i) => i === idx ? { ...r, prefix: val } : r));
                      }}
                      style={{ flex: 1, fontSize: '11px', padding: '5px 8px', borderRadius: '6px', background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>?</span>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="8080"
                      value={rt.port}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExtraRoutes((curr) => curr.map((r, i) => i === idx ? { ...r, port: val } : r));
                      }}
                      style={{ width: '80px', fontSize: '11px', padding: '5px 8px', borderRadius: '6px', background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setExtraRoutes((curr) => curr.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Remove route"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                    </button>
                  </div>
                ))}
                {otherProcesses.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                      Quick Add Other Running Servers:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {otherProcesses.map((p) => {
                        const defaultPrefix = p.name.toLowerCase().includes('api') ? '/api' : `/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                        const isAdded = extraRoutes.some((r) => Number(r.port) === p.port);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isAdded}
                            onClick={() => {
                              if (!isAdded) {
                                setExtraRoutes((curr) => [...curr, { prefix: defaultPrefix, port: p.port }]);
                              }
                            }}
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: isAdded ? 'var(--color-surface-container-lowest)' : 'var(--color-surface-container-highest)',
                              border: '1px solid var(--color-outline-variant)',
                              color: isAdded ? 'var(--color-on-surface-variant)' : 'var(--color-primary)',
                              cursor: isAdded ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{isAdded ? '?' : '+'}</span>
                            <span>{p.name} (:{p.port}) as {defaultPrefix}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setExtraRoutes((curr) => [...curr, { prefix: '/api', port: '' }])}
                  style={{
                    background: 'none',
                    border: '1px dashed var(--color-outline-variant)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    color: 'var(--color-primary)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                  <span>Add Route Prefix</span>
                </button>
              </div>
            )}
          </div>
          <div className="domain-desc-box">
            {getDescription()}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={authEnabled && (!authUsername.trim() || !authPassword.trim())}
            style={authEnabled && (!authUsername.trim() || !authPassword.trim()) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            onClick={() => {
              if (authEnabled && (!authUsername.trim() || !authPassword.trim())) return;
              if (authEnabled) {
                try {
                  localStorage.setItem(LAST_AUTH_USERNAME_KEY, authUsername.trim());
                } catch (err) {
                  console.warn('[Dialogs] localStorage operation failed:', err);
                }
              }
              const basicAuth: BasicAuthConfig | undefined =
                authEnabled && authUsername.trim() && authPassword.trim()
                  ? { enabled: true, username: authUsername.trim(), password: authPassword.trim() }
                  : undefined;
              const validExtra = routingEnabled
                ? extraRoutes
                    .filter((r) => r.prefix.trim() && Number(r.port) > 0)
                    .map((r) => `${r.prefix.trim().startsWith('/') ? r.prefix.trim() : `/${r.prefix.trim()}`}:${r.port}`)
                : [];
              const routes = validExtra.length > 0 ? [`/:${process.port}`, ...validExtra] : undefined;
              onConfirm(selectedDomain, basicAuth, routes);
            }}
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

/* ?????????????????? Launch Stack Dialog ?????????????????? */
export function LaunchStackDialog({
  processes,
  onClose,
  onLaunchIndividual,
  onLaunchUnified,
}: {
  processes: ProcessCandidate[];
  onClose: () => void;
  onLaunchIndividual: (selected: ProcessCandidate[]) => void;
  onLaunchUnified: (primary: ProcessCandidate, routes: string[]) => void;
}) {
  useEscape(onClose);
  const [mode, setMode] = useState<'unified' | 'individual'>('unified');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => processes.map((p) => p.id));
  const [primaryPort, setPrimaryPort] = useState<number>(() => {
    const web = processes.find((p) => [3000, 5173, 8080, 8000].includes(p.port));
    return web ? web.port : (processes[0]?.port ?? 3000);
  });
  const [customPrefixes, setCustomPrefixes] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const p of processes) {
      if (p.port === primaryPort) {
        init[p.port] = '/';
      } else if (p.name.toLowerCase().includes('api') || p.port === 8080 || p.port === 8000) {
        init[p.port] = '/api';
      } else {
        init[p.port] = `/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      }
    }
    return init;
  });
  const toggleSelect = (id: string) => {
    setSelectedIds((curr) => curr.includes(id) ? curr.filter((i) => i !== id) : [...curr, id]);
  };
  const selectedProcesses = processes.filter((p) => selectedIds.includes(p.id));
  return (
    <div className="dialog-backdrop glass" onClick={onClose}>
      <section className="discover-dialog domain-select-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>Launch Microservices Stack</h2>
            <p>Orchestrate <strong>{processes.length} detected servers</strong> into live cloud tunnels.</p>
          </div>
          <button className="icon-btn" onClick={onClose}>{Icons.x}</button>
        </header>
        <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="field-label">Stack Orchestration Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div
                onClick={() => setMode('unified')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: mode === 'unified' ? '1px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                  background: mode === 'unified' ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--color-surface-container-high)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>?</span>
                  <strong style={{ fontSize: '12px', color: mode === 'unified' ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>Unified URL</strong>
                </div>
                <p style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', lineHeight: 1.3 }}>
                  1 public URL with path routing (e.g. <code>/</code> and <code>/api</code>). Zero CORS issues.
                </p>
              </div>
              <div
                onClick={() => setMode('individual')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: mode === 'individual' ? '1px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                  background: mode === 'individual' ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--color-surface-container-high)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>??</span>
                  <strong style={{ fontSize: '12px', color: mode === 'individual' ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>Separate Subdomains</strong>
                </div>
                <p style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', lineHeight: 1.3 }}>
                  Each service gets its own independent public subdomain. Like <code>proxync stack</code>.
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="field-label">Select Services to Include</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {processes.map((proc) => {
                const isSelected = selectedIds.includes(proc.id);
                const isPrimary = proc.port === primaryPort;
                return (
                  <div
                    key={proc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--color-surface-container-high)',
                      border: '1px solid var(--color-outline-variant)',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(proc.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                          {proc.name} <span style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>:{proc.port}</span>
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>
                          {proc.framework || 'Local service'}
                        </span>
                      </div>
                    </label>
                    {mode === 'unified' && isSelected && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isPrimary ? (
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', padding: '2px 6px', borderRadius: '4px' }}>
                            Root (/)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Path:</span>
                            <input
                              type="text"
                              value={customPrefixes[proc.port] ?? '/api'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomPrefixes((c) => ({ ...c, [proc.port]: val }));
                              }}
                              style={{
                                width: '70px',
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                background: 'var(--color-surface-container-lowest)',
                                border: '1px solid var(--color-outline-variant)',
                                color: 'var(--color-on-surface)',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPrimaryPort(proc.port);
                                setCustomPrefixes((c) => ({ ...c, [proc.port]: '/' }));
                              }}
                              style={{
                                fontSize: '9px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-on-surface-variant)',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                              title="Make this server the root (/)"
                            >
                              Make Root
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={selectedProcesses.length === 0}
            onClick={() => {
              if (mode === 'individual') {
                onLaunchIndividual(selectedProcesses);
              } else {
                const primary = selectedProcesses.find((p) => p.port === primaryPort) || selectedProcesses[0];
                const routes: string[] = [`/:${primary.port}`];
                for (const p of selectedProcesses) {
                  if (p.port !== primary.port) {
                    const pfx = customPrefixes[p.port] || `/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                    const cleanPfx = pfx.startsWith('/') ? pfx : `/${pfx}`;
                    routes.push(`${cleanPfx}:${p.port}`);
                  }
                }
                onLaunchUnified(primary, routes);
              }
              onClose();
            }}
          >
            Launch {selectedProcesses.length} Services
          </button>
        </div>
      </section>
    </div>
  );
}