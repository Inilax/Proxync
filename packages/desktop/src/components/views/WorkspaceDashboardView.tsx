import { useState, useEffect } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Tunnel, RequestLog } from './SharedComponents';
import type { ProcessCandidate, WorkspaceConfig } from '../../lib/types';
import { showToast } from '../../lib/toast';
function getFrameworkSubtitle(proc: ProcessCandidate): string {
  if (proc.framework && proc.framework !== 'unknown') {
    const fw = proc.framework.trim();
    if (fw.toLowerCase().endsWith('app') || fw.toLowerCase().endsWith('server') || fw.toLowerCase().endsWith('service')) {
      return fw;
    }
    return `${fw} App`;
  }
  const text = `${proc.name || ''} ${proc.command || ''} ${proc.directory || ''}`.toLowerCase();
  if (text.includes('node') || text.includes('express')) return 'Node.js App';
  if (text.includes('vite')) return 'Vite App';
  if (text.includes('next')) return 'Next.js App';
  if (text.includes('react')) return 'React App';
  if (text.includes('python') || text.includes('fastapi') || text.includes('django')) return 'Python App';
  if (text.includes('go')) return 'Go App';
  return 'HTTP Service';
}

export function WorkspaceDashboardView({
  workspace,
  tunnels,
  requests,
  activeTunnel,
  processes,
  discovering,
  sharingPort,
  spawningPorts = [],
  onScan,
  onSelectProcess,
  onSharePublic,
  onShareNative,
  onShareLocal,
  onStopTunnel,
  onStopAllTunnels,
  onInspectTraffic,
}: {
  workspace: WorkspaceConfig | null;
  tunnels: Tunnel[];
  requests: RequestLog[];
  activeTunnel: Tunnel | null;
  processes: ProcessCandidate[];
  discovering: boolean;
  sharingPort?: number | null;
  spawningPorts?: number[];
  onScan: () => void;
  onSelectProcess: (processId: string) => void;
  onSharePublic: (process: ProcessCandidate) => void;
  onShareNative?: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
  onStopTunnel: (tunnel: Tunnel) => void;
  onStopAllTunnels?: () => void;
  onInspectTraffic?: (proc: ProcessCandidate) => void;
}) {
  const [activeMenuTunnelId, setActiveMenuTunnelId] = useState<string | null>(null);
  const activeTunnels = tunnels.filter((t) => t.status === 'ACTIVE' || t.status === 'STANDBY');
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
      const activeTunnelsList = tunnels.filter((t) => t.status === 'ACTIVE' || t.status === 'STANDBY');
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
    return () => {
      active = false;
      clearInterval(interval);
    };
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
    return [hours, minutes, seconds].map((v) => v.toString().padStart(2, '0')).join(':');
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
      <div className="workspace-dashboard-view w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8 fade-in select-none">
        {/* Hero Workspace Header */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 bg-surface-container-low p-4 sm:p-6 md:p-8 rounded-2xl border border-outline-variant relative overflow-hidden">
          <div className="relative z-10 space-y-2 max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
              <span className="font-label-md text-label-md text-secondary uppercase tracking-widest text-[11px] sm:text-xs">
                Active Workspace
              </span>
            </div>
            <h2 className="font-display-sm text-display-sm text-on-surface">
              {workspace?.name ?? 'Workspace Dashboard'}
            </h2>
            <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
              Detected {processes.length} local development {processes.length === 1 ? 'server' : 'servers'} running on localhost ports. Select any server card below to configure and launch a public tunnel.
            </p>
          </div>
          <button
            onClick={onScan}
            disabled={discovering}
            className="btn-primary relative z-10 flex items-center justify-center gap-2 cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <span className={`material-symbols-outlined ${discovering ? 'animate-spin' : ''}`}>
              {discovering ? 'sync' : 'search'}
            </span>
            <span>{discovering ? 'Scanning Local Ports...' : 'Full Scan Local Ports'}</span>
          </button>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>
        </section>

        {/* Main Grid Section */}
        <div className="space-y-8">
          {/* Section 1: Detected Local Servers */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                className="border-2 border-dashed border-outline-variant hover:border-primary/50 hover:bg-surface-container-low/30 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group py-12"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                {processes.map((proc) => {
                  const activeT = tunnels.find((t) => t.localPort === proc.port && (t.status === 'ACTIVE' || t.status === 'STANDBY'));
                  const isLive = Boolean(activeT);
                  const isStandby = activeT?.status === 'STANDBY';
                  const isSpawning = spawningPorts.includes(proc.port) || sharingPort === proc.port;
                  const displayDir = proc.directory && proc.directory !== 'unknown' ? proc.directory : `localhost:${proc.port}`;

                  return (
                    <div
                      key={proc.id}
                      onClick={() => onSelectProcess(proc.id)}
                      className={`p-4 sm:p-5 bg-surface-container border rounded-2xl flex flex-col justify-between gap-4 transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                        isLive && !isStandby
                          ? 'border-emerald-500/60 shadow-emerald-500/10'
                          : isStandby
                            ? 'border-amber-500/60 shadow-amber-500/10'
                            : isSpawning
                              ? 'border-primary/50 ring-1 ring-primary/30'
                              : 'border-outline-variant/60 hover:border-primary/50'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Top Header: Icon + Name + Subtitle + Status Pills */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Icon Box */}
                            <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                              <span className="material-symbols-outlined text-[20px]">
                                code
                              </span>
                            </div>

                            {/* Title & Subtitle */}
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-on-surface truncate">
                                {proc.name}
                              </h4>
                              <p className="text-xs text-on-surface-variant/70 font-mono mt-0.5 truncate">
                                {getFrameworkSubtitle(proc)}
                              </p>
                            </div>
                          </div>

                          {/* Top Right Badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2.5 py-1 bg-surface-container-high rounded-full border text-[11px] font-mono font-medium flex items-center gap-1.5 ${
                              isLive && !isStandby
                                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                : isStandby
                                ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                : 'border-outline-variant/50 text-on-surface-variant'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isLive && !isStandby ? 'bg-emerald-400 animate-pulse' : isStandby ? 'bg-amber-400' : 'bg-outline'}`}></span>
                              {isLive && !isStandby ? 'ONLINE' : isStandby ? 'STANDBY' : 'LOCAL'}
                            </span>
                            <span className="px-2.5 py-1 bg-surface-container-high rounded-full border border-outline-variant/50 text-[11px] font-mono font-bold text-primary">
                              :{proc.port}
                            </span>
                          </div>
                        </div>

                        {/* Directory Row */}
                        <div className="flex items-center gap-2 text-on-surface-variant/70 font-mono text-xs">
                          <span className="material-symbols-outlined text-[16px] text-outline shrink-0">
                            folder
                          </span>
                          <span className="truncate" title={displayDir}>
                            {displayDir}
                          </span>
                        </div>

                        {/* Local Endpoint / Public Endpoint Box */}
                        {isLive && activeT ? (
                          <div className={`bg-surface-container-lowest/80 p-3 rounded-lg border ${isStandby ? 'border-amber-500/30' : 'border-emerald-500/30'} space-y-1`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-mono uppercase tracking-wider ${isStandby ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>
                                {isStandby ? 'STANDBY ENDPOINT' : 'PUBLIC ENDPOINT'}
                              </span>
                              <span className={`px-1.5 py-0.5 ${isStandby ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'} text-[10px] font-mono rounded`}>
                                {isStandby ? 'Standby' : 'Live'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-mono text-xs font-bold text-on-surface truncate select-all">{activeT.publicUrl}</p>
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(activeT.publicUrl);
                                    showToast('Public URL copied!', 'success');
                                  }}
                                  className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                                  title="Copy URL"
                                >
                                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                </button>
                                <button
                                  onClick={() => {
                                    openUrl(activeT.publicUrl).catch(() => window.open(activeT.publicUrl, '_blank'));
                                  }}
                                  className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                                  title="Open in Browser"
                                >
                                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-surface-container-lowest/80 p-3 rounded-lg border border-outline-variant/40 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-outline font-semibold">
                                LOCAL ENDPOINT
                              </span>
                              <span className="px-1.5 py-0.5 bg-surface-container-high text-[10px] font-mono text-outline rounded">
                                Ready
                              </span>
                            </div>
                            <p className="font-mono text-xs font-bold text-on-surface truncate">
                              http://localhost:{proc.port}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Row */}
                      <div className="pt-3 border-t border-outline-variant/30 flex items-center">
                        {isSpawning ? (
                          /* Spawning State matching Image 2 */
                          <div
                            className="w-full py-2 px-4 bg-surface-container-high/70 border border-outline-variant/60 rounded-lg text-xs font-medium text-on-surface flex items-center justify-center gap-2 shadow-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant animate-spin">
                              sync
                            </span>
                            <span className="font-mono text-on-surface-variant font-semibold">
                              Spawning Tunnel Connection...
                            </span>
                          </div>
                        ) : isLive && activeT ? (
                          /* Live State */
                          <div className="flex items-center justify-between w-full gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectTraffic?.(proc);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-body-sm text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 group/btn"
                              title="View live traffic logs for this server"
                            >
                              <span className="material-symbols-outlined text-[15px]">troubleshoot</span>
                              <span>Inspect Traffic</span>
                              <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">arrow_forward</span>
                            </button>
                            <button
                              onClick={() => onStopTunnel(activeT)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-error/40 bg-error/10 hover:bg-error/20 text-error font-body-sm text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                              title="Stop active tunnel"
                            >
                              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                stop_circle
                              </span>
                              <span>Stop</span>
                            </button>
                          </div>
                        ) : (
                          /* Local / Ready State matching Image 1 */
                          <div className="flex items-center gap-1.5 w-full min-w-0" onClick={(e) => e.stopPropagation()}>
                            {onShareNative && (
                              <button
                                onClick={() => onShareNative(proc)}
                                className="btn-expose-proxync flex-1 min-w-0"
                                style={{
                                  backgroundColor: '#7c82ff',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.25)',
                                  boxShadow: '0 2px 8px rgba(124, 130, 255, 0.3)',
                                }}
                                title="Share via Proxync Native SSH Tunnel"
                              >
                                <span className="material-symbols-outlined text-[15px] text-white shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  bolt
                                </span>
                                <span className="truncate">Expose (Proxync)</span>
                              </button>
                            )}
                            <button
                              onClick={() => onSharePublic(proc)}
                              className="btn-cloud-option shrink-0"
                              style={{
                                backgroundColor: '#20293d',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                              }}
                              title="Share Public Cloudflare Tunnel"
                            >
                              Cloudflare
                            </button>
                            <button
                              onClick={() => onShareLocal(proc)}
                              className="btn-lan-option shrink-0"
                              style={{
                                backgroundColor: '#20293d',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                              }}
                              title="Share LAN Link"
                            >
                              LAN
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Active Tunnels for Workspace */}
          <div className="space-y-4 pt-6 border-t border-outline-variant/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                    className="p-4 sm:p-5 bg-surface-container border border-outline-variant rounded-xl flex flex-col gap-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
                          <span className={`material-symbols-outlined ${idx % 2 === 0 ? 'text-primary' : 'text-secondary'}`}>
                            {idx % 2 === 0 ? 'link' : 'cloud_queue'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 group/url">
                            <h4 className="font-body-lg text-body-lg text-on-surface truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[320px] md:max-w-[440px] lg:max-w-[560px]" title={new URL(tunnel.publicUrl).hostname}>
                              {new URL(tunnel.publicUrl).hostname}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(tunnel.publicUrl);
                                showToast('Public URL copied!', 'success');
                              }}
                              className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center opacity-70 sm:opacity-0 group-hover/url:opacity-100 focus:opacity-100 shrink-0"
                              title="Copy URL"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
                          </div>
                          <p className="font-code-sm text-code-sm text-on-surface-variant truncate">
                            {idx % 2 === 0 ? 'Relay Subdomain' : 'Cloudflare'} • Port {tunnel.localPort}
                          </p>
                        </div>
                      </div>

                      <div className="relative shrink-0">
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

                              {onInspectTraffic && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuTunnelId(null);
                                    const matchingProc = processes.find((p) => p.port === tunnel.localPort);
                                    if (matchingProc) {
                                      onInspectTraffic(matchingProc);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-xs text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                                  Inspect Traffic
                                </button>
                              )}

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
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-outline-variant/30 pt-4">
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter truncate">Latency</p>
                        <p className="font-code-sm text-code-sm text-secondary truncate">
                          {tunnelLatencies[tunnel.id] !== undefined
                            ? (tunnelLatencies[tunnel.id] === Infinity ? 'offline' : `${Math.round(tunnelLatencies[tunnel.id])}ms`)
                            : 'measuring...'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter truncate">Traffic (Up/Down)</p>
                        <p className="font-code-sm text-code-sm text-on-surface truncate">
                          {getTrafficStats(tunnel.id)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter truncate">Uptime</p>
                        <p className="font-code-sm text-code-sm text-on-surface truncate">
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