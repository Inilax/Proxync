import { useState, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

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

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const method = (req.method || 'GET').toUpperCase();
      const path = (req.path || '/').toLowerCase();
      const statusNum = typeof req.status === 'number' ? req.status : parseInt(String(req.status || 200), 10);

      // Method filter
      if (selectedMethod !== 'ALL' && method !== selectedMethod) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === '2xx' && (statusNum < 200 || statusNum >= 300)) return false;
        if (selectedStatus === '3xx' && (statusNum < 300 || statusNum >= 400)) return false;
        if (selectedStatus === '4xx' && (statusNum < 400 || statusNum >= 500)) return false;
        if (selectedStatus === '5xx' && statusNum < 500) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return path.includes(query) || method.toLowerCase().includes(query) || String(req.status).includes(query);
      }

      return true;
    });
  }, [requests, searchQuery, selectedMethod, selectedStatus]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 fade-in select-none">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline-variant/30 pb-6 gap-4">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Traffic Logs & Inspector</h1>
          <p className="text-on-surface-variant font-body-md mt-1">
            {activeTunnel
              ? `Capturing live network packages on port :${activeTunnel.localPort}`
              : 'Activate a public tunnel to capture and debug HTTP traffic.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-code-sm text-code-sm text-on-surface-variant px-3 py-1 bg-surface-container rounded border border-outline-variant/50">
            {filteredRequests.length} / {requests.length} Logs
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

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant/30">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            type="text"
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-9 pr-8 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
            placeholder="Filter requests by path or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            className="form-select !h-8 !py-0 text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 text-on-surface focus:outline-none"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
          >
            <option value="ALL">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            className="form-select !h-8 !py-0 text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 text-on-surface focus:outline-none"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="2xx">2xx Success</option>
            <option value="3xx">3xx Redirect</option>
            <option value="4xx">4xx Client Error</option>
            <option value="5xx">5xx Server Error</option>
          </select>
        </div>
      </div>

      {/* Traffic Table Area */}
      <div className="border border-outline-variant/30 rounded-xl bg-surface-container-lowest overflow-hidden">
        {/* Table Head */}
        <div className="flex items-center border-b border-outline-variant bg-surface-container-low font-label-md text-on-surface-variant py-2.5 px-4 text-xs font-bold uppercase tracking-wider">
          <div className="w-24 shrink-0">Method</div>
          <div className="w-24 shrink-0">Status</div>
          <div className="flex-1 min-w-0">Request Path</div>
          <div className="w-24 shrink-0 text-right">Duration</div>
          <div className="w-48 shrink-0 text-right">Actions</div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-16 flex items-center justify-center gap-3 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px] text-outline shrink-0">filter_alt_off</span>
            <span className="leading-relaxed">
              {requests.length === 0
                ? 'No network packages captured yet. Launch your local dev server and trigger requests to start logging.'
                : 'No network packages match the active filter criteria.'}
            </span>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20 max-h-[60vh] overflow-y-auto">
            {filteredRequests.map((request) => {
              const reqMethod = (request.method || 'GET').toUpperCase();
              const isGet = reqMethod === 'GET';
              const isPost = ['POST', 'PUT', 'PATCH'].includes(reqMethod);
              const methodColor = isGet ? 'text-primary' : isPost ? 'text-secondary' : 'text-error';
              
              // Track expansion strictly by immutable UUID request.id
              const isExpanded = expandedRequestId === request.id;

              return (
                <div key={request.id}>
                  <div
                    onClick={() => onOpen(request)}
                    className={`flex items-center py-3 px-4 hover:bg-surface-container-highest cursor-pointer transition-colors group ${
                      isExpanded ? 'bg-surface-container-high/60' : ''
                    }`}
                  >
                    <div className={`w-24 shrink-0 font-bold font-mono text-xs truncate ${methodColor} flex items-center gap-1.5`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRequestId(isExpanded ? null : request.id);
                        }}
                        className="p-0.5 rounded hover:bg-surface-container-highest transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse inline preview' : 'Expand inline preview'}
                      >
                        <span className="material-symbols-outlined text-[14px] text-outline opacity-70 hover:opacity-100 transition-opacity block">
                          {isExpanded ? 'expand_more' : 'chevron_right'}
                        </span>
                      </button>
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

                    <div className="w-24 shrink-0 text-right font-mono text-xs text-on-surface-variant opacity-80">
                      {request.durationMs ? `${request.durationMs}ms` : 'pending'}
                    </div>

                    <div className="w-48 shrink-0 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSendToPostman(request)}
                        className="btn-ghost compact text-[11px]"
                        title="Send request template to Playground"
                      >
                        Playground →
                      </button>
                      <button
                        onClick={() => onOpen(request)}
                        className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
                        title="Open in Detail Dialog"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Expanded Payload & Header Inspector */}
                  {isExpanded && (
                    <div className="p-4 bg-surface-container-lowest border-t border-b border-outline-variant/30 space-y-3 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                      {request.headers && Object.keys(request.headers).length > 0 && (
                        <div>
                          <strong className="text-[11px] uppercase tracking-wider text-outline block mb-1">Request Headers</strong>
                          <pre className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 overflow-x-auto text-[11px] text-on-surface-variant">
                            {JSON.stringify(request.headers, null, 2)}
                          </pre>
                        </div>
                      )}

                      {request.bodyPreview ? (
                        <div>
                          <strong className="text-[11px] uppercase tracking-wider text-outline block mb-1">Request Payload</strong>
                          <pre className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 overflow-x-auto text-[11px] text-on-surface">
                            {request.bodyPreview}
                          </pre>
                        </div>
                      ) : (
                        <div>
                          <strong className="text-[11px] uppercase tracking-wider text-outline block mb-1">Request Payload</strong>
                          <p className="text-[11px] text-outline italic p-2 bg-surface-container-low/50 rounded-lg border border-outline-variant/10">
                            [empty body]
                          </p>
                        </div>
                      )}

                      {request.responseHeaders && Object.keys(request.responseHeaders).length > 0 && (
                        <div>
                          <strong className="text-[11px] uppercase tracking-wider text-outline block mb-1">Response Headers</strong>
                          <pre className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 overflow-x-auto text-[11px] text-on-surface-variant">
                            {JSON.stringify(request.responseHeaders, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
