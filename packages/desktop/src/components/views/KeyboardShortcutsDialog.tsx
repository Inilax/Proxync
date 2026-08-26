import { useState, useMemo } from 'react';
import type { MainView } from './SharedComponents';
import { useEscape } from './SharedComponents';

interface ShortcutItem {
  name: string;
  keys: string[];
  description?: string;
  category: 'global' | 'contextual';
  view?: MainView;
}

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: MainView;
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  currentView = 'workspace_dashboard',
}: KeyboardShortcutsDialogProps) {
  useEscape(onClose, isOpen);
  const [filterQuery, setFilterQuery] = useState('');

  // Cross-platform OS key symbol detection (macOS vs Windows/Linux)
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return (
      /Mac|iPod|iPhone|iPad/i.test(navigator.platform) ||
      /Macintosh|Mac OS X/i.test(navigator.userAgent)
    );
  }, []);

  const modKey = isMac ? '⌘' : 'Ctrl';

  const allShortcuts = useMemo<ShortcutItem[]>(() => [
    // ── Global Shortcuts (Available on all screens) ──
    {
      name: 'Search & Switch Workspaces',
      keys: [modKey, 'K'],
      description: 'Open quick workspace command dropdown with live search',
      category: 'global',
    },
    {
      name: 'Toggle Keyboard Shortcuts Guide',
      keys: [modKey, '/'],
      description: 'Open or dismiss this keybindings cheatsheet',
      category: 'global',
    },
    {
      name: 'Toggle Navigation Sidebar',
      keys: [modKey, 'B'],
      description: 'Expand or collapse the main navigation sidebar',
      category: 'global',
    },
    {
      name: 'Toggle Activity & Diagnostics Console',
      keys: [modKey, '`'],
      description: 'Open or hide the terminal log drawer',
      category: 'global',
    },

    // ── API Workbench / Playground Shortcuts ──
    {
      name: 'Send API Request',
      keys: [modKey, 'Enter'],
      description: 'Execute current HTTP request in API Workbench',
      category: 'contextual',
      view: 'postman',
    },
    {
      name: 'Save Request to Collection',
      keys: [modKey, 'S'],
      description: 'Persist current draft request to saved collection',
      category: 'contextual',
      view: 'postman',
    },
    {
      name: 'Request / Collection Context Menu',
      keys: ['Right Click'],
      description: 'Rename, duplicate, move, or delete collections and requests',
      category: 'contextual',
      view: 'postman',
    },

    // ── Traffic Inspector Shortcuts ──
    {
      name: 'Inspect Packet Details',
      keys: ['Click Row'],
      description: 'Open full request and response header/body inspector',
      category: 'contextual',
      view: 'traffic',
    },
    {
      name: 'Send Request to Workbench',
      keys: ['Replay Icon'],
      description: 'Clone intercepted live request directly into API Workbench',
      category: 'contextual',
      view: 'traffic',
    },

    // ── Explore Network Hub Shortcuts ──
    {
      name: 'Stop All Active Tunnels',
      keys: [modKey, 'Shift', 'X'],
      description: 'Immediately terminate all active and standby tunnel sessions',
      category: 'contextual',
      view: 'welcome',
    },
  ], [modKey]);

  if (!isOpen) return null;

  const viewLabel =
    currentView === 'postman'
      ? 'API Workbench'
      : currentView === 'traffic'
      ? 'Traffic Inspector'
      : currentView === 'welcome'
      ? 'Explore Network Hub'
      : currentView === 'lobby'
      ? 'Workspaces Studio'
      : currentView === 'swagger'
      ? 'OpenAPI Documentation'
      : currentView === 'settings'
      ? 'Settings'
      : currentView === 'observability'
      ? 'Observability'
      : 'Workspace Hub';

  const filtered = allShortcuts.filter((s) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.keys.some((k) => k.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  const globalShortcuts = filtered.filter((s) => s.category === 'global');
  const contextualShortcuts = filtered.filter(
    (s) => s.category === 'contextual' && (!s.view || s.view === currentView)
  );

  return (
    <div className="dialog-backdrop glass z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="dialog-content max-w-xl w-full p-6 bg-surface-container-high border border-outline-variant/60 rounded-2xl space-y-4 shadow-2xl slide-up select-none max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-2xl">keyboard</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-on-surface text-base">Keyboard Shortcuts</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {isMac ? 'macOS (⌘)' : 'Windows & Linux (Ctrl)'}
                </span>
              </div>
              <p className="text-xs text-outline">
                Productivity keybindings and navigation hotkeys across Proxync Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Search filter for shortcuts */}
        <div className="relative shrink-0">
          <span className="material-symbols-outlined text-outline text-base absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search keybindings..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Shortcuts list container */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
          {/* Global Shortcuts */}
          {globalShortcuts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <span className="material-symbols-outlined text-primary text-sm">public</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Global Keybindings (All Screens)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {globalShortcuts.map((sc) => (
                  <div
                    key={sc.name}
                    className="flex items-center justify-between p-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-on-surface truncate">{sc.name}</p>
                      {sc.description && (
                        <p className="text-[11px] text-outline truncate">{sc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {sc.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-1 bg-surface-container-high border border-outline-variant/40 rounded text-[11px] font-mono text-primary font-bold shadow-xs min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contextual Screen Shortcuts */}
          {contextualShortcuts.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 px-1">
                <span className="material-symbols-outlined text-secondary text-sm">widgets</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  {viewLabel} Specific Keybindings
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {contextualShortcuts.map((sc) => (
                  <div
                    key={sc.name}
                    className="flex items-center justify-between p-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-on-surface truncate">{sc.name}</p>
                      {sc.description && (
                        <p className="text-[11px] text-outline truncate">{sc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {sc.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-1 bg-surface-container-high border border-outline-variant/40 rounded text-[11px] font-mono text-secondary font-bold shadow-xs min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {globalShortcuts.length === 0 && contextualShortcuts.length === 0 && (
            <div className="py-8 text-center text-outline text-xs">
              No keybindings match "{filterQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-outline font-mono">
            Press <kbd className="px-1.5 py-0.5 bg-surface-container-low rounded border border-outline-variant/40 text-on-surface">{modKey} + /</kbd> anywhere to toggle
          </span>
          <button
            className="btn-primary compact cursor-pointer"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
