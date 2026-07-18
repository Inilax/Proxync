import type { SavedRequest, PostmanResponse, Tunnel } from '../lib/types';

function formatHeaders(headers: Record<string, string>) {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

interface PostmanViewProps {
  draft: SavedRequest;
  savedRequests: SavedRequest[];
  response: PostmanResponse | null;
  sending: boolean;
  starterSuggestions: SavedRequest[];
  activeTunnel: Tunnel | null;
  onDraftChange: (request: SavedRequest) => void;
  onHeaderTextChange: (value: string) => void;
  onRun: () => void;
  onSave: () => void;
  onLoad: (request: SavedRequest) => void;
  onImportStarterRequests: () => void;
}

export function PostmanView({
  draft,
  savedRequests,
  response,
  sending,
  starterSuggestions,
  activeTunnel,
  onDraftChange,
  onHeaderTextChange,
  onRun,
  onSave,
  onLoad,
  onImportStarterRequests,
}: PostmanViewProps) {
  return (
    <div className="postman-view">
      <div className="collection-rail">
        <h2>Collection</h2>
        {savedRequests.map((request) => (
          <button key={request.id} onClick={() => onLoad(request)}>
            <span className={`method ${request.method.toLowerCase()}`}>{request.method}</span>
            <span>
              {request.name}
              <small>{request.source}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="request-builder">
        {starterSuggestions.length > 0 && (
          <div className="import-banner">
            <div>
              <strong>Starter scan available</strong>
              <p>
                Likely endpoints were inferred from the project shape. Import them and
                test what sticks.
              </p>
            </div>
            <button onClick={onImportStarterRequests}>Import scan</button>
          </div>
        )}

        <div className="request-name-row">
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            aria-label="Request name"
          />
          <button onClick={onSave}>Save</button>
        </div>
        <div className="url-builder">
          <select
            value={draft.method}
            onChange={(event) => onDraftChange({ ...draft, method: event.target.value })}
            aria-label="HTTP method"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
          <input
            value={draft.path}
            onChange={(event) => onDraftChange({ ...draft, path: event.target.value })}
            placeholder={activeTunnel ? '/api/users' : 'https://example.com/api'}
            aria-label="Request URL or path"
          />
          <button className="primary-command small" onClick={onRun} disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div className="builder-grid">
          <label>
            Headers
            <textarea
              value={formatHeaders(draft.headers)}
              onChange={(event) => onHeaderTextChange(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            Body
            <textarea
              value={draft.body}
              onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
              spellCheck={false}
            />
          </label>
        </div>
      </div>

      <div className="response-pane">
        <h2>Response</h2>
        {response ? (
          <>
            <div className="response-meta">
              <span>Status {response.status}</span>
              <span>{response.duration}ms</span>
            </div>
            <pre>{response.body || '[empty response]'}</pre>
          </>
        ) : (
          <div className="traffic-empty">Send a request to see the response.</div>
        )}
      </div>
    </div>
  );
}
