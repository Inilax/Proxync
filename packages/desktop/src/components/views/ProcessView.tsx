/**
 * ProcessView.tsx — Redesigned process detail screen
 * Cleaner layout with tabbed sections and active tunnel hero.
 */
import type { WorkspaceConfig, ProcessCandidate, ProcessProfile, Tunnel, SavedRequest } from './SharedComponents';
import { InfoTile, Icons, formatDate } from './SharedComponents';

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
      <div className="empty-stage fade-in">
        <div className="empty-icon">
          {Icons.search}
        </div>
        <h2>No process selected</h2>
        <p>Scan localhost and choose a running server to create your first saved share.</p>
        <button className="btn-primary" onClick={onDiscover}>
          {Icons.search} Discover processes
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

  const isActive = tunnel?.localPort === processLike.port && tunnel.status === 'ACTIVE';

  return (
    <div className="process-view fade-in">
      <div className="page-heading">
        <div>
          <h1>{processLike.name}</h1>
          <div className="badge-row">
            <span className={process ? 'badge accent' : 'badge muted'}>
              {process ? '● Running locally' : '○ Saved profile'}
            </span>
            <span className="badge muted">Port {processLike.port}</span>
            <span className="badge muted">{processLike.framework ?? 'HTTP'}</span>
            <span className="badge muted">{workspace?.languageHint ?? 'Unknown language'}</span>
          </div>
        </div>
        <div className="heading-actions">
          {isActive && tunnel ? (
            <button className="btn-danger" onClick={() => onStop(tunnel)}>
              {Icons.stop} Stop tunnel
            </button>
          ) : sharingPort === processLike.port ? (
            <button className="btn-danger" onClick={onStopLocalShare}>
              {Icons.stop} Stop sharing
            </button>
          ) : process ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                onClick={() => onShareLocal(process)}
              >
                {Icons.wifi} LAN Share
              </button>
              <button
                className="btn-primary"
                onClick={() => onShare(process)}
              >
                {Icons.globe} Public Share
              </button>
            </div>
          ) : (
            <button className="btn-primary compact" onClick={onDiscover}>
              {Icons.search} Find running process
            </button>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <section className="console-section starter-section">
          <div className="starter-copy">
            <h2>Starter request scan</h2>
            <p>
              Proxync guessed likely endpoints for this app and prepared them for the
              Postman workspace. Test them, keep the winners, and the Swagger contract
              will update from what turns out to be real.
            </p>
          </div>
          <div className="starter-actions">
            <span>{suggestions.length} starter requests ready</span>
            <button className="btn-primary compact" onClick={onImportStarterRequests}>
              Import into Postman
            </button>
          </div>
        </section>
      )}

      <section className="console-section">
        <h2>Process status</h2>
        <div className="status-grid">
          <InfoTile label="Status" value={process ? 'Running' : 'Awaiting rerun'} />
          <InfoTile label="Uptime" value={processLike.uptime ?? 'unknown'} />
          <InfoTile label="PID" value={process?.pid?.toString() ?? 'saved only'} />
          <InfoTile label="Port" value={processLike.port.toString()} />
        </div>
      </section>

      <section className="console-section">
        <h2>Workspace configuration</h2>
        <div className="detail-grid">
          <InfoTile label="Guardrail auth" value={workspace?.guardrails.authMode ?? 'guest'} />
          <InfoTile
            label="Swagger mode"
            value={workspace?.guardrails.autoUpdateSwagger ? 'auto-updating' : 'manual'}
          />
          <InfoTile
            label="Profile saved"
            value={profile?.lastSharedAt ? formatDate(profile.lastSharedAt) : 'this session'}
          />
        </div>
      </section>

      <section className="console-section">
        <h2>Process details</h2>
        <div className="detail-grid">
          <InfoTile label="Command" value={processLike.command ?? processLike.name} monospace />
          <InfoTile label="Directory" value={processLike.directory ?? 'unknown'} monospace />
          <InfoTile label="Executable" value={processLike.executable ?? 'unknown'} monospace />
        </div>
      </section>

      <section className="console-section share-section">
        <h2>Connection and sharing</h2>
        {!hasVerifiedDomain && (
          <div className="notice-banner warning">
            <span className="notice-icon">⚠️</span>
            <div>
              <strong>No custom domain connected.</strong> The default wildcard link will only work within this local network. For public internet visibility, you must add and verify a custom domain in Settings.
            </div>
          </div>
        )}
        <div className={isActive ? 'share-box active' : 'share-box'}>
          <div>
            <strong>
              {isActive ? 'You are hosting this process' : 'Workspace is ready to reuse this share'}
            </strong>
            <p>
              {isActive
                ? 'Traffic capture, starter Postman requests, and workspace-specific Swagger are active now.'
                : 'The share configuration is saved with this workspace. Start the local process and rerun share when you need the link again.'}
            </p>
          </div>
          <div className="url-line">
            <span>Local</span>
            <code>http://localhost:{processLike.port}</code>
            <button
              className="btn-ghost compact"
              onClick={() =>
                onCopy(`http://localhost:${processLike.port}`, 'Local address copied')
              }
            >
              {Icons.copy} Copy
            </button>
          </div>
          {localIp && localIp !== '127.0.0.1' && (
            <div className="url-line">
              <span>LAN</span>
              <code>http://{localIp}:{processLike.port}</code>
              <button
                className="btn-ghost compact"
                onClick={() =>
                  onCopy(`http://${localIp}:${processLike.port}`, 'LAN address copied')
                }
              >
                {Icons.copy} Copy
              </button>
            </div>
          )}
          {isActive && tunnel && (
            <>
              <div className="url-line">
                <span>Public</span>
                <code>{tunnel.publicUrl}</code>
                <button
                  className="btn-ghost compact"
                  onClick={() =>
                    onCopy(tunnel.publicUrl, 'Share URL copied')
                  }
                >
                  {Icons.copy} Copy
                </button>
              </div>
              <div className="url-line">
                <span>LAN Tunnel</span>
                <code>http://{localIp}:3939</code>
                <button
                  className="btn-ghost compact"
                  onClick={() =>
                    onCopy(`http://${localIp}:3939`, 'LAN Tunnel URL copied')
                  }
                >
                  {Icons.copy} Copy
                </button>
              </div>
              <div className="notice-banner info">
                💡 <strong>Local Network Share:</strong> Colleagues on your same WiFi/network can access this active tunnel instantly at <code>http://{localIp}:3939</code>.
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
