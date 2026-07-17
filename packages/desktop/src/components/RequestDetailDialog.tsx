import type { RequestLog } from '../lib/types';

interface RequestDetailDialogProps {
  request: RequestLog;
  onClose: () => void;
  onReplay: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
}

export function RequestDetailDialog({
  request,
  onClose,
  onReplay,
  onSendToPostman,
}: RequestDetailDialogProps) {
  return (
    <div className="dialog-backdrop">
      <section className="request-dialog">
        <header>
          <div>
            <h2>
              {request.method} {request.path}
            </h2>
            <p>
              Status {request.status ?? 'pending'} | {request.durationMs ?? '-'}ms
            </p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="dialog-actions">
          <button onClick={() => onSendToPostman(request)}>Send to Postman</button>
          <button onClick={() => onReplay(request)}>Replay</button>
        </div>
        <h3>Request headers</h3>
        <pre>{JSON.stringify(request.headers ?? {}, null, 2)}</pre>
        <h3>Body</h3>
        <pre>{request.bodyPreview || '[empty body]'}</pre>
        <h3>Response headers</h3>
        <pre>{JSON.stringify(request.responseHeaders ?? {}, null, 2)}</pre>
      </section>
    </div>
  );
}
