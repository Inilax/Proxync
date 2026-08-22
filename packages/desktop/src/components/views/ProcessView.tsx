import { openUrl } from '@tauri-apps/plugin-opener';
import type { WorkspaceConfig, ProcessCandidate, ProcessProfile, Tunnel, SavedRequest } from './SharedComponents';
import { InfoTile, formatDate } from './SharedComponents';

function handleOpenUrl(url: string) {
  openUrl(url).catch(() => window.open(url, '_blank'));
}

export function getTunnelProviderLabel(tunnel: Tunnel | null): string {
  if (!tunnel?.publicUrl) return 'Proxync Tunnel';
  const lower = tunnel.publicUrl.toLowerCase();
  if (lower.includes('trycloudflare.com') || lower.includes('cloudflare')) {
    return 'Cloudflare Tunnel';
  }
  if (lower.includes('localtunnel.me') || lower.includes('localtunnel')) {
    return 'Localtunnel';
  }
  if (lower.includes('proxync') || tunnel.subdomain?.startsWith('px-')) {
    return 'Proxync Tunnel';
  }
  try {
    const urlObj = new URL(tunnel.publicUrl.startsWith('http') ? tunnel.publicUrl : `https://${tunnel.publicUrl}`);
    return urlObj.hostname ? `Custom Domain (${urlObj.hostname})` : 'Proxync Tunnel';
  } catch {
    return 'Proxync Tunnel';
  }
}

