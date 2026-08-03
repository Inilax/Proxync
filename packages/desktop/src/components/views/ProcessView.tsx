import type { WorkspaceConfig, ProcessCandidate, ProcessProfile, Tunnel, SavedRequest } from './SharedComponents';
import { InfoTile, formatDate } from './SharedComponents';

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

  const resolvedDirectory = (processLike.directory && processLike.directory !== 'unknown')
    ? processLike.directory
    : (workspace?.projectRootPath || 'unknown');

  let resolvedExecutable = processLike.executable;
  if (!resolvedExecutable || resolvedExecutable === 'unknown') {
    const lang = (workspace?.languageHint || '').toLowerCase();
    if (lang.includes('ts') || lang.includes('js') || lang.includes('react') || lang.includes('node')) {
      resolvedExecutable = 'node';
    } else if (lang.includes('py') || lang.includes('django') || lang.includes('flask')) {
      resolvedExecutable = 'python';
    } else if (lang.includes('go')) {
      resolvedExecutable = 'go';
    } else if (lang.includes('java')) {
      resolvedExecutable = 'java';
    } else {
      resolvedExecutable = 'unknown';
    }
  }

  const isActive = tunnel?.localPort === processLike.port && tunnel.status === 'ACTIVE';

  return (
    <div className="max-w-5xl mx-auto space-y-8 fade-in select-none">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">{processLike.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`badge ${process ? 'accent' : 'muted'}`}>
              {process ? '● Running locally' : '○ Saved profile'}
            </span>
            <span className="badge muted">Port {processLike.port}</span>
            <span className="badge muted">{processLike.framework ?? 'HTTP'}</span>
            <span className="badge muted">{workspace?.languageHint ?? 'Unknown language'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isActive && tunnel ? (
            <button
              className="btn-danger"
              onClick={() => onStop(tunnel)}
            >
              <span className="material-symbols-outlined text-[16px]">stop</span>
              Stop Tunnel
            </button>
          ) : sharingPort === processLike.port ? (
            <button
              className="btn-danger"
              onClick={onStopLocalShare}
            >
              <span className="material-symbols-outlined text-[16px]">stop</span>
              Stop Sharing
            </button>
          ) : process ? (
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => onShareLocal(process)}
              >
                <span className="material-symbols-outlined text-[16px]">wifi</span>
                LAN Share
              </button>
              <button
                className="btn-primary"
                onClick={() => onShare(process)}
              >
                <span className="material-symbols-outlined text-[16px]">public</span>
                Public Share
              </button>
            </div>
          ) : (
            <button
              className="btn-primary"
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
        <section className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="font-body-lg text-body-lg text-on-surface font-semibold">Starter Request Scan</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
              Proxync detected likely routing endpoints for this framework. Import them to your Postman collection to start live tests and build Swagger validation contracts.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Diagnostics */}
        <div className="space-y-6">
          {/* Status Box */}
          <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
            <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">Process Diagnostics</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoTile label="Status" value={process ? 'Running' : 'Awaiting rerun'} />
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
            <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">Process Configuration</h3>
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
              <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Local Endpoint</span>
                  <code className="text-xs font-mono text-primary mt-0.5">http://localhost:{processLike.port}</code>
                </div>
                <button
                  onClick={() => onCopy(`http://localhost:${processLike.port}`, 'Local address copied')}
                  className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>

              {localIp && localIp !== '127.0.0.1' && (
                <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">LAN Endpoint</span>
                    <code className="text-xs font-mono text-primary mt-0.5">http://{localIp}:{processLike.port}</code>
                  </div>
                  <button
                    onClick={() => onCopy(`http://${localIp}:${processLike.port}`, 'LAN address copied')}
                    className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              )}

              {isActive && tunnel && (
                <div className="space-y-3 pt-3 border-t border-outline-variant/30">
                  <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Public Exposure URL</span>
                      <code className="text-xs font-mono text-primary font-bold mt-0.5 select-all">{tunnel.publicUrl}</code>
                    </div>
                    <button
                      onClick={() => onCopy(tunnel.publicUrl, 'Public URL copied')}
                      className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">LAN Proxy Tunnel</span>
                      <code className="text-xs font-mono text-on-surface mt-0.5">http://{localIp}:3939</code>
                    </div>
                    <button
                      onClick={() => onCopy(`http://${localIp}:3939`, 'LAN Tunnel URL copied')}
                      className="btn-ghost compact cursor-pointer hover:bg-surface-container-high rounded"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
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
