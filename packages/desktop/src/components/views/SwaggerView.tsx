/**
 * SwaggerView.tsx — Redesigned OpenAPI contract viewer
 * Card-based endpoint list with method-colored borders.
 */
import type { WorkspaceConfig, SwaggerPanel } from './SharedComponents';
import { InfoTile, Icons, formatDate } from './SharedComponents';

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
    <div className="swagger-view fade-in">
      <div className="page-heading">
        <div>
          <h1>Swagger</h1>
          <p>
            {languageHint} project detected. This contract updates from saved requests,
            captured traffic, and workspace guardrails.
          </p>
        </div>
        <div className="action-cluster">
          <button
            className={swaggerPanel === 'preview' ? 'subtab active' : 'subtab'}
            onClick={() => onChangePanel('preview')}
          >
            Preview
          </button>
          <button
            className={swaggerPanel === 'json' ? 'subtab active' : 'subtab'}
            onClick={() => onChangePanel('json')}
          >
            JSON
          </button>
          <button className="btn-primary compact" onClick={onCopy}>
            {Icons.copy} Copy JSON
          </button>
        </div>
      </div>

      {swaggerPanel === 'preview' ? (
        <div className="swagger-preview">
          <section className="swagger-summary">
            <InfoTile label="Language hint" value={languageHint} />
            <InfoTile
              label="Auto update"
              value={workspace?.guardrails.autoUpdateSwagger ? 'enabled' : 'manual'}
            />
            <InfoTile
              label="Generated"
              value={
                workspace?.lastSwaggerGeneratedAt
                  ? formatDate(workspace.lastSwaggerGeneratedAt)
                  : 'just now'
              }
            />
          </section>

          <section className="swagger-endpoints">
            {endpointPreview.length === 0 ? (
              <div className="traffic-empty">Capture or save requests to generate endpoints.</div>
            ) : (
              endpointPreview.map((endpoint) => (
                <article key={`${endpoint.method}-${endpoint.path}`} className="endpoint-card">
                  <div className="endpoint-header">
                    <span className={`method ${endpoint.method.toLowerCase()}`}>
                      {endpoint.method}
                    </span>
                    <code>{endpoint.path}</code>
                  </div>
                  <p>{endpoint.summary}</p>
                  <small>{endpoint.responseLabel}</small>
                </article>
              ))
            )}
          </section>
        </div>
      ) : (
        <pre className="openapi-preview">{JSON.stringify(document, null, 2)}</pre>
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
        summary: descriptor.summary ?? 'Generated endpoint',
        responseLabel: descriptor.responses
          ? `${Object.keys(descriptor.responses).join(', ')} responses`
          : 'No response metadata',
      };
    }),
  );
}