export function ProcessView({
  workspace,
  process,
  profile,
  tunnel,
  sharingPort,
  suggestions,
  hasVerifiedDomain,
  localIp,
  onDiscover,
  onShare,
  onShareLocal,
  onStop,
  onStopLocalShare,
  onCopy,
  onImportStarterRequests,
  onRefreshConfig,
  onInspectTraffic,
}: {
  workspace: WorkspaceConfig | null;
  process: ProcessCandidate | null;
  profile: ProcessProfile | null;
  tunnel: Tunnel | null;
  sharingPort: number | null;
  suggestions: SavedRequest[];
  hasVerifiedDomain: boolean;
  localIp: string;
  onDiscover: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
  onStop: (tunnel: Tunnel) => void;
  onStopLocalShare: () => void;
  onCopy: (value: string, message: string) => void;
  onImportStarterRequests: () => void;
  onRefreshConfig?: (process: ProcessCandidate | ProcessProfile) => void;
  onInspectTraffic?: () => void;
}) {
  if (!process && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12 fade-in select-none">
        <div className="w-16 h-16 bg-surface-container-high border border-outline-variant text-outline rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[32px]">pageview</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface mb-2">No Process Selected</h2>
        <p className="text-on-surface-variant text-sm max-w-sm mb-6 leading-relaxed">
          Scan localhost and choose a running development server to configure custom tunnels, capture traffic, or generate schemas.
        </p>
        <button
          className="btn-primary"
          onClick={onDiscover}
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          Discover Processes
        </button>
      </div>
    );
  }

  const processLike = process ?? {
    id: profile!.id,
    name: profile!.processName,
    port: profile!.port,
    command: profile!.command,
    directory: profile!.directory,
    executable: profile!.executable,
    framework: profile!.framework,
    access: 'unknown' as const,
    uptime: profile?.lastSharedAt ? 'saved configuration' : 'saved',
  };

  // Dynamic directory resolution
  const resolvedDirectory = (processLike.directory && processLike.directory !== 'unknown')
    ? processLike.directory
    : (workspace?.projectRootPath && workspace.projectRootPath !== 'unknown' && workspace.projectRootPath !== '')
      ? workspace.projectRootPath
      : 'Directory undetected';

  // Dynamic executable resolution (never default to java for JS/TS apps!)
  let resolvedExecutable = processLike.executable;
  if (!resolvedExecutable || resolvedExecutable === 'unknown') {
    const hint = `${workspace?.languageHint || ''} ${processLike.name || ''} ${processLike.command || ''} ${processLike.framework || ''}`.toLowerCase();
    if (hint.includes('node') || hint.includes('next') || hint.includes('vite') || hint.includes('react') || hint.includes('express') || hint.includes('script') || hint.includes('npm') || hint.includes('yarn') || hint.includes('pnpm') || hint.includes('bun')) {
      resolvedExecutable = 'node';
    } else if (hint.includes('py') || hint.includes('django') || hint.includes('flask') || hint.includes('python')) {
      resolvedExecutable = 'python';
    } else if (hint.includes('go')) {
      resolvedExecutable = 'go';
    } else if (hint.includes('java') && !hint.includes('javascript')) {
      resolvedExecutable = 'java';
    } else {
      resolvedExecutable = 'node';
    }
  }

  const isTunnelOpen = tunnel?.localPort === processLike.port && (tunnel.status === 'ACTIVE' || tunnel.status === 'STANDBY');
  const isActive = tunnel?.localPort === processLike.port && tunnel.status === 'ACTIVE';
  const isStandby = tunnel?.localPort === processLike.port && tunnel.status === 'STANDBY';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 fade-in select-none">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 border-b border-outline-variant/30 pb-5 sm:pb-6">
        <div className="min-w-0">
          <h1 className="font-display-sm text-display-sm text-on-surface truncate" title={processLike.name}>{processLike.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {isActive && tunnel ? (
              <span className="badge success">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-0.5" />
                Online • {getTunnelProviderLabel(tunnel)}
              </span>
            ) : isStandby && tunnel ? (
              <span className="badge warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }} title="Local server is offline. Tunnel URL is preserved in standby mode and waiting for server restart.">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-0.5" />
                Standby • Target Offline
              </span>
            ) : sharingPort === processLike.port ? (
              <span className="badge accent" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-0.5" />
                Shared on LAN
              </span>
            ) : (
              <span className={`badge ${process ? 'accent' : 'muted'}`}>
                {process ? '● Running locally' : '○ Saved profile'}
              </span>
            )}
            <span className="badge muted">Port {processLike.port}</span>
            <span className="badge muted">{processLike.framework ?? 'HTTP'}</span>
            <span className="badge muted">{workspace?.languageHint ?? 'Unknown language'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isTunnelOpen && tunnel ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {onInspectTraffic && (
                <button
                  className="btn-secondary flex-1 sm:flex-initial justify-center"
                  onClick={onInspectTraffic}
                  title="Inspect real-time HTTP traffic and payloads"
                >
                  Inspect Traffic
                </button>
              )}
              <button
                className="btn-danger flex-1 sm:flex-initial justify-center"
                onClick={() => onStop(tunnel)}
              >
                <span className="material-symbols-outlined text-[16px]">stop</span>
                Stop Tunnel
              </button>
            </div>
          ) : sharingPort === processLike.port ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {onInspectTraffic && (
                <button
                  className="btn-secondary flex-1 sm:flex-initial justify-center"
                  onClick={onInspectTraffic}
                  title="Inspect local traffic"
                >
                  Inspect Traffic
                </button>
              )}
              <button
                className="btn-danger flex-1 sm:flex-initial justify-center"
                onClick={onStopLocalShare}
              >
                <span className="material-symbols-outlined text-[16px]">stop</span>
                Stop Sharing
              </button>
            </div>
          ) : process ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                className="btn-secondary flex-1 sm:flex-initial justify-center"
                onClick={() => onShareLocal(process)}
              >
                <span className="material-symbols-outlined text-[16px]">wifi</span>
                LAN Share
              </button>
              <button
                className="btn-primary flex-1 sm:flex-initial justify-center"
                onClick={() => onShare(process)}
              >
                <span className="material-symbols-outlined text-[16px]">public</span>
                Public Share
              </button>
            </div>
          ) : (
            <button
              className="btn-primary w-full sm:w-auto justify-center"
              onClick={onDiscover}
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              Find Running Process
            </button>
          )}
        </div>
      </div>

      {/* Starter Request Scan */}
      {suggestions.length > 0 && (
        <section className="p-4 sm:p-5 bg-surface-container border border-outline-variant/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1">
            <h2 className="font-body-lg text-body-lg text-on-surface font-semibold">Starter Request Scan</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
              Proxync detected likely routing endpoints for this framework. Import them to your Playground collection to start live tests and build Swagger validation contracts.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-on-surface-variant font-mono">{suggestions.length} templates ready</span>
            <button
              className="btn-primary compact"
              onClick={onImportStarterRequests}
            >
              Import Templates
            </button>
          </div>
        </section>
      )}

      {/* Grid: Process Details & Connection Sharing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left Column: Diagnostics */}
        <div className="space-y-6">
          {/* Status Box */}
          <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
            <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">Process Diagnostics</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoTile
                label="Status"
                value={
                  isActive && tunnel
                    ? `Online (${getTunnelProviderLabel(tunnel)})`
                    : isStandby && tunnel
                    ? `Standby (${getTunnelProviderLabel(tunnel)})`
                    : sharingPort === processLike.port
                    ? 'Shared (LAN)'
                    : process
                    ? 'Running locally'
                    : 'Awaiting rerun'
                }
              />
              <InfoTile label="Uptime" value={processLike.uptime ?? 'unknown'} />
              <InfoTile label="PID" value={process?.pid?.toString() ?? 'saved only'} />
              <InfoTile label="Port" value={processLike.port.toString()} />
            </div>
          </div>

          {/* Config Details */}
          <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
            <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">Workspace Integration</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoTile label="Guardrail auth" value={workspace?.guardrails.authMode ?? 'guest'} />
              <InfoTile label="Swagger mode" value={workspace?.guardrails.autoUpdateSwagger ? 'auto-updating' : 'manual'} />
              <InfoTile label="Profile saved" value={profile?.lastSharedAt ? formatDate(profile.lastSharedAt) : 'this session'} />
            </div>
          </div>

          {/* Executable Details */}
          <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">Process Configuration</h3>
              {onRefreshConfig && (
                <button
                  onClick={() => onRefreshConfig(processLike)}
                  className="text-xs text-primary hover:text-primary-fixed-dim font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  title="Re-scan directory & process config"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  <span>Re-scan Directory</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              <InfoTile label="Command" value={processLike.command ?? processLike.name} monospace />
              <InfoTile label="Directory" value={resolvedDirectory} monospace />
              <InfoTile label="Executable" value={resolvedExecutable} monospace />
            </div>
          </div>
        </div>

        {/* Right Column: Connection and Sharing */}
        <div className="space-y-6">
          <div className="p-6 bg-surface-container border border-outline-variant rounded-xl flex flex-col gap-6">
            <div>
              <h3 className="font-body-lg text-lg font-bold text-on-surface">Connection & Expositions</h3>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                Configure loopback settings and share local development instances with remote developers.
              </p>
            </div>

            {!hasVerifiedDomain && (
              <div className="p-4 bg-tertiary/10 border border-tertiary/20 rounded-xl flex gap-3">
                <span className="material-symbols-outlined text-tertiary shrink-0 text-[18px]">warning</span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  <strong>No Custom Domain Connected.</strong> Standard exposures will use random public subdomains. To register fixed links, verify custom DNS in Settings.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Local Endpoint</span>
                  <code
                    onClick={() => handleOpenUrl(`http://localhost:${processLike.port}`)}
                    className="text-xs font-mono text-primary font-semibold mt-0.5 hover:underline cursor-pointer select-all truncate"
                    title="Open in Browser"
                  >
                    http://localhost:{processLike.port}
                  </code>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenUrl(`http://localhost:${processLike.port}`)}
                    className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-on-surface-variant hover:text-primary transition-colors"
                    title="Open in Browser"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </button>
                  <button
                    onClick={() => onCopy(`http://localhost:${processLike.port}`, 'Local address copied')}
                    className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Copy Address"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              {localIp && localIp !== '127.0.0.1' && (
                <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg gap-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">LAN Endpoint</span>
                    <code
                      onClick={() => handleOpenUrl(`http://${localIp}:${processLike.port}`)}
                      className="text-xs font-mono text-primary font-semibold mt-0.5 hover:underline cursor-pointer select-all truncate"
                      title="Open in Browser"
                    >
                      http://{localIp}:{processLike.port}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenUrl(`http://${localIp}:${processLike.port}`)}
                      className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-on-surface-variant hover:text-primary transition-colors"
                      title="Open in Browser"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    </button>
                    <button
                      onClick={() => onCopy(`http://${localIp}:${processLike.port}`, 'LAN address copied')}
                      className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface transition-colors"
                      title="Copy Address"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                </div>
              )}

              {isTunnelOpen && tunnel && (
                <div className="space-y-3 pt-3 border-t border-outline-variant/30">
                  <div className={`flex items-center justify-between p-3 bg-surface-container-low border ${isStandby ? 'border-amber-500/30' : 'border-emerald-500/30'} rounded-lg gap-2`}>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${isStandby ? 'text-amber-400' : 'text-emerald-400'} font-bold uppercase tracking-wider truncate`}>
                          {getTunnelProviderLabel(tunnel)} • Public URL
                        </span>
                        <span className={`px-1.5 py-0.2 ${isStandby ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'} text-[9.5px] font-mono rounded font-semibold shrink-0`}>
                          {isStandby ? 'Standby' : 'Live'}
                        </span>
                      </div>
                      <code
                        onClick={() => handleOpenUrl(tunnel.publicUrl)}
                        className="text-xs font-mono text-primary font-bold mt-0.5 hover:underline cursor-pointer select-all truncate"
                        title={tunnel.publicUrl}
                      >
                        {tunnel.publicUrl}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenUrl(tunnel.publicUrl)}
                        className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-primary hover:text-primary/80 transition-colors"
                        title="Open in Browser"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </button>
                      <button
                        onClick={() => onCopy(tunnel.publicUrl, 'Public URL copied')}
                        className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Copy Address"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg gap-2">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">LAN Proxy Tunnel</span>
                      <code
                        onClick={() => handleOpenUrl(`http://${localIp}:3939`)}
                        className="text-xs font-mono text-on-surface mt-0.5 hover:underline cursor-pointer select-all truncate"
                        title="Open in Browser"
                      >
                        http://{localIp}:3939
                      </code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenUrl(`http://${localIp}:3939`)}
                        className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-on-surface-variant hover:text-primary transition-colors"
                        title="Open in Browser"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </button>
                      <button
                        onClick={() => onCopy(`http://${localIp}:3939`, 'LAN Tunnel URL copied')}
                        className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Copy Address"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-[11px] text-on-surface-variant leading-relaxed">
                    💡 <strong>Local Network Tunnel:</strong> Other devices on your same subnet can access your server using the LAN Proxy address.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
