import type { RequestLog, Tunnel } from '../lib/types';

interface TrafficViewProps {
  requests: RequestLog[];
  activeTunnel: Tunnel | null;
  onOpen: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
}

export function TrafficView({
  requests,
  activeTunnel,
  onOpen,
  onSendToPostman,
}: TrafficViewProps) {
  return (
    <div className="traffic-view">
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
              <span>{request.status ?? 'pending'}</span>
              <span>{request.durationMs ? `${request.durationMs}ms` : '-'}</span>
              <span
                className="inline-action"
                onClick={(event) => {
                  event.stopPropagation();
                  onSendToPostman(request);
                }}
              >
                Send to Postman
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
