import type { 
  WorkspaceConfig, 
  AppSettings, 
  DomainRecord, 
  Tunnel, 
  Guardrails 
} from '../lib/types';
import type { LocalWorkspaceContext } from '../lib/api';
import { InfoTile } from './ProcessView';
import { showToast } from '../lib/toast';

const getApexDomain = (domain: string) => {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  const secondToLast = parts[parts.length - 2].toLowerCase();
  const commonDoubleTlds = ['co', 'com', 'org', 'net', 'edu', 'gov', 'mil'];
  if (parts.length > 3 && commonDoubleTlds.includes(secondToLast)) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
};

const getRelayBase = () => {
  const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
  const parsed = apiBase.replace(/^https?:\/\//, '').split(':')[0];
  if (parsed === 'localhost' || parsed === '127.0.0.1') {
    return 'localtest.me';
  }
  return parsed;
};

interface SettingsViewProps {
  context: LocalWorkspaceContext | null;
  workspace: WorkspaceConfig | null;
  appSettings: AppSettings;
  domains: DomainRecord[];
  domainDraft: string;
  loadingDomains: boolean;
  busyDomainId: string | null;
  bootstrapError: string;
  activeTunnel: Tunnel | null;
  scanningProject: boolean;
  onUpdateGuardrails: (patch: Partial<Guardrails>) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateAppNotes: (notes: string) => void;
  onUpdateRelayHint: (relayDeploymentHint: string) => void;
  onUpdateProjectRootPath: (projectRootPath: string) => void;
  onScanProjectFolder: () => void;
  onDomainDraftChange: (value: string) => void;
  onAddDomain: () => void;
  onVerifyDomain: (domainId: string) => void;
  onRemoveDomain: (domainId: string) => void;
  onSyncWorkspace: () => void;
  onReconnectApi: () => void;
}

export function SettingsView({
  context,
  workspace,
  appSettings,
  domains,
  domainDraft,
  loadingDomains,
  busyDomainId,
  bootstrapError,
  activeTunnel,
  scanningProject,
  onUpdateGuardrails,
  onUpdateNotes,
  onUpdateAppNotes,
  onUpdateRelayHint,
  onUpdateProjectRootPath,
  onScanProjectFolder,
  onDomainDraftChange,
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
  onSyncWorkspace,
  onReconnectApi,
}: SettingsViewProps) {
  return (
    <div className="settings-view">
      <h1>Settings</h1>
      {bootstrapError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#ff8b8b',
          fontSize: '13px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>API Connection Offline.</strong> You are currently running in local-only fallback mode.
          </div>
          <button className="primary-command small" style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={onReconnectApi}>
            Reconnect
          </button>
        </div>
      )}
      <div className="settings-grid">
        <InfoTile label="Workspace" value={workspace?.name ?? 'starting'} />
        <InfoTile
          label="User mode"
          value={context?.user?.email?.endsWith('@proxync.local') ? 'guest relay session' : 'local'}
        />
        <InfoTile label="Remote workspace" value={workspace?.remoteWorkspaceId ?? 'not synced'} monospace />
        <InfoTile label="Relay state" value={bootstrapError || 'connected'} />
        <InfoTile label="Active tunnel" value={activeTunnel?.publicUrl ?? 'none'} monospace />
      </div>

      <section className="console-section settings-section">
        <h2>Control Plane Connection</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Status: <strong style={{ color: bootstrapError ? '#ef4444' : '#10b981' }}>{bootstrapError ? 'Offline 🛑' : 'Connected 🟢'}</strong>
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              To connect, make sure the NestJS server is running (run <code>npm run dev</code> inside the <code>packages/api</code> directory).
            </p>
          </div>
          <button className="primary-command small" onClick={onReconnectApi}>
            Reconnect
          </button>
        </div>
      </section>

      <section className="console-section settings-section">
        <h2>Project scan</h2>
        <div className="settings-form">
          <label>
            Project root
            <input
              value={workspace?.projectRootPath ?? appSettings.defaultProjectRootPath}
              onChange={(event) => onUpdateProjectRootPath(event.target.value)}
              placeholder="E:\\path\\to\\project"
            />
          </label>
          <div className="project-scan-row">
            <button
              className="primary-command small"
              onClick={onScanProjectFolder}
              disabled={scanningProject}
            >
              {scanningProject ? 'Scanning...' : 'Scan project folder'}
            </button>
            <span>
              {workspace?.scannedFiles?.length ?? 0} files indexed
            </span>
          </div>
        </div>
      </section>

      <section className="console-section settings-section">
        <h2>Guardrails</h2>
        <div className="settings-form">
          <label>
            Auth mode
            <select
              value={appSettings.guardrails.authMode}
              onChange={(event) =>
                onUpdateGuardrails({
                  authMode: event.target.value as Guardrails['authMode'],
                })
              }
            >
              <option value="guest">Guest</option>
              <option value="shared-secret">Shared secret</option>
              <option value="workspace-only">Workspace only</option>
            </select>
          </label>
          <label>
            Rate limit
            <input
              value={appSettings.guardrails.rateLimit}
              onChange={(event) =>
                onUpdateGuardrails({
                  rateLimit: event.target.value,
                })
              }
            />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={appSettings.guardrails.piiRedaction}
              onChange={(event) =>
                onUpdateGuardrails({
                  piiRedaction: event.target.checked,
                })
              }
            />
            Redact sensitive values from captured traffic
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={appSettings.guardrails.captureBodies}
              onChange={(event) =>
                onUpdateGuardrails({
                  captureBodies: event.target.checked,
                })
              }
            />
            Capture request and response bodies
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={appSettings.guardrails.autoUpdateSwagger}
              onChange={(event) =>
                onUpdateGuardrails({
                  autoUpdateSwagger: event.target.checked,
                })
              }
            />
            Auto-update Swagger when requests or saved tests change
          </label>
        </div>
      </section>

      <section className="console-section settings-section">
        <h2>Custom domains</h2>
        <div className="domain-intro">
          <p>
            Domains are registered against the currently selected synced workspace. Add
            the DNS records below, then click verify. For real public testing, your API
            relay must be deployed on the internet and the custom domain must point to it.
          </p>
        </div>
        <div className="domain-add-row">
          <input
            value={domainDraft}
            onChange={(event) => onDomainDraftChange(event.target.value)}
            placeholder="demo.example.com"
          />
          <button
            className="primary-command small"
            onClick={onAddDomain}
            disabled={busyDomainId === 'new' || !workspace?.remoteWorkspaceId}
          >
            {busyDomainId === 'new' ? 'Adding...' : 'Add domain'}
          </button>
        </div>
        {!workspace?.remoteWorkspaceId && (
          <div className="settings-empty" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'start' }}>
            <div>
              This workspace is not synced to a remote API workspace yet, so domains cannot
              be registered from here.
            </div>
            {context && context.workspace && context.workspace.id !== 'local' && (
              <button className="primary-command small" onClick={onSyncWorkspace}>
                Sync workspace to remote API
              </button>
            )}
          </div>
        )}
        {loadingDomains ? (
          <div className="settings-empty">Loading domains...</div>
        ) : (domains || []).length === 0 ? (
          <div className="settings-empty">
            No domains added yet. Start with a subdomain or apex domain you control.
          </div>
        ) : (
          <div className="domain-list">
            {(domains || []).map((domain) => {
              const apexDomain = getApexDomain(domain.name);
              const isSub = domain.name !== apexDomain && domain.name.endsWith(`.${apexDomain}`);
              
              const fullTxtHost = `_proxync.${domain.name}`;
              const relativeTxtHost = fullTxtHost.endsWith(`.${apexDomain}`) 
                ? fullTxtHost.slice(0, -(apexDomain.length + 1)) 
                : fullTxtHost;
                
              const relativeTrafficHost = domain.name === apexDomain
                ? '@'
                : isSub
                  ? domain.name.slice(0, -(apexDomain.length + 1))
                  : domain.name;

              const routingValue = isSub || domain.name !== apexDomain ? getRelayBase() : '127.0.0.1';

              const copyVal = (text: string) => {
                navigator.clipboard.writeText(text);
                showToast('Copied to clipboard!', 'success');
              };

              return (
                <article key={domain.id} className="domain-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <div className="domain-card-head" style={{ border: 'none', padding: 0 }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{domain.name}</strong>
                      <small style={{ display: 'block', color: domain.verified ? 'var(--green)' : 'var(--yellow)', marginTop: '4px', fontSize: '11px' }}>
                        {domain.verified ? '✓ Ownership Verified' : '⚡ Pending verification'}
                      </small>
                    </div>
                    <span className={domain.verified ? 'badge good' : 'badge neutral'}>
                      {domain.verified ? 'Live' : 'Pending'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!domain.verified && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                          💡 <strong>Registrar Tip:</strong> Namesilo/GoDaddy automatically suffixes your domain. Enter only the bold Host prefix into your registrar inputs.
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                          ⚠️ <strong>Local Relay Loopback Notice:</strong> The traffic configuration value below points to <code>{routingValue}</code> because your Proxync stack is currently running locally. This domain configuration will only work for local loopback testing on your machine. To expose your server to the actual public internet, select <strong>Localtunnel</strong> when starting the share!
                        </div>
                      </div>
                    )}
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                      <table className="dns-table">
                        <thead>
                          <tr>
                            <th>Host</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>TTL</th>
                            <th>Copy Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* 1. TXT Verification Record (Only needed if unverified) */}
                          {!domain.verified && (
                            <tr>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <code style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{relativeTxtHost}</code>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>.{apexDomain}</span>
                                  </div>
                                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Full: {fullTxtHost}</small>
                                </div>
                              </td>
                              <td><span className="badge neutral" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>TXT</span></td>
                              <td><code>proxync-verification={domain.verificationToken}</code></td>
                              <td>30 min</td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(relativeTxtHost)}>Copy Host</button>
                                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(`proxync-verification=${domain.verificationToken}`)}>Copy Value</button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* 2. Traffic Configuration Record */}
                          <tr>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <code style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{relativeTrafficHost}</code>
                                  {relativeTrafficHost !== '@' && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>.{apexDomain}</span>
                                  )}
                                </div>
                                <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Full: {domain.name}</small>
                              </div>
                            </td>
                            <td>
                              <span className="badge neutral" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
                                {isSub || domain.name !== apexDomain ? 'CNAME' : 'A'}
                              </span>
                            </td>
                            <td><code>{routingValue}</code></td>
                            <td>30 min</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(relativeTrafficHost)}>Copy Host</button>
                                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(routingValue)}>Copy Value</button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="domain-actions">
                    <button
                      onClick={() => onVerifyDomain(domain.id)}
                      disabled={busyDomainId === domain.id}
                    >
                      {busyDomainId === domain.id ? 'Working...' : 'Verify'}
                    </button>
                    <button
                      onClick={() => onRemoveDomain(domain.id)}
                      disabled={busyDomainId === domain.id}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="console-section settings-section">
        <h2>Global notes</h2>
        <textarea
          value={appSettings.notes}
          onChange={(event) => onUpdateAppNotes(event.target.value)}
          placeholder="Keep app-wide relay or deployment notes here."
        />
      </section>

      <section className="console-section settings-section">
        <h2>Workspace notes</h2>
        <textarea
          value={workspace?.notes ?? ''}
          onChange={(event) => onUpdateNotes(event.target.value)}
          placeholder="Keep project-specific notes, handoff context, or testing reminders here."
        />
      </section>

      <section className="console-section settings-section">
        <h2>Relay deployment hint</h2>
        <textarea
          value={appSettings.relayDeploymentHint}
          onChange={(event) => onUpdateRelayHint(event.target.value)}
          placeholder="Example: relay.example.com behind wildcard TLS and public DNS."
        />
      </section>
    </div>
  );
}
