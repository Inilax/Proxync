import { useState, useMemo } from 'react';
import type { RequestLog, Tunnel } from './SharedComponents';
import type { WorkspaceConfig, ProcessCandidate } from '../../lib/types';

export function TrafficView({
  requests,
  workspaces = [],
  processes = [],
  activeTunnel,
  onOpen,
  onSendToPostman,
  onClear,
  onOpenWorkbench,
}: {
  requests: RequestLog[];
  workspaces?: WorkspaceConfig[];
  processes?: ProcessCandidate[];
  activeTunnel: Tunnel | null;
  onOpen: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
  onClear: () => void;
  onOpenWorkbench?: (request: RequestLog) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>('ALL');
  const [selectedServerFilter, setSelectedServerFilter] = useState<string>('ALL');
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

  // Build Workspace Options dynamically
  const workspaceOptions = useMemo(() => {
    const map = new Map<string, string>();
    workspaces.forEach((w) => map.set(w.id, w.name));
    requests.forEach((r) => {
      if (r.workspaceId && r.workspaceName) {
        map.set(r.workspaceId, r.workspaceName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [workspaces, requests]);

  // Build Local Server / Port Options dynamically
  const serverOptions = useMemo(() => {
    const map = new Map<number, string>();
    processes.forEach((p) => map.set(p.port, p.name ? `${p.name} (:${p.port})` : `Port :${p.port}`));
    requests.forEach((r) => {
      if (r.port && !map.has(r.port)) {
        map.set(r.port, r.serverName ? `${r.serverName} (:${r.port})` : `Port :${r.port}`);
      }
    });
    return Array.from(map.entries()).map(([port, name]) => ({ port, name }));
  }, [processes, requests]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMethod !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedWorkspaceFilter !== 'ALL' ||
    selectedServerFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMethod('ALL');
    setSelectedStatus('ALL');
    setSelectedWorkspaceFilter('ALL');
    setSelectedServerFilter('ALL');
  };

  const filteredRequests = useMemo(() => {
    // // ponytail: Pre-compute query normalization & port parsing once outside loop
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const targetPort = selectedServerFilter !== 'ALL' ? parseInt(selectedServerFilter, 10) : null;

    return requests.filter((req) => {
      // 1. Fast primitive O(1) checks first
      if (selectedWorkspaceFilter !== 'ALL' && req.workspaceId && req.workspaceId !== selectedWorkspaceFilter) {
        return false;
      }

      if (targetPort !== null && req.port && req.port !== targetPort) {
        return false;
      }

      const method = (req.method || 'GET').toUpperCase();
      if (selectedMethod !== 'ALL' && method !== selectedMethod) {
        return false;
      }

      if (selectedStatus !== 'ALL') {
        const statusNum = typeof req.status === 'number' ? req.status : parseInt(String(req.status || 200), 10);
        if (selectedStatus === '2xx' && (statusNum < 200 || statusNum >= 300)) return false;
        if (selectedStatus === '3xx' && (statusNum < 300 || statusNum >= 400)) return false;
        if (selectedStatus === '4xx' && (statusNum < 400 || statusNum >= 500)) return false;
        if (selectedStatus === '5xx' && statusNum < 500) return false;
      }

      // 2. Search query check only executed if non-empty
      if (normalizedQuery) {
        const path = (req.path || '/').toLowerCase();
        if (path.includes(normalizedQuery)) return true;
        if (method.toLowerCase().includes(normalizedQuery)) return true;
        if (String(req.status).includes(normalizedQuery)) return true;
        if (req.workspaceName && req.workspaceName.toLowerCase().includes(normalizedQuery)) return true;
        if (req.serverName && req.serverName.toLowerCase().includes(normalizedQuery)) return true;
        return false;
      }

      return true;
    });
  }, [requests, searchQuery, selectedMethod, selectedStatus, selectedWorkspaceFilter, selectedServerFilter]);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 fade-in select-none">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/30 pb-5 sm:pb-6 gap-4">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Traffic Inspector</h1>
          <p className="text-on-surface-variant font-body-md mt-1 text-xs">
            {activeTunnel
              ? `Capturing live network packages on port :${activeTunnel.localPort}`
              : 'Real-time HTTP request & response payload inspector across workspaces.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-code-sm text-code-sm text-on-surface-variant px-3 py-1 bg-surface-container rounded border border-outline-variant/50">
            {filteredRequests.length} / {requests.length} Logs
          </span>
          <button
            onClick={onClear}
            disabled={requests.length === 0}
            className="btn-ghost compact text-xs text-on-surface-variant hover:text-error flex items-center gap-1 cursor-pointer border border-outline-variant/40 px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant transition-all"
            title="Clear traffic logs"
          >
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Clear Logs
          </button>
        </div>
      </div>

      {/* Custom Theme-Matching Single-Row Toolbar & Dropdown Filters */}
      <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/40 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-sm">
        {/* Search Input */}
        <div className="flex-1 min-w-0 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            type="text"
            className="w-full bg-surface-container-low border border-outline-variant/40 hover:border-primary/40 rounded-lg pl-9 pr-8 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all"
            placeholder="Filter by path, method, status, workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* 4 Custom Theme-Matching Dropdown Controls */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
          {/* 1. Workspace Dropdown */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 rounded-lg px-2.5 py-1 text-xs text-on-surface transition-all">
            <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider shrink-0">WS:</span>
            <select
              className="bg-surface-container-low text-xs font-mono font-semibold text-on-surface focus:outline-none cursor-pointer w-full sm:max-w-[120px] truncate"
              value={selectedWorkspaceFilter}
              onChange={(e) => setSelectedWorkspaceFilter(e.target.value)}
            >
              <option value="ALL" className="bg-surface-container-high text-on-surface">All</option>
              {workspaceOptions.map((w) => (
                <option key={w.id} value={w.id} className="bg-surface-container-high text-on-surface">
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Server Dropdown */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 rounded-lg px-2.5 py-1 text-xs text-on-surface transition-all">
            <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider shrink-0">Port:</span>
            <select
              className="bg-surface-container-low text-xs font-mono font-semibold text-on-surface focus:outline-none cursor-pointer w-full sm:max-w-[120px] truncate"
              value={selectedServerFilter}
              onChange={(e) => setSelectedServerFilter(e.target.value)}
            >
              <option value="ALL" className="bg-surface-container-high text-on-surface">All</option>
              {serverOptions.map((s) => (
                <option key={s.port} value={String(s.port)} className="bg-surface-container-high text-on-surface">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Method Dropdown */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 rounded-lg px-2.5 py-1 text-xs text-on-surface transition-all">
            <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider shrink-0">Verb:</span>
            <select
              className="bg-surface-container-low text-xs font-mono font-semibold text-on-surface focus:outline-none cursor-pointer w-full sm:w-auto"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="ALL" className="bg-surface-container-high text-on-surface">All</option>
              <option value="GET" className="bg-surface-container-high text-on-surface">GET</option>
              <option value="POST" className="bg-surface-container-high text-on-surface">POST</option>
              <option value="PUT" className="bg-surface-container-high text-on-surface">PUT</option>
              <option value="PATCH" className="bg-surface-container-high text-on-surface">PATCH</option>
              <option value="DELETE" className="bg-surface-container-high text-on-surface">DELETE</option>
            </select>
          </div>

          {/* 4. Status Dropdown */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 rounded-lg px-2.5 py-1 text-xs text-on-surface transition-all">
            <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider shrink-0">Status:</span>
            <select
              className="bg-surface-container-low text-xs font-mono font-semibold text-on-surface focus:outline-none cursor-pointer w-full sm:w-auto"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL" className="bg-surface-container-high text-on-surface">All</option>
              <option value="2xx" className="bg-surface-container-high text-on-surface">2xx</option>
              <option value="3xx" className="bg-surface-container-high text-on-surface">3xx</option>
              <option value="4xx" className="bg-surface-container-high text-on-surface">4xx</option>
              <option value="5xx" className="bg-surface-container-high text-on-surface">5xx</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-surface-container-high rounded-lg transition-all cursor-pointer flex items-center justify-center col-span-2 sm:col-span-1"
              title="Reset all traffic filters"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            </button>
          )}
        </div>
      </div>

      {/* Traffic Table Area */}
      <div className="border border-outline-variant/30 rounded-xl bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="responsive-table-container">
          <div className="min-w-[760px]">
            {/* Table Head */}
            <div className="flex items-center border-b border-outline-variant bg-surface-container-low font-label-md text-on-surface-variant py-2.5 px-4 text-xs font-bold uppercase tracking-wider">
              <div className="w-20 shrink-0">Method</div>
              <div className="w-24 shrink-0">Status</div>
              <div className="w-44 shrink-0">Scope / Server</div>
              <div className="flex-1 min-w-0 pr-4">Request Path</div>
              <div className="w-28 shrink-0 text-right pr-6">Duration</div>
              <div className="w-72 shrink-0 text-right">Actions</div>
            </div>

        {filteredRequests.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-xs text-on-surface-variant text-center">
            <span className="material-symbols-outlined text-[32px] text-outline">filter_alt_off</span>
            <p className="font-semibold text-on-surface">No Traffic Packages Found</p>
            <p className="text-outline max-w-md">
              {requests.length === 0
                ? 'No network requests captured yet. Launch your local dev server and trigger HTTP traffic.'
                : 'No traffic logs match your active search or filter criteria.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="btn-secondary compact text-xs mt-2"
              >
                Clear Active Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20 max-h-[60vh] overflow-y-auto">
            {filteredRequests.map((request) => {
              const reqMethod = (request.method || 'GET').toUpperCase();
              const isGet = reqMethod === 'GET';
              const isPost = ['POST', 'PUT', 'PATCH'].includes(reqMethod);
              const methodColor = isGet ? 'text-primary' : isPost ? 'text-secondary' : 'text-error';

              const isExpanded = expandedRequestId === request.id;

              return (
                <div key={request.id}>
                  <div
                    onClick={() => onOpen(request)}
                    className={`flex items-center py-2.5 px-4 hover:bg-surface-container-highest cursor-pointer transition-colors group ${isExpanded ? 'bg-surface-container-high/60' : ''
                      }`}
                  >
                    {/* Method Column */}
                    <div className={`w-20 shrink-0 font-bold font-mono text-xs truncate ${methodColor} flex items-center gap-1.5`}>
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

                    {/* Status Column */}
                    <div className={`w-24 shrink-0 flex items-center gap-1 font-mono text-xs ${getStatusClass(request.status)}`}>
                      <span className="material-symbols-outlined text-[14px] shrink-0">
                        {getStatusIcon(request.status)}
                      </span>
                      {request.status ?? 'pending'}
                    </div>

                    {/* Scope / Server Column */}
                    <div className="w-44 shrink-0 flex items-center gap-1.5 truncate pr-2 font-mono text-[11px]">
                      {request.workspaceName ? (
                        <span className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant/40 rounded text-on-surface-variant font-sans truncate max-w-[100px]" title={request.workspaceName}>
                          {request.workspaceName}
                        </span>
                      ) : (
                        <span className="text-outline text-[10px] italic">Global</span>
                      )}
                      {request.port && (
                        <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary font-mono text-[10px] shrink-0">
                          :{request.port}
                        </span>
                      )}
                    </div>

                    {/* Request Path Column */}
                    <div className="flex-1 min-w-0 pr-4 font-mono text-xs text-on-surface truncate" title={request.path}>
                      {request.path || '/'}
                    </div>

                    {/* Duration Column (Fixed width & right-aligned with clear right padding) */}
                    <div className="w-28 shrink-0 text-right pr-6 font-mono text-xs">
                      {request.durationMs ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-400 font-semibold">
                          <span className="text-[12px]">⚡</span>
                          {request.durationMs}ms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-outline italic text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          in flight
                        </span>
                      )}
                    </div>

                    {/* Actions Column (Dedicated width with compact isolated buttons) */}
                    <div className="w-72 shrink-0 flex items-center justify-end gap-2 pl-2" onClick={(e) => e.stopPropagation()}>
                      {onOpenWorkbench && (
                        <button
                          onClick={() => onOpenWorkbench(request)}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          title="Open 360° Request Workbench Studio"
                        >
                          <span className="material-symbols-outlined text-[13px]">bolt</span>
                          Workbench
                        </button>
                      )}
                      <button
                        onClick={() => onSendToPostman(request)}
                        className="px-2.5 py-1 bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high rounded text-xs font-medium text-on-surface transition-colors cursor-pointer shrink-0"
                        title="Send request template to Playground"
                      >
                        Playground →
                      </button>
                      <button
                        onClick={() => (onOpenWorkbench ? onOpenWorkbench(request) : onOpen(request))}
                        className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer shrink-0"
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

                      {request.bodyPreview && (
                        <div>
                          <strong className="text-[11px] uppercase tracking-wider text-outline block mb-1">Request Payload</strong>
                          <pre className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 overflow-x-auto text-[11px] text-on-surface">
                            {request.bodyPreview}
                          </pre>
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
      </div>
    </div>
  );
}
