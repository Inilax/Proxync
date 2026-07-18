/**
 * TrafficView.tsx — Redesigned traffic monitor
 * Clean table with color-coded methods and status indicators.
 */
import type { RequestLog, Tunnel } from './SharedComponents';

export function TrafficView({
  requests,
  activeTunnel,
  onOpen,
  onSendToPostman,
}: {
  requests: RequestLog[];
  activeTunnel: Tunnel | null;
  onOpen: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
}) {
  return (
    <div className="traffic-view fade-in">
      <div className="page-heading">
        <div>
          <h1>Traffic</h1>
          <p>
            {activeTunnel
              ? `Listening on ${activeTunnel.publicUrl}`
              : 'Start a tunnel to capture live requests.'}
          </p>
        </div>
      </div>
      <div className="traffic-table">
        <div className="traffic-head">
          <span>Method</span>
          <span>Path</span>
          <span>Status</span>
          <span>Time</span>
          <span>Action</span>
        </div>
        {requests.length === 0 ? (
          <div className="traffic-empty">No requests captured yet.</div>
        ) : (
          requests.map((request) => (
            <button className="traffic-row" key={request.id} onClick={() => onOpen(request)}>
              <span className={`method ${request.method.toLowerCase()}`}>{request.method}</span>
              <code>{request.path}</code>
              <span className={`status-code ${getStatusClass(request.status)}`}>
                {request.status ?? 'pending'}
              </span>
              <span className="time-cell">{request.durationMs ? `${request.durationMs}ms` : '-'}</span>
              <span
                className="inline-action"
                onClick={(event) => {
                  event.stopPropagation();
                  onSendToPostman(request);
                }}
              >
                Send to Postman →
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function getStatusClass(status?: number | string): string {
  if (!status || status === 'pending') return 'pending';
  const code = typeof status === 'string' ? parseInt(status, 10) : status;
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'client-error';
  if (code >= 500) return 'server-error';
  return '';
}
