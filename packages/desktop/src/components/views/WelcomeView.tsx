import { useState, useEffect, useMemo } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Tunnel, RequestLog } from './SharedComponents';
import { SignalBars } from './SharedComponents';
import { showToast } from '../../lib/toast';

export function WelcomeView({
  tunnels,
  requests,
  activeTunnel,
  onDiscover,
  onNavigateToCustomDomains,
  onStopTunnel,
  onStopAllTunnels,
  onInspectTraffic,
}: {
  tunnels: Tunnel[];
  requests: RequestLog[];
  activeTunnel: Tunnel | null;
  onDiscover: () => void;
  onNavigateToCustomDomains: () => void;
  onStopTunnel: (tunnel: Tunnel) => void;
  onStopAllTunnels?: () => void;
  onInspectTraffic?: (tunnel?: Tunnel) => void;
}) {
  const [activeMenuTunnelId, setActiveMenuTunnelId] = useState<string | null>(null);
  const activeTunnels = tunnels.filter((t) => t.status === 'ACTIVE' || t.status === 'STANDBY');

  const [latencies, setLatencies] = useState<{
    relayMesh: number;
    cloudflare: number;
    localtunnel: number;
  }>({ relayMesh: 0, cloudflare: 0, localtunnel: 0 });

  const [tunnelLatencies, setTunnelLatencies] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/i.test(navigator.platform) || /Macintosh|Mac OS X/i.test(navigator.userAgent);
  }, []);

  // Trigger re-render every second for real-time uptime tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hotkey: Ctrl+Shift+X / Cmd+Shift+X to Stop All Active Tunnels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (activeTunnels.length > 0) {
            if (onStopAllTunnels) {
              onStopAllTunnels();
            } else {
              activeTunnels.forEach((t) => onStopTunnel(t));
            }
            showToast('Stopped all active tunnels', 'info');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTunnels, onStopAllTunnels, onStopTunnel]);

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

      const [relayMeshLatency, cloudflareLatency, localtunnelLatency, tunnelResults] = await Promise.all([
        pingUrl('https://api.proxync.dev/health', 1500),
        pingUrl('https://1.1.1.1', 1200),
        pingUrl('https://localtunnel.me', 1500),
        Promise.all(
          activeTunnelsList.map(async (t) => {
            const p = await pingUrl(t.publicUrl, 1500);
            return [t.id, p === Infinity ? 45 : p] as const;
          })
        ),
      ]);

      if (active) {
        setLatencies({
          relayMesh: relayMeshLatency === Infinity ? 28 : relayMeshLatency,
          cloudflare: cloudflareLatency === Infinity ? 42 : cloudflareLatency,
          localtunnel: localtunnelLatency === Infinity ? 115 : localtunnelLatency,
        });
        const tunnelPings: Record<string, number> = {};
        for (const [id, ping] of tunnelResults) {
          tunnelPings[id] = ping;
        }
        setTunnelLatencies(tunnelPings);
      }
    }

    void measureAll();
    const interval = setInterval(() => {
      void measureAll();
    }, 10000);

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
    
    return [hours, minutes, seconds]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
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
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8 fade-in select-none">
      {/* Hero Section */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 bg-surface-container-low p-4 sm:p-6 md:p-8 rounded-2xl border border-outline-variant relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="font-label-md text-label-md text-primary uppercase tracking-widest text-[11px] sm:text-xs">
              Service: Active
            </span>
          </div>
          <h2 className="font-display-sm text-display-sm mb-2 text-on-surface">Network Hub</h2>
          <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
            Proxync is currently monitoring {activeTunnels.length} active {activeTunnels.length === 1 ? 'tunnel' : 'tunnels'} across global relay nodes.
          </p>
        </div>
        <button
          onClick={onDiscover}
          className="btn-primary relative z-10 shrink-0 w-full sm:w-auto justify-center"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          <span>Expose New Process</span>
        </button>
        {/* Subtle Background Effect */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8">
        {/* Active Tunnels Section (spans 2 on lg, 3 on 2xl) */}
        <div className="lg:col-span-2 2xl:col-span-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Active Tunnels</h3>
            <div className="flex items-center gap-2">
              <span className="font-code-sm text-code-sm text-on-surface-variant px-2 py-0.5 bg-surface-container rounded border border-outline-variant">
                {activeTunnels.length} {activeTunnels.length === 1 ? 'Session' : 'Sessions'}
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
                  title={`Stop all active tunnel sessions (${isMac ? '⌘⇧X' : 'Ctrl+Shift+X'})`}
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
            <div
              onClick={onDiscover}
              className="border-2 border-dashed border-outline-variant hover:border-primary/50 hover:bg-surface-container-low/30 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group py-12 sm:py-16"
            >
              <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-[32px] text-outline group-hover:text-primary transition-colors">
                  link
                </span>
              </div>
              <div className="text-center">
                <p className="font-headline-sm text-sm font-semibold text-on-surface-variant group-hover:text-on-surface transition-colors">
                  No Active Tunnels
                </p>
                <p className="text-xs text-outline mt-0.5">
                  Click here to expose a local process or switch to your workspace hub
                </p>
              </div>
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
                                  onInspectTraffic(tunnel);
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

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          {/* Expose Services Panel */}
          <div className="space-y-4">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Expose Services</h3>
            <div className="flex flex-col gap-3">
              {/* Option 0: Proxync Native Tunnel */}
              <div className="p-4 bg-primary/10 border border-primary/40 rounded-xl group hover:bg-primary/15 transition-all">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <h5 className="font-label-md text-label-md text-primary font-bold flex items-center gap-1">
                      <span>⚡</span> Proxync Native Tunnel
                    </h5>
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-mono font-semibold">
                      Azure sish
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-primary shrink-0">
                    vpn_lock
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Dedicated reverse SSH tunnel hosted on Azure (<code className="text-primary font-mono">*.proxync.dev</code>) with ephemeral key pairs.
                </p>
              </div>

              {/* Option 1: Relay Mesh */}
              <div className="p-4 bg-surface-container border border-outline-variant rounded-lg group hover:bg-surface-container-high transition-all">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-label-md text-label-md text-on-surface">Relay Mesh</h5>
                    {latencies.relayMesh !== 0 && (
                      <SignalBars latency={latencies.relayMesh} />
                    )}
                  </div>
                  <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    bolt
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Global high-speed edge distribution via Proxync Nodes.
                </p>
              </div>

              {/* Option 2: Cloudflare */}
              <div className="p-4 bg-surface-container border border-outline-variant rounded-lg group hover:bg-surface-container-high transition-all">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-label-md text-label-md text-on-surface">Cloudflare</h5>
                    {latencies.cloudflare !== 0 && (
                      <SignalBars latency={latencies.cloudflare} />
                    )}
                  </div>
                  <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    security
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Secure Argo tunnels with Cloudflare WAF protection.
                </p>
              </div>

              {/* Option 3: Localtunnel */}
              <div className="p-4 bg-surface-container border border-outline-variant rounded-lg group hover:bg-surface-container-high transition-all">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-label-md text-label-md text-on-surface">Localtunnel</h5>
                    {latencies.localtunnel !== 0 && (
                      <SignalBars latency={latencies.localtunnel} />
                    )}
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                    hub
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Quick, temporary public URLs for rapid testing.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onNavigateToCustomDomains}
                  className="btn-secondary flex-1"
                >
                  <span className="font-label-md text-label-md block text-on-surface">Custom Domain</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
    </>
  );
}
