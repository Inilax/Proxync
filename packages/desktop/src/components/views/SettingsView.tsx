/**
 * SettingsView.tsx — Standalone local settings screen
 */
import type { WorkspaceConfig, AppSettings, DomainRecord, Tunnel } from './SharedComponents';
import { InfoTile } from './SharedComponents';
import { showToast } from '../../lib/toast';

export function SettingsView({
  workspace,
  appSettings,
  domains,
  domainDraft,
  busyDomainId,
  activeTunnel,
  scanningProject,
  onUpdateAppNotes,
  onUpdateProjectRootPath,
  onScanProjectFolder,
  onDomainDraftChange,
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
}: {
  workspace: WorkspaceConfig | null;
  appSettings: AppSettings;
  domains: DomainRecord[];
  domainDraft: string;
  busyDomainId: string | null;
  activeTunnel: Tunnel | null;
  scanningProject: boolean;
  onUpdateAppNotes: (notes: string) => void;
  onUpdateProjectRootPath: (projectRootPath: string) => void;
  onScanProjectFolder: () => void;
  onDomainDraftChange: (value: string) => void;
  onAddDomain: () => void;
  onVerifyDomain: (domainId: string) => void;
  onRemoveDomain: (domainId: string) => void;
}) {
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



  return (
    <div className="settings-view fade-in">
      <h1>Settings</h1>
      
      <div className="settings-grid">
        <InfoTile label="Workspace" value={workspace?.name ?? 'starting'} />
        <InfoTile label="Mode" value="Standalone (Local-First)" />
        <InfoTile label="Active tunnel" value={activeTunnel?.publicUrl ?? 'none'} monospace />
      </div>

      <section className="console-section settings-section">
        <h2>Project scan</h2>
        <div className="settings-form">
          <label>
            Project root
            <input
              className="form-input"
              value={workspace?.projectRootPath ?? appSettings.defaultProjectRootPath}
              onChange={(event) => onUpdateProjectRootPath(event.target.value)}
              placeholder="E:\\path\\to\\project"
            />
          </label>
          <div className="project-scan-row">
            <button
              className="btn-primary compact"
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
        <h2>Custom domains</h2>
        <div className="domain-intro">
          <p>
            Configure custom domains to use with public tunnels. Add the DNS records below, 
            then verify ownership locally.
          </p>
        </div>
        <div className="domain-add-row">
          <input
            className="form-input"
            value={domainDraft}
            onChange={(event) => onDomainDraftChange(event.target.value)}
            placeholder="demo.example.com"
          />
          <button
            className="btn-primary compact"
            onClick={onAddDomain}
            disabled={busyDomainId === 'new'}
          >
            {busyDomainId === 'new' ? 'Adding...' : 'Add domain'}
          </button>
        </div>

        {(domains || []).length === 0 ? (
          <div className="settings-empty">
            No domains added yet. Start by adding a domain you control.
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
              const routingValue = '127.0.0.1';
              const copyVal = (text: string) => {
                navigator.clipboard.writeText(text);
                showToast('Copied to clipboard!', 'success');
              };

              return (
                <article key={domain.id} className="domain-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <div className="domain-card-head" style={{ border: 'none', padding: 0 }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{domain.name}</strong>
                      <small style={{ display: 'block', color: domain.verified ? 'var(--accent-primary)' : 'var(--amber)', marginTop: '4px', fontSize: '11px' }}>
                        {domain.verified ? '✓ Ownership Verified' : '⚡ Pending verification'}
                      </small>
                    </div>
                    <span className={domain.verified ? 'badge accent' : 'badge muted'}>
                      {domain.verified ? 'Live' : 'Pending'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!domain.verified && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="notice-banner info">
                          💡 <strong>Registrar Tip:</strong> Namesilo/GoDaddy automatically suffixes your domain. Enter only the bold Host prefix into your registrar inputs.
                        </div>
                      </div>
                    )}
                    <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
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
                          {!domain.verified && (
                            <tr>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <code style={{ fontWeight: 'bold' }}>{relativeTxtHost}</code>
                                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>.{apexDomain}</span>
                                  </div>
                                  <small style={{ fontSize: 10, color: 'var(--muted)' }}>Full: {fullTxtHost}</small>
                                </div>
                              </td>
                              <td><span className="badge muted" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>TXT</span></td>
                              <td><code>proxync-verification={domain.verificationToken}</code></td>
                              <td>30 min</td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn-ghost compact" onClick={() => copyVal(relativeTxtHost)}>Copy Host</button>
                                  <button className="btn-ghost compact" onClick={() => copyVal(`proxync-verification=${domain.verificationToken}`)}>Copy Value</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <code style={{ fontWeight: 'bold' }}>{relativeTrafficHost}</code>
                                  {relativeTrafficHost !== '@' && (
                                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>.{apexDomain}</span>
                                  )}
                                </div>
                                <small style={{ fontSize: 10, color: 'var(--muted)' }}>Full: {domain.name}</small>
                              </div>
                            </td>
                            <td>
                              <span className="badge muted" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
                                {isSub || domain.name !== apexDomain ? 'CNAME' : 'A'}
                              </span>
                            </td>
                            <td><code>{routingValue}</code></td>
                            <td>30 min</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn-ghost compact" onClick={() => copyVal(relativeTrafficHost)}>Copy Host</button>
                                <button className="btn-ghost compact" onClick={() => copyVal(routingValue)}>Copy Value</button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="domain-actions">
                    <button
                      className="btn-primary compact"
                      onClick={() => onVerifyDomain(domain.id)}
                      disabled={busyDomainId === domain.id}
                    >
                      {busyDomainId === domain.id ? 'Working...' : 'Verify'}
                    </button>
                    <button
                      className="btn-ghost compact"
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
          className="form-textarea"
          value={appSettings.notes}
          onChange={(event) => onUpdateAppNotes(event.target.value)}
          placeholder="Keep app-wide relay or deployment notes here."
        />
      </section>
    </div>
  );
}
