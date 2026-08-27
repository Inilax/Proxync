import { useState } from 'react';
import { showToast } from '../../lib/toast';

interface DocTopic {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export function DocsView() {
  const [activeTopic, setActiveTopic] = useState<string>('quickstart');

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const topics: DocTopic[] = [
    {
      id: 'quickstart',
      title: 'Quickstart',
      icon: 'rocket_launch',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Proxync Architecture &amp; Lifecycle</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Proxync is a local-first desktop developer engine built with <strong>Tauri v2 + Rust</strong>. It connects local development ports (<code className="text-primary font-mono bg-surface-container-high px-1.5 py-0.5 rounded">localhost:3000</code>) to public edge tunnels, intercepts real-time HTTP traffic, auto-generates OpenAPI 3.0 specs, and provides built-in Postman/Swagger test workbenches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <span className="material-symbols-outlined text-base">hub</span>
                <span>1. Process Discovery</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Proxync periodically scans active OS TCP ports (Node, Vite, Next.js, Django, Flask, Go, Spring) to identify live servers running on your workstation.
              </p>
            </div>

            <div className="p-4 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-secondary/40 transition-colors">
              <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                <span className="material-symbols-outlined text-base">bolt</span>
                <span>2. Edge Tunneling</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Expose any local port via Proxync Native SSH Tunnels (hosted on Azure Edge), Cloudflare Quick Tunnels, Localtunnel, or LAN broadcast.
              </p>
            </div>

            <div className="p-4 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-tertiary/40 transition-colors">
              <div className="flex items-center gap-2 text-tertiary font-bold text-xs">
                <span className="material-symbols-outlined text-base">insights</span>
                <span>3. Live Synthesis</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Incoming webhook payloads, query parameters, headers, and latency metrics are intercepted in real time to synthesize OpenAPI 3.0 definitions.
              </p>
            </div>
          </div>

          <div className="p-5 bg-surface-container/40 rounded-xl border border-outline-variant/30 space-y-2.5">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">folder_open</span>
              Workspace Concept
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              A <strong>Workspace</strong> binds your project directory to saved server profiles, custom domain bindings, Postman collections, and Swagger contracts. Switching workspaces re-scopes all tunnels, environment variables, and telemetry logs.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'tunnels',
      title: 'Tunnels',
      icon: 'alt_route',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Supported Tunnel Providers</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Proxync features 4 distinct tunneling strategies designed for different network topologies, firewall constraints, and webhook testing scenarios:
            </p>
          </div>

          <div className="space-y-4">
            {/* Proxync Native */}
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">bolt</span>
                  <h3 className="text-sm font-bold text-on-surface">Proxync Native Tunnel (Recommended)</h3>
                </div>
                <span className="badge accent">Fastest • Azure Edge</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Direct SSH reverse tunnel connection to Proxync&apos;s edge relay hosted on Azure. Auto-generates public subdomains (e.g. <code className="text-primary font-mono">*.proxync.dev</code>) with zero third-party account requirements and ultra-low latency.
              </p>
            </div>

            {/* Cloudflare */}
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-outline-variant transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">cloud</span>
                  <h3 className="text-sm font-bold text-on-surface">Cloudflare Quick Tunnel</h3>
                </div>
                <span className="badge muted">Global Anycast</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Uses the embedded <code className="font-mono text-primary">cloudflared</code> daemon to generate an encrypted HTTPS URL on <code className="text-on-surface font-mono">*.trycloudflare.com</code> without requiring a Cloudflare account or API token.
              </p>
            </div>

            {/* Localtunnel */}
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-outline-variant transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-400 text-lg">link</span>
                  <h3 className="text-sm font-bold text-on-surface">Localtunnel Proxy</h3>
                </div>
                <span className="badge muted">Public Relay</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Connects through public Localtunnel gateway nodes (<code className="text-on-surface font-mono">*.loca.lt</code>). Ideal for testing when strict enterprise firewalls restrict custom SSH ports.
              </p>
            </div>

            {/* Local Loopback */}
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">dns</span>
                  <h3 className="text-sm font-bold text-on-surface">Local Loopback Domain (*.localtest.me)</h3>
                </div>
                <span className="badge success">Offline Testing</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Resolves subdomains directly back to <code className="font-mono text-primary">127.0.0.1</code> on your workstation. Perfect for multi-tenant frontend testing, subdomain routing, and cookie isolation without internet access.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'domains',
      title: 'Domains',
      icon: 'domain',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Custom Domains &amp; CNAME Setup</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Route production webhooks or client demonstrations through your own branded custom domain (e.g. <code className="text-primary font-mono">api.yourcompany.com</code> or <code className="text-primary font-mono">dev.acme.org</code>).
            </p>
          </div>

          <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">dns</span>
              DNS CNAME Configuration
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              In your DNS registrar dashboard (Cloudflare, GoDaddy, Namecheap, Route53), add a <strong>CNAME Record</strong> pointing your chosen subdomain to the Proxync edge target:
            </p>

            <div className="bg-black/60 p-4 rounded-xl border border-outline-variant/40 font-mono text-xs text-white font-medium flex items-center justify-between">
              <div>
                <span className="text-on-surface-variant">CNAME Target: </span>
                <span className="text-primary font-bold">tunnel.proxync.dev</span>
              </div>
              <button 
                onClick={() => copyText('tunnel.proxync.dev', 'CNAME target')}
                className="btn-ghost compact text-xs flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>Copy</span>
              </button>
            </div>

            <div className="p-4 bg-surface-container-high/60 rounded-lg text-xs text-on-surface-variant space-y-1.5 border border-outline-variant/20">
              <div className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">verified</span>
                <span>Automated SSL Termination</span>
              </div>
              <p>
                Proxync&apos;s edge proxy automatically terminates HTTPS traffic using auto-renewing Let&apos;s Encrypt / Cloudflare certificates. Once DNS propagates, your custom subdomain connects directly to your local workstation.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'postman',
      title: 'Postman',
      icon: 'send',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Postman Studio &amp; Collection Runner</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Postman Studio is a native, offline-capable REST testing environment with full collection management, multi-environment variables, and dynamic code generation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-primary/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">folder_special</span>
                Organized Collections &amp; Folders
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Organize requests into modular folders (e.g. Auth, Users, Billing, Webhooks). Reorder, rename, or duplicate requests with full drag-and-drop hierarchy.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-secondary/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">code</span>
                Export to cURL, Node.js &amp; Python
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Convert any saved request into production-ready cURL commands, Node.js <code className="font-mono text-primary">fetch()</code>, Python <code className="font-mono text-primary">requests</code>, or Go HTTP snippets with 1 click.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-tertiary/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-base">data_object</span>
                JSON Body Formatter &amp; Validator
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Built-in Monaco/CodeMirror syntax highlighter with auto-formatting, syntax validation, and collapsible nested object folding.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2 hover:border-amber-400/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">import_export</span>
                Postman v2.1 Format Interop
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Import standard <code className="font-mono text-primary">collection.json</code> files directly from Postman or Insomnia, and export your Proxync collections with zero lock-in.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'swagger',
      title: 'Swagger',
      icon: 'api',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Swagger Studio &amp; OpenAPI 3.0</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Proxync observes live HTTP traffic passing through your tunnels and codebase endpoints to automatically infer query parameters, JSON schemas, headers, and status codes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-3">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
                How Auto-Generation Works
              </h3>
              <ul className="text-xs text-on-surface-variant space-y-2 list-disc list-inside leading-relaxed">
                <li><strong className="text-on-surface">Route Discovery:</strong> Detects endpoints from URL paths (e.g. <code className="font-mono text-primary">/api/v1/users/:id</code>).</li>
                <li><strong className="text-on-surface">Schema Inference:</strong> Analyzes request and response JSON payloads to deduce primitive types (string, number, boolean, array, object).</li>
                <li><strong className="text-on-surface">Status Code Mapping:</strong> Captures 200, 201, 400, 401, 404, 500 response bodies to populate OpenAPI response maps.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-container/40 rounded-xl border border-outline-variant/30 space-y-2 hover:border-secondary/40 transition-colors">
                <h4 className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-sm">download</span>
                  Export openapi.json / YAML
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Export valid OpenAPI 3.0 specification files for documentation generation, Swagger UI hosting, or backend contract testing in CI/CD.
                </p>
              </div>

              <div className="p-4 bg-surface-container/40 rounded-xl border border-outline-variant/30 space-y-2 hover:border-primary/40 transition-colors">
                <h4 className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-sm">sync_alt</span>
                  Sync Directly to Postman Studio
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Click <strong>Export to Postman</strong> in Swagger Studio to convert auto-discovered endpoints directly into an executable Postman collection.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'observability',
      title: 'Observability',
      icon: 'insights',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Observability, Traffic &amp; PII Privacy</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Monitor incoming requests, network latency, payload sizes, and error spikes in real time while maintaining strict local-first data privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2.5 hover:border-emerald-400/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-base">shield_lock</span>
                Automatic PII &amp; Secret Redaction
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Authorization headers (<code className="font-mono text-primary">Bearer ey...</code>), Stripe secret keys (<code className="font-mono text-primary">sk_live_...</code>), API tokens, and sensitive headers are sanitized before disk persistence to prevent accidental secret leakage.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2.5 hover:border-sky-400/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-400 text-base">ssid_chart</span>
                Real-Time Latency &amp; Status Filters
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Filter live traffic streams by HTTP method (GET, POST, PUT, DELETE), status code family (2xx, 4xx, 5xx), or search query text with instant visual response.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2.5 hover:border-primary/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">wifi_tethering</span>
                LAN Sharing &amp; Mobile Testing
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Broadcast local servers to your local Wi-Fi network with 1 click. Generates a QR code and local IP URL (<code className="font-mono text-primary">http://192.168.x.x:PORT</code>) for testing on physical iOS/Android phones.
              </p>
            </div>

            <div className="p-5 bg-surface-container/60 rounded-xl border border-outline-variant/30 space-y-2.5 hover:border-amber-400/40 transition-colors">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">replay</span>
                1-Click Request Replay
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Replay failed webhooks or client requests directly from the Traffic view into the built-in synthetic test runner to reproduce bugs instantly.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: 'Shortcuts',
      icon: 'keyboard',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-on-surface">Keyboard Shortcuts</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Speed up your daily workflow with global and view-specific keyboard shortcuts.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container/30">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-container-high text-on-surface-variant font-bold border-b border-outline-variant/30">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Shortcut</th>
                    <th className="py-3 px-4">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Quick Workspace Search</td>
                    <td className="py-2.5 px-4 font-mono"><kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Ctrl + K</kbd> / <kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Cmd + K</kbd></td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Global</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Keyboard Shortcuts Modal</td>
                    <td className="py-2.5 px-4 font-mono"><kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Ctrl + /</kbd> / <kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Cmd + /</kbd></td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Global</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Execute Request in Workbench</td>
                    <td className="py-2.5 px-4 font-mono"><kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Ctrl + Enter</kbd> / <kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Cmd + Enter</kbd></td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Workbench &amp; Postman</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Open New Request Tab</td>
                    <td className="py-2.5 px-4 font-mono"><kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Ctrl + T</kbd> / <kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Cmd + T</kbd></td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Workbench</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Close Active Request Tab</td>
                    <td className="py-2.5 px-4 font-mono"><kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Ctrl + W</kbd> / <kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Cmd + W</kbd></td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Workbench</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Dismiss Modals / Overlays</td>
                    <td className="py-2.5 px-4 font-mono"><kbd className="bg-black/50 px-2 py-0.5 rounded border border-outline-variant/40 text-primary">Escape</kbd></td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Global</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentTopic = topics.find((t) => t.id === activeTopic) ?? topics[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 fade-in select-none pb-8 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <h1 className="font-bold text-2xl text-on-surface tracking-tight">Documentation</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Reference guides for tunnels, custom domains, API studios, and telemetry.
          </p>
        </div>

        <a
          href="https://proxync.dev/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-xs transition-all shrink-0 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          <span>Web Docs</span>
        </a>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="flex flex-row overflow-x-auto gap-1.5 p-1 bg-surface-container/40 border border-outline-variant/30 rounded-2xl md:flex-col md:p-2 md:space-y-1 shrink-0">
          {topics.map((t) => {
            const isActive = t.id === activeTopic;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTopic(t.id)}
                className={`whitespace-nowrap shrink-0 md:w-full text-left px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {t.icon}
                </span>
                <span className="truncate">{t.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="md:col-span-3 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 sm:p-7 min-h-[460px] shadow-sm">
          {currentTopic.content}

          {/* Footer Web Link */}
          <div className="mt-10 pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
            <span>Need CLI flags or Docker recipes?</span>
            <a
              href="https://proxync.dev/docs"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-bold hover:underline flex items-center gap-1"
            >
              <span>proxync.dev/docs</span>
              <span className="material-symbols-outlined text-xs">north_east</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
