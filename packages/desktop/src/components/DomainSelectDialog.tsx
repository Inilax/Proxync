import { useState, useEffect } from 'react';
import type { ProcessCandidate } from '../lib/types';

export function SignalBars({ latency }: { latency: number }) {
  let activeBars = 0;
  let barColor = 'var(--text-muted)';
  
  if (latency < 50) {
    activeBars = 4;
    barColor = '#10B981'; // Green
  } else if (latency < 150) {
    activeBars = 3;
    barColor = '#A7F3D0'; // Light Green
  } else if (latency < 300) {
    activeBars = 2;
    barColor = '#F59E0B'; // Orange
  } else if (latency < Infinity) {
    activeBars = 1;
    barColor = '#EF4444'; // Red
  }

  return (
    <div 
      style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '14px', width: '18px' }} 
      title={latency === Infinity ? 'Unreachable' : `${Math.round(latency)}ms`}
    >
      {[1, 2, 3, 4].map((bar) => {
        const isActive = bar <= activeBars;
        return (
          <div
            key={bar}
            style={{
              width: '3px',
              height: `${bar * 25}%`,
              background: isActive ? barColor : 'rgba(255,255,255,0.15)',
              borderRadius: '1px',
              transition: 'background 0.3s ease'
            }}
          />
        );
      })}
    </div>
  );
}

interface DomainSelectDialogProps {
  process: ProcessCandidate;
  domains: any[];
  onClose: () => void;
  onConfirm: (customDomainOrOption: string, ltSubdomain?: string) => void;
}

export function DomainSelectDialog({
  process,
  domains,
  onClose,
  onConfirm,
}: DomainSelectDialogProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>('default');
  const [customSubdomain, setCustomSubdomain] = useState<string>('');
  const [latencies, setLatencies] = useState<Record<string, number>>({
    default: Infinity,
    cloudflare: Infinity,
    localtunnel: Infinity,
  });

  useEffect(() => {
    let active = true;

    const ping = async (url: string): Promise<number> => {
      const start = performance.now();
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
        return performance.now() - start;
      } catch (e) {
        try {
          await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
          return performance.now() - start;
        } catch (err) {
          return Infinity;
        }
      }
    };

    const measureAll = async () => {
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const endpoints = {
        default: `${apiBase.replace(/\/$/, '')}/health`,
        cloudflare: 'https://1.1.1.1/cdn-cgi/trace',
        localtunnel: 'https://loca.lt',
      };

      const results = await Promise.all([
        ping(endpoints.default),
        ping(endpoints.cloudflare),
        ping(endpoints.localtunnel),
      ]);

      if (active) {
        setLatencies({
          default: results[0],
          cloudflare: results[1],
          localtunnel: results[2],
        });
      }
    };

    void measureAll();
    return () => {
      active = false;
    };
  }, []);

  const getDescription = () => {
    if (selectedDomain === 'default') {
      return (
        <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          🔌 <strong>Local Loopback:</strong> Exposes the server on a local subdomain (e.g., <code>*.localtest.me</code>). Useful for offline loopback testing on your own machine.
        </span>
      );
    }
    if (selectedDomain === 'cloudflare') {
      return (
        <span style={{ display: 'block', fontSize: '12px', color: '#f38020', lineHeight: '1.5' }}>
          ☁️ <strong>Cloudflare Tunnel (Highly Recommended):</strong> Generates a high-performance public HTTPS URL (e.g., <code>https://*.trycloudflare.com</code>) routed through Cloudflare's secure edge.
        </span>
      );
    }
    if (selectedDomain === 'localtunnel') {
      return (
        <span style={{ display: 'block', fontSize: '12px', color: 'var(--green)', lineHeight: '1.5' }}>
          🌐 <strong>Localtunnel:</strong> Generates a real, secure public HTTPS URL (e.g., <code>https://*.loca.lt</code>) instantly. Accessible from any phone or computer on the internet.
        </span>
      );
    }
    return (
      <span style={{ display: 'block', fontSize: '12px', color: 'var(--blue)', lineHeight: '1.5' }}>
        🏷️ <strong>Custom Domain:</strong> Routes traffic through your verified custom domain <code>{selectedDomain}</code>. Note: requires pointing your domain to the active relay.
      </span>
    );
  };

  const options = [
    {
      id: 'default',
      title: 'Default Relay Subdomain',
      desc: 'Expose server on default localtest.me tunnel',
      icon: '🔌',
      latency: latencies.default,
    },
    {
      id: 'cloudflare',
      title: 'Cloudflare Tunnel',
      desc: 'Secure TryCloudflare tunnel at Cloudflare\'s edge',
      icon: '☁️',
      latency: latencies.cloudflare,
    },
    {
      id: 'localtunnel',
      title: 'Localtunnel',
      desc: 'Free public HTTPS URL via localtunnel.me proxy',
      icon: '🌐',
      latency: latencies.localtunnel,
    },
    ...domains.map(d => ({
      id: d.name,
      title: `Custom Domain (${d.name})`,
      desc: 'Route traffic through your own verified apex/subdomain',
      icon: '🏷️',
      latency: latencies.default,
    }))
  ];

  return (
    <div className="dialog-backdrop" style={{ backdropFilter: 'blur(8px)', background: 'rgba(5, 5, 8, 0.75)' }}>
      <section className="discover-dialog" style={{ maxWidth: '440px', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)' }}>
        <header style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Expose public tunnel</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Select the domain target for <strong>{process.name}</strong> (Port {process.port}).</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >
            &times;
          </button>
        </header>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sharing Target</label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {options.map((opt) => {
              const isSelected = selectedDomain === opt.id;
              const hasMeasured = opt.latency !== Infinity;
              
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedDomain(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : '#111218',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '20px', minWidth: '24px', textAlign: 'center' }}>{opt.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.desc}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
                    <span style={{ fontSize: '11px', color: hasMeasured ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {hasMeasured ? `${Math.round(opt.latency)} ms` : 'pinging...'}
                    </span>
                    <SignalBars latency={opt.latency} />
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDomain === 'localtunnel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Localtunnel Subdomain (Optional)</label>
              <input
                type="text"
                placeholder="e.g. clueliq-demo-port-3000"
                value={customSubdomain}
                onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  background: '#1a1b23',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '54px', display: 'flex', alignItems: 'center' }}>
            {getDescription()}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px' }}>Cancel</button>
          <button 
            className="primary-command"
            onClick={() => onConfirm(selectedDomain, selectedDomain === 'localtunnel' ? (customSubdomain || undefined) : undefined)}
            style={{ padding: '8px 20px', borderRadius: '6px' }}
          >
            Go Live
          </button>
        </div>
      </section>
    </div>
  );
}
