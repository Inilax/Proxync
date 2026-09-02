import { useState, useMemo } from 'react';
import type { RequestLog, Tunnel } from './SharedComponents';
import type { WorkspaceConfig, ProcessCandidate, SchemaDriftReport } from '../../lib/types';

export function TrafficView({
  requests,
  workspaces = [],
  processes = [],
  activeTunnel,
  driftAlerts,
  onOpen,
  onSendToPostman,
  onClear,
  onOpenWorkbench,
  onSyncDrift,
  onCopyBugReport,
}: {
  requests: RequestLog[];
  workspaces?: WorkspaceConfig[];
  processes?: ProcessCandidate[];
  activeTunnel: Tunnel | null;
  driftAlerts?: Map<string, SchemaDriftReport>;
  onOpen: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
  onClear: () => void;
  onOpenWorkbench?: (request: RequestLog) => void;
  onSyncDrift?: (method: string, path: string, statusCode: string, body: string) => void;
  onCopyBugReport?: (report: SchemaDriftReport) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [driftFilter, setDriftFilter] = useState<'ALL' | 'BREAKING' | 'ANY' | 'COMPLIANT'>('ALL');
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
    driftFilter !== 'ALL' ||
    selectedWorkspaceFilter !== 'ALL' ||
    selectedServerFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMethod('ALL');
    setSelectedStatus('ALL');
    setDriftFilter('ALL');
    setSelectedWorkspaceFilter('ALL');
    setSelectedServerFilter('ALL');
  };

  const filteredRequests = useMemo(() => {
    // ponytail: Pre-compute query normalization & port parsing once outside loop
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

      // Schema drift filter
      if (driftFilter !== 'ALL') {
        const drift =
          driftAlerts?.get(req.id) ??
          (req.rawRequestId ? driftAlerts?.get(req.rawRequestId) : undefined) ??
          req.schemaDrift;
        if (driftFilter === 'BREAKING' && (!drift || drift.breakingCount === 0)) return false;
        if (driftFilter === 'ANY' && (!drift || !drift.hasDrift)) return false;
        if (driftFilter === 'COMPLIANT' && drift?.hasDrift) return false;
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
  }, [requests, searchQuery, selectedMethod, selectedStatus, driftFilter, selectedWorkspaceFilter, selectedServerFilter, driftAlerts]);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 fade-in select-none">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/30 pb-5 sm:pb-6 gap-4">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Traffic Inspector</h1>
          <p className="text-on-surface-variant font-body-md mt-1 text-xs">
            {activeTunnel
              ? `Capturing live network packages on port :${activeTunnel.localPort}`
              : 'Real-time HTTP request & response payload inspector with contract drift detection.'}
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

        {/* 5 Custom Theme-Matching Dropdown Controls */}
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

          {/* 5. Drift Dropdown */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 rounded-lg px-2.5 py-1 text-xs text-on-surface transition-all">
            <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider shrink-0">Drift:</span>
            <select
              className="bg-surface-container-low text-xs font-mono font-semibold text-on-surface focus:outline-none cursor-pointer w-full sm:w-auto"
              value={driftFilter}
              onChange={(e) => setDriftFilter(e.target.value as typeof driftFilter)}
            >
              <option value="ALL" className="bg-surface-container-high text-on-surface">All</option>
              <option value="BREAKING" className="bg-surface-container-high text-error font-bold">🚨 Breaking</option>
              <option value="ANY" className="bg-surface-container-high text-amber-400 font-bold">⚠️ Any Drift</option>
              <option value="COMPLIANT" className="bg-surface-container-high text-secondary font-bold">✓ Compliant</option>
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
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1080px]">
            {/* Table Head */}
            <div className="flex items-center border-b border-outline-variant bg-surface-container-low font-label-md text-on-surface-variant py-3 px-4 text-xs font-bold uppercase tracking-wider">
              <div className="w-24 shrink-0">Method</div>
              <div className="w-28 shrink-0">Status</div>
              <div className="flex-1 min-w-[180px] pr-4">Request Path</div>
              <div className="w-44 shrink-0 pr-2">Scope / Server</div>
              <div className="w-28 shrink-0 text-left pr-2">Time</div>
              <div className="w-32 shrink-0 text-left pr-4">Duration</div>
              <div className="w-72 shrink-0 text-right pr-2">Actions</div>
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
              const drift =
                driftAlerts?.get(request.id) ??
                (request.rawRequestId ? driftAlerts?.get(request.rawRequestId) : undefined) ??
                request.schemaDrift;

              return (
                <div key={request.id}>
                  <div
                    onClick={() => onOpen(request)}
                    className={`flex items-center py-3 px-4 hover:bg-surface-container-highest cursor-pointer transition-colors group ${
                      isExpanded ? 'bg-surface-container-high/60' : ''
                    }`}
                  >
                    {/* Method Column */}
                    <div className={`w-24 shrink-0 font-bold font-mono text-[13px] ${methodColor} flex items-center gap-1.5`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRequestId(isExpanded ? null : request.id);
                        }}
                        className="p-0.5 rounded hover:bg-surface-container-highest transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse inline preview' : 'Expand inline preview'}
                      >
                        <span className="material-symbols-outlined text-[15px] text-outline opacity-70 hover:opacity-100 transition-opacity block">
                          {isExpanded ? 'expand_more' : 'chevron_right'}
                        </span>
                      </button>
                      {reqMethod}
                    </div>

                    {/* Status Column + Contract Drift Badge */}
                    <div className={`w-28 shrink-0 flex items-center gap-1 font-mono text-[13px] ${getStatusClass(request.status)}`}>
                      <span className="material-symbols-outlined text-[15px] shrink-0">
                        {getStatusIcon(request.status)}
                      </span>
                      <span className="font-semibold">{request.status ?? 'pending'}</span>
                      {drift?.hasDrift && (
                        drift.breakingCount > 0 ? (
                          <span
                            className="px-1.5 py-0.5 bg-error/15 border border-error/30 rounded text-error font-mono text-[10px] font-bold shrink-0 flex items-center gap-0.5 ml-1"
                            title={`${drift.breakingCount} breaking contract violations`}
                          >
                            <span className="material-symbols-outlined text-[11px]">warning</span>
                            {drift.breakingCount}
                          </span>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded text-amber-400 font-mono text-[10px] font-bold shrink-0 flex items-center gap-0.5 ml-1"
                            title={`${drift.warningCount} additive schema changes`}
                          >
                            <span className="material-symbols-outlined text-[11px]">add_circle</span>
                            +{drift.warningCount}
                          </span>
                        )
                      )}
                    </div>

                    {/* Request Path Column */}
                    <div className="flex-1 min-w-[180px] pr-4 font-mono text-[13px] text-on-surface font-medium truncate" title={request.path}>
                      {request.path || '/'}
                    </div>

                    {/* Scope / Server Column */}
                    <div className="w-44 shrink-0 flex items-center gap-1.5 truncate pr-2 font-mono text-xs">
                      {(() => {
                        const wsName = request.workspaceName || workspaces.find((w) => w.id === request.workspaceId)?.name;
                        return wsName ? (
                          <span className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant/40 rounded text-on-surface-variant font-sans truncate max-w-[100px]" title={wsName}>
                            {wsName}
                          </span>
                        ) : (
                          <span className="text-outline text-[11px] italic">Global</span>
                        );
                      })()}
                      {request.port && (
                        <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary font-mono text-[11px] font-semibold shrink-0">
                          :{request.port}
                        </span>
                      )}
                    </div>

                    {/* Time Column */}
                    <div className="w-28 shrink-0 pr-2 font-mono text-xs text-on-surface-variant/75">
                      {request.capturedAt
                        ? new Date(request.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'recent'}
                    </div>

                    {/* Duration Column — Left aligned inside w-32 */}
                    <div className="w-32 shrink-0 text-left pr-4 font-mono text-[13px]">
                      {request.durationMs ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                          <span className="text-[13px]">⚡</span>
                          {request.durationMs}ms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-outline italic text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          in flight
                        </span>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="w-72 shrink-0 flex items-center justify-end gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
                      {onOpenWorkbench && (
                        <button
                          onClick={() => onOpenWorkbench(request)}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-sm"
                          title="Open 360° Request Workbench Studio"
                        >
                          <span className="material-symbols-outlined text-[14px]">bolt</span>
                          Workbench
                        </button>
                      )}
                      <button
                        onClick={() => onSendToPostman(request)}
                        className="px-2.5 py-1 bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high rounded-md text-xs font-medium text-on-surface transition-colors cursor-pointer shrink-0 shadow-sm"
                        title="Send request template to Playground"
                      >
                        Playground →
                      </button>
                      <button
                        onClick={() => (onOpenWorkbench ? onOpenWorkbench(request) : onOpen(request))}
                        className="p-1 rounded-md hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer shrink-0"
                        title="Open in Detail Dialog"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Expanded Payload, Header & Schema Drift Inspector */}
                  {isExpanded && (
                    <div className="p-4 bg-surface-container-lowest border-t border-b border-outline-variant/30 space-y-3 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                      {/* Contract & Schema Drift Diff Panel */}
                      {drift?.hasDrift && (
                        <DriftDiffPanel
                          drift={drift}
                          responseBodyPreview={request.responseBodyPreview}
                          onSyncDrift={onSyncDrift}
                          onCopyBugReport={onCopyBugReport}
                        />
                      )}

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

                      {request.responseBodyPreview && (
                        <div>
                          <strong className="text-[11px] uppercase tracking-wider text-outline block mb-1">Response Body Preview (Intercepted)</strong>
                          <pre className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 overflow-x-auto text-[11px] text-on-surface">
                            {request.responseBodyPreview}
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

// ponytail: co-located visual diff panel until reused in standalone views
export function DriftDiffPanel({
  drift,
  responseBodyPreview,
  onSyncDrift,
  onCopyBugReport,
}: {
  drift: SchemaDriftReport;
  responseBodyPreview?: string;
  onSyncDrift?: (method: string, path: string, statusCode: string, body: string) => void;
  onCopyBugReport?: (report: SchemaDriftReport) => void;
}) {
  const hasBreaking = drift.breakingCount > 0;
  return (
    <div
      className={`rounded-xl border p-4 space-y-3 font-sans transition-all shadow-sm ${
        hasBreaking
          ? 'bg-error/10 border-error/40 text-on-surface'
          : 'bg-amber-500/10 border-amber-500/40 text-on-surface'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-outlined text-[20px] ${
              hasBreaking ? 'text-error animate-pulse' : 'text-amber-400'
            }`}
          >
            {hasBreaking ? 'error' : 'change_circle'}
          </span>
          <div>
            <strong className={`text-xs uppercase tracking-wider block font-bold ${hasBreaking ? 'text-error' : 'text-amber-400'}`}>
              {hasBreaking
                ? `Contract Drift: ${drift.breakingCount} Breaking Violation${drift.breakingCount !== 1 ? 's' : ''}`
                : `Schema Change: ${drift.warningCount} Additive Field${drift.warningCount !== 1 ? 's' : ''}`}
            </strong>
            <span className="text-[11px] text-on-surface-variant font-mono">
              Expected contract: <code className="text-on-surface font-semibold">{drift.method} {drift.path}</code> (HTTP {drift.statusCode})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onCopyBugReport && (
            <button
              onClick={() => onCopyBugReport(drift)}
              className="px-2.5 py-1 text-xs font-semibold bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer text-on-surface flex items-center gap-1"
              title="Copy markdown bug report for Slack / Jira"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              Copy Bug Report
            </button>
          )}
          {onSyncDrift && responseBodyPreview && (
            <button
              onClick={() => onSyncDrift(drift.method, drift.path, String(drift.statusCode), responseBodyPreview)}
              className="px-2.5 py-1 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              title="Reconcile OpenAPI specification with this runtime payload"
            >
              <span className="material-symbols-outlined text-[14px]">sync</span>
              Sync with OpenAPI
            </button>
          )}
        </div>
      </div>

      {/* Structured Diff Table */}
      <div className="overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest/80">
        <table className="w-full text-xs font-mono text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/30 bg-surface-container-low text-[10px] text-on-surface-variant uppercase tracking-wider">
              <th className="py-2 px-3">Field Path</th>
              <th className="py-2 px-3">Violation Type</th>
              <th className="py-2 px-3">Expected Contract</th>
              <th className="py-2 px-3">Actual Runtime</th>
              <th className="py-2 px-3 font-sans">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {drift.items.map((item, idx) => {
              const isBreaking = item.severity === 'breaking';
              return (
                <tr key={idx} className={isBreaking ? 'bg-error/5' : 'bg-amber-500/5'}>
                  <td className="py-2 px-3 font-bold text-on-surface whitespace-nowrap">
                    {item.path}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isBreaking ? 'bg-error/20 text-error' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {item.changeType.replace(/^(BREAKING_|NON_BREAKING_)/, '')}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-on-surface-variant font-semibold">
                    {item.expected}
                  </td>
                  <td className={`py-2 px-3 font-bold ${isBreaking ? 'text-error' : 'text-amber-400'}`}>
                    {item.actual}
                  </td>
                  <td className="py-2 px-3 font-sans text-xs text-on-surface-variant max-w-[280px]">
                    {item.suggestion}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
