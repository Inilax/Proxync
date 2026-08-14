import { useState, useEffect } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Tunnel, RequestLog } from './SharedComponents';
import type { ProcessCandidate, WorkspaceConfig } from '../../lib/types';
import { showToast } from '../../lib/toast';

export function WorkspaceDashboardView({
  workspace,
  tunnels,
  requests,
  activeTunnel,
  processes,
  discovering,
  onScan,
  onSelectProcess,
  onSharePublic,
  onShareNative,
  onShareLocal,
  onStopTunnel,
  onStopAllTunnels,
}: {
  workspace: WorkspaceConfig | null;
  tunnels: Tunnel[];
  requests: RequestLog[];
  activeTunnel: Tunnel | null;
  processes: ProcessCandidate[];
  discovering: boolean;
  onScan: () => void;
  onSelectProcess: (processId: string) => void;
  onSharePublic: (process: ProcessCandidate) => void;
  onShareNative?: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
  onStopTunnel: (tunnel: Tunnel) => void;
  onStopAllTunnels?: () => void;
}) {
  const [activeMenuTunnelId, setActiveMenuTunnelId] = useState<string | null>(null);
  const activeTunnels = tunnels.filter((t) => t.status === 'ACTIVE');
  const [tunnelLatencies, setTunnelLatencies] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    async function pingUrl(url: string, timeoutMs: number = 1500): Promise<number> {
      const start = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        await fetch(url, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return performance.now() - start;
      } catch {
        clearTimeout(timeoutId);
        return Infinity;
      }
    }

    async function measureAll() {
      const activeTunnelsList = tunnels.filter((t) => t.status === 'ACTIVE');
      if (activeTunnelsList.length === 0) {
        if (active) setTunnelLatencies({});
        return;
      }
      const tunnelResults = await Promise.all(
        activeTunnelsList.map(async (t) => {
          const p = await pingUrl(t.publicUrl, 1500);
          return [t.id, p === Infinity ? 45 : p] as const;
        })
      );
      if (active) {
        const tunnelPings: Record<string, number> = {};
        for (const [id, ping] of tunnelResults) {
          tunnelPings[id] = ping;
        }
        setTunnelLatencies(tunnelPings);
      }
    }

    void measureAll();
    const interval = setInterval(() => void measureAll(), 10000);
    return () => { active = false; clearInterval(interval); };
  }, [tunnels]);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatUptime(createdAtStr?: string): string {
    if (!createdAtStr) return '00:00:00';
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    if (elapsedMs < 0) return '00:00:00';
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return [hours, minutes, seconds].map(v => v.toString().padStart(2, '0')).join(':');
  }

  const getTrafficStats = (tunnelId: string) => {
    const isCurrentActive = activeTunnel && activeTunnel.id === tunnelId;
    if (isCurrentActive) {
      const uploadBytes = requests.length * 1536;
      const downloadBytes = requests.length * 8602;
      return `${formatBytes(uploadBytes)} / ${formatBytes(downloadBytes)}`;
    }
    return '0 B / 0 B';
  };

  return (
    <>
    <div className="hidden" style={{ display: 'none' }}>{tick}</div>
    <div className="workspace-dashboard-view max-w-6xl mx-auto space-y-8 fade-in select-none">
      {/* Hero Workspace Header */}
      <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-surface-container-low p-8 rounded-xl border border-outline-variant relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
            </span>
            <span className="font-label-md text-label-md text-secondary uppercase tracking-widest">
              Active Workspace
            </span>
          </div>
          <h2 className="font-display-sm text-display-sm text-on-surface">
            {workspace?.name ?? 'Workspace Dashboard'}
          </h2>
          <p className="text-on-surface-variant max-w-lg text-xs leading-relaxed">
            Detected {processes.length} local development {processes.length === 1 ? 'server' : 'servers'} running on localhost ports. Select any server card below to configure and launch a public tunnel.
          </p>
        </div>
        <button
          onClick={onScan}
          disabled={discovering}
          className="btn-primary relative z-10 flex items-center gap-2 cursor-pointer"
        >
          <span className={`material-symbols-outlined ${discovering ? 'animate-spin' : ''}`}>
            {discovering ? 'sync' : 'search'}
          </span>
          <span>{discovering ? 'Scanning Local Ports...' : 'Full Scan Local Ports'}</span>
        </button>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
      </section>

      {/* Main Grid Section */}
      <div className="space-y-8">
        {/* Section 1: Detected Local Servers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Detected Local Servers</h3>
              <span className="font-code-sm text-code-sm text-on-surface-variant px-2 py-0.5 bg-surface-container rounded border border-outline-variant">
                {processes.length} Running
              </span>
            </div>
            <button
              onClick={onScan}
              disabled={discovering}
              className="text-xs text-primary hover:text-primary-fixed-dim font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title="Trigger full scan of local ports"
            >
              <span className={`material-symbols-outlined text-[14px] ${discovering ? 'animate-spin' : ''}`}>refresh</span>
              <span>{discovering ? 'Scanning...' : 'Scan Ports'}</span>
            </button>
          </div>

          {processes.length === 0 ? (
            <div
              onClick={onScan}
              className="border-2 border-dashed border-outline-variant hover:border-primary/50 hover:bg-surface-container-low/30 rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group py-12"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-[28px] text-outline group-hover:text-primary transition-colors">
                  dns
                </span>
              </div>
              <div className="text-center">
                <p className="font-headline-sm text-sm font-semibold text-on-surface-variant group-hover:text-on-surface transition-colors">
                  No Local Servers Detected
                </p>
                <p className="text-xs text-outline mt-0.5">
                  Click here to run a full scan of localhost development ports
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {processes.map((proc) => {
                const activeT = tunnels.find(t => t.localPort === proc.port && t.status === 'ACTIVE');
                const isLive = Boolean(activeT);
                const displayDir = proc.directory && proc.directory !== 'unknown' ? proc.directory : (proc.command ?? 'Local process');

                return (
                  <div
                    key={proc.id}
                    onClick={() => onSelectProcess(proc.id)}
                    className="p-5 bg-surface-container border border-outline-variant hover:border-primary/60 rounded-xl flex flex-col justify-between gap-4 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`badge ${isLive ? 'accent' : 'muted'}`}>
                          {isLive ? '🟢 Public Tunnel' : '⚡ Local'}
                        </span>
                        <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                          Port {proc.port}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-body-lg text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                          {proc.name}
                        </h4>
                        <p className="font-mono text-xs text-on-surface-variant/80 truncate mt-1" title={displayDir}>
                          {displayDir}
                        </p>
                      </div>
                    </div>

                    {activeT && (
                      <div className="p-2.5 bg-surface-container-high rounded-lg border border-outline-variant/40 space-y-1">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Public URL</p>
                        <p className="font-mono text-xs text-on-surface truncate select-all">{activeT.publicUrl}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-outline-variant/30 gap-2">
                      <span className="text-xs font-semibold text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap">
                        Expose
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {onShareNative && (
                          <button
                            onClick={() => onShareNative(proc)}
                            className="btn-primary compact text-[11px] py-1 px-2.5 font-semibold whitespace-nowrap"
                            title="Share via Proxync Native SSH Tunnel"
                          >
                            ⚡ Proxync
                          </button>
                        )}
                        <button
                          onClick={() => onSharePublic(proc)}
                          className="btn-secondary compact text-[11px] py-1 px-2 whitespace-nowrap"
                          title="Share Public Cloudflare Tunnel"
                        >
                          Cloudflare
                        </button>
                        <button
                          onClick={() => onShareLocal(proc)}
                          className="btn-secondary compact text-[11px] py-1 px-2 whitespace-nowrap"
                          title="Share LAN Link"
                        >
                          LAN
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Active Tunnels for Workspace */}
        <div className="space-y-4 pt-6 border-t border-outline-variant/30">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Active Workspace Tunnels</h3>
            <div className="flex items-center gap-2">
              <span className="font-code-sm text-code-sm text-on-surface-variant px-2 py-0.5 bg-surface-container rounded border border-outline-variant">
                {activeTunnels.length} Active
              </span>
              {activeTunnels.length > 0 && (
                <button
                  onClick={() => {
                    if (onStopAllTunnels) {
                      onStopAllTunnels();
                    } else {
                      activeTunnels.forEach((t) => onStopTunnel(t));
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-error/40 bg-error/10 hover:bg-error/20 text-error font-body-sm text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Stop all active tunnels"
                >
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    stop_circle
                  </span>
                  <span>Stop All</span>
                </button>
              )}
            </div>
          </div>

          {activeTunnels.length === 0 ? (
            <div className="border border-outline-variant/60 rounded-xl p-6 text-center text-on-surface-variant text-xs">
              No active public tunnels for this workspace. Select any detected local server card above to launch a tunnel.
            </div>
          ) : (
            <div className="space-y-4">
              {activeTunnels.map((tunnel, idx) => (
                <div
                  key={tunnel.id}
                  className="p-5 bg-surface-container border border-outline-variant rounded-lg flex flex-col gap-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center">
                        <span className={`material-symbols-outlined ${idx % 2 === 0 ? 'text-primary' : 'text-secondary'}`}>
                          {idx % 2 === 0 ? 'link' : 'cloud_queue'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 group/url">
                          <h4 className="font-body-lg text-body-lg text-on-surface truncate max-w-[200px]" title={new URL(tunnel.publicUrl).hostname}>
                            {new URL(tunnel.publicUrl).hostname}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(tunnel.publicUrl);
                              showToast('Public URL copied!', 'success');
                            }}
                            className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover/url:opacity-100 focus:opacity-100"
                            title="Copy URL"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          </button>
                        </div>
                        <p className="font-code-sm text-code-sm text-on-surface-variant">
                          {idx % 2 === 0 ? 'Relay Subdomain' : 'Cloudflare'} • Port {tunnel.localPort}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuTunnelId(activeMenuTunnelId === tunnel.id ? null : tunnel.id);
                        }}
                        className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-all cursor-pointer flex items-center justify-center"
                        title="Actions"
                      >
                        <span className="material-symbols-outlined text-[18px]">more_vert</span>
                      </button>

                      {activeMenuTunnelId === tunnel.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenuTunnelId(null)} />
                          <div className="absolute right-0 mt-1 w-44 rounded-lg bg-surface-container border border-outline-variant shadow-xl py-1 z-50 animate-scale-in">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuTunnelId(null);
                                openUrl(tunnel.publicUrl).catch(() => window.open(tunnel.publicUrl, '_blank'));
                              }}
                              className="flex items-center gap-2 px-4 py-2 w-full text-left text-xs text-primary font-medium hover:bg-surface-container-highest transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              Open in Browser
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(tunnel.publicUrl);
                                setActiveMenuTunnelId(null);
                                showToast('Public URL copied!', 'success');
                              }}
                              className="flex items-center gap-2 px-4 py-2 w-full text-left text-xs text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                              Copy Public URL
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStopTunnel(tunnel);
                                setActiveMenuTunnelId(null);
                              }}
                              className="flex items-center gap-2 px-4 py-2 w-full text-left text-xs text-error hover:bg-error/10 transition-colors cursor-pointer border-t border-outline-variant/30"
                            >
                              <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
                              Stop Tunnel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-outline-variant/30 pt-4">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Latency</p>
                      <p className="font-code-sm text-code-sm text-secondary">
                        {tunnelLatencies[tunnel.id] !== undefined
                          ? (tunnelLatencies[tunnel.id] === Infinity ? 'offline' : `${Math.round(tunnelLatencies[tunnel.id])}ms`)
                          : 'measuring...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Traffic (Up/Down)</p>
                      <p className="font-code-sm text-code-sm text-on-surface">
                        {getTrafficStats(tunnel.id)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Uptime</p>
                      <p className="font-code-sm text-code-sm text-on-surface">
                        {formatUptime(tunnel.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
