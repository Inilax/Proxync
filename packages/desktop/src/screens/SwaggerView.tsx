import type { WorkspaceConfig, SwaggerPanel } from '../lib/types';
import { InfoTile } from './ProcessView';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
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

interface SwaggerViewProps {
  document: Record<string, unknown>;
  swaggerPanel: SwaggerPanel;
  workspace: WorkspaceConfig | null;
  languageHint: string;
  onChangePanel: (panel: SwaggerPanel) => void;
  onCopy: () => void;
}

export function SwaggerView({
  document,
  swaggerPanel,
  workspace,
  languageHint,
  onChangePanel,
  onCopy,
}: SwaggerViewProps) {
  const endpointPreview = buildEndpointPreview(document);

  return (
    <div className="swagger-view">
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
          <button className="primary-command small" onClick={onCopy}>
            Copy JSON
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
