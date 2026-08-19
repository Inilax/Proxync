// ponytail: functional closure logger; minimal RAM overhead with bounded ring buffers
import { invoke } from '@tauri-apps/api/core';
import { AppLogEntry, RequestLog, LogsSummary, AppSettings, WorkspaceConfig } from './types';

export type { LogsSummary, AppLogEntry };

let _seq = 0;
const nextLogId = () => ++_seq;

const MAX_APP_LOGS = 1000;
const MAX_TRAFFIC_LOGS = 2000;

let _appLogs: AppLogEntry[] = [];
let _trafficLogs: RequestLog[] = [];

// Defaults: Application logs ENABLED by default; Traffic logs DISABLED by default
let _appLogEnabled = true;
let _trafficLogEnabled = false;
let _sessionStartTime: number | null = Date.now();

// ── Sensitive Data Sanitizer for AI Agents and Human Safety ──
const SENSITIVE_KEY_REGEX = /(authorization|bearer|token|apikey|api_key|cookie|set-cookie|password|secret|credential|access_token|refresh_token)/i;

function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return undefined;
  const sanitized: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

function sanitizeText(input: string): string {
  return input
    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
    .replace(/(?:token|key|secret|password)=([A-Za-z0-9\-_.]+)/gi, '$1=[REDACTED]');
}

export function isAppLoggingEnabled(): boolean {
  return _appLogEnabled;
}

export function isTrafficLoggingEnabled(): boolean {
  return _trafficLogEnabled;
}

export function isDebugLoggingEnabled(): boolean {
  return _appLogEnabled || _trafficLogEnabled;
}

export function initLogger(config?: { appLogging?: boolean; trafficLogging?: boolean } | boolean): void {
  if (typeof config === 'boolean') {
    _appLogEnabled = config;
  } else if (config) {
    _appLogEnabled = config.appLogging ?? true;
    _trafficLogEnabled = config.trafficLogging ?? false;
  }
  if ((_appLogEnabled || _trafficLogEnabled) && !_sessionStartTime) {
    _sessionStartTime = Date.now();
  }
}

