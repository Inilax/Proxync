import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';

interface DomainsSettingsProps {
  workspace: any;
}

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

export function DomainsSettings({ workspace }: DomainsSettingsProps) {
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
  }, [workspace.id]);

  async function fetchDomains() {
    try {
      const list = await api.domains.list();
      setDomains(list);
    } catch (err: any) {
      showToast(err.message ?? 'Failed to load domains', 'error');
    }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setLoading(true);

    try {
      const created = await api.domains.create(newDomain.trim());
      showToast('Domain registered! Please configure DNS to verify.', 'success');
      setNewDomain('');
      setExpandedId(created.id);
      fetchDomains();
    } catch (err: any) {
      showToast(err.message ?? 'Failed to register domain', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(domainId: string) {
    setVerifyingId(domainId);
    try {
      await api.domains.verify(domainId);
      showToast('Domain successfully verified!', 'success');
      fetchDomains();
    } catch (err: any) {
      showToast(err.message ?? 'Verification check failed', 'error');
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(domainId: string) {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
      await api.domains.delete(domainId);
      showToast('Domain removed', 'success');
      fetchDomains();
    } catch (err: any) {
      showToast(err.message ?? 'Failed to delete domain', 'error');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Register Domain Form */}
      <div className="card">
        <h3 className="card-title">Register Custom Domain</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Link custom external domains to your local tunnels. Once ownership is verified, traffic directed to your domain will be routed to your active tunnel.
        </p>

        <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: 12 }}>
          <input
            id="domain-input"
            type="text"
            className="form-input"
            placeholder="api.dev.mycompany.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            disabled={loading}
            style={{ flex: 1 }}
            required
          />
          <button
            id="domain-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: 'auto' }}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Register'}
          </button>
        </form>
      </div>

      {/* List of Domains */}
      <div className="card">
        <h3 className="card-title">Registered Domains</h3>
        
        {domains.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <span className="empty-state-icon">🌐</span>
            <div className="empty-state-title">No custom domains</div>
            <div className="empty-state-desc">Add a domain above to get started.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {domains.map((dom) => {
              const isExpanded = expandedId === dom.id;
              const apexDomain = getApexDomain(dom.name);
              
              // Determine if it is a subdomain relative to the apex domain
              const isSub = dom.name !== apexDomain && dom.name.endsWith(`.${apexDomain}`);
              
              // Visual relative inputs for domain registrars (like GoDaddy/Namesilo suffix setups)
              const fullTxtHost = `_proxync.${dom.name}`;
              const relativeTxtHost = fullTxtHost.endsWith(`.${apexDomain}`) 
                ? fullTxtHost.slice(0, -(apexDomain.length + 1)) 
                : fullTxtHost;
                
              const relativeTrafficHost = dom.name === apexDomain
                ? '@'
                : isSub
                  ? dom.name.slice(0, -(apexDomain.length + 1))
                  : dom.name;

              const routingValue = isSub || dom.name !== apexDomain ? getRelayBase() : '127.0.0.1';

              return (
                <div
                  key={dom.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Domain Card Header */}
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : dom.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16 }}>🌐</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{dom.name}</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {isExpanded ? '▲ Click to collapse' : '▼ Click to view DNS records'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {dom.verified ? (
                        <span className="tunnel-status-badge active">Verified</span>
                      ) : (
                        <span className="tunnel-status-badge closed" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)', borderColor: 'rgba(245,158,11,0.3)' }}>Unverified</span>
                      )}
                      <button
                        className="btn-icon"
                        style={{ height: 28, width: 28 }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(dom.id); }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Expanded Verification Details */}
                  {isExpanded && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13 }}>
                        {dom.verified ? (
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <p style={{ color: 'var(--green)', fontWeight: 600, margin: '0 0 4px' }}>✓ Ownership Verified</p>
                            <p style={{ margin: 0 }}>Traffic to <code>{dom.name}</code> will now route to your active workspace tunnels.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                              Configure the following DNS records in your domain registrar (GoDaddy, Namesilo, etc.) to verify ownership and start routing traffic:
                            </p>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '8px 12px', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                              💡 <strong>Registrar Tip:</strong> Registrars automatically append <code>.{apexDomain}</code> to the **Host** field. You only need to type the bold prefix value shown in the table below.
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
                              {!dom.verified && (
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
                                  <td><code>proxync-verification={dom.verificationToken}</code></td>
                                  <td>30 min</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyToClipboard(relativeTxtHost)}>Copy Host</button>
                                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyToClipboard(`proxync-verification=${dom.verificationToken}`)}>Copy Value</button>
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
                                    <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Full: {dom.name}</small>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge neutral" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
                                    {isSub || dom.name !== apexDomain ? 'CNAME' : 'A'}
                                  </span>
                                </td>
                                <td><code>{routingValue}</code></td>
                                <td>30 min</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyToClipboard(relativeTrafficHost)}>Copy Host</button>
                                    <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyToClipboard(routingValue)}>Copy Value</button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {!dom.verified ? (
                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button
                              className="btn btn-primary"
                              style={{ width: 'auto', padding: '8px 16px' }}
                              onClick={() => handleVerify(dom.id)}
                              disabled={verifyingId === dom.id}
                            >
                              {verifyingId === dom.id ? 'Checking...' : 'Verify DNS Records'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px 14px', borderRadius: 8, color: 'var(--yellow)', fontSize: 12 }}>
                            ⚠️ <strong>Developer Hygiene Tip:</strong> The TXT record is only used for verification. Once verified, you can safely remove the `_proxync` TXT record from your registrar to keep your DNS zone clean.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
