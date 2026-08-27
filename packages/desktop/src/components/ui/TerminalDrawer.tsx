import { useState, useMemo } from 'react';
import type { RequestLog } from '../../lib/types';
import { useEscape } from '../views/SharedComponents';
import { showToast } from '../../lib/toast';

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  source: 'proxy' | 'cloudflared' | 'localtunnel' | 'scanner' | 'system';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: TerminalLogEntry[];
  activeRequest?: RequestLog | null;
  onClearLogs?: () => void;
  isInline?: boolean; // When true, renders inside workbench scope without backdrop overlay
}

export function TerminalDrawer({
  isOpen,
  onClose,
  logs,
  activeRequest,
  onClearLogs,
  isInline = false,
}: TerminalDrawerProps) {
  useEscape(onClose, isOpen && !isInline);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [useTimeWindow, setUseTimeWindow] = useState<boolean>(!!activeRequest);

  // Asymmetric Time-Window Filter (-1s to +5s around activeRequest.capturedAt)
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (useTimeWindow && activeRequest?.capturedAt) {
      const reqTs = new Date(activeRequest.capturedAt).getTime();
      const minTs = reqTs - 1000; // -1s
      const maxTs = reqTs + 5000; // +5s

      const windowMatches = logs.filter((log) => {
        const logTs = new Date(log.timestamp).getTime();
        return logTs >= minTs && logTs <= maxTs;
      });

      // If time-window has matching log entries, use them; otherwise gracefully fallback to full stream
      if (windowMatches.length > 0) {
        result = windowMatches;
      }
    }

    return result.filter((log) => {
      // Source filter
      if (filterSource !== 'ALL' && log.source !== filterSource) {
        return false;
      }

      // Keyword search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          log.message.toLowerCase().includes(query) ||
          log.source.toLowerCase().includes(query) ||
          log.level.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [logs, activeRequest, useTimeWindow, filterSource, searchQuery]);

  if (!isOpen) return null;

  const copyAllLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.source.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast(`Copied ${filteredLogs.length} log lines to clipboard`, 'success');
  };

  const content = (
    <div className={`flex flex-col h-full bg-black text-emerald-400 font-mono text-xs overflow-hidden ${
      isInline ? 'rounded-xl border border-outline-variant/30' : 'border-t border-outline-variant/40 shadow-2xl'
    }`}>
      {/* Drawer Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-low border-b border-outline-variant/30 text-on-surface select-none">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="font-bold text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">terminal</span>
            {isInline ? 'Correlated Terminal Output' : 'Live Subprocess & Tunnel Logs Console'}
          </h3>
          {activeRequest && (
            <button
              onClick={() => setUseTimeWindow(!useTimeWindow)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                useTimeWindow
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
              }`}
              title="Toggle asymmetric -1s/+5s time window log filter"
            >
              {useTimeWindow ? '⏱️ Time-Window Filter (-1s / +5s)' : '🌐 Full Stream'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Source Filter Select */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-surface-container border border-outline-variant/30 rounded px-2 py-1 text-[11px] text-on-surface focus:outline-none"
          >
            <option value="ALL">All Sources</option>
            <option value="proxy">Proxy Interceptor</option>
            <option value="cloudflared">Cloudflare Tunnel</option>
            <option value="localtunnel">Localtunnel</option>
            <option value="scanner">Code Scanner</option>
            <option value="system">System</option>
          </select>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Filter logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-container border border-outline-variant/30 rounded px-2.5 py-1 text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-emerald-400 w-36"
          />

          <button
            onClick={copyAllLogs}
            className="p-1.5 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Copy logs"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="p-1.5 rounded hover:bg-error/20 text-outline hover:text-error transition-colors cursor-pointer"
              title="Clear log console"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}

          {!isInline && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface cursor-pointer"
              title="Close terminal drawer (Esc)"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Log Output Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-1.5 leading-relaxed font-mono select-all">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-outline text-xs italic">
            {activeRequest && useTimeWindow
              ? 'No correlated subprocess output within the -1s/+5s window. Switch to "Full Stream" to view all logs.'
              : 'No terminal log entries recorded.'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.level === 'error';
            const isWarn = log.level === 'warn';
            const reqStatus = activeRequest?.status ? String(activeRequest.status) : '';
            const reqPath = activeRequest?.path ? activeRequest.path : '';

            // Soft highlight matching request status or path
            const isSoftHighlight =
              (reqStatus && log.message.includes(reqStatus)) ||
              (reqPath && log.message.toLowerCase().includes(reqPath.toLowerCase()));

            return (
              <div
                key={log.id}
                className={`flex items-start gap-3 p-1 rounded transition-colors ${
                  isSoftHighlight ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : 'hover:bg-white/5'
                }`}
              >
                <span className="text-[10px] text-neutral-500 shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                    log.source === 'cloudflared'
                      ? 'bg-amber-500/20 text-amber-300'
                      : log.source === 'localtunnel'
                        ? 'bg-sky-500/20 text-sky-300'
                        : log.source === 'proxy'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {log.source}
                </span>
                <span
                  className={`flex-1 break-all ${
                    isError
                      ? 'text-error font-bold'
                      : isWarn
                        ? 'text-amber-300'
                        : isSoftHighlight
                          ? 'text-emerald-300 font-bold'
                          : 'text-emerald-400/90'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div
      className="h-64 w-full shrink-0 z-40 transition-all select-none fade-in"
      tabIndex={-1}
    >
      {content}
    </div>
  );
}