export async function setAppLogging(enabled: boolean, envMeta?: Record<string, any>): Promise<void> {
  const wasEnabled = _appLogEnabled;
  _appLogEnabled = enabled;

  const now = new Date().toISOString();

  if (enabled && !wasEnabled) {
    _sessionStartTime = Date.now();
    const appVersion = envMeta?.appVersion || 'v0.2.1-stable';
    const platform = envMeta?.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'desktop');
    const theme = envMeta?.theme || 'slate';

    const header = [
      '══════════════════════════════════════════════════════════════════════════════',
      'PROXYNC PRO DEBUGGER LOG — APPLICATION ENGINE DIAGNOSTICS',
      '── AI AGENT & DEVELOPER DIAGNOSTIC DIRECTIVE ──',
      '  Schema:   [<ISO8601_TIMESTAMP>] [<LEVEL>] [<SUBSYSTEM>] <Message> [| <ContextKey>=<ContextVal>]',
      '  Levels:   DEBUG (trace/internal), INFO (lifecycle/actions), WARN (degraded/retry), ERROR (failure)',
      '  Subsystems: SYSTEM (app lifecycle), RECON (port scans), TUNNEL (tunnels & subprocesses),',
      '              PROXY (HTTP proxy engine), HTTP (traffic events), SCANNER (OpenAPI/codebase), UPDATER (updater)',
      '  Errors:   Formatted with error="<Reason>" | target="<PortOrURL>" | hint="<ActionableFix>"',
      '  Privacy:  All authorization tokens and sensitive cookies are automatically replaced with [REDACTED].',
      `Session Started: ${now} | App Version: ${appVersion} | Platform: ${platform} | Theme: ${theme}`,
      '══════════════════════════════════════════════════════════════════════════════',
    ].join('\n');

    try {
      await invoke('append_log_entry', { category: 'app', line: header });
    } catch {
      // Non-blocking in dev / test mode
    }

    logApp('SYSTEM', 'INFO', `═══ Application Diagnostics Logging Enabled [${now}] (Version: ${appVersion}) ═══`);
  } else if (!enabled && wasEnabled) {
    const durationMs = _sessionStartTime ? Date.now() - _sessionStartTime : 0;
    const durationSec = Math.round(durationMs / 1000);
    const durationStr = `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;

    logApp('SYSTEM', 'INFO', `═══ Application Diagnostics Logging Disabled [${now}] — Active Duration: ${durationStr} ═══`);

    const footer = [
      '══════════════════════════════════════════════════════════════════════════════',
      `═══ Application Diagnostics Logging Ended [${now}] — Duration: ${durationStr} ═══`,
      '══════════════════════════════════════════════════════════════════════════════',
    ].join('\n');

    try {
      await invoke('append_log_entry', { category: 'app', line: footer });
    } catch {
      // Non-blocking
    }
  }
}

export async function setTrafficLogging(enabled: boolean, envMeta?: Record<string, any>): Promise<void> {
  const wasEnabled = _trafficLogEnabled;
  _trafficLogEnabled = enabled;

  const now = new Date().toISOString();

  if (enabled && !wasEnabled) {
    const appVersion = envMeta?.appVersion || 'v0.2.1-stable';
    const header = [
      '══════════════════════════════════════════════════════════════════════════════',
      'PROXYNC PRO DEBUGGER LOG — HTTP & TUNNEL TRAFFIC STREAM',
      '── AI AGENT & DEVELOPER PARSING DIRECTIVE ──',
      '  Format:   Strict JSON Lines (JSONL) — 1 valid JSON object per line.',
      '  Fields:   timestamp, reqId, method, path, port, status, durationMs, errorReason, isProbe, headers, body',
      '  Errors:   Requests with status >= 400 include explicit errorReason for instant triage.',
      '  Privacy:  Sensitive headers (Authorization, Cookie, Set-Cookie) are masked as [REDACTED].',
      `Traffic Capture Started: ${now} | App Version: ${appVersion}`,
      '══════════════════════════════════════════════════════════════════════════════',
    ].join('\n');

    try {
      await invoke('append_log_entry', { category: 'traffic', line: header });
    } catch {
      // Non-blocking
    }
    logApp('HTTP', 'INFO', `═══ Traffic Stream Logging to Disk Enabled [${now}] ═══`);
  } else if (!enabled && wasEnabled) {
    logApp('HTTP', 'INFO', `═══ Traffic Stream Logging to Disk Disabled [${now}] ═══`);
    const footer = [
      '══════════════════════════════════════════════════════════════════════════════',
      `═══ Traffic Capture Ended [${now}] ═══`,
      '══════════════════════════════════════════════════════════════════════════════',
    ].join('\n');

    try {
      await invoke('append_log_entry', { category: 'traffic', line: footer });
    } catch {
      // Non-blocking
    }
  }
}

export async function setDebugLogging(enabled: boolean, envMeta?: Record<string, any>): Promise<void> {
  await Promise.all([
    setAppLogging(enabled, envMeta),
    setTrafficLogging(enabled, envMeta),
  ]);
}

export function logApp(
  source: AppLogEntry['source'],
  level: AppLogEntry['level'],
  message: string,
  details?: any
): void {
  const timestamp = new Date().toISOString();
  let detailStr: string | undefined = undefined;

  if (details) {
    if (typeof details === 'string') {
      detailStr = sanitizeText(details);
    } else {
      try {
        detailStr = sanitizeText(JSON.stringify(details));
      } catch {
        detailStr = String(details);
      }
    }
  }

  const cleanMessage = sanitizeText(message);

  const entry: AppLogEntry = {
    seq: nextLogId(),
    timestamp,
    level,
    source,
    message: cleanMessage,
    details: detailStr,
  };

  _appLogs.push(entry);
  if (_appLogs.length > MAX_APP_LOGS) {
    _appLogs = _appLogs.slice(-MAX_APP_LOGS);
  }

  // Format grep-friendly, LLM-optimized bracket log line
  const formattedLine = `[${timestamp}] [${level}] [${source}] ${cleanMessage}${detailStr ? ' | ' + detailStr : ''}`;

  // Console output in development or when app logging is enabled
  if (_appLogEnabled || import.meta.env?.DEV) {
    if (level === 'ERROR') {
      console.error(`[${source}]`, cleanMessage, details || '');
    } else if (level === 'WARN') {
      console.warn(`[${source}]`, cleanMessage, details || '');
    } else {
      console.log(`[${source}]`, cleanMessage, details || '');
    }
  }

  if (_appLogEnabled) {
    invoke('append_log_entry', { category: 'app', line: formattedLine }).catch(() => {});
  }
}

/**
 * Structured error logging helper for AI agents and human diagnostics
 */
export function logError(
  source: AppLogEntry['source'],
  summary: string,
  error: unknown,
  hint?: string,
  target?: string | number
): void {
  const errMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  const contextParts: string[] = [];
  if (errMsg) contextParts.push(`error="${errMsg.replace(/"/g, "'")}"`);
  if (target !== undefined && target !== null) contextParts.push(`target="${target}"`);
  if (hint) contextParts.push(`hint="${hint.replace(/"/g, "'")}"`);

  logApp(source, 'ERROR', summary, contextParts.length > 0 ? contextParts.join(' | ') : undefined);
}

