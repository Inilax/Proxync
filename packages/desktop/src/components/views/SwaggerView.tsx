import { useState, useMemo } from 'react';
import type { WorkspaceConfig, SwaggerPanel, ProcessCandidate, Tunnel, RequestLog } from './SharedComponents';
import type { ScannedEndpoint } from '../../lib/codebaseScanner';
import { exportOpenApiToYaml, exportSwaggerToPostmanCollection, importPostmanToOpenApi, inferResourceTag } from '../../lib/openApiGenerator';
import { generateCodeSnippet, type FrameworkLanguage } from '../../lib/codeSnippetGenerator';
import type { SchemaDriftReport } from '../../lib/types';

export function SwaggerView({
  document,
  swaggerPanel,
  workspace,
  languageHint,
  scannedEndpoints = [],
  tunnels = [],
  processes = [],
  requests = [],
  activeTunnel,
  generating,
  driftReports,
  onGenerateSpec,
  onClearSpec,
  onChangePanel,
  onCopy,
  onExportPostman,
  onImportSpec,
  onOpenWorkbench,
}: {
  document: Record<string, unknown>;
  swaggerPanel: SwaggerPanel;
  workspace: WorkspaceConfig | null;
  languageHint: string;
  scannedEndpoints?: ScannedEndpoint[];
  tunnels?: Tunnel[];
  processes?: ProcessCandidate[];
  requests?: RequestLog[];
  activeTunnel?: Tunnel | null;
  generating?: boolean;
  driftReports?: SchemaDriftReport[];
  onGenerateSpec: (targetPort?: number) => void;
  onClearSpec?: () => void;
  onChangePanel: (panel: SwaggerPanel) => void;
  onCopy: (content?: string, msg?: string) => void;
  onExportPostman: (collection: Record<string, unknown>) => void;
  onImportSpec: (importedDoc: Record<string, unknown>) => void;
  onOpenWorkbench?: (req: { method: string; path: string; port?: number }) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedServerFilter, setSelectedServerFilter] = useState<string>('ALL');
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const [selectedSnippetFramework, setSelectedSnippetFramework] = useState<FrameworkLanguage>('nestjs');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importInputText, setImportInputText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const endpointPreview = useMemo(() => buildEndpointPreview(document), [document]);
  const rawYaml = useMemo(() => exportOpenApiToYaml(document), [document]);

  const contractHealth = useMemo(() => {
    if (!driftReports || driftReports.length === 0) {
      return { pct: 100, breakingCount: 0, driftedRoutes: 0 };
    }
    const breaking = driftReports.reduce((s, r) => s + r.breakingCount, 0);
    const totalDocumented = endpointPreview.length || 1;
    const driftedEndpoints = new Set(driftReports.filter((r) => r.hasDrift).map((r) => `${r.method} ${r.path}`)).size;
    const pct = Math.max(0, Math.round(((totalDocumented - Math.min(totalDocumented, driftedEndpoints)) / totalDocumented) * 100));
    return {
      pct,
      breakingCount: breaking,
      driftedRoutes: driftedEndpoints,
    };
  }, [driftReports, endpointPreview]);

  // Build Server / Tunnel Options dynamically
  const serverOptions = useMemo(() => {
    const map = new Map<string, { port: string; label: string; tunnelUrl?: string; subdomain?: string }>();

    // 1. Discovered active tunnels
    tunnels.forEach((t) => {
      if (t.localPort) {
        const portKey = String(t.localPort);
        const sub = t.subdomain || (t.publicUrl ? t.publicUrl.replace('https://', '').split('.')[0] : '');
        map.set(portKey, {
          port: portKey,
          label: sub ? `Port :${t.localPort} — ${sub} (${t.publicUrl})` : `Port :${t.localPort} (${t.publicUrl})`,
          tunnelUrl: t.publicUrl,
          subdomain: sub,
        });
      }
    });

    // 2. Discovered running processes
    processes.forEach((p) => {
      const portKey = String(p.port);
      if (!map.has(portKey)) {
        map.set(portKey, {
          port: portKey,
          label: p.name ? `Port :${p.port} (${p.name})` : `Port :${p.port}`,
        });
      }
    });

    // 3. Captured requests metadata
    requests.forEach((r) => {
      if (r.port) {
        const portKey = String(r.port);
        if (!map.has(portKey)) {
          map.set(portKey, {
            port: portKey,
            label: r.tunnelUrl
              ? `Port :${r.port} — ${r.subdomain || 'tunnel'} (${r.tunnelUrl})`
              : r.serverName ? `Port :${r.port} (${r.serverName})` : `Port :${r.port}`,
            tunnelUrl: r.tunnelUrl,
            subdomain: r.subdomain,
          });
        }
      }
    });

    // 4. Endpoints in current OpenAPI document
    endpointPreview.forEach((ep) => {
      if (ep.port) {
        const portKey = String(ep.port);
        if (!map.has(portKey)) {
          map.set(portKey, {
            port: portKey,
            label: ep.tunnelUrl
              ? `Port :${ep.port} — ${ep.subdomain || 'tunnel'} (${ep.tunnelUrl})`
              : ep.serverName ? `Port :${ep.port} (${ep.serverName})` : `Port :${ep.port}`,
            tunnelUrl: ep.tunnelUrl,
            subdomain: ep.subdomain,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [processes, tunnels, requests, endpointPreview]);

  // Method counts
  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: endpointPreview.length, GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 };
    endpointPreview.forEach((ep) => {
      const m = ep.method.toUpperCase();
      if (counts[m] !== undefined) counts[m]++;
    });
    return counts;
  }, [endpointPreview]);

  // Filter endpoints by search query, method, and server
  const filteredEndpoints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const targetPort = selectedServerFilter !== 'ALL' ? parseInt(selectedServerFilter, 10) : null;

    return endpointPreview.filter((ep) => {
      // 1. Server filter check
      if (targetPort !== null) {
        if (ep.port !== undefined && ep.port !== null) {
          if (ep.port !== targetPort) return false;
        } else {
          // If ep has no port, check if serverName, tag, or path matches targetPort
          const portStr = String(targetPort);
          const matches = (ep.serverName && ep.serverName.includes(portStr)) || ep.summary.includes(portStr) || ep.path.includes(portStr);
          if (!matches) return false;
        }
      }
      // 2. Method filter check
      if (selectedMethod !== 'ALL' && ep.method.toUpperCase() !== selectedMethod) {
        return false;
      }
      // 3. Search query check
      if (query) {
        const matchesPath = ep.path.toLowerCase().includes(query);
        const matchesMethod = ep.method.toLowerCase().includes(query);
        const matchesTag = ep.tag.toLowerCase().includes(query);
        const matchesSummary = ep.summary.toLowerCase().includes(query);
        return matchesPath || matchesMethod || matchesTag || matchesSummary;
      }
      return true;
    });
  }, [endpointPreview, searchQuery, selectedMethod, selectedServerFilter]);

  // Handle Spec Download
  const downloadSpec = (format: 'json' | 'yaml') => {
    const filename = `openapi.${format}`;
    const content = format === 'json' ? JSON.stringify(document, null, 2) : rawYaml;
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onCopy(undefined, `Downloaded ${filename}`);
  };

  // Copy as cURL helper
  const handleCopyCurl = (ep: (typeof endpointPreview)[0]) => {
    const matchingTunnel = ep.port ? tunnels.find((t) => t.localPort === ep.port && (t.status === 'ACTIVE' || t.status === 'STANDBY')) : activeTunnel;
    const baseUrl = ep.tunnelUrl || matchingTunnel?.publicUrl || `http://localhost:${ep.port || 3000}`;
    let sampleBodyStr = '';
    if (['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.requestBodySchema) {
      sampleBodyStr = ` \\\n  -H "Content-Type: application/json" \\\n  -d '{"title": "example"}'`;
    }
    const curlCmd = `curl -X ${ep.method} "${baseUrl}${ep.path}"${sampleBodyStr}`;
    navigator.clipboard.writeText(curlCmd);
    onCopy(curlCmd, `cURL copied for ${ep.method} ${ep.path} (${baseUrl})`);
  };

  // Handle Import Spec Modal submit
  const handleImportSubmit = () => {
    setImportError(null);
    if (!importInputText.trim()) return;

    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(importInputText);
      } catch {
        throw new Error('Invalid JSON format. Please paste valid JSON or Postman collection.');
      }

      if (parsed.info && (parsed.info as any).schema?.includes('postman')) {
        parsed = importPostmanToOpenApi(parsed);
      }

      onImportSpec(parsed);
      setImportModalOpen(false);
      setImportInputText('');
      onCopy(undefined, 'Imported OpenAPI Spec successfully');
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse spec file');
    }
  };

  const hasEndpoints = endpointPreview.length > 0;
  const projectRoot = workspace?.projectRootPath;

  const handleGenerateClick = () => {
    const targetPort = selectedServerFilter !== 'ALL' ? parseInt(selectedServerFilter, 10) : undefined;
    onGenerateSpec(targetPort);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 fade-in select-none">
      {/* ── Tier 1: Hero Header & Primary Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4 sm:pb-5">
        <div className="min-w-0">
          <nav className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant/70 mb-1 uppercase tracking-wider">
            <span>Workspace</span>
            <span className="material-symbols-outlined text-[12px] opacity-60">chevron_right</span>
            <span className="text-primary font-semibold">OpenAPI Specification</span>
          </nav>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-on-surface tracking-tight truncate">
            Swagger & OpenAPI Studio
          </h1>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          {onClearSpec && (
            <button
              onClick={onClearSpec}
              disabled={!hasEndpoints}
              className="px-3 py-1.5 rounded-lg text-xs font-label-md transition-all flex items-center gap-1.5 text-on-surface-variant bg-surface-container border border-outline-variant hover:border-rose-500/40 hover:text-rose-400 cursor-pointer disabled:opacity-40 flex-1 sm:flex-initial justify-center"
              title="Clear OpenAPI specification"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Clear
            </button>
          )}

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-label-md transition-all flex items-center gap-1.5 text-on-surface-variant bg-surface-container border border-outline-variant hover:border-primary/50 hover:text-on-surface cursor-pointer flex-1 sm:flex-initial justify-center"
          >
            <span className="material-symbols-outlined text-[16px]">file_upload</span>
            Import Spec
          </button>

          <button
            onClick={() => {
              const collection = exportSwaggerToPostmanCollection(document);
              onExportPostman(collection);
            }}
            disabled={!hasEndpoints}
            className="px-3 py-1.5 rounded-lg text-xs font-label-md transition-all flex items-center gap-1.5 text-secondary bg-secondary/10 border border-secondary/30 hover:bg-secondary/20 cursor-pointer disabled:opacity-40 flex-1 sm:flex-initial justify-center"
          >
            <span className="material-symbols-outlined text-[16px]">output</span>
            Export to Playground
          </button>

          <button
            className="btn-primary flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold shadow-md shadow-primary/20 w-full sm:w-auto"
            onClick={handleGenerateClick}
            disabled={generating}
          >
            <span className={`material-symbols-outlined text-[16px] ${generating ? 'animate-spin' : ''}`}>
              {generating ? 'sync' : 'auto_mode'}
            </span>
            {generating ? 'Generating Spec...' : 'Generate OpenAPI Spec'}
          </button>
        </div>
      </div>

      {/* ── Tier 2: Metadata Badges & Segmented View Tab Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/40">
        {/* Metadata Badge Row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant/60">
            <span className="text-on-surface-variant/70">Framework:</span>
            <strong className="text-primary font-semibold">{languageHint}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant/60">
            <span className="text-on-surface-variant/70">Code Routes:</span>
            <strong className="text-secondary font-semibold">{scannedEndpoints.length}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant/60">
            <span className="text-on-surface-variant/70">Live Specs:</span>
            <strong className="text-on-surface font-semibold">{requests.length}</strong>
          </span>
          {activeTunnel && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tunnel :{activeTunnel.localPort}
            </span>
          )}
        </div>

        {/* Segmented View Switchers */}
        <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant w-full sm:w-auto">
          <button
            className={`px-3 py-1.5 rounded-md text-xs font-label-md cursor-pointer transition-all flex-1 sm:flex-initial text-center ${
              swaggerPanel === 'preview'
                ? 'bg-surface-bright text-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => onChangePanel('preview')}
          >
            Endpoints Preview
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-xs font-label-md cursor-pointer transition-all flex-1 sm:flex-initial text-center ${
              swaggerPanel === 'json'
                ? 'bg-surface-bright text-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => onChangePanel('json')}
          >
            Raw JSON
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-xs font-label-md cursor-pointer transition-all flex-1 sm:flex-initial text-center ${
              swaggerPanel === 'yaml'
                ? 'bg-surface-bright text-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => onChangePanel('yaml')}
          >
            Raw YAML
          </button>
        </div>
      </div>

      {/* ── Project Root & Quick Spec Download Bar ── */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0">folder_code</span>
          <div className="text-xs truncate">
            <span className="font-semibold text-on-surface uppercase tracking-wider mr-2 text-[10px] text-on-surface-variant">Project Root:</span>
            {projectRoot ? (
              <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded text-[11px] truncate inline-block max-w-[200px] sm:max-w-none align-middle">{projectRoot}</code>
            ) : (
              <span className="text-amber-400/90 text-xs">Not set (Click Scan in Workspace Hub)</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => downloadSpec('json')}
            disabled={!hasEndpoints}
            className="px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1.5 text-on-surface bg-surface-container border border-outline-variant hover:border-primary cursor-pointer disabled:opacity-40 flex-1 sm:flex-initial justify-center"
            title="Download openapi.json"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            .json
          </button>
          <button
            onClick={() => downloadSpec('yaml')}
            disabled={!hasEndpoints}
            className="px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1.5 text-on-surface bg-surface-container border border-outline-variant hover:border-primary cursor-pointer disabled:opacity-40 flex-1 sm:flex-initial justify-center"
            title="Download openapi.yaml"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            .yaml
          </button>
          <button
            onClick={() => onCopy(JSON.stringify(document, null, 2), 'OpenAPI JSON copied')}
            disabled={!hasEndpoints}
            className="px-3 py-1 rounded text-xs font-mono transition-all flex items-center gap-1.5 text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 cursor-pointer disabled:opacity-40 font-semibold flex-1 sm:flex-initial justify-center"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            Copy Schema
          </button>
        </div>
      </div>

      {/* ── Main View Content ── */}
      {swaggerPanel === 'preview' ? (
        <div className="space-y-5">
          {/* Controls: Search, Multi-Server Selector & Method Filter Pills */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search endpoints by path, method, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>

              {/* Multi-Tunnel / Multi-Server Selector Dropdown */}
              {serverOptions.length > 0 && (
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-xs text-on-surface w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="material-symbols-outlined text-primary text-[16px]">dns</span>
                      <span className="text-[10px] uppercase font-mono text-on-surface-variant font-semibold">Server / Tunnel:</span>
                    </div>
                    <select
                      value={selectedServerFilter}
                      onChange={(e) => setSelectedServerFilter(e.target.value)}
                      className="bg-transparent text-xs text-on-surface font-mono font-medium focus:outline-none cursor-pointer pl-1 max-w-[200px] sm:max-w-[280px] truncate"
                    >
                      <option value="ALL" className="bg-surface-container-high text-on-surface">🌐 All Tunnels & Servers ({endpointPreview.length})</option>
                      {serverOptions.map((s) => (
                        <option key={s.port} value={s.port} className="bg-surface-container-high text-on-surface">
                          ⚡ {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Method Filter Pills & Tag Selectors */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Method Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const).map((m) => {
                  const count = methodCounts[m] || 0;
                  if (m !== 'ALL' && count === 0) return null;
                  const isSelected = selectedMethod === m;

                  const METHOD_THEMES = {
                    ALL: {
                      dot: 'bg-primary',
                      active: 'bg-primary/15 border-primary/60 text-primary font-bold',
                      inactive: 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-primary/40 hover:bg-surface-container',
                    },
                    GET: {
                      dot: 'bg-emerald-400',
                      active: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400 font-bold',
                      inactive: 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-surface-container',
                    },
                    POST: {
                      dot: 'bg-indigo-400',
                      active: 'bg-indigo-500/15 border-indigo-500/60 text-indigo-400 font-bold',
                      inactive: 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-surface-container',
                    },
                    PUT: {
                      dot: 'bg-amber-400',
                      active: 'bg-amber-500/15 border-amber-500/60 text-amber-400 font-bold',
                      inactive: 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-amber-400 hover:border-amber-500/40 hover:bg-surface-container',
                    },
                    DELETE: {
                      dot: 'bg-rose-400',
                      active: 'bg-rose-500/15 border-rose-500/60 text-rose-400 font-bold',
                      inactive: 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-rose-400 hover:border-rose-500/40 hover:bg-surface-container',
                    },
                    PATCH: {
                      dot: 'bg-cyan-400',
                      active: 'bg-cyan-500/15 border-cyan-500/60 text-cyan-400 font-bold',
                      inactive: 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-surface-container',
                    },
                  }[m];

                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected ? METHOD_THEMES.active : METHOD_THEMES.inactive
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${METHOD_THEMES.dot}`} />
                      <span>{m}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                          isSelected
                            ? 'bg-primary/20 text-current'
                            : 'bg-surface-container-highest/90 text-on-surface-variant'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Endpoints List Grid */}
          {filteredEndpoints.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-center border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low/30">
              <span className="material-symbols-outlined text-[36px] text-outline">search_off</span>
              <h3 className="font-headline-sm text-sm text-on-surface font-semibold">No endpoints match criteria</h3>
              <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                Click <strong>"Generate OpenAPI Spec"</strong> above to scan your project code files and live proxy traffic, or adjust your search filter.
              </p>
              <button
                onClick={handleGenerateClick}
                className="btn-primary text-xs px-4 py-2 mt-2 font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">auto_mode</span>
                Generate OpenAPI Spec Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Contract Health & Reconciliation Banner */}
              {contractHealth.breakingCount > 0 && (
                <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-error font-bold">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    <span>
                      {contractHealth.breakingCount} Breaking Contract Violation{contractHealth.breakingCount !== 1 ? 's' : ''} in Live Traffic
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-on-surface-variant font-mono">
                      Contract Health: <strong className="text-error">{contractHealth.pct}%</strong> compliant
                    </span>
                  </div>
                </div>
              )}
              {filteredEndpoints.map((ep) => {
                const isExpanded = expandedEndpointId === ep.id;
                const isGet = ep.method === 'GET';
                const isPost = ep.method === 'POST';
                const isPut = ep.method === 'PUT' || ep.method === 'PATCH';
                const isDelete = ep.method === 'DELETE';

                const colorClass = isGet
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isPost
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : isPut
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : isDelete
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-surface-container-high text-on-surface border-outline-variant';

                return (
                  <div
                    key={ep.id}
                    className="border border-outline-variant/80 rounded-xl bg-surface-container-low overflow-hidden hover:border-outline-variant transition-all shadow-sm"
                  >
                    {/* Endpoint Card Header */}
                    <div
                      className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-high/30 transition-colors"
                      onClick={() => setExpandedEndpointId(isExpanded ? null : ep.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
                        {/* Method Badge */}
                        <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border uppercase tracking-wider shrink-0 ${colorClass}`}>
                          {ep.method}
                        </span>

                        {/* Path */}
                        <span className="font-mono text-xs sm:text-sm text-on-surface font-semibold tracking-tight truncate max-w-[220px] sm:max-w-none" title={ep.path}>
                          {ep.path}
                        </span>

                        {/* Schema Drift Indicator Pill */}
                        {(() => {
                          const epDrift = driftReports?.find(
                            (r) =>
                              r.method === ep.method.toUpperCase() &&
                              (r.path === ep.path || ep.path.includes(r.path)) &&
                              r.hasDrift
                          );
                          if (!epDrift) return null;
                          return (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 flex items-center gap-1 ${
                                epDrift.breakingCount > 0
                                  ? 'bg-error/15 text-error border-error/30'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}
                              title={`${epDrift.breakingCount} breaking, ${epDrift.warningCount} warnings`}
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {epDrift.breakingCount > 0 ? 'warning' : 'change_circle'}
                              </span>
                              {epDrift.breakingCount > 0
                                ? `${epDrift.breakingCount} Breaking Drift`
                                : `+${epDrift.warningCount} Added Fields`}
                            </span>
                          );
                        })()}

                        {/* Server & Tunnel Badge */}
                        {ep.tunnelUrl ? (
                          <a
                            href={`${ep.tunnelUrl}${ep.path}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors font-semibold shrink-0"
                            title={`Public Tunnel URL: ${ep.tunnelUrl}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">public</span>
                            <span>{ep.subdomain ? `${ep.subdomain}` : ep.tunnelUrl.replace(/^https?:\/\//, '')}</span>
                            <span className="opacity-70">(:{ep.port || 'live'})</span>
                          </a>
                        ) : ep.port ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container-high border border-outline-variant text-primary font-semibold shrink-0">
                            ⚡ :{ep.port}
                          </span>
                        ) : null}

                        {/* Semantic Resource Tag Badge */}
                        {ep.tag && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary/10 border border-secondary/25 text-secondary font-semibold shrink-0">
                            🏷️ {ep.tag}
                          </span>
                        )}

                        {/* Origin Tag Badge */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container border border-outline-variant/60 text-on-surface-variant shrink-0">
                          {ep.source === 'traffic' ? '⚡ Live Traffic' : ep.source === 'code' ? '📂 Code Scanned' : 'Default'}
                        </span>
                      </div>

                      {/* Right Action Icons */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                        <span className="text-[11px] font-mono text-on-surface-variant/70 hidden sm:inline">
                          {ep.responseLabel}
                        </span>

                        {onOpenWorkbench && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenWorkbench({ method: ep.method, path: ep.path, port: ep.port });
                            }}
                            className="px-2.5 py-1 rounded text-xs font-label-md flex items-center gap-1 text-primary bg-primary/10 hover:bg-primary/20 transition-colors font-semibold"
                            title="Test in Interactive Workbench"
                          >
                            <span className="material-symbols-outlined text-[15px]">bolt</span>
                            Workbench
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCurl(ep);
                          }}
                          className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                          title="Copy as cURL command"
                        >
                          <span className="material-symbols-outlined text-[16px]">terminal</span>
                        </button>

                        <span className="material-symbols-outlined text-on-surface-variant text-[18px] transition-transform duration-200">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-4 bg-black/40 border-t border-outline-variant/40 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Left Column: Summary & Path Params & Code Generator */}
                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider font-semibold block mb-1">
                                Summary & Documentation
                              </span>
                              <p className="text-xs text-on-surface bg-surface-container p-2.5 rounded-lg border border-outline-variant/60 leading-relaxed font-sans">
                                {ep.summary}
                              </p>
                            </div>

                            {ep.pathParams.length > 0 && (
                              <div>
                                <span className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider font-semibold block mb-1">
                                  Path Parameters
                                </span>
                                <div className="space-y-1">
                                  {ep.pathParams.map((param) => (
                                    <div key={param} className="flex items-center gap-2 text-xs font-mono bg-surface-container px-2.5 py-1.5 rounded-lg border border-outline-variant/60">
                                      <span className="text-primary font-bold">{param}</span>
                                      <span className="text-on-surface-variant text-[11px]">(string, required)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Client Code Snippet Generator */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider font-semibold">
                                  Client Code Snippet
                                </span>
                                <select
                                  value={selectedSnippetFramework}
                                  onChange={(e) => setSelectedSnippetFramework(e.target.value as FrameworkLanguage)}
                                  className="bg-surface-container border border-outline-variant rounded px-2 py-0.5 text-[10px] font-mono text-on-surface focus:outline-none"
                                >
                                  <option value="nestjs">NestJS (TypeScript)</option>
                                  <option value="express">Express (Node.js)</option>
                                  <option value="fastapi">FastAPI (Python)</option>
                                  <option value="springboot">Spring Boot (Java)</option>
                                  <option value="go">Go (Gin)</option>
                                </select>
                              </div>

                              <pre className="p-3 bg-black border border-outline-variant/80 rounded-lg text-[11px] font-mono text-secondary overflow-x-auto select-all leading-relaxed">
                                {generateCodeSnippet(ep.method, ep.path, selectedSnippetFramework, ep.tag || 'Api', ep.pathParams || [])}
                              </pre>
                            </div>
                          </div>

                          {/* Right Column: Request & Response Schemas */}
                          <div className="space-y-3">
                            {ep.requestBodySchema && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider font-semibold">
                                    Request Body (JSON Schema)
                                  </span>
                                  <span className="text-[10px] font-mono text-primary font-bold">application/json</span>
                                </div>
                                <pre className="p-3 bg-black border border-outline-variant/80 rounded-lg text-[11px] font-mono text-primary/90 overflow-x-auto select-all max-h-40">
                                  {JSON.stringify(ep.requestBodySchema, null, 2)}
                                </pre>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider font-semibold">
                                  Quick cURL Invocation
                                </span>
                                <button
                                  onClick={() => handleCopyCurl(ep)}
                                  className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <span className="material-symbols-outlined text-[12px]">content_copy</span>
                                  Copy cURL
                                </button>
                              </div>
                              <pre className="p-3 bg-black border border-outline-variant/80 rounded-lg text-[11px] font-mono text-on-surface/90 overflow-x-auto select-all leading-relaxed">
                                {`curl -X ${ep.method} "${activeTunnel ? activeTunnel.publicUrl : `http://localhost:${ep.port || 3000}`}${ep.path}"`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : swaggerPanel === 'json' ? (
        /* Raw JSON Code Block View */
        <div className="rounded-xl border border-outline-variant overflow-hidden shadow-xl">
          <div className="bg-surface-container-high px-4 py-2.5 flex items-center justify-between border-b border-outline-variant text-[11px] font-mono select-none">
            <span className="text-on-surface font-semibold">openapi.json</span>
            <span className="text-on-surface-variant opacity-60">OpenAPI 3.0.3 Specification</span>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-5 bg-black">
            <pre className="font-mono text-[11px] text-secondary leading-relaxed whitespace-pre-wrap select-all">
              {JSON.stringify(document, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        /* Raw YAML Code Block View */
        <div className="rounded-xl border border-outline-variant overflow-hidden shadow-xl">
          <div className="bg-surface-container-high px-4 py-2.5 flex items-center justify-between border-b border-outline-variant text-[11px] font-mono select-none">
            <span className="text-on-surface font-semibold">openapi.yaml</span>
            <span className="text-on-surface-variant opacity-60">OpenAPI 3.0.3 Specification</span>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-5 bg-black">
            <pre className="font-mono text-[11px] text-primary leading-relaxed whitespace-pre-wrap select-all">
              {rawYaml}
            </pre>
          </div>
        </div>
      )}

      {/* ── Import Spec Modal Dialog ── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in">
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">file_upload</span>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">Import OpenAPI or Postman Spec</h3>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Paste valid OpenAPI 3.0 JSON specification or Postman Collection JSON below to import into your workspace.
            </p>

            <textarea
              rows={10}
              placeholder="Paste openapi.json or Postman collection content here..."
              value={importInputText}
              onChange={(e) => setImportInputText(e.target.value)}
              className="w-full bg-black border border-outline-variant rounded-xl p-3 font-mono text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
            />

            {importError && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-xs font-mono text-error">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-label-md text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="btn-primary px-5 py-2 text-xs font-semibold"
              >
                Import Spec
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildEndpointPreview(document: Record<string, unknown>) {
  const paths = (document.paths ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, value]) => {
      const descriptor = value as {
        summary?: string;
        description?: string;
        tags?: string[];
        parameters?: any[];
        requestBody?: any;
        responses?: Record<string, unknown>;
        'x-proxync-source'?: 'code' | 'traffic' | 'default';
        'x-proxync-port'?: number;
        'x-proxync-server'?: string;
        'x-proxync-tunnel-url'?: string;
        'x-proxync-subdomain'?: string;
        'x-proxync-file'?: string;
      };

      const pathParams = descriptor.parameters
        ? descriptor.parameters.filter((p: any) => p.in === 'path').map((p: any) => p.name)
        : [];

      let requestBodySchema: any = null;
      if (descriptor.requestBody?.content?.['application/json']?.schema) {
        requestBodySchema = descriptor.requestBody.content['application/json'].schema;
      }

      const rawTag = descriptor.tags && descriptor.tags[0] ? descriptor.tags[0] : '';
      const inferredTag = (rawTag && rawTag !== 'Code Controllers' && rawTag !== 'Captured Traffic' && !rawTag.startsWith('Port :'))
        ? rawTag
        : inferResourceTag(path);

      return {
        id: `${method}-${path}`,
        method: method.toUpperCase(),
        path,
        tag: inferredTag,
        summary: descriptor.summary || descriptor.description || `${method.toUpperCase()} ${path}`,
        pathParams,
        requestBodySchema,
        source: descriptor['x-proxync-source'] || (descriptor.tags?.some((t) => t.includes('Traffic') || t.includes('Port')) ? 'traffic' : 'code'),
        port: descriptor['x-proxync-port'],
        serverName: descriptor['x-proxync-server'],
        tunnelUrl: descriptor['x-proxync-tunnel-url'],
        subdomain: descriptor['x-proxync-subdomain'],
        fileSource: descriptor['x-proxync-file'],
        responseLabel: descriptor.responses
          ? `${Object.keys(descriptor.responses).join(', ')} responses`
          : 'No response metadata',
      };
    })
  );
}
