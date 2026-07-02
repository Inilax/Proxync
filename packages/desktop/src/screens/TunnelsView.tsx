import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getToken } from '../lib/api';
import { ChatPanel } from '../components/ChatPanel';

interface TunnelsViewProps {
  workspace: any;
  user?: any;
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

export function TunnelsView({ workspace, user }: TunnelsViewProps) {
  const [tunnels, setTunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<number | null>(null);
  const [activeTunnel, setActiveTunnel] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  // Bug 3 fix: track per-request start times so we can compute real latency
  const requestStartTimes = useRef<Map<string, number>>(new Map());
  const detectedPorts = usePortScanner();

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
      const tunnel = await api.tunnels.create(workspace.id, port);
      
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      // Derive the relay WS URL from the same base as the API
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') as string;
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
    setCopied(true);
    showToast('Link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  const activeTunnels = tunnels.filter((t) => t.status === 'ACTIVE');
  const pastTunnels = tunnels.filter((t) => t.status !== 'ACTIVE');

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>
      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: 'hidden auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Share Modal */}
      {activeTunnel && (
        <div className="modal-overlay" onClick={() => setActiveTunnel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--green-dim)',
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>⚡</div>
              <div>
                <div className="modal-title">Tunnel Live</div>
                <div className="modal-subtitle">Your local port {activeTunnel.localPort} is now publicly accessible</div>
              </div>
            </div>

            <div className="url-display">
              <span className="url-text">{activeTunnel.publicUrl}</span>
              {copied && <span className="copied-badge">✓ Copied</span>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="copy-tunnel-url"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => copyUrl(activeTunnel.publicUrl)}
              >
                📋 Copy Link
              </button>
              <button
                className="btn btn-danger"
                onClick={() => closeTunnel(activeTunnel.id)}
              >
                Stop
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setActiveTunnel(null)}
              >
                Dismiss
              </button>
            </div>

            <div style={{
              marginTop: 16, padding: '10px 12px',
              background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
              fontSize: 12, color: 'var(--text-secondary)',
            }}>
              💡 Share this link with anyone — they can open it in any browser. No install required.
            </div>

            {requests.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div className="modal-title" style={{ fontSize: 14, marginBottom: 8 }}>Live Traffic</div>
                <div style={{
                  maxHeight: 200, overflowY: 'auto', 
                  background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
                  padding: 8, display: 'flex', flexDirection: 'column', gap: 4
                }}>
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
                      fontSize: 12, padding: '6px 8px', borderRadius: 4,
                      background: 'rgba(255,255,255,0.02)', cursor: 'pointer'
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ 
                          fontWeight: 600, 
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
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Detected Ports */}
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Tunnels</h1>
            <p className="page-subtitle">Share a running local server in one click</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              id="toggle-chat"
              className={`btn btn-ghost ${chatOpen ? 'active' : ''}`}
              onClick={() => setChatOpen(o => !o)}
              style={{ padding: '8px 14px', color: chatOpen ? 'var(--text-accent)' : undefined, borderColor: chatOpen ? 'var(--accent)' : undefined }}
            >
              💬 Chat
            </button>
            <button
              id="refresh-ports"
              className="btn btn-ghost"
              onClick={loadTunnels}
              style={{ padding: '8px 14px' }}
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Detected Local Servers</div>
          {detectedPorts.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-state-icon">🔍</div>
              <p className="empty-state-title">No servers detected</p>
              <p className="empty-state-desc">
                Start a dev server (e.g. <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>npm run dev</code>) and it will appear here
              </p>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                Or manually enter a port:
              </div>
              <ManualPortEntry onShare={share} sharing={sharing} />
            </div>
          ) : (
            <div className="port-list">
              {detectedPorts.map((port) => (
                <div key={port} className="port-item">
                  <span className="port-badge">:{port}</span>
                  <span className="port-label">
                    {PORT_NAMES[port] ?? 'Local server'}
                  </span>
                  <div className="port-status" />
                  <button
                    id={`share-port-${port}`}
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '7px 16px', fontSize: 13 }}
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

      {/* Active Tunnels */}
      {activeTunnels.length > 0 && (
        <div>
          <div className="card-title" style={{ marginBottom: 12 }}>Active Tunnels</div>
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

      {/* Past Tunnels */}
      {pastTunnels.length > 0 && (
        <div>
          <div className="card-title" style={{ marginBottom: 12 }}>Recent</div>
          <div className="tunnel-list">
            {pastTunnels.slice(0, 10).map((t) => (
              <TunnelCard key={t.id} tunnel={t} />
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <div className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      )}
      </div>{/* end main content */}

      {/* ── Chat Panel ── */}
      {chatOpen && (
        <ChatPanel workspace={workspace} user={user} />
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
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input
        id="manual-port"
        className="form-input"
        type="number"
        placeholder="e.g. 5173"
        value={port}
        onChange={(e) => setPort(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ width: 120, textAlign: 'center' }}
      />
      <button
        id="manual-share-btn"
        className="btn btn-primary"
        style={{ width: 'auto', padding: '10px 16px' }}
        onClick={submit}
        disabled={!port || sharing !== null}
      >
        ⚡ Share
      </button>
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