export function logTraffic(requestLog: RequestLog): void {
  _trafficLogs.push(requestLog);
  if (_trafficLogs.length > MAX_TRAFFIC_LOGS) {
    _trafficLogs = _trafficLogs.slice(-MAX_TRAFFIC_LOGS);
  }

  if (_trafficLogEnabled) {
    const statusNum = typeof requestLog.status === 'number' ? requestLog.status : parseInt(String(requestLog.status), 10);
    let errorReason: string | null = null;
    if (!isNaN(statusNum)) {
      if (statusNum === 502) errorReason = '502 Bad Gateway: Upstream local service port unreachable or crashed';
      else if (statusNum === 504) errorReason = '504 Gateway Timeout: Upstream local service did not respond in time';
      else if (statusNum === 404) errorReason = '404 Not Found: Route or resource does not exist';
      else if (statusNum === 401) errorReason = '401 Unauthorized: Missing or invalid authentication token';
      else if (statusNum === 403) errorReason = '403 Forbidden: Request blocked by security policy';
      else if (statusNum >= 500) errorReason = `Internal Server Error (${statusNum}): Upstream application exception`;
    }

    const structuredEntry = {
      timestamp: requestLog.capturedAt || new Date().toISOString(),
      reqId: requestLog.id,
      method: requestLog.method,
      path: requestLog.path,
      port: requestLog.port,
      status: requestLog.status,
      durationMs: requestLog.durationMs,
      subdomain: requestLog.subdomain,
      tunnelUrl: requestLog.tunnelUrl,
      isProbe: requestLog.isProbe,
      errorReason,
      headers: sanitizeHeaders(requestLog.headers),
      body: requestLog.bodyPreview ? sanitizeText(requestLog.bodyPreview) : null,
    };

    const rawLine = JSON.stringify(structuredEntry);
    invoke('append_log_entry', { category: 'traffic', line: rawLine }).catch(() => {});
  }
}

export function getAppLogs(): AppLogEntry[] {
  return [..._appLogs];
}

export function getTrafficLogs(): RequestLog[] {
  return [..._trafficLogs];
}

export async function copyAppLogs(): Promise<boolean> {
  try {
    const text = _appLogs
      .map((e) => `[${e.timestamp}] [${e.level}] [${e.source}] ${e.message}${e.details ? ' | ' + e.details : ''}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyTrafficLogs(): Promise<boolean> {
  try {
    const text = JSON.stringify(_trafficLogs, null, 2);
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function openLogsFolder(): Promise<void> {
  try {
    await invoke('open_logs_folder');
  } catch (err) {
    console.error('Failed to open logs folder:', err);
  }
}

export async function clearLogs(): Promise<void> {
  _appLogs = [];
  _trafficLogs = [];
  try {
    await invoke('clear_log_files');
  } catch (err) {
    console.error('Failed to clear log files:', err);
  }
}

export async function readLogsSummary(): Promise<LogsSummary | null> {
  try {
    return await invoke<LogsSummary>('read_logs_summary');
  } catch {
    return null;
  }
}

export interface SupportBundleContext {
  settings?: AppSettings;
  activeWorkspace?: WorkspaceConfig | null;
  activeTunnels?: any[];
  discoveredProcesses?: any[];
  activeTunnel?: any;
  appVersion?: string;
}

export function exportSupportBundle(ctx: SupportBundleContext): void {
  const generatedAt = new Date().toISOString();
  const appVersion = ctx.appVersion || 'v0.2.1-stable';

  const bundle = {
    bundleSchema: '1.0.0',
    generatedAt,
    systemInfo: {
      appVersion,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'Unknown',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      theme: ctx.settings?.theme || 'slate',
      telemetry: ctx.settings?.telemetry || 'enhanced',
      autoUpdate: ctx.settings?.autoUpdate ?? true,
      appLoggingActive: _appLogEnabled,
      trafficLoggingActive: _trafficLogEnabled,
      defaultProjectRoot: ctx.settings?.defaultProjectRootPath || '',
    },
    activeWorkspace: ctx.activeWorkspace
      ? {
          id: ctx.activeWorkspace.id,
          name: ctx.activeWorkspace.name,
          domainsCount: ctx.activeWorkspace.domains?.length || 0,
          savedRequestsCount: ctx.activeWorkspace.savedRequests?.length || 0,
          capturedRequestsCount: ctx.activeWorkspace.capturedRequests?.length || 0,
          languageHint: ctx.activeWorkspace.languageHint,
        }
      : null,
    activeTunnel: ctx.activeTunnel ? {
      id: ctx.activeTunnel.id,
      publicUrl: ctx.activeTunnel.publicUrl,
      localPort: ctx.activeTunnel.localPort,
      subdomain: ctx.activeTunnel.subdomain,
      status: ctx.activeTunnel.status,
    } : null,
    activeTunnels: (ctx.activeTunnels || []).map((t) => ({
      id: t.id || t.tunnelId,
      publicUrl: t.publicUrl,
      localPort: t.localPort,
      subdomain: t.subdomain,
      status: t.status,
    })),
    discoveredProcesses: (ctx.discoveredProcesses || []).map((p) => ({
      name: p.name,
      port: p.port,
      command: p.command,
      framework: p.framework,
      directory: p.directory,
      executable: p.executable,
    })),
    recentAppLogs: _appLogs.slice(-500),
    recentTrafficLogs: _trafficLogs.slice(-500),
  };

  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proxync-support-bundle-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
