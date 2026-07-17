import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getToken } from '../lib/api';
import { ChatPanel } from '../components/ChatPanel';
import { RequestPlayground } from '../components/RequestPlayground';

interface TunnelsViewProps {
  workspace: any;
}

// Common ports and their app names
const PORT_NAMES: Record<number, string> = {
  3000: 'Node / React (CRA)',
  3001: 'Node alt',
  4000: 'Node / GraphQL',
  4200: 'Angular CLI',
  5000: 'Flask / .NET',
  5173: 'Vite',
  8000: 'Django / FastAPI',
  8080: 'General HTTP',
  8888: 'Jupyter',
};

// Simulate port detection (real detection would use Tauri Rust commands)
function usePortScanner() {
  const [ports, setPorts] = useState<number[]>([]);

  useEffect(() => {
    async function fetchPorts() {
      try {
        const detected: number[] = await invoke('scan_ports');
        setPorts(detected);
      } catch (err) {
        console.error('Failed to scan ports', err);
      }
    }
    fetchPorts();

    const interval = setInterval(fetchPorts, 10000);
    return () => clearInterval(interval);
  }, []);

  return ports;
}

export function TunnelsView({ workspace }: TunnelsViewProps) {
  const [tunnels, setTunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<number | null>(null);
  const [activeTunnel, setActiveTunnel] = useState<any | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  // Bug 3 fix: track per-request start times so we can compute real latency
  const requestStartTimes = useRef<Map<string, number>>(new Map());
  const detectedPorts = usePortScanner();
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [inspectorTab, setInspectorTab] = useState<'traffic' | 'playground'>('traffic');
  const [playgroundPrefill, setPlaygroundPrefill] = useState<any | null>(null);

  useEffect(() => {
    if (activeTunnel) {
      api.requests.list(workspace.id, activeTunnel.id)
        .then(data => setRequests(data))
        .catch(err => console.error('Failed to load history', err));
    }
  }, [activeTunnel, workspace.id]);

  useEffect(() => {
    let unlistenAutoClosed: () => void;
    let unlistenReqLog: () => void;
    let unlistenResLog: () => void;

    async function setupListeners() {
      unlistenAutoClosed = await listen('tunnel:auto-closed', async (e: any) => {
        const { tunnelId } = e.payload;
        setTunnels((prev) => prev.map((t) => t.id === tunnelId ? { ...t, status: 'CLOSED' } : t));
        setActiveTunnel((prev: any) => prev?.id === tunnelId ? null : prev);
        try {
          await api.tunnels.close(workspace.id, tunnelId);
        } catch {}
        showToast('Local server stopped, tunnel closed automatically.', 'info');
      });

      unlistenReqLog = await listen('request:log', (e: any) => {
        const payload = e.payload;
        // Record the start time for this request so we can compute real latency
        requestStartTimes.current.set(payload.requestId, Date.now());
        setRequests((prev) => [{ 
          id: payload.requestId, 
          method: payload.method, 
          path: payload.path, 
          status: 'pending', 
          durationMs: null 
        }, ...prev].slice(0, 100));
      });

      unlistenResLog = await listen('request:log:response', (e: any) => {
        const startTime = requestStartTimes.current.get(e.payload.requestId);
        const durationMs = startTime ? Date.now() - startTime : null;
        if (startTime) requestStartTimes.current.delete(e.payload.requestId);
        setRequests((prev) => prev.map(r => {
          if (r.id === e.payload.requestId) {
            return { ...r, status: e.payload.status, durationMs };
          }
          return r;
        }));
      });
    }

    setupListeners();

    return () => {
      if (unlistenAutoClosed) unlistenAutoClosed();
      if (unlistenReqLog) unlistenReqLog();
      if (unlistenResLog) unlistenResLog();
    };
  }, [workspace.id]);

  const loadTunnels = useCallback(async () => {
    try {
      const data = await api.tunnels.list(workspace.id);
      setTunnels(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => { loadTunnels(); }, [loadTunnels]);

  async function share(port: number) {
    setSharing(port);
    try {
      const tunnel = await api.tunnels.create(workspace.id, port, 'http', usePassword ? password : undefined);
      setUsePassword(false);
      setPassword('');
      
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      // Derive the relay WS URL from the same base as the API
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = apiBase.replace(/^http/, 'ws') + '/relay';

      await invoke('open_tunnel', { 
        tunnelId: tunnel.id, 
        localPort: port, 
        token, 
        workspaceId: workspace.id,
        relayUrl,
      });

      setTunnels((prev) => [tunnel, ...prev]);
      setRequests([]);
      setActiveTunnel(tunnel);
      showToast('Tunnel created — link ready to share!', 'success');
    } catch (err: any) {
      showToast(err.message || String(err), 'error');
    } finally {
      setSharing(null);
    }
  }

  async function closeTunnel(tunnelId: string) {
    try {
      await invoke('close_tunnel', { tunnelId });
      await api.tunnels.close(workspace.id, tunnelId);
      setTunnels((prev) =>
        prev.map((t) => t.id === tunnelId ? { ...t, status: 'CLOSED' } : t),
      );
      if (activeTunnel?.id === tunnelId) setActiveTunnel(null);
      showToast('Tunnel closed', 'info');
    } catch (err: any) {
      showToast(err.message || String(err), 'error');
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    showToast('Link copied!', 'success');
  }

  const activeTunnels = tunnels.filter((t) => t.status === 'ACTIVE');
  const pastTunnels = tunnels.filter((t) => t.status !== 'ACTIVE');

  return (
    <div className="tunnels-view-container">
      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: 'hidden auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Share Modal */}


      {/* Inspector Modal */}
      {selectedRequest && activeTunnel && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)} style={{ zIndex: 100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 600, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ 
                  fontWeight: 600, fontSize: 16,
                  color: selectedRequest.method === 'GET' ? 'var(--blue)' : selectedRequest.method === 'POST' ? 'var(--green)' : 'var(--orange)' 
                }}>{selectedRequest.method}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16 }}>{selectedRequest.path}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border-subtle)' }}
                  onClick={() => {
                    setPlaygroundPrefill({
                      method: selectedRequest.method,
                      path: selectedRequest.path,
                      headers: selectedRequest.headers,
                      bodyPreview: selectedRequest.bodyPreview,
                    });
                    setInspectorTab('playground');
                    setSelectedRequest(null);
                  }}
                >
                  ⚡ Send to Playground
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={async () => {
                    try {
                      await api.requests.replay(workspace.id, activeTunnel.id, selectedRequest.id);
                      showToast('Request replayed!', 'success');
                      setSelectedRequest(null);
                    } catch (err: any) {
                      showToast(err.message, 'error');
                    }
                  }}
                >
                  ↺ Replay
                </button>
                <button className="btn btn-ghost" onClick={() => setSelectedRequest(null)}>✕</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              <div>Status: <span style={{ color: selectedRequest.status >= 400 ? 'var(--red)' : 'var(--green-dim)' }}>{selectedRequest.status || 'Pending'}</span></div>
              <div>Time: {selectedRequest.durationMs ? `${selectedRequest.durationMs}ms` : '-'}</div>
              <div>Captured: {new Date(selectedRequest.capturedAt).toLocaleTimeString()}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>REQUEST HEADERS</div>
                <div style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, overflowX: 'auto' }}>
                  {Object.entries(selectedRequest.headers || {}).map(([k, v]) => (
                    <div key={k}><span style={{ color: 'var(--blue)' }}>{k}</span>: {String(v)}</div>
                  ))}
                </div>
              </div>

              {selectedRequest.bodyPreview && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>REQUEST BODY</div>
                  <pre style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {selectedRequest.bodyPreview}
                  </pre>
                </div>
              )}

              {selectedRequest.responseHeaders && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>RESPONSE HEADERS</div>
                  <div style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, overflowX: 'auto' }}>
                    {Object.entries(selectedRequest.responseHeaders).map(([k, v]) => (
                      <div key={k}><span style={{ color: 'var(--blue)' }}>{k}</span>: {String(v)}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bento Grid Dashboard ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Tunnels</h1>
            <p className="page-subtitle">Expose and share local development environments instantly</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              id="toggle-chat"
              className={`btn btn-ghost ${chatOpen ? 'active' : ''}`}
              onClick={() => setChatOpen(o => !o)}
              style={{ padding: '8px 16px', color: chatOpen ? 'var(--text-accent)' : undefined, borderColor: chatOpen ? 'var(--accent)' : undefined }}
            >
              💬 Chat
            </button>
            <button
              id="refresh-ports"
              className="btn btn-ghost"
              onClick={loadTunnels}
              style={{ padding: '8px 16px' }}
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        <div className="bento-grid">
          {/* Card 1: Share a Local Server */}
          <div className="bento-card">
            <div className="bento-card-title">
              <span>⚡</span> Share a Local Server
            </div>
            <div className="bento-card-subtitle">
              Expose any local HTTP port to a secure public URL.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <ManualPortEntry onShare={share} sharing={sharing} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <input
                    id="toggle-password"
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                  />
                  🔒 Password Protection
                </label>
                {usePassword && (
                  <input
                    id="tunnel-password-input"
                    type="password"
                    className="form-input"
                    placeholder="Access password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: 160, padding: '6px 12px', fontSize: 12, height: 'auto', marginBottom: 0 }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Detected Services */}
          <div className="bento-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="bento-card-title" style={{ marginBottom: 0 }}>
                <span>🔍</span> Detected Services
              </div>
              <div className="pulse-indicator">
                <span className="pulse-dot"></span>
                <span>Auto Scanner</span>
              </div>
            </div>
            <div className="bento-card-subtitle">
              Automatically scanner for local development server ports.
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200 }}>
              {detectedPorts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px 0', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: 18, marginBottom: 6 }}>📡</span>
                  <span style={{ fontSize: 11 }}>No dev servers detected on standard ports.</span>
                </div>
              ) : (
                <div className="port-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detectedPorts.map((port) => (
                    <div key={port} className="port-item" style={{ margin: 0, padding: '10px 14px' }}>
                      <span className="port-badge">:{port}</span>
                      <span className="port-label" style={{ fontSize: 12 }}>
                        {PORT_NAMES[port] ?? 'Local server'}
                      </span>
                      <div className="port-status" />
                      <button
                        id={`share-port-${port}`}
                        className="btn btn-primary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => share(port)}
                        disabled={sharing === port}
                      >
                        {sharing === port ? <span className="spinner" /> : '⚡ Share'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Active & Recent Tunnels */}
          <div className="bento-card bento-full">
            <div className="bento-card-title">
              <span>🌐</span> Active & Recent Tunnels
            </div>
            <div className="bento-card-subtitle">
              Manage your active tunnels and view public URL sharing metrics.
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <div className="spinner" style={{ width: 24, height: 24 }} />
              </div>
            ) : tunnels.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: 22, marginBottom: 8 }}>⚡</span>
                <span style={{ fontSize: 11, fontWeight: 500 }}>No tunnels established yet. Expose a port to see it here!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activeTunnels.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Active Tunnels</div>
                    <div className="tunnel-list">
                      {activeTunnels.map((t) => (
                        <TunnelCard
                          key={t.id}
                          tunnel={t}
                          onOpen={() => setActiveTunnel(t)}
                          onClose={() => closeTunnel(t.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {pastTunnels.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Recent Tunnels</div>
                    <div className="tunnel-list">
                      {pastTunnels.slice(0, 5).map((t) => (
                        <TunnelCard key={t.id} tunnel={t} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>{/* end main content */}

      {/* ── Right Panel: Active Tunnel Inspector & Request Playground ── */}
      {activeTunnel && (
        <div className="inspector-panel">
          {/* Tunnel Header */}
          <div className="inspector-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--green)', fontSize: 10 }}>●</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Tunnel Active</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>:{activeTunnel.localPort}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {activeTunnel.publicUrl}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border-subtle)' }} onClick={() => copyUrl(activeTunnel.publicUrl)}>
                📋 Copy
              </button>
              <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => closeTunnel(activeTunnel.id)}>
                Stop
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setActiveTunnel(null)}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="inspector-tabs">
            <button
              onClick={() => setInspectorTab('traffic')}
              className={`inspector-tab ${inspectorTab === 'traffic' ? 'active' : ''}`}
            >
              🚦 Traffic Log ({requests.length})
            </button>
            <button
              onClick={() => setInspectorTab('playground')}
              className={`inspector-tab ${inspectorTab === 'playground' ? 'active' : ''}`}
            >
              ⚡ Request Playground & AI Swagger
            </button>
          </div>

          {/* Tab Content */}
          <div className="inspector-content">
            {inspectorTab === 'traffic' ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {requests.length === 0 ? (
                  <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 24, marginBottom: 8 }}>📡</span>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Waiting for incoming HTTP requests on {activeTunnel.publicUrl}...</p>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {requests.map(req => (
                      <div
                        key={req.id}
                        onClick={async () => {
                          try {
                            const detail = await api.requests.get(workspace.id, activeTunnel.id, req.id);
                            setSelectedRequest(detail);
                          } catch (err) {
                            showToast('Failed to load request details', 'error');
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          fontSize: 12, padding: '10px 12px', borderRadius: 6,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        className="endpoint-item-hover"
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{
                            fontWeight: 600, minWidth: 50, display: 'inline-block',
                            color: req.method === 'GET' ? 'var(--blue)' : req.method === 'POST' ? 'var(--green)' : 'var(--orange)'
                          }}>{req.method}</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{req.path}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)' }}>
                          {req.status === 'pending' ? (
                            <span className="spinner" style={{ width: 12, height: 12 }} />
                          ) : (
                            <>
                              <span style={{ color: req.status >= 400 ? 'var(--red)' : 'var(--green-dim)' }}>{req.status}</span>
                              <span>{req.durationMs}ms</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <RequestPlayground
                workspace={workspace}
                activeTunnel={activeTunnel}
                prefillRequest={playgroundPrefill}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Chat Panel ── */}
      {chatOpen && (
        <ChatPanel workspace={workspace} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}

function TunnelCard({ tunnel, onOpen, onClose }: {
  tunnel: any;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const isActive = tunnel.status === 'ACTIVE';
  const age = formatAge(tunnel.createdAt);

  return (
    <div
      className="tunnel-card"
      onClick={onOpen}
      style={{ cursor: isActive ? 'pointer' : 'default' }}
    >
      <div className="tunnel-card-header">
        <span className="tunnel-card-url">{tunnel.publicUrl}</span>
        <span className={`tunnel-status-badge ${isActive ? 'active' : 'closed'}`}>
          {tunnel.status}
        </span>
      </div>
      <div className="tunnel-meta">
        <div className="tunnel-meta-item">
          <span>🔌</span> Port {tunnel.localPort}
        </div>
        <div className="tunnel-meta-item">
          <span>🕐</span> {age}
        </div>
        {isActive && onClose && (
          <div className="tunnel-actions">
            <button
              id={`close-tunnel-${tunnel.id}`}
              className="btn btn-danger"
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualPortEntry({ onShare, sharing }: { onShare: (p: number) => void; sharing: number | null }) {
  const [port, setPort] = useState('');
  function submit() {
    const n = parseInt(port, 10);
    if (n > 0 && n < 65536) onShare(n);
  }
  return (
    <div>
      <div className="share-input-group">
        <input
          id="manual-port"
          className="share-input"
          type="number"
          placeholder="Expose local port (e.g. 3000, 5173, 8080)"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          id="manual-share-btn"
          className="btn btn-primary"
          style={{ width: 'auto', padding: '8px 20px', borderRadius: '8px', fontSize: 13 }}
          onClick={submit}
          disabled={!port || sharing !== null}
        >
          {sharing !== null ? <span className="spinner" /> : '⚡ Share'}
        </button>
      </div>
      
      <div className="preset-ports-container">
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PRESETS:</span>
        {[3000, 5173, 8000, 8080].map((p) => (
          <button
            key={p}
            className="preset-port-pill"
            onClick={() => onShare(p)}
            disabled={sharing !== null}
          >
            :{p}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
