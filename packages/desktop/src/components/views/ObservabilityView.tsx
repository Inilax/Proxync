import { useMemo, useState } from 'react';
import type { WorkspaceConfig, ProcessCandidate, Tunnel, RequestLog } from './SharedComponents';
import type { MainView } from '../../lib/types';

interface ObservabilityViewProps {
  workspace: WorkspaceConfig | null;
  process: ProcessCandidate | null;
  tunnel: Tunnel | null;
  requests: RequestLog[];
  onNavigateView?: (view: MainView) => void;
  onOpenDetail?: (request: RequestLog) => void;
  onSendToPostman?: (request: RequestLog) => void;
  onReplayRequest?: (request: RequestLog) => void;
}

export function ObservabilityView({
  workspace,
  process,
  tunnel,
  requests,
  onNavigateView,
  onOpenDetail,
  onSendToPostman,
  onReplayRequest,
}: ObservabilityViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'webhooks' | 'endpoints'>('overview');

  /* ──────────────────────────────────────────────────────────
   *  O(N) Bounded Telemetry Calculations (Zero CPU/Memory Stress)
   * ────────────────────────────────────────────────────────── */
  const telemetry = useMemo(() => {
    const totalCount = requests.length;
    let sumDuration = 0;
    let validDurationCount = 0;
    let count2xx = 0;
    let count3xx = 0;
    let count4xx = 0;
    let count5xx = 0;
    let totalBytes = 0;

    const durations: number[] = [];
    const endpointMap = new Map<string, { method: string; path: string; count: number; totalMs: number; errors: number }>();
    const errorLogs: RequestLog[] = [];
    const webhookLogs: RequestLog[] = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];

      // Duration metrics
      if (typeof req.durationMs === 'number' && req.durationMs >= 0) {
        durations.push(req.durationMs);
        sumDuration += req.durationMs;
        validDurationCount++;
      }

      // Status code distribution
      const statusNum = typeof req.status === 'number' ? req.status : parseInt(String(req.status || '200'), 10);
      if (statusNum >= 200 && statusNum < 300) count2xx++;
      else if (statusNum >= 300 && statusNum < 400) count3xx++;
      else if (statusNum >= 400 && statusNum < 500) {
        count4xx++;
        errorLogs.push(req);
      } else if (statusNum >= 500) {
        count5xx++;
        errorLogs.push(req);
      }

      // Payload Data Transfer calculation
      if (req.bodyPreview) {
        totalBytes += req.bodyPreview.length;
      }
      if (req.headers) {
        totalBytes += JSON.stringify(req.headers).length;
      }

      // Endpoint leaderboard aggregation
      const epKey = `${req.method.toUpperCase()} ${req.path}`;
      const existing = endpointMap.get(epKey);
      const isErr = statusNum >= 400;
      if (existing) {
        existing.count++;
        existing.totalMs += req.durationMs || 0;
        if (isErr) existing.errors++;
      } else {
        endpointMap.set(epKey, {
          method: req.method.toUpperCase(),
          path: req.path,
          count: 1,
          totalMs: req.durationMs || 0,
          errors: isErr ? 1 : 0,
        });
      }

      // Webhook stream detection
      const ua = (req.headers?.['user-agent'] || req.headers?.['User-Agent'] || '').toLowerCase();
      const pathLower = req.path.toLowerCase();
      const isWebhook =
        ua.includes('stripe') ||
        ua.includes('github') ||
        ua.includes('shopify') ||
        ua.includes('slack') ||
        ua.includes('twilio') ||
        ua.includes('webhook') ||
        pathLower.includes('webhook') ||
        pathLower.includes('callback') ||
        pathLower.includes('hook');

      if (isWebhook) {
        webhookLogs.push(req);
      }
    }

    // Latency Percentiles (P50, P90, P99)
    durations.sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      if (durations.length === 0) return 0;
      const index = Math.floor((p / 100) * durations.length);
      return durations[Math.min(index, durations.length - 1)];
    };

    const avgMs = validDurationCount > 0 ? Math.round(sumDuration / validDurationCount) : 0;
    const p50 = getPercentile(50);
    const p90 = getPercentile(90);
    const p99 = getPercentile(99);

    // Leaderboard sorted by avg duration
    const leaderboards = Array.from(endpointMap.values())
      .map((ep) => ({
        ...ep,
        avgMs: ep.count > 0 ? Math.round(ep.totalMs / ep.count) : 0,
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 5);

    // Data unit format
    const formattedBytes =
      totalBytes > 1024 * 1024
        ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
        : totalBytes > 1024
          ? `${(totalBytes / 1024).toFixed(1)} KB`
          : `${totalBytes} B`;

    const successRate = totalCount > 0 ? (((count2xx + count3xx) / totalCount) * 100).toFixed(1) : '100.0';

    return {
      totalCount,
      avgMs,
      p50,
      p90,
      p99,
      count2xx,
      count3xx,
      count4xx,
      count5xx,
      successRate,
      formattedBytes,
      leaderboards,
      errorLogs: errorLogs.reverse(),
      webhookLogs: webhookLogs.reverse(),
    };
  }, [requests]);

  const cards = [
    {
      label: 'Tunnel Status',
      value: tunnel ? '🟢 Active & Shared' : '⚪ Waiting for Tunnel',
      note: tunnel ? `${tunnel.publicUrl}` : 'No active public tunnel',
      status: tunnel ? 'good' : 'neutral',
      icon: 'lan',
    },
    {
      label: 'P90 Latency',
      value: `${telemetry.p90} ms`,
      note: `P50: ${telemetry.p50}ms | P99: ${telemetry.p99}ms`,
      status: telemetry.p90 < 200 ? 'good' : telemetry.p90 < 800 ? 'warn' : 'danger',
      icon: 'speed',
    },
    {
      label: 'Success Rate',
      value: `${telemetry.successRate}%`,
      note: `${telemetry.count2xx + telemetry.count3xx} pass / ${telemetry.count4xx + telemetry.count5xx} fail`,
      status: Number(telemetry.successRate) > 95 ? 'good' : Number(telemetry.successRate) > 80 ? 'warn' : 'danger',
      icon: 'check_circle',
    },
    {
      label: 'Bandwidth & Posture',
      value: telemetry.formattedBytes,
      note: workspace?.guardrails?.piiRedaction ? 'PII Redaction Active' : 'Open Capture',
      status: workspace?.guardrails?.piiRedaction ? 'good' : 'warn',
      icon: 'shield_lock',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in select-none">
      {/* Page Heading & Quick Actions */}
      <div className="border-b border-outline-variant/30 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display-sm text-display-sm text-on-surface">Observability Hub</h1>
            <span className="text-xs font-mono text-secondary px-2.5 py-0.5 bg-secondary/10 rounded-full border border-secondary/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Real-Time Telemetry
            </span>
          </div>
          <p className="text-on-surface-variant font-body-md mt-1">
            Zero-config local performance metrics, public tunnel health, log soup elimination, and webhook stream.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateView && (
            <>
              <button
                onClick={() => onNavigateView('traffic')}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 rounded-lg text-xs font-medium text-on-surface flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">traffic</span>
                Inspect Traffic Logs
              </button>
              <button
                onClick={() => onNavigateView('postman')}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Open REST Client
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Top Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const dotColor =
            card.status === 'good'
              ? 'bg-secondary'
              : card.status === 'warn'
                ? 'bg-tertiary'
                : card.status === 'danger'
                  ? 'bg-error'
                  : 'bg-outline';

          return (
            <div
              key={card.label}
              className="p-5 bg-surface-container rounded-xl border border-outline-variant/30 relative overflow-hidden flex flex-col justify-between hover:border-outline-variant/60 transition-all shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{card.icon}</span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                      {card.label}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                </div>
                <strong className="font-headline-sm text-lg text-on-surface block pt-1 truncate">
                  {card.value}
                </strong>
              </div>
              <p className="text-[11px] text-outline mt-3 truncate">{card.note}</p>
            </div>
          );
        })}
      </div>

      {/* Tab Selector Navigation */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'overview'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">analytics</span>
          Overview & Tunnel
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all relative ${
            activeTab === 'errors'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bug_report</span>
          Error Center ({telemetry.errorLogs.length})
          {telemetry.errorLogs.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-error animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'webhooks'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">webhook</span>
          Webhook Stream ({telemetry.webhookLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'endpoints'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">leaderboard</span>
          Slowest Routes
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
       * TAB 1: OVERVIEW & TUNNEL OBSERVABILITY
       * ────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Shared Public Tunnel Observability Panel */}
          <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/30 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">public</span>
                </span>
                <div>
                  <h3 className="font-headline-sm text-sm text-on-surface font-bold">
                    Shared Tunnel & Network Telemetry
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Full visibility into public tunnel traffic, forwarding port, and guardrails
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-mono px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  tunnel
                    ? 'text-secondary bg-secondary/10 border-secondary/20'
                    : 'text-outline bg-surface-container-low border-outline-variant/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${tunnel ? 'bg-secondary' : 'bg-outline'}`} />
                {tunnel ? 'Tunnel Active' : 'No Public Tunnel'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-1.5">
                <span className="text-on-surface-variant font-mono uppercase tracking-wider text-[10px]">
                  Public Endpoint
                </span>
                <p className="text-sm font-bold font-mono text-primary truncate">
                  {tunnel?.publicUrl ?? 'Local Proxy Only (127.0.0.1)'}
                </p>
                <span className="text-[10px] text-outline block">
                  Target Port: <strong className="text-on-surface font-mono">{tunnel?.localPort ?? process?.port ?? 3000}</strong>
                </span>
              </div>

              <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-1.5">
                <span className="text-on-surface-variant font-mono uppercase tracking-wider text-[10px]">
                  Status Code Heatmap
                </span>
                <div className="flex items-center gap-2 text-xs font-mono pt-1">
                  <span className="text-secondary font-bold">2xx: {telemetry.count2xx}</span>
                  <span className="text-outline">|</span>
                  <span className="text-sky-400 font-bold">3xx: {telemetry.count3xx}</span>
                  <span className="text-outline">|</span>
                  <span className="text-tertiary font-bold">4xx: {telemetry.count4xx}</span>
                  <span className="text-outline">|</span>
                  <span className="text-error font-bold">5xx: {telemetry.count5xx}</span>
                </div>
                <span className="text-[10px] text-outline block">
                  Average Duration: <strong className="text-on-surface font-mono">{telemetry.avgMs} ms</strong>
                </span>
              </div>

              <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-1.5">
                <span className="text-on-surface-variant font-mono uppercase tracking-wider text-[10px]">
                  Security Guardrails
                </span>
                <p className="text-sm font-bold text-on-surface">
                  {workspace?.guardrails?.piiRedaction ? '🟢 PII Redaction Active' : '🟡 Unmasked Capture'}
                </p>
                <span className="text-[10px] text-outline block">
                  Rate Limit: <strong className="text-on-surface font-mono">{workspace?.guardrails?.rateLimit ?? '250 req/min'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Latency Percentiles Card */}
          <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/30 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">timer</span>
                <h3 className="font-headline-sm text-sm text-on-surface font-bold">Response Time Percentiles</h3>
              </div>
              <span className="text-[11px] font-mono text-on-surface-variant">
                Evaluated across {telemetry.totalCount} captured requests
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                <span className="text-[10px] font-mono text-outline uppercase block">Average Latency</span>
                <span className="text-lg font-bold text-on-surface font-mono">{telemetry.avgMs} ms</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                <span className="text-[10px] font-mono text-outline uppercase block">P50 (Median)</span>
                <span className="text-lg font-bold text-secondary font-mono">{telemetry.p50} ms</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                <span className="text-[10px] font-mono text-outline uppercase block">P90 (90th Percentile)</span>
                <span className="text-lg font-bold text-tertiary font-mono">{telemetry.p90} ms</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                <span className="text-[10px] font-mono text-outline uppercase block">P99 (Tail Latency)</span>
                <span className="text-lg font-bold text-error font-mono">{telemetry.p99} ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
       * TAB 2: LOG SOUP ELIMINATION & ERROR CENTER
       * ────────────────────────────────────────────────────────── */}
      {activeTab === 'errors' && (
        <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div>
              <h3 className="font-headline-sm text-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-error">error</span>
                Error Aggregator & Log Soup Elimination
              </h3>
              <p className="text-xs text-on-surface-variant">
                Structured 4xx and 5xx failure stream without raw console noise
              </p>
            </div>
            <span className="text-xs font-mono text-error px-2.5 py-1 bg-error/10 rounded-full border border-error/20 font-bold">
              {telemetry.errorLogs.length} Failures Detected
            </span>
          </div>

          {telemetry.errorLogs.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-2">
              <span className="material-symbols-outlined text-[36px] text-secondary">verified</span>
              <p className="text-sm font-semibold text-on-surface">Zero Errors Intercepted</p>
              <p className="text-xs text-on-surface-variant">
                Your local backend and shared tunnel are operating with 100% clean responses.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {telemetry.errorLogs.map((req) => {
                const statusNum = typeof req.status === 'number' ? req.status : parseInt(String(req.status || '500'), 10);
                const is5xx = statusNum >= 500;

                return (
                  <div
                    key={req.id}
                    className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-outline-variant/40 transition-colors"
                  >
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            is5xx ? 'bg-error/20 text-error border border-error/30' : 'bg-tertiary/20 text-tertiary border border-tertiary/30'
                          }`}
                        >
                          {req.status ?? 500}
                        </span>
                        <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface rounded font-bold">
                          {req.method}
                        </span>
                        <span className="text-on-surface font-semibold text-sm">{req.path}</span>
                      </div>
                      <div className="text-[11px] text-outline flex items-center gap-3">
                        <span>Duration: {req.durationMs ?? 0} ms</span>
                        <span>•</span>
                        <span>Captured: {req.capturedAt ? new Date(req.capturedAt).toLocaleTimeString() : 'Recent'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onOpenDetail && (
                        <button
                          onClick={() => onOpenDetail(req)}
                          className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 rounded text-xs text-on-surface flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">search</span>
                          Inspect Log
                        </button>
                      )}
                      {onSendToPostman && (
                        <button
                          onClick={() => onSendToPostman(req)}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded text-xs flex items-center gap-1 font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">send</span>
                          Debug in Postman
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
       * TAB 3: WEBHOOK STREAM & REPLAY
       * ────────────────────────────────────────────────────────── */}
      {activeTab === 'webhooks' && (
        <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div>
              <h3 className="font-headline-sm text-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">webhook</span>
                Public Webhook Interception & Replay Stream
              </h3>
              <p className="text-xs text-on-surface-variant">
                Auto-detects incoming webhooks hitting your public tunnel and provides 1-click replay
              </p>
            </div>
            <span className="text-xs font-mono text-secondary px-2.5 py-1 bg-secondary/10 rounded-full border border-secondary/20 font-bold">
              {telemetry.webhookLogs.length} Webhooks Streamed
            </span>
          </div>

          {telemetry.webhookLogs.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-2">
              <span className="material-symbols-outlined text-[36px] text-outline">sync_alt</span>
              <p className="text-sm font-semibold text-on-surface">Listening for Incoming Webhooks</p>
              <p className="text-xs text-on-surface-variant">
                Send webhooks from Stripe, GitHub, Shopify, or Twilio to your public tunnel URL:
                <strong className="block font-mono text-primary mt-1">{tunnel?.publicUrl ?? 'Waiting for active tunnel...'}</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {telemetry.webhookLogs.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-outline-variant/40 transition-colors"
                >
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-secondary/20 text-secondary border border-secondary/30 rounded font-bold uppercase text-[10px]">
                        Webhook
                      </span>
                      <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface rounded font-bold">
                        {req.method}
                      </span>
                      <span className="text-on-surface font-semibold text-sm">{req.path}</span>
                    </div>
                    <div className="text-[11px] text-outline flex items-center gap-3">
                      <span>User-Agent: {req.headers?.['user-agent'] || req.headers?.['User-Agent'] || 'Webhook Source'}</span>
                      <span>•</span>
                      <span>Captured: {req.capturedAt ? new Date(req.capturedAt).toLocaleTimeString() : 'Recent'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onReplayRequest && (
                      <button
                        onClick={() => onReplayRequest(req)}
                        className="px-3 py-1 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">replay</span>
                        Replay Webhook
                      </button>
                    )}
                    {onSendToPostman && (
                      <button
                        onClick={() => onSendToPostman(req)}
                        className="px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded text-xs flex items-center gap-1 font-medium transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">send</span>
                        Open in Postman
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
       * TAB 4: SLOWEST ROUTES LEADERBOARD
       * ────────────────────────────────────────────────────────── */}
      {activeTab === 'endpoints' && (
        <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div>
              <h3 className="font-headline-sm text-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">leaderboard</span>
                Slowest Endpoints Leaderboard
              </h3>
              <p className="text-xs text-on-surface-variant">
                Top bottleneck routes sorted by average response time (ms)
              </p>
            </div>
            <span className="text-xs font-mono text-tertiary px-2.5 py-1 bg-tertiary/10 rounded-full border border-tertiary/20 font-bold">
              Top Bottlenecks
            </span>
          </div>

          {telemetry.leaderboards.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-low rounded-lg border border-outline-variant/20 text-xs text-on-surface-variant">
              No endpoint data captured yet. Send requests to populate the leaderboard.
            </div>
          ) : (
            <div className="space-y-2">
              {telemetry.leaderboards.map((ep, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded">
                      {ep.method}
                    </span>
                    <span className="text-on-surface font-semibold">{ep.path}</span>
                  </div>

                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <span className="text-outline text-[10px] block">AVG LATENCY</span>
                      <strong className="text-tertiary text-sm font-bold">{ep.avgMs} ms</strong>
                    </div>
                    <div>
                      <span className="text-outline text-[10px] block">CALLS</span>
                      <span className="text-on-surface font-bold">{ep.count}</span>
                    </div>
                    {ep.errors > 0 && (
                      <div>
                        <span className="text-outline text-[10px] block">ERRORS</span>
                        <span className="text-error font-bold">{ep.errors}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

