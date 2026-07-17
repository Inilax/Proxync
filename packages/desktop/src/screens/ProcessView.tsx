import type { WorkspaceConfig, ProcessCandidate, ProcessProfile, Tunnel, SavedRequest } from '../lib/types';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function InfoTile({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="info-tile">
      <span>{label}</span>
      <strong className={monospace ? 'mono' : ''}>{value}</strong>
    </div>
  );
}

interface ProcessViewProps {
  workspace: WorkspaceConfig | null;
  process: ProcessCandidate | null;
  profile: ProcessProfile | null;
  tunnel: Tunnel | null;
  sharingPort: number | null;
  suggestions: SavedRequest[];
  hasVerifiedDomain: boolean;
  localIp: string;
  bootstrapError: string;
  onDiscover: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
  onStop: (tunnel: Tunnel) => void;
  onStopLocalShare: () => void;
  onCopy: (value: string, message: string) => void;
  onImportStarterRequests: () => void;
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
  bootstrapError,
  onDiscover,
  onShare,
  onShareLocal,
  onStop,
  onStopLocalShare,
  onCopy,
  onImportStarterRequests,
}: ProcessViewProps) {
  if (!process && !profile) {
    return (
      <div className="empty-stage">
        <h2>No process selected</h2>
        <p>Scan localhost and choose a running server to create your first saved share.</p>
        <button className="primary-command" onClick={onDiscover}>
          Discover processes
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
    <div className="process-view">
      <div className="page-heading">
        <div>
          <h1>{processLike.name}</h1>
          <div className="badge-row">
            <span className="badge good">
              {process ? 'Running locally' : 'Saved profile'}
            </span>
            <span className="badge neutral">Port {processLike.port}</span>
            <span className="badge neutral">{processLike.framework ?? 'HTTP'}</span>
            <span className="badge neutral">{workspace?.languageHint ?? 'Unknown language'}</span>
          </div>
        </div>
        {isActive && tunnel ? (
          <button className="danger-command" onClick={() => onStop(tunnel)}>
            Stop tunnel
          </button>
        ) : sharingPort === processLike.port ? (
          <button className="danger-command" onClick={onStopLocalShare}>
            Stop sharing
          </button>
        ) : process ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="primary-command small"
              onClick={() => onShareLocal(process)}
              style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              Share via Localhost/LAN
            </button>
            <button
              className="primary-command small"
              onClick={() => onShare(process)}
            >
              Share via Public Domain
            </button>
          </div>
        ) : (
          <button className="primary-command small" onClick={onDiscover}>
            Find running process
          </button>
        )}
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
            <button className="primary-command small" onClick={onImportStarterRequests}>
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
        {bootstrapError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#ff8b8b',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'start',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: '1' }}>🛑</span>
            <div>
              <strong>API Control Plane Offline.</strong> Public tunnels are disabled. Please start your NestJS API server (run <code>npm run dev</code> inside <code>packages/api</code>), go to <strong>Settings</strong>, and click <strong>Reconnect</strong>.
            </div>
          </div>
        )}
        {!bootstrapError && !hasVerifiedDomain && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--yellow)',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'start',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: '1' }}>⚠️</span>
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
              onClick={() =>
                onCopy(`http://localhost:${processLike.port}`, 'Local address copied')
              }
            >
              Copy
            </button>
          </div>
          {localIp && localIp !== '127.0.0.1' && (
            <div className="url-line">
              <span>LAN</span>
              <code>http://{localIp}:{processLike.port}</code>
              <button
                onClick={() =>
                  onCopy(`http://${localIp}:${processLike.port}`, 'LAN address copied')
                }
              >
                Copy
              </button>
            </div>
          )}
          {isActive && tunnel && (
            <>
              <div className="url-line">
                <span>Public</span>
                <code>{tunnel.publicUrl}</code>
                <button
                  onClick={() =>
                    onCopy(
                      tunnel.publicUrl,
                      'Share URL copied',
                    )
                  }
                >
                  Copy
                </button>
              </div>
              <div className="url-line">
                <span>LAN Tunnel</span>
                <code>http://{localIp}:3939</code>
                <button
                  onClick={() =>
                    onCopy(
                      `http://${localIp}:3939`,
                      'LAN Tunnel URL copied',
                    )
                  }
                >
                  Copy
                </button>
              </div>
              <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 8, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                💡 <strong>Local Network Share:</strong> Colleagues on your same WiFi/network can access this active tunnel instantly at <code>http://{localIp}:3939</code>.
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
