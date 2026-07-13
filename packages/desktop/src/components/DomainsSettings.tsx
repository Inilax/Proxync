import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';

interface DomainsSettingsProps {
  workspace: any;
}

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
      const list = await api.domains.list(workspace.id);
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
      const created = await api.domains.create(workspace.id, newDomain.trim());
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
      await api.domains.verify(workspace.id, domainId);
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
      await api.domains.delete(workspace.id, domainId);
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
                      {dom.verified ? (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          <p style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 8 }}>✓ Ownership Verified</p>
                          <p style={{ marginBottom: 12 }}>Traffic to <code>{dom.name}</code> will now route to your active workspace tunnels.</p>
                          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px 14px', borderRadius: 8, color: 'var(--yellow)' }}>
                            ⚠️ <strong>Developer Reminder:</strong> TXT records are loose assets. For cleanliness and hygiene, please remember to remove the TXT record from your DNS settings once you no longer need this custom domain.
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                          <p>To verify ownership, create the following DNS TXT record on your domain registrar:</p>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-base)', padding: 12, borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span><strong>Type:</strong> <code>TXT</code></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span><strong>Host/Name:</strong> <code>_proxync.{dom.name}</code></span>
                              <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => copyToClipboard(`_proxync.${dom.name}`)}>Copy</button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span><strong>Value:</strong> <code>proxync-verification={dom.verificationToken}</code></span>
                              <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => copyToClipboard(`proxync-verification=${dom.verificationToken}`)}>Copy</button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button
                              className="btn btn-primary"
                              style={{ width: 'auto', padding: '8px 16px' }}
                              onClick={() => handleVerify(dom.id)}
                              disabled={verifyingId === dom.id}
                            >
                              {verifyingId === dom.id ? 'Checking...' : 'Verify DNS TXT Record'}
                            </button>
                          </div>
                        </div>
                      )}
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
