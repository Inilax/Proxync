import type { WorkspaceConfig, SwaggerPanel } from './SharedComponents';
import { formatDate } from './SharedComponents';

export function SwaggerView({
  document,
  swaggerPanel,
  workspace,
  languageHint,
  onChangePanel,
  onCopy,
}: {
  document: Record<string, unknown>;
  swaggerPanel: SwaggerPanel;
  workspace: WorkspaceConfig | null;
  languageHint: string;
  onChangePanel: (panel: SwaggerPanel) => void;
  onCopy: () => void;
}) {
  const endpointPreview = buildEndpointPreview(document);

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in select-none">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant/30 pb-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant/70 mb-2 uppercase tracking-wider">
            <span>Workspace</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary">OpenAPI Specification</span>
          </nav>
          <h1 className="font-display-sm text-display-sm text-on-surface">API Documentation</h1>

          {/* Compact Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-surface-variant/70 mt-2 font-mono">
            <span>Framework: <strong className="text-primary">{languageHint}</strong></span>
            <span className="opacity-30">|</span>
            <span>Compiler: <strong>{workspace?.guardrails.autoUpdateSwagger ? 'Auto-updating' : 'Manual'}</strong></span>
            <span className="opacity-30">|</span>
            <span>Updated: <strong>{workspace?.lastSwaggerGeneratedAt ? formatDate(workspace.lastSwaggerGeneratedAt) : 'just now'}</strong></span>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant">
            <button
              className={`px-4 py-1.5 rounded text-xs font-label-md cursor-pointer transition-all ${swaggerPanel === 'preview'
                  ? 'bg-surface-bright text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`}
              onClick={() => onChangePanel('preview')}
            >
              Endpoints Preview
            </button>
            <button
              className={`px-4 py-1.5 rounded text-xs font-label-md cursor-pointer transition-all ${swaggerPanel === 'json'
                  ? 'bg-surface-bright text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`}
              onClick={() => onChangePanel('json')}
            >
              Raw OpenAPI JSON
            </button>
          </div>

          <a
            href="https://editor.swagger.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded text-xs font-label-md transition-all flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Swagger Editor
          </a>

          <button
            className="btn-primary"
            onClick={onCopy}
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            Copy Schema
          </button>
        </div>
      </div>

      {/* Main Panel View */}
      {swaggerPanel === 'preview' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Registered Endpoints</h2>
            <span className="font-code-sm text-code-sm text-on-surface-variant px-2.5 py-0.5 bg-surface-container rounded border border-outline-variant">
              {endpointPreview.length} {endpointPreview.length === 1 ? 'Endpoint' : 'Endpoints'}
            </span>
          </div>

          {endpointPreview.length === 0 ? (
            <div className="p-16 flex items-center justify-center gap-3 text-xs text-on-surface-variant border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low/30">
              <span className="material-symbols-outlined text-[24px] text-outline shrink-0">hub</span>
              <span className="leading-relaxed">
                No endpoints registered yet. Expose your port and hit some paths to build the schema.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {endpointPreview.map((endpoint, idx) => {
                const isGet = endpoint.method === 'GET';
                const isPost = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
                const colorClass = isGet
                  ? 'text-primary border-primary/20 bg-primary/5'
                  : isPost
                    ? 'text-secondary border-secondary/20 bg-secondary/5'
                    : 'text-error border-error/20 bg-error/5';

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${colorClass}`}>
                          {endpoint.method}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono opacity-80">
                          {endpoint.responseLabel}
                        </span>
                      </div>
                      <code className="text-xs font-mono text-on-surface block truncate bg-surface-container-lowest border border-outline-variant/30 px-2 py-1.5 rounded">
                        {endpoint.path}
                      </code>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        {endpoint.summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Raw JSON code block view */
        <div className="rounded-xl border border-outline-variant overflow-hidden shadow-xl">
          <div className="bg-surface-container-high px-4 py-2.5 flex items-center justify-between border-b border-outline-variant text-[11px] font-mono select-none">
            <span className="text-on-surface">openapi.json</span>
            <span className="text-on-surface-variant opacity-60">OpenAPI 3.0.0</span>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-5 bg-black">
            <pre className="font-mono text-[11px] text-secondary leading-relaxed whitespace-pre-wrap select-all">
              {JSON.stringify(document, null, 2)}
            </pre>
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
        responses?: Record<string, unknown>;
      };
      return {
        method: method.toUpperCase(),
        path,
        summary: descriptor.summary ?? 'Generated endpoints specifications from traffic logs.',
        responseLabel: descriptor.responses
          ? `${Object.keys(descriptor.responses).join(', ')} responses`
          : 'No response metadata',
      };
    }),
  );
}
