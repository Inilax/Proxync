import { useState } from 'react';
import type { WorkspaceConfig, SwaggerPanel } from './SharedComponents';
import type { ScannedEndpoint } from '../../lib/codebaseScanner';
import { exportOpenApiToYaml, exportSwaggerToPostmanCollection, importPostmanToOpenApi } from '../../lib/openApiGenerator';
import { generateCodeSnippet, type FrameworkLanguage } from '../../lib/codeSnippetGenerator';

export function SwaggerView({
  document,
  swaggerPanel,
  workspace,
  languageHint,
  scannedEndpoints = [],
  generating = false,
  onGenerateSpec,
  onChangePanel,
  onCopy,
  onExportPostman,
  onImportSpec,
}: {
  document: Record<string, unknown>;
  swaggerPanel: SwaggerPanel;
  workspace: WorkspaceConfig | null;
  languageHint: string;
  scannedEndpoints?: ScannedEndpoint[];
  generating?: boolean;
  onGenerateSpec: () => void;
  onChangePanel: (panel: SwaggerPanel) => void;
  onCopy: (content?: string, msg?: string) => void;
  onExportPostman: (collection: Record<string, unknown>) => void;
  onImportSpec: (importedDoc: Record<string, unknown>) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const [selectedSnippetFramework, setSelectedSnippetFramework] = useState<FrameworkLanguage>('nestjs');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importInputText, setImportInputText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const endpointPreview = buildEndpointPreview(document);
  const rawYaml = exportOpenApiToYaml(document);

  // Derive unique tags
  const allTags = Array.from(new Set(endpointPreview.map((e) => e.tag))).filter(Boolean);

  // Filter endpoints
  const filteredEndpoints = endpointPreview.filter((ep) => {
    const matchesSearch =
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'ALL' || ep.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

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

      // Check if Postman collection format
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in select-none">
      {/* ── Top Header Navigation Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant/30 pb-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant/70 mb-2 uppercase tracking-wider">
            <span>Workspace</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary">OpenAPI Specification</span>
          </nav>
          <h1 className="font-display-sm text-display-sm text-on-surface">Swagger & OpenAPI Studio</h1>

          {/* Compact Metadata & Status Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-surface-variant/70 mt-2 font-mono">
            <span>Framework: <strong className="text-primary">{languageHint}</strong></span>
            <span className="opacity-30">|</span>
            <span>Scanned Code Routes: <strong className="text-secondary">{scannedEndpoints.length}</strong></span>
            <span className="opacity-30">|</span>
            <span>Captured Traffic Specs: <strong>{workspace?.capturedRequests.length ?? 0}</strong></span>
          </div>
        </div>

        {/* View Switchers & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant">
            <button
              className={`px-3 py-1.5 rounded text-xs font-label-md cursor-pointer transition-all ${
                swaggerPanel === 'preview'
                  ? 'bg-surface-bright text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => onChangePanel('preview')}
            >
              Endpoints Preview
            </button>
            <button
              className={`px-3 py-1.5 rounded text-xs font-label-md cursor-pointer transition-all ${
                swaggerPanel === 'json'
                  ? 'bg-surface-bright text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => onChangePanel('json')}
            >
              Raw JSON
            </button>
            <button
              className={`px-3 py-1.5 rounded text-xs font-label-md cursor-pointer transition-all ${
                swaggerPanel === 'yaml'
                  ? 'bg-surface-bright text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => onChangePanel('yaml')}
            >
              Raw YAML
            </button>
          </div>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-1.5 rounded text-xs font-label-md transition-all flex items-center gap-1.5 text-on-surface-variant bg-surface-container-high border border-outline-variant hover:border-primary cursor-pointer"
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
            className="px-3 py-1.5 rounded text-xs font-label-md transition-all flex items-center gap-1.5 text-secondary bg-secondary/10 border border-secondary/30 hover:bg-secondary/20 cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]">output</span>
            Export to Postman
          </button>

          <button
            className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold"
            onClick={onGenerateSpec}
            disabled={generating}
          >
            <span className={`material-symbols-outlined text-[18px] ${generating ? 'animate-spin' : ''}`}>
              {generating ? 'sync' : 'auto_mode'}
            </span>
            {generating ? 'Generating Spec...' : 'Generate OpenAPI Spec'}
          </button>
        </div>
      </div>

      {/* ── Manual Action & Directory Info Hero Card ── */}
      <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">folder_code</span>
            <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">
              Project Root: {projectRoot ? <code className="text-primary font-mono lowercase">{projectRoot}</code> : <span className="text-warning">Not set</span>}
            </h3>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            OpenAPI spec is computed strictly <strong>on-demand</strong> when you click "Generate OpenAPI Spec". Traffic interception and server proxying run unblocked in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => downloadSpec('json')}
            disabled={!hasEndpoints}
            className="px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 text-on-surface bg-surface-container border border-outline-variant hover:border-primary cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            .json
          </button>
          <button
            onClick={() => downloadSpec('yaml')}
            disabled={!hasEndpoints}
            className="px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 text-on-surface bg-surface-container border border-outline-variant hover:border-primary cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            .yaml
          </button>
          <button
            onClick={() => onCopy(JSON.stringify(document, null, 2), 'OpenAPI JSON copied')}
            disabled={!hasEndpoints}
            className="px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 cursor-pointer disabled:opacity-40 font-semibold"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            Copy Schema
          </button>
        </div>
      </div>

      {/* ── Main View Content ── */}
      {swaggerPanel === 'preview' ? (
        <div className="space-y-6">
          {/* Controls: Search & Tag Filter Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search endpoints by path, method, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedTag('ALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedTag === 'ALL'
                    ? 'bg-primary text-white font-bold shadow-md shadow-primary/25 ring-1 ring-primary/40'
                    : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({endpointPreview.length})
              </button>
              {allTags.map((tag) => {
                const count = endpointPreview.filter((e) => e.tag === tag).length;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-primary text-white font-bold shadow-md shadow-primary/25 ring-1 ring-primary/40'
                        : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tag} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Endpoints List Grid */}
          {filteredEndpoints.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-center border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low/30">
              <span className="material-symbols-outlined text-[36px] text-outline">search_off</span>
              <h3 className="font-headline-sm text-sm text-on-surface font-semibold">No endpoints found</h3>
              <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                Click <strong>"Generate OpenAPI Spec"</strong> above to scan your project code files and live proxy traffic, or adjust your search filter.
              </p>
              <button
                onClick={onGenerateSpec}
                className="btn-primary text-xs px-4 py-2 mt-2 font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">auto_mode</span>
                Generate OpenAPI Spec Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEndpoints.map((ep, idx) => {
                const isExpanded = expandedEndpointId === ep.id;
                const isGet = ep.method === 'GET';
                const isPost = ep.method === 'POST';
                const isPut = ep.method === 'PUT' || ep.method === 'PATCH';
                const isDelete = ep.method === 'DELETE';

                const colorClass = isGet
                  ? 'text-primary border-primary/30 bg-primary/10'
                  : isPost
                  ? 'text-secondary border-secondary/30 bg-secondary/10'
                  : isPut
                  ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                  : isDelete
                  ? 'text-error border-error/30 bg-error/10'
                  : 'text-on-surface-variant border-outline bg-surface-container';

                const codeSnippet = generateCodeSnippet(
                  ep.method,
                  ep.path,
                  selectedSnippetFramework,
                  ep.tag,
                  ep.pathParams
                );

                return (
                  <div
                    key={ep.id || idx}
                    className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden hover:border-primary/40 transition-all shadow-sm"
                  >
                    {/* Header Banner */}
                    <div
                      onClick={() => setExpandedEndpointId(isExpanded ? null : ep.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-high/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded border shrink-0 ${colorClass}`}>
                          {ep.method}
                        </span>
                        <code className="text-xs font-mono font-bold text-on-surface truncate">
                          {ep.path}
                        </code>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container border border-outline-variant/40 text-on-surface-variant/80 shrink-0">
                          {ep.tag}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-on-surface-variant font-mono hidden md:inline">
                          {ep.responseLabel}
                        </span>
                        <span className="material-symbols-outlined text-outline text-[20px]">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail Drawer */}
                    {isExpanded && (
                      <div className="p-5 border-t border-outline-variant/30 bg-surface-container-lowest/60 space-y-5 fade-in">
                        {/* Summary & Description */}
                        <div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            {ep.summary}
                          </p>
                        </div>

                        {/* Path Parameters Table */}
                        {ep.pathParams && ep.pathParams.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-primary">
                              Path Parameters
                            </h4>
                            <div className="border border-outline-variant/40 rounded-lg overflow-hidden bg-surface-container">
                              <table className="w-full text-left border-collapse text-[11px] font-mono">
                                <thead>
                                  <tr className="bg-surface-container-high border-b border-outline-variant/40 text-on-surface-variant">
                                    <th className="p-2.5">Name</th>
                                    <th className="p-2.5">In</th>
                                    <th className="p-2.5">Type</th>
                                    <th className="p-2.5">Required</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ep.pathParams.map((p) => (
                                    <tr key={p} className="border-b border-outline-variant/20 text-on-surface">
                                      <td className="p-2.5 font-bold text-primary">{p}</td>
                                      <td className="p-2.5 text-on-surface-variant">path</td>
                                      <td className="p-2.5 text-secondary">string</td>
                                      <td className="p-2.5 text-error">true</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Request / Response Schemas */}
                        {ep.requestBodySchema && (
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-secondary">
                              Request Body JSON Schema
                            </h4>
                            <pre className="p-3 bg-black rounded-lg border border-outline-variant/30 font-mono text-[11px] text-secondary overflow-x-auto">
                              {JSON.stringify(ep.requestBodySchema, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* "Add to Codebase" Code Snippet Generator */}
                        <div className="space-y-3 pt-2 border-t border-outline-variant/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[18px]">code</span>
                              <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-on-surface">
                                Add to Codebase Snippet
                              </h4>
                            </div>

                            <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded border border-outline-variant/40 text-[10px] font-mono">
                              {(['nestjs', 'express', 'fastapi', 'springboot', 'go'] as FrameworkLanguage[]).map((fw) => (
                                <button
                                  key={fw}
                                  onClick={() => setSelectedSnippetFramework(fw)}
                                  className={`px-2 py-0.5 rounded cursor-pointer capitalize transition-all ${
                                    selectedSnippetFramework === fw
                                      ? 'bg-primary/20 text-primary border border-primary/30 font-bold'
                                      : 'text-on-surface-variant hover:text-on-surface'
                                  }`}
                                >
                                  {fw}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="relative group">
                            <pre className="p-4 bg-black rounded-xl border border-outline-variant/40 font-mono text-[11px] text-primary leading-relaxed overflow-x-auto select-all">
                              {codeSnippet}
                            </pre>
                            <button
                              onClick={() => onCopy(codeSnippet, `Copied ${selectedSnippetFramework} decorator snippet`)}
                              className="absolute top-3 right-3 px-3 py-1 rounded bg-surface-container-high text-xs font-mono text-on-surface hover:text-primary border border-outline-variant flex items-center gap-1 cursor-pointer transition-all shadow"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              Copy Code
                            </button>
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
            <span className="text-on-surface">openapi.json</span>
            <span className="text-on-surface-variant opacity-60">OpenAPI 3.0.3</span>
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
            <span className="text-on-surface">openapi.yaml</span>
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
      };

      const pathParams = descriptor.parameters
        ? descriptor.parameters.filter((p: any) => p.in === 'path').map((p: any) => p.name)
        : [];

      let requestBodySchema: any = null;
      if (descriptor.requestBody?.content?.['application/json']?.schema) {
        requestBodySchema = descriptor.requestBody.content['application/json'].schema;
      }

      return {
        id: `${method}-${path}`,
        method: method.toUpperCase(),
        path,
        tag: descriptor.tags && descriptor.tags[0] ? descriptor.tags[0] : 'General',
        summary: descriptor.summary || descriptor.description || `${method.toUpperCase()} ${path}`,
        pathParams,
        requestBodySchema,
        responseLabel: descriptor.responses
          ? `${Object.keys(descriptor.responses).join(', ')} responses`
          : 'No response metadata',
      };
    })
  );
}
