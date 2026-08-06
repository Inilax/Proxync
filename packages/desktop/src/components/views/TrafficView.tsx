import type { RequestLog, Tunnel } from './SharedComponents';

export function TrafficView({
  requests,
  activeTunnel,
  onOpen,
  onSendToPostman,
  onClear,
}: {
  requests: RequestLog[];
  activeTunnel: Tunnel | null;
  onOpen: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
  onClear: () => void;
}) {
  const getStatusClass = (status?: number | string) => {
    if (!status || status === 'pending') return 'text-outline';
    const code = typeof status === 'string' ? parseInt(status, 10) : status;
    if (code >= 200 && code < 300) return 'text-secondary';
    if (code >= 300 && code < 400) return 'text-tertiary';
    return 'text-error';
  };

  const getStatusIcon = (status?: number | string) => {
    if (!status || status === 'pending') return 'pending';
    const code = typeof status === 'string' ? parseInt(status, 10) : status;
    if (code >= 200 && code < 400) return 'check_circle';
    return 'error';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 fade-in select-none">
      {/* Page Heading */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Traffic Logs</h1>
          <p className="text-on-surface-variant font-body-md mt-1">
            {activeTunnel
              ? `Capturing live network packages on port :${activeTunnel.localPort}`
              : 'Activate a public tunnel to capture and debug HTTP traffic.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-code-sm text-code-sm text-on-surface-variant px-3 py-1 bg-surface-container rounded border border-outline-variant/50">
            {requests.length} Requests
          </span>
          <button
            onClick={onClear}
            disabled={requests.length === 0}
            className="btn-ghost compact text-xs text-on-surface-variant hover:text-error flex items-center gap-1 cursor-pointer border border-outline-variant/40 px-2.5 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant transition-all"
            title="Clear traffic logs"
          >
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Clear Logs
          </button>
        </div>
      </div>

      {/* Traffic Table Area */}
      <div key={`traffic-container-${requests.length}`} className="border border-outline-variant/30 rounded-xl bg-surface-container-lowest overflow-hidden">
        {/* Table Head */}
        <div className="flex items-center border-b border-outline-variant bg-surface-container-low font-label-md text-on-surface-variant py-2.5 px-4 text-xs font-bold uppercase tracking-wider">
          <div className="w-24 shrink-0">Method</div>
          <div className="w-24 shrink-0">Status</div>
          <div className="flex-1 min-w-0">Request Path</div>
          <div className="w-28 shrink-0 text-right">Duration</div>
          <div className="w-36 shrink-0 text-right">Actions</div>
        </div>

        {requests.length === 0 ? (
          <div className="p-16 flex items-center justify-center gap-3 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px] text-outline shrink-0">leak_add</span>
            <span className="leading-relaxed">
              No network packages captured yet. Launch your local dev server and trigger requests to start logging.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20 max-h-[60vh] overflow-y-auto">
            {requests.map((request, index) => {
              const reqMethod = (request.method || 'GET').toUpperCase();
              const isGet = reqMethod === 'GET';
              const isPost = ['POST', 'PUT', 'PATCH'].includes(reqMethod);
              const methodColor = isGet ? 'text-primary' : isPost ? 'text-secondary' : 'text-error';

              return (
                <div
                  key={request.id ? `${request.id}-${index}` : `req-${index}-${request.capturedAt || index}`}
                  onClick={() => onOpen(request)}
                  className="flex items-center py-3 px-4 hover:bg-surface-container-highest cursor-pointer transition-colors group"
                >
                  <div className={`w-24 shrink-0 font-bold font-mono text-xs truncate ${methodColor}`}>
                    {reqMethod}
                  </div>

                  <div className={`w-24 shrink-0 flex items-center gap-1 font-mono text-xs ${getStatusClass(request.status)}`}>
                    <span className="material-symbols-outlined text-[14px] shrink-0">
                      {getStatusIcon(request.status)}
                    </span>
                    {request.status ?? 'pending'}
                  </div>

                  <div className="flex-1 min-w-0 truncate font-mono text-xs text-on-surface" title={request.path}>
                    {request.path || '/'}
                  </div>

                  <div className="w-28 shrink-0 text-right font-mono text-xs text-on-surface-variant opacity-80">
                    {request.durationMs ? `${request.durationMs}ms` : 'pending'}
                  </div>

                  <div className="w-36 shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSendToPostman(request)}
                      className="btn-ghost compact"
                    >
                      Send to Playground →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
