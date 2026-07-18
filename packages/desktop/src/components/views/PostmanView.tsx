/**
 * PostmanView.tsx — Redesigned request builder
 * Cleaner layout with collection rail and response pane.
 */
import type { SavedRequest, PostmanResponse, Tunnel } from './SharedComponents';
import { formatHeaders } from './SharedComponents';

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
}: {
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
}) {
  return (
    <div className="postman-view fade-in">
      <div className="collection-rail">
        <h2>Collection</h2>
        {savedRequests.map((request) => (
          <button key={request.id} onClick={() => onLoad(request)} className="collection-item">
            <span className={`method ${request.method.toLowerCase()}`}>{request.method}</span>
            <span>
              {request.name}
              <small>{request.source}</small>
            </span>
          </button>
        ))}
        {savedRequests.length === 0 && (
          <div className="collection-empty">No saved requests yet.</div>
        )}
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
            <button className="btn-primary compact" onClick={onImportStarterRequests}>Import scan</button>
          </div>
        )}

        <div className="request-name-row">
          <input
            className="form-input"
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            aria-label="Request name"
            placeholder="Request name"
          />
          <button className="btn-ghost compact" onClick={onSave}>Save</button>
        </div>
        <div className="url-builder">
          <select
            className="form-select"
            value={draft.method}
            onChange={(event) => onDraftChange({ ...draft, method: event.target.value })}
            aria-label="HTTP method"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
          <input
            className="form-input"
            value={draft.path}
            onChange={(event) => onDraftChange({ ...draft, path: event.target.value })}
            placeholder={activeTunnel ? '/api/users' : 'https://example.com/api'}
            aria-label="Request URL or path"
          />
          <button className="btn-primary compact" onClick={onRun} disabled={sending}>
            {sending ? 'Sending...' : '▶ Send'}
          </button>
        </div>
        <div className="builder-grid">
          <label>
            Headers
            <textarea
              className="form-textarea"
              value={formatHeaders(draft.headers)}
              onChange={(event) => onHeaderTextChange(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            Body
            <textarea
              className="form-textarea"
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
              <span className={`status-code ${response.status >= 200 && response.status < 300 ? 'success' : response.status >= 400 ? 'client-error' : ''}`}>
                Status {response.status}
              </span>
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
