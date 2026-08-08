import { useState } from 'react';
import { showToast } from '../../lib/toast';

interface DocTopic {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export function DocsView() {
  const [activeTopic, setActiveTopic] = useState<string>('getting-started');

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const topics: DocTopic[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'rocket_launch',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Welcome to Proxync</h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Proxync is a local-first desktop developer studio that connects your local server ports (like <code className="text-primary font-mono bg-black/40 px-1.5 py-0.5 rounded">localhost:3000</code>) to public URLs while logging and structuring HTTP traffic in real time.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-on-surface">Core Workflow</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
                <h4 className="font-bold text-on-surface text-sm">Workspaces</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Link a workspace to your codebase directory to save configs, notes, and custom domains.
                </p>
              </div>

              <div className="p-4 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">2</div>
                <h4 className="font-bold text-on-surface text-sm">Start Tunnels</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Expose any local HTTP port with 1-click Cloudflare Tunnels or Localtunnel.
                </p>
              </div>

              <div className="p-4 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-sm">3</div>
                <h4 className="font-bold text-on-surface text-sm">Inspect Traffic</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  View incoming headers, bodies, duration, and auto-generated OpenAPI schemas.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tunnels',
      title: 'Public Tunnels',
      icon: 'alt_route',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Launching Public Tunnels</h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Proxync lets you share local ports with external webhooks (Stripe, GitHub, Twilio) or mobile clients in seconds.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-3">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">cloud</span>
                Cloudflare Quick Tunnel (Recommended)
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Generates a free public HTTPS URL on <code className="text-primary font-mono">*.trycloudflare.com</code> with zero configuration required.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-3">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">link</span>
                Localtunnel Proxy
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Lightweight relay spawner that streams traffic through Proxync&apos;s local interceptor for full header logging.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'custom-domains',
      title: 'Custom Domains',
      icon: 'domain',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Connecting Custom Domains</h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Map custom domain names (like <code className="text-emerald-400 font-mono">api.yourcompany.dev</code>) directly to your local tunnels.
            </p>
          </div>

          <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-base">dns</span>
              CNAME Setup Instruction
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Add a CNAME record in your domain registrar (Cloudflare, GoDaddy, Namecheap) pointing to:
            </p>

            <div className="bg-black/60 p-4 rounded-xl border border-outline-variant/30 font-mono text-xs text-secondary flex items-center justify-between">
              <span>tunnel.proxync.dev</span>
              <button 
                onClick={() => copyText('tunnel.proxync.dev', 'CNAME target')}
                className="btn-ghost compact text-xs flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'api-tools',
      title: 'OpenAPI & REST Runner',
      icon: 'api',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Swagger Specs &amp; REST Client</h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Proxync analyzes HTTP traffic to auto-generate OpenAPI specs and execute synthetic HTTP calls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-2">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-base">auto_awesome</span>
                Auto OpenAPI Generation
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Endpoints and JSON schemas are derived automatically from traffic logs. Export <code className="text-tertiary font-mono">openapi.json</code> at any time in the <strong>Swagger</strong> view.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-2">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">send</span>
                Traffic Replay
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Click replay on any captured request to populate method, headers, and body directly into the built-in REST runner.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: 'shield_lock',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Data Protection &amp; Guardrails</h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Proxync runs 100% locally on your desktop. Your source code, state files, and logs stay on your machine.
            </p>
          </div>

          <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/20 space-y-2">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-base">visibility_off</span>
              Automatic PII Redaction
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Authorization Bearer JWT tokens, secret keys, and credit card numbers are masked automatically in logs before writing to local state files.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentTopic = topics.find((t) => t.id === activeTopic) ?? topics[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 fade-in select-none pb-8 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <h1 className="font-bold text-2xl text-on-surface tracking-tight">Documentation &amp; User Guides</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Simple reference guides for local tunnels, custom domains, and API tools.
          </p>
        </div>

        <a
          href="https://proxync.dev/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-xs transition-all shrink-0 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          <span>Full Web Docs (proxync.dev/docs)</span>
        </a>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="space-y-1 bg-surface-container/40 border border-outline-variant/30 rounded-2xl p-2.5">
          {topics.map((t) => {
            const isActive = t.id === activeTopic;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTopic(t.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${isActive ? 'text-primary' : 'text-outline'}`}>
                  {t.icon}
                </span>
                <span>{t.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="md:col-span-3 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-7 min-h-[420px] shadow-sm">
          {currentTopic.content}

          {/* Footer Web Link */}
          <div className="mt-10 pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
            <span>Need detailed API reference or CLI guides?</span>
            <a
              href="https://proxync.dev/docs"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-bold hover:underline flex items-center gap-1"
            >
              <span>Explore full web documentation at proxync.dev/docs</span>
              <span className="material-symbols-outlined text-xs">north_east</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
