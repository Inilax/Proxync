import { useEffect, useMemo, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from "@tauri-apps/plugin-opener";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import './index.css';
import { ToastContainer, showToast, dismissToast } from './lib/toast';
import { scanCodebaseEndpoints, type ScannedEndpoint } from './lib/codebaseScanner';
import { generateOpenApiSpec, importSwaggerToSavedRequests } from './lib/openApiGenerator';
import {
  api,
  ensureLocalWorkspace,
  getToken,
  type LocalWorkspaceContext,
} from './lib/api';

/* ── Extracted View Components ── */
import {
  type MainView,
  type SwaggerPanel,
  type PanelView,
  type ProcessCandidate,
  type Tunnel,
  type RequestLog,
  type SavedRequest,
  type PostmanResponse,
  type Guardrails,
  type ProcessProfile,
  type WorkspaceConfig,
  type AppSettings,
  type DomainRecord,
  CompanionPanel,
  parseHeaderText,
  stripMethodPrefix,
  useEscape,
} from './components/views/SharedComponents';
import { WelcomeView } from './components/views/WelcomeView';
import { LobbyView } from './components/views/LobbyView';
import { ProcessView } from './components/views/ProcessView';
import { TrafficView } from './components/views/TrafficView';
import { PostmanView } from './components/views/PostmanView';
import { SwaggerView } from './components/views/SwaggerView';
import { ObservabilityView } from './components/views/ObservabilityView';
import { SettingsView } from './components/views/SettingsView';
import { DocsView } from './components/views/DocsView';
import { DiscoverDialog, DomainSelectDialog, RequestDetailDialog, ConfirmDeleteDialog } from './components/views/Dialogs';

/* ══════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════ */

const PORT_NAMES: Record<number, string> = {
  3000: 'Node app', 3001: 'Node app', 4000: 'GraphQL service',
  4200: 'Angular app', 5000: 'Flask or .NET app', 5173: 'Vite server',
  8000: 'Django or FastAPI app', 8080: 'HTTP service', 8888: 'Notebook server',
};

const DEFAULT_GUARDRAILS: Guardrails = {
  authMode: 'guest', piiRedaction: true, captureBodies: true,
  autoUpdateSwagger: true, rateLimit: '250 req/min',
};

const DEFAULT_REQUEST: SavedRequest = {
  id: 'draft', name: 'Draft request', method: 'GET', path: '/',
  headers: { 'Content-Type': 'application/json' }, body: '', source: 'manual',
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  guardrails: { ...DEFAULT_GUARDRAILS },
  defaultProjectRootPath: '', notes: '',
  theme: 'slate',
  autoUpdate: true,
  telemetry: 'enhanced',
  enableDevTools: false,
};

const LOCAL_WORKSPACES_KEY = 'proxync_local_workspaces_v1';
const ACTIVE_WORKSPACE_KEY = 'proxync_local_active_workspace_v1';
const APP_SETTINGS_KEY = 'proxync_app_settings_v1';

/* ══════════════════════════════════════════════
   NAV CONFIG
   ══════════════════════════════════════════════ */

const NAV_ITEMS: { view: MainView; label: string; icon: string }[] = [
  { view: 'welcome', label: 'Explore', icon: 'explore' },
  { view: 'lobby', label: 'Workspaces', icon: 'hub' },
  { view: 'process', label: 'Tunnels', icon: 'lan' },
  { view: 'traffic', label: 'Traffic', icon: 'terminal' },
  { view: 'postman', label: 'Playground', icon: 'send' },
  { view: 'swagger', label: 'Swagger', icon: 'api' },
  { view: 'docs', label: 'Docs', icon: 'menu_book' },
  { view: 'observability', label: 'Observability', icon: 'insights' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];

export async function checkRealInternetConnection(timeoutMs = 1200): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch('https://1.1.1.1/cdn-cgi/trace', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch (e) {
    clearTimeout(timer);
    return false;
  }
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [context, setContext] = useState<LocalWorkspaceContext | null>(null);
  const [bootstrapError, setBootstrapError] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>(() => {
    const stored = localStorage.getItem(LOCAL_WORKSPACES_KEY);
    return stored ? (JSON.parse(stored) as WorkspaceConfig[]) : [];
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    const stored = localStorage.getItem(LOCAL_WORKSPACES_KEY);
    const parsed = stored ? (JSON.parse(stored) as WorkspaceConfig[]) : [];
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? (parsed.length > 0 ? parsed[0].id : null);
  });
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [processes, setProcesses] = useState<ProcessCandidate[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [activeTunnel, setActiveTunnel] = useState<Tunnel | null>(null);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [draftRequest, setDraftRequest] = useState<SavedRequest>(DEFAULT_REQUEST);
  const [postmanResponse, setPostmanResponse] = useState<PostmanResponse | null>(null);
  const [mainView, setMainView] = useState<MainView>(() => {
    const stored = localStorage.getItem(LOCAL_WORKSPACES_KEY);
    const parsed = stored ? (JSON.parse(stored) as WorkspaceConfig[]) : [];
    return parsed.length === 0 ? 'lobby' : 'welcome';
  });
  const [swaggerPanel, setSwaggerPanel] = useState<SwaggerPanel>('preview');
  const [panelView, setPanelView] = useState<PanelView>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(180);
  const [isResizing, setIsResizing] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger'>('general');

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const doResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newHeight = window.innerHeight - e.clientY - 24;
    if (newHeight >= 60 && newHeight <= window.innerHeight * 0.8) {
      setTerminalHeight(newHeight);
    }
  }, [isResizing]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', doResize);
      window.addEventListener('mouseup', stopResize);
    } else {
      window.removeEventListener('mousemove', doResize);
      window.removeEventListener('mouseup', stopResize);
    }
    return () => {
      window.removeEventListener('mousemove', doResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing, doResize, stopResize]);
  const [discovering, setDiscovering] = useState(false);
  const [sharingPort, setSharingPort] = useState<number | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [starterSuggestions, setStarterSuggestions] = useState<SavedRequest[]>([]);
  const [scanningProject, setScanningProject] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings());
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [domainDraft, setDomainDraft] = useState('');
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [busyDomainId, setBusyDomainId] = useState<string | null>(null);
  const [sharingProcessCandidate, setSharingProcessCandidate] = useState<ProcessCandidate | null>(null);
  const [localIp, setLocalIp] = useState<string>('127.0.0.1');

  /* ── Derived state ── */

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const selectedProcess = useMemo(
    () => processes.find((process) => process.id === selectedProcessId) ?? null,
    [processes, selectedProcessId],
  );

  const selectedProfile = useMemo(() => {
    if (!activeWorkspace?.selectedProfileId) return null;
    return (
      activeWorkspace.profiles.find(
        (profile) => profile.id === activeWorkspace.selectedProfileId,
      ) ?? null
    );
  }, [activeWorkspace]);

  const effectiveLanguageHint = useMemo(() => {
    if (selectedProcess) return detectLanguageLabel(selectedProcess);
    if (selectedProfile) return selectedProfile.languageHint;
    return activeWorkspace?.languageHint ?? 'Undetermined';
  }, [activeWorkspace, selectedProcess, selectedProfile]);

  const [scannedEndpoints, setScannedEndpoints] = useState<ScannedEndpoint[]>([]);
  const [openApiDocument, setOpenApiDocument] = useState<Record<string, unknown>>(() =>
    generateOpenApiSpec([], [], 'Proxync Workspace', 'HTTP Server')
  );
  const [generatingSwagger, setGeneratingSwagger] = useState<boolean>(false);

  const handleGenerateSwaggerSpec = async () => {
    setGeneratingSwagger(true);
    try {
      let endpoints: ScannedEndpoint[] = scannedEndpoints;
      if (activeWorkspace?.projectRootPath && activeWorkspace?.scannedFiles?.length > 0) {
        endpoints = await scanCodebaseEndpoints(activeWorkspace.projectRootPath, activeWorkspace.scannedFiles);
        setScannedEndpoints(endpoints);
      }
      const spec = generateOpenApiSpec(
        endpoints,
        requests,
        activeWorkspace?.name ?? 'Proxync Workspace',
        effectiveLanguageHint
      );
      setOpenApiDocument(spec);
      const pathCount = Object.keys((spec.paths as any) || {}).length;
      showToast(`Generated OpenAPI Spec (${pathCount} path${pathCount === 1 ? '' : 's'})`, 'success');
    } catch (err: any) {
      showToast(err instanceof Error ? err.message : 'Failed to generate OpenAPI spec', 'error');
    } finally {
      setGeneratingSwagger(false);
    }
  };



  /* ── Effects ── */

  const SKIP_UPDATE_KEY = 'proxync_skipped_update_version';
  const LAST_UPDATE_CHECK_KEY = 'proxync_last_update_check_ts';

  // ── Semver Force-Update Helper ────────────────────────────────────
  // Returns true when the minor OR major segment increments, which is
  // considered a "new iteration" requiring a forced update.
  // Patch-only bumps (1.1.4 → 1.1.6) are optional (non-forced).
  function isForceUpdate(current: string, next: string): boolean {
    const parse = (v: string) => v.split('.').map(Number);
    const [curMajor, curMinor] = parse(current);
    const [nxtMajor, nxtMinor] = parse(next);
    return nxtMajor > curMajor || nxtMinor > curMinor;
  }

  useEffect(() => {
    let mounted = true;
    let updaterInterval: ReturnType<typeof setInterval> | null = null;

    async function runUpdateCheck() {
      try {
        const update = await check();
        if (!mounted || !update) return;

        const forced = isForceUpdate(update.currentVersion, update.version);

        // Skip logic only applies to non-forced (patch-only) updates
        if (!forced) {
          const skipped = localStorage.getItem(SKIP_UPDATE_KEY);
          if (skipped === update.version) return;
        }

        if (forced) {
          // ── FORCE UPDATE TOAST ── No Skip, No Later ────────────────
          const forceToastId = showToast(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '1em' }}>⚠️ Required Update v{update.version}</div>
              <div style={{ fontSize: '0.82em', opacity: 0.85, lineHeight: 1.4 }}>
                This is a major release update and is required to continue using Proxync.
                Please update now.
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  id={`updater-force-btn-${update.version}`}
                  style={{ padding: '5px 14px', cursor: 'pointer', background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 700 }}
                  onClick={async (e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.disabled = true;
                    btn.innerText = 'Downloading...';

                    let downloaded = 0;
                    let contentLength = 0;
                    await update.downloadAndInstall((event: any) => {
                      switch (event.event) {
                        case 'Started':
                          contentLength = event.data.contentLength || 0;
                          break;
                        case 'Progress':
                          downloaded += event.data.chunkLength;
                          if (contentLength) {
                            const pct = Math.round((downloaded / contentLength) * 100);
                            btn.innerText = `Downloading... ${pct}%`;
                          }
                          break;
                        case 'Finished':
                          btn.innerText = 'Done!';
                          break;
                      }
                    });

                    dismissToast(forceToastId);
                    showToast(
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontWeight: 600 }}>✅ Update v{update.version} ready</div>
                        <div style={{ fontSize: '0.82em', opacity: 0.8 }}>Restart Proxync to apply the update.</div>
                        <button
                          style={{ padding: '5px 10px', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 600 }}
                          onClick={() => relaunch()}
                        >
                          Restart Now
                        </button>
                      </div>,
                      'success',
                      true
                    );
                  }}
                >
                  Update Now
                </button>
              </div>
            </div>,
            'error',
            true // persistent — cannot be dismissed
          );
        } else {
          // ── OPTIONAL UPDATE TOAST ── Skip / Later available ────────
          const toastId = showToast(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 600 }}>🚀 Update v{update.version} available</div>
              <div style={{ fontSize: '0.82em', opacity: 0.8 }}>A new version of Proxync is ready to download.</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  id={`updater-btn-${update.version}`}
                  style={{ padding: '5px 10px', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 600 }}
                  onClick={async (e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.disabled = true;
                    btn.innerText = 'Starting...';

                    let downloaded = 0;
                    let contentLength = 0;
                    await update.downloadAndInstall((event: any) => {
                      switch (event.event) {
                        case 'Started':
                          contentLength = event.data.contentLength || 0;
                          btn.innerText = 'Downloading...';
                          break;
                        case 'Progress':
                          downloaded += event.data.chunkLength;
                          if (contentLength) {
                            const pct = Math.round((downloaded / contentLength) * 100);
                            btn.innerText = `Downloading... ${pct}%`;
                          }
                          break;
                        case 'Finished':
                          btn.innerText = 'Done!';
                          break;
                      }
                    });

                    dismissToast(toastId);
                    const restartId = showToast(
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontWeight: 600 }}>✅ Update v{update.version} ready</div>
                        <div style={{ fontSize: '0.82em', opacity: 0.8 }}>Restart Proxync to apply the update.</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            style={{ padding: '5px 10px', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 600 }}
                            onClick={() => relaunch()}
                          >
                            Restart Now
                          </button>
                          <button
                            style={{ padding: '5px 10px', cursor: 'pointer', background: 'transparent', color: 'inherit', border: '1px solid currentColor', borderRadius: '5px' }}
                            onClick={() => dismissToast(restartId)}
                          >
                            Later
                          </button>
                        </div>
                      </div>,
                      'success',
                      true
                    );
                  }}
                >
                  Update Now
                </button>
                <button
                  style={{ padding: '5px 10px', cursor: 'pointer', background: 'transparent', color: 'inherit', border: '1px solid currentColor', borderRadius: '5px' }}
                  onClick={() => {
                    localStorage.setItem(SKIP_UPDATE_KEY, update.version);
                    dismissToast(toastId);
                  }}
                >
                  Skip this version
                </button>
                <button
                  style={{ padding: '5px 10px', cursor: 'pointer', background: 'transparent', color: 'inherit', border: '1px solid currentColor', borderRadius: '5px' }}
                  onClick={() => dismissToast(toastId)}
                >
                  Later
                </button>
              </div>
            </div>,
            'info',
            true
          );
        }
      } catch (err) {
        console.error('[AutoUpdater] Failed to check for updates:', err);
      }
    }

    // ── Schedule update checks based on autoUpdate setting ────────
    if (appSettings.autoUpdate) {
      // Auto-update ON: check on startup + every 2 hours
      runUpdateCheck();
      updaterInterval = setInterval(runUpdateCheck, 2 * 60 * 60 * 1000);
    } else {
      // Auto-update OFF: only check every 7 days
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const lastCheck = parseInt(localStorage.getItem(LAST_UPDATE_CHECK_KEY) ?? '0', 10);
      const now = Date.now();
      if (now - lastCheck >= sevenDaysMs) {
        localStorage.setItem(LAST_UPDATE_CHECK_KEY, String(now));
        runUpdateCheck();
      }
      updaterInterval = setInterval(() => {
        localStorage.setItem(LAST_UPDATE_CHECK_KEY, String(Date.now()));
        runUpdateCheck();
      }, sevenDaysMs);
    }

    invoke<string>('get_local_ip')
      .then((ip) => { if (mounted) setLocalIp(ip); })
      .catch(() => undefined);

    ensureLocalWorkspace()
      .then(async (nextContext) => {
        if (!mounted) return;
        setContext(nextContext);
        setBootstrapError('');
        const hydrated = hydrateStoredWorkspaces(
          nextContext.workspace ?? null, appSettings.guardrails, appSettings.defaultProjectRootPath,
        );
        setWorkspaces(hydrated.workspaces);
        if (hydrated.workspaces.length === 0) {
          setActiveWorkspaceId(null);
          setMainView('lobby');
        } else {
          setActiveWorkspaceId(hydrated.activeWorkspaceId);
        }
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setBootstrapError(error.message);
        setContext({ user: { id: 'local', name: 'Local Developer', email: 'local@proxync.dev' } });
        const fallback = hydrateStoredWorkspaces(null, appSettings.guardrails, appSettings.defaultProjectRootPath);
        setWorkspaces(fallback.workspaces);
        if (fallback.workspaces.length === 0) {
          setActiveWorkspaceId(null);
          setMainView('lobby');
        } else {
          setActiveWorkspaceId(fallback.activeWorkspaceId);
        }
      });
    return () => { mounted = false; if (updaterInterval) clearInterval(updaterInterval); };
  }, [appSettings.defaultProjectRootPath, appSettings.guardrails, appSettings.autoUpdate]);

  useEffect(() => { void discoverProcesses(); }, []);

  /* ── Network Online/Offline Status Notification ── */
  useEffect(() => {
    if (!navigator.onLine) {
      showToast(
        '⚠️ You are currently offline. Cloud tunnels (Cloudflare & Localtunnel) require internet connection. Local network sharing is active.',
        'warning'
      );
    }

    const handleOffline = () => {
      showToast(
        '⚠️ Network disconnected: You are offline. Cloud tunnels require internet connection.',
        'warning'
      );
    };

    const handleOnline = () => {
      showToast(
        '🌐 Network connected: Back online! Cloud tunnels (Cloudflare & Localtunnel) are ready.',
        'success'
      );
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEscape(() => setAuthDialogOpen(false), authDialogOpen);

  useEffect(() => {
    if (workspaces.length === 0) {
      localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify([]));
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      return;
    }
    if (!activeWorkspaceId) return;
    localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(workspaces));
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    const theme = appSettings.theme ?? 'slate';
    document.body.classList.forEach((cls) => {
      if (cls.startsWith('theme-')) {
        document.body.classList.remove(cls);
      }
    });
    document.body.classList.add(`theme-${theme}`);
  }, [appSettings.theme]);

  useEffect(() => {
    if (!activeWorkspace) return;
    setSavedRequests(activeWorkspace.savedRequests);
    setRequests((current) => (current.length > 0 ? current : (activeWorkspace.capturedRequests || [])));
    setStarterSuggestions(activeWorkspace.savedRequests.filter((r) => r.source === 'starter-scan'));
    if (activeWorkspace.remoteWorkspaceId) {
      localStorage.setItem('proxync_workspace', activeWorkspace.remoteWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspace) return;
    const now = new Date().toISOString();
    setWorkspaces((current) =>
      current.map((ws) =>
        ws.id === activeWorkspace.id
          ? { ...ws, savedRequests, capturedRequests: requests, languageHint: effectiveLanguageHint, lastActivityAt: now }
          : ws,
      ),
    );
  }, [savedRequests, requests, effectiveLanguageHint]);

  useEffect(() => {
    let unlistenRequest: (() => void) | undefined;
    let unlistenResponse: (() => void) | undefined;
    let unlistenClosed: (() => void) | undefined;
    async function bindEvents() {
      unlistenRequest = await listen<any>('request:log', (event) => {
        const payload = event.payload;
        let method = (payload.method || 'GET').toUpperCase();
        let path = payload.path || '/';

        if (method.includes('/')) {
          path = method;
          method = 'GET';
        }

        const cleanPath = path.toLowerCase();
        const isHmrNoise = cleanPath.includes('_next/webpack-hmr') ||
                           cleanPath.includes('__vite_ping') ||
                           cleanPath.includes('hot-update') ||
                           cleanPath.includes('favicon.ico');

        if (isHmrNoise) return;

        const rawRequestId = payload.id || payload.requestId || '';
        const item: RequestLog & { rawRequestId?: string } = {
          id: crypto.randomUUID(),
          rawRequestId,
          method,
          path,
          status: payload.status || 'pending',
          durationMs: payload.durationMs || null,
          headers: payload.headers,
          bodyPreview: payload.bodyPreview || payload.body,
          capturedAt: new Date().toISOString(),
        };
        setRequests((current) => [item, ...current].slice(0, 150));
      });
      unlistenResponse = await listen<any>('request:log:response', (event) => {
        const payload = event.payload;
        const targetId = payload.id || payload.requestId;
        if (!targetId) return;
        setRequests((current) =>
          current.map((r: any) => (r.id === targetId || r.rawRequestId === targetId) ? { ...r, status: payload.status, durationMs: payload.durationMs || r.durationMs } : r),
        );
      });
      unlistenClosed = await listen<{ tunnelId: string }>('tunnel:auto-closed', (event) => {
        setTunnels((current) => current.map((t) => t.id === event.payload.tunnelId ? { ...t, status: 'CLOSED' } : t));
        setActiveTunnel((current) => current?.id === event.payload.tunnelId ? null : current);
        showToast('Local process stopped. Tunnel closed.', 'info');
      });
    }
    void bindEvents();
    return () => { unlistenRequest?.(); unlistenResponse?.(); unlistenClosed?.(); };
  }, []);

  useEffect(() => {
    if (!activeWorkspace?.remoteWorkspaceId || !activeTunnel) return;
    api.requests.list(activeWorkspace.remoteWorkspaceId, activeTunnel.id)
      .then((history) => setRequests(history)).catch(() => undefined);
  }, [activeTunnel, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspace?.remoteWorkspaceId) { setDomains([]); return; }
    setLoadingDomains(true);
    api.domains.list().then((items) => setDomains(items)).catch(() => setDomains([])).finally(() => setLoadingDomains(false));
  }, [activeWorkspace?.remoteWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspace?.remoteWorkspaceId) { setTunnels([]); setActiveTunnel(null); return; }
    api.tunnels.list(activeWorkspace.remoteWorkspaceId)
      .then((existing) => {
        setTunnels(existing);
        const active = existing.find((t) => t.status === 'ACTIVE');
        if (active) { setActiveTunnel(active); setSelectedProcessId(`port-${active.localPort}`); }
        else { setActiveTunnel(null); }
      })
      .catch(() => { setTunnels([]); setActiveTunnel(null); });
  }, [activeWorkspace?.remoteWorkspaceId]);

  /* ── Action handlers ── */

  async function discoverProcesses(bypassCache: boolean = false) {
    setDiscovering(true);
    try {
      const discovered = await readNativeProcesses(bypassCache);
      setProcesses(discovered);
      if (!selectedProcessId && discovered[0]) setSelectedProcessId(discovered[0].id);
      showToast(discovered.length > 0 ? `Discovered ${discovered.length} local process${discovered.length === 1 ? '' : 'es'}` : 'No local development ports found', discovered.length > 0 ? 'success' : 'info');

      // Async ping/latency check for all discovered processes
      const withLatency = await Promise.all(
        discovered.map(async (p) => {
          const latency = await measureLocalPortLatency(p.port);
          return { ...p, latency };
        })
      );
      setProcesses(withLatency);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Process discovery failed', 'error');
    } finally { setDiscovering(false); }
  }

  async function createWorkspace() {
    const name = newWorkspaceName.trim();
    if (!name) return;
    let remoteWorkspaceId: string | undefined;
    if (context && context.workspace && context.workspace.id !== 'local') {
      try { const remote = await api.workspaces.create(name); remoteWorkspaceId = remote.id; } catch { remoteWorkspaceId = undefined; }
    }
    const workspace = createWorkspaceConfig(name, remoteWorkspaceId, appSettings.guardrails, appSettings.defaultProjectRootPath);
    setWorkspaces((current) => [workspace, ...current]);
    setActiveWorkspaceId(workspace.id);
    setNewWorkspaceName('');
    setMainView('welcome');
    showToast(`Workspace "${name}" created`, 'success');
  }

  function touchWorkspaceActivity(workspaceId: string) {
    const now = new Date().toISOString();
    setWorkspaces((current) =>
      current.map((w) => (w.id === workspaceId ? { ...w, lastActivityAt: now } : w))
    );
  }

  function selectWorkspace(workspaceId: string) {
    if (activeWorkspaceId !== workspaceId) {
      setActiveWorkspaceId(workspaceId);
      setActiveTunnel(null);
    }
    touchWorkspaceActivity(workspaceId);
    setMainView('process');
  }

  const [deletingWorkspace, setDeletingWorkspace] = useState<WorkspaceConfig | null>(null);

  function initiateDeleteWorkspace(workspaceId: string) {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setDeletingWorkspace(ws);
    }
  }

  async function confirmDeleteWorkspace(workspaceId: string) {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;

    if (activeTunnel && activeWorkspaceId === workspaceId) {
      try {
        await stopTunnel(activeTunnel);
      } catch (error) {
        console.error('Error stopping active tunnel on delete:', error);
      }
    }

    if (ws.remoteWorkspaceId) {
      try {
        await api.workspaces.delete(ws.remoteWorkspaceId);
      } catch (error: any) {
        showToast(error instanceof Error ? error.message : 'Unable to delete workspace on remote API', 'error');
      }
    }

    const remaining = workspaces.filter((w) => w.id !== workspaceId);
    setWorkspaces(remaining);
    localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(remaining));

    if (activeWorkspaceId === workspaceId) {
      setTunnels([]);
      setActiveTunnel(null);
      setSelectedProcessId(null);
      setRequests([]);
      setStarterSuggestions([]);
      setSavedRequests([]);
      if (remaining.length > 0) {
        setActiveWorkspaceId(remaining[0].id);
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, remaining[0].id);
        setMainView('welcome');
      } else {
        setActiveWorkspaceId(null);
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        setMainView('lobby');
      }
    }
    showToast(`Workspace "${ws.name}" completely deleted`, 'success');
  }

  async function purgeWorkspace(workspaceId: string) {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    const confirmPurge = window.confirm(`Are you sure you want to purge workspace "${ws.name}"? This will terminate all active shared processes and clear all data related to the workspace.`);
    if (!confirmPurge) return;

    if (activeTunnel && activeWorkspaceId === workspaceId) {
      try {
        await stopTunnel(activeTunnel);
      } catch (error) {
        console.error('Error stopping active tunnel on purge:', error);
      }
    }

    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return {
          id: w.id,
          name: w.name,
          remoteWorkspaceId: w.remoteWorkspaceId,
          profiles: [],
          savedRequests: [],
          capturedRequests: [],
          domains: [],
          guardrails: { ...DEFAULT_GUARDRAILS },
          languageHint: 'Undetermined',
          selectedProfileId: undefined,
          projectRootPath: '',
          scannedFiles: [],
          notes: '',
          lastSwaggerGeneratedAt: new Date().toISOString(),
        };
      }
      return w;
    });

    setWorkspaces(updated);
    localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(updated));

    if (activeWorkspaceId === workspaceId) {
      setTunnels([]);
      setActiveTunnel(null);
      setSelectedProcessId(null);
      setRequests([]);
      setStarterSuggestions([]);
      setSavedRequests([]);
      setMainView('welcome');
    }
    showToast(`Workspace "${ws.name}" successfully purged`, 'success');
  }

  function updateActiveWorkspace(mutator: (workspace: WorkspaceConfig) => WorkspaceConfig) {
    if (!activeWorkspace) return;
    const now = new Date().toISOString();
    setWorkspaces((current) => current.map((ws) => ws.id === activeWorkspace.id ? { ...mutator(ws), lastActivityAt: now } : ws));
  }

  function initiatePublicShare(process: ProcessCandidate) {
    if (!activeWorkspace) {
      showToast('Select or create a workspace first before sharing a port', 'info');
      return;
    }
    setSharingProcessCandidate(process);
  }



  async function shareProcessCloudflare(process: ProcessCandidate) {
    if (!activeWorkspace) return;
    const isConnected = await checkRealInternetConnection();
    if (!isConnected) {
      showToast('⚠️ No internet connection detected. Cloudflare Tunnel requires an active internet connection. Please connect to the internet and try again.', 'error');
      return;
    }
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));

    const targetWorkspaceId = activeWorkspace.remoteWorkspaceId || activeWorkspace.id;
    const token = getToken();

    setSharingPort(process.port);
    try {
      localStorage.setItem('proxync_workspace', targetWorkspaceId);
      const tunnel = await api.tunnels.create(targetWorkspaceId, process.port, 'http', undefined);
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;
      await invoke('open_tunnel', { tunnelId: tunnel.id, localPort: process.port, token, workspaceId: targetWorkspaceId, relayUrl }).catch(() => undefined);

      const proxyPort = await invoke<number>('start_proxy', { localPort: process.port }).catch(() => process.port);
      showToast('Starting Cloudflare Tunnel service...', 'info');
      const cfTunnelUrl = await invoke<string>('open_cloudflare_tunnel', { tunnelId: tunnel.id, localPort: proxyPort });

      const cloudflareBoundTunnel: Tunnel = { ...tunnel, publicUrl: cfTunnelUrl, subdomain: cfTunnelUrl.replace('https://', '').replace('.trycloudflare.com', '') };
      setActiveTunnel(cloudflareBoundTunnel);
      setTunnels((current) => [cloudflareBoundTunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false); setRequests([]);
      showToast(`Cloudflare Tunnel is active! URL: ${cfTunnelUrl}`, 'success');
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: cfTunnelUrl } : p) }));
    } catch (error) { showToast(error instanceof Error ? error.message : String(error), 'error'); }
    finally { setSharingPort(null); }
  }

  async function shareProcessLocaltunnel(process: ProcessCandidate, customSubdomain?: string) {
    if (!activeWorkspace) return;
    const isConnected = await checkRealInternetConnection();
    if (!isConnected) {
      showToast('⚠️ No internet connection detected. Localtunnel service requires an active internet connection. Please connect to the internet and try again.', 'error');
      return;
    }
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));

    const targetWorkspaceId = activeWorkspace.remoteWorkspaceId || activeWorkspace.id;
    const token = getToken();

    setSharingPort(process.port);
    try {
      localStorage.setItem('proxync_workspace', targetWorkspaceId);
      const tunnel = await api.tunnels.create(targetWorkspaceId, process.port, 'http', undefined);
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;
      await invoke('open_tunnel', { tunnelId: tunnel.id, localPort: process.port, token, workspaceId: targetWorkspaceId, relayUrl }).catch(() => undefined);
      const proxyPort = await invoke<number>('start_proxy', { localPort: process.port }).catch(() => process.port);
      const suggestedSub = customSubdomain || `${activeWorkspace.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${process.port}`;
      showToast('Starting localtunnel service...', 'info');
      const localtunnelUrl = await invoke<string>('open_localtunnel', { tunnelId: tunnel.id, localPort: proxyPort, subdomain: suggestedSub });
      const localtunnelBoundTunnel: Tunnel = { ...tunnel, publicUrl: localtunnelUrl, subdomain: localtunnelUrl.replace('https://', '').replace('.localtunnel.me', '') };
      setActiveTunnel(localtunnelBoundTunnel);
      setTunnels((current) => [localtunnelBoundTunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false); setRequests([]);
      showToast(`Localtunnel is active! URL: ${localtunnelUrl}`, 'success');
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: localtunnelUrl } : p) }));
    } catch (error) { showToast(error instanceof Error ? error.message : String(error), 'error'); }
    finally { setSharingPort(null); }
  }

  async function shareProcess(process: ProcessCandidate, customDomain?: string) {
    if (!activeWorkspace) return;
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));

    const targetWorkspaceId = activeWorkspace.remoteWorkspaceId || activeWorkspace.id;
    const token = getToken();

    setSharingPort(process.port);
    try {
      localStorage.setItem('proxync_workspace', targetWorkspaceId);
      const tunnel = await api.tunnels.create(targetWorkspaceId, process.port, 'http', undefined, customDomain);
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;
      await invoke('open_tunnel', { tunnelId: tunnel.id, localPort: process.port, token, workspaceId: targetWorkspaceId, relayUrl }).catch(() => undefined);
      setActiveTunnel(tunnel);
      setTunnels((current) => [tunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false); setRequests([]);
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: tunnel.publicUrl } : p) }));
      showToast(`Tunnel is live. Imported ${starterScan.length} starter requests into Playground.`, 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to share process', 'error'); }
    finally { setSharingPort(null); }
  }

  function shareProcessLocal(process: ProcessCandidate) {
    if (!activeWorkspace) {
      showToast('Select or create a workspace first before sharing a port', 'info');
      return;
    }
    touchWorkspaceActivity(activeWorkspace.id);
    setSelectedProcessId(process.id); setMainView('process'); setSharingPort(process.port);
    showToast(`Exposed local share at http://localhost:${process.port} and http://${localIp}:${process.port}`, 'success');
  }

  async function stopTunnel(tunnel: Tunnel) {
    if (!activeWorkspace) return;
    touchWorkspaceActivity(activeWorkspace.id);
    try {
      await invoke('close_tunnel', { tunnelId: tunnel.id }).catch(() => undefined);
      if (!tunnel.id.startsWith('lt-') && activeWorkspace.remoteWorkspaceId) { await api.tunnels.close(activeWorkspace.remoteWorkspaceId, tunnel.id); }
      setTunnels((current) => current.map((item) => item.id === tunnel.id ? { ...item, status: 'CLOSED' } : item));
      setActiveTunnel((current) => (current?.id === tunnel.id ? null : current));
      showToast('Tunnel stopped', 'info');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to stop tunnel', 'error'); }
  }

  function openRequestDetail(request: RequestLog) {
    setSelectedRequest(request);
  }

  function sendToPostman(request: RequestLog) {
    const nextRequest: SavedRequest = { id: `captured-${request.id}`, name: `${request.method} ${request.path}`, method: request.method, path: request.path, headers: request.headers ?? { 'Content-Type': 'application/json' }, body: request.bodyPreview ?? '', source: 'captured' };
    setDraftRequest(nextRequest);
    setSavedRequests((current) => mergeRequests(current, [nextRequest]));
    setSelectedRequest(null); setMainView('postman');
  }

  async function replayRequest(request: RequestLog) {
    const targetUrl = resolveTargetUrl(request.path);
    const startedAt = Date.now();

    try {
      let status = 200;
      let durationMs = 0;
      let resHeaders: Record<string, string> = {};

      try {
        const res = await invoke<{ status: number; headers: Record<string, string>; body: string }>('execute_http_request', {
          method: request.method,
          url: targetUrl,
          headers: request.headers || {},
          body: request.bodyPreview || null,
        });
        durationMs = Date.now() - startedAt;
        status = res.status;
        resHeaders = res.headers;
      } catch {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: ['GET', 'HEAD'].includes(request.method.toUpperCase()) ? undefined : (request.bodyPreview || undefined),
        });
        durationMs = Date.now() - startedAt;
        status = response.status;
        resHeaders = Object.fromEntries(response.headers.entries());
      }

      const replayedLog: RequestLog = {
        id: crypto.randomUUID(),
        method: request.method,
        path: request.path,
        status,
        durationMs,
        headers: request.headers,
        bodyPreview: request.bodyPreview,
        responseHeaders: resHeaders,
        capturedAt: new Date().toISOString(),
      };

      setRequests((current) => [replayedLog, ...current].slice(0, 150));
      showToast(`Replayed ${request.method} ${request.path} (${status})`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Replay failed', 'error');
    }
  }

  function resolveTargetUrl(rawPath: string): string {
    const trimmed = rawPath.trim();
    if (!trimmed) return 'http://localhost:3000';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      if (selectedProcess?.port) {
        return `http://localhost:${selectedProcess.port}${trimmed}`;
      }
      if (activeTunnel?.publicUrl) {
        const base = activeTunnel.publicUrl.replace(/\/+$/, '');
        return `${base}${trimmed}`;
      }
      return `http://localhost:4000${trimmed}`;
    }

    return `https://${trimmed}`;
  }

  async function runPostmanRequest() {
    setSendingRequest(true); setPostmanResponse(null);
    const startedAt = Date.now();
    const targetUrl = resolveTargetUrl(draftRequest.path);

    try {
      let status = 200;
      let durationMs = 0;
      let resHeaders: Record<string, string> = {};
      let bodyText = '';

      // Try native Rust HTTP executor first to bypass CORS completely
      try {
        const res = await invoke<{ status: number; headers: Record<string, string>; body: string }>('execute_http_request', {
          method: draftRequest.method,
          url: targetUrl,
          headers: draftRequest.headers || {},
          body: draftRequest.body || null,
        });
        durationMs = Date.now() - startedAt;
        status = res.status;
        resHeaders = res.headers;
        bodyText = res.body;
      } catch (err: any) {
        // Web browser mode fallback
        const response = await fetch(targetUrl, {
          method: draftRequest.method,
          headers: draftRequest.headers,
          body: ['GET', 'HEAD'].includes(draftRequest.method) ? undefined : draftRequest.body,
        });
        durationMs = Date.now() - startedAt;
        status = response.status;
        resHeaders = Object.fromEntries(response.headers.entries());
        bodyText = await response.text();
      }

      setPostmanResponse({ status, duration: durationMs, headers: resHeaders, body: bodyText });

      const newLog: RequestLog = {
        id: crypto.randomUUID(),
        method: draftRequest.method,
        path: targetUrl,
        status,
        durationMs,
        headers: draftRequest.headers,
        bodyPreview: draftRequest.body,
        capturedAt: new Date().toISOString(),
      };
      setRequests((current) => [newLog, ...current].slice(0, 150));
      showToast(`Request to ${targetUrl} completed (${status})`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Request failed', 'error');
    } finally {
      setSendingRequest(false);
    }
  }

  function saveDraftRequest() {
    const folder = draftRequest.collectionName || 'Default Collection';
    const saved: SavedRequest = {
      ...draftRequest,
      id: draftRequest.id === 'draft' ? crypto.randomUUID() : draftRequest.id,
      name: stripMethodPrefix(draftRequest.name.trim() || draftRequest.path) || draftRequest.path,
      collectionName: folder,
    };
    setSavedRequests((current) => mergeRequests(current, [saved]));
    setDraftRequest(saved);
    showToast(`Request saved to "${folder}"`, 'success');
  }

  function deleteSavedRequest(id: string) {
    setSavedRequests((current) => current.filter((r) => r.id !== id));
    showToast('Request removed from collection', 'info');
  }

  function updateSavedRequests(next: SavedRequest[]) {
    setSavedRequests(next);
  }

  function importStarterRequests() {
    if (starterSuggestions.length === 0) return;
    setSavedRequests((current) => mergeRequests(current, starterSuggestions));
    setDraftRequest(starterSuggestions[0]); setMainView('postman');
    showToast(`Loaded ${starterSuggestions.length} starter requests. Test the likely endpoints and refine from there.`, 'success');
  }

  function updateDraftHeader(rawHeaders: string) { setDraftRequest((current) => ({ ...current, headers: parseHeaderText(rawHeaders) })); }

  function updateGuardrails(patch: Partial<Guardrails>) {
    const nextGuardrails = { ...appSettings.guardrails, ...patch };
    setAppSettings((current) => ({ ...current, guardrails: nextGuardrails }));
    setWorkspaces((current) => current.map((ws) => ({ ...ws, guardrails: nextGuardrails })));
  }

  function updateWorkspaceSettings(workspaceId: string, patch: Partial<Pick<WorkspaceConfig, 'name' | 'notes'>>) {
    setWorkspaces((current) =>
      current.map((ws) => (ws.id === workspaceId ? { ...ws, ...patch } : ws)),
    );
    showToast('Workspace settings saved', 'success');
  }

  function updateProjectRootPath(projectRootPath: string) {
    setAppSettings((current) => ({ ...current, defaultProjectRootPath: projectRootPath }));
    if (!activeWorkspace) return;
    updateActiveWorkspace((ws) => ({ ...ws, projectRootPath }));
  }

  async function scanProjectFolder() {
    if (!activeWorkspace?.projectRootPath) { showToast('Add a project root path first', 'info'); return; }
    setScanningProject(true);
    try {
      const files = await invoke<string[]>('scan_directory', { path: activeWorkspace.projectRootPath });
      const inferredLanguage = inferLanguageFromFiles(files);
      updateActiveWorkspace((ws) => {
        const nextProfiles = ws.profiles.map((p) => {
          const nextP = { ...p };
          if (!nextP.directory || nextP.directory === 'unknown') {
            nextP.directory = ws.projectRootPath;
          }
          if (!nextP.executable || nextP.executable === 'unknown') {
            const lang = inferredLanguage.toLowerCase();
            if (lang.includes('ts') || lang.includes('js')) nextP.executable = 'node';
            else if (lang.includes('py')) nextP.executable = 'python';
            else if (lang.includes('go')) nextP.executable = 'go';
            else if (lang.includes('java')) nextP.executable = 'java';
          }
          return nextP;
        });
        return {
          ...ws,
          scannedFiles: files,
          languageHint: inferredLanguage,
          profiles: nextProfiles,
        };
      });
      showToast(`Scanned ${files.length} files. Language hint updated to ${inferredLanguage}.`, 'success');
      void discoverProcesses(true);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Project scan failed', 'error'); }
    finally { setScanningProject(false); }
  }

  function updateAppNotes(notes: string) { setAppSettings((current) => ({ ...current, notes })); }

  function updateTheme(theme: string) { setAppSettings((current) => ({ ...current, theme })); }

  function updateAutoUpdate(enabled: boolean) { setAppSettings((current) => ({ ...current, autoUpdate: enabled })); }

  function updateEnableDevTools(enabled: boolean) { setAppSettings((current) => ({ ...current, enableDevTools: enabled })); }

  function updateTelemetry(telemetry: 'enhanced' | 'basic') { setAppSettings((current) => ({ ...current, telemetry })); }

  async function addDomain() {
    if (!domainDraft.trim()) { showToast('Enter a domain name first', 'info'); return; }
    setBusyDomainId('new');
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspace?.id || 'local';
    try { const created = await api.domains.create(wsId, domainDraft.trim().toLowerCase()); setDomains((current) => [...current.filter((d) => d.id !== created.id), created]); setDomainDraft(''); showToast('Domain added successfully!', 'success'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to add domain', 'error'); }
    finally { setBusyDomainId(null); }
  }

  async function verifyDomain(domainId: string) {
    setBusyDomainId(domainId);
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspace?.id || 'local';
    try { const updated = await api.domains.verify(wsId, domainId); setDomains((current) => current.map((d) => (d.id === domainId ? updated : d))); showToast('Domain verification succeeded', 'success'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Verification failed', 'error'); }
    finally { setBusyDomainId(null); }
  }

  async function removeDomain(domainId: string) {
    setBusyDomainId(domainId);
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspace?.id || 'local';
    try { await api.domains.delete(wsId, domainId); setDomains((current) => current.filter((d) => d.id !== domainId)); showToast('Domain removed', 'success'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to remove domain', 'error'); }
    finally { setBusyDomainId(null); }
  }

  function clearTrafficLogs() {
    setRequests([]);
    if (activeWorkspace) {
      updateActiveWorkspace((ws) => ({ ...ws, capturedRequests: [] }));
    }
    showToast('Traffic logs cleared', 'info');
  }

  function copyText(value: string, message: string) {
    navigator.clipboard.writeText(value).then(() => showToast(message, 'success')).catch(() => showToast('Clipboard access failed', 'error'));
  }

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      if (!appSettings.enableDevTools) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, [appSettings.enableDevTools]);

  /* ══════════════════════════════════════════════
     RENDER — Reference-Matching Shell
     ══════════════════════════════════════════════ */

  const viewLabel = NAV_ITEMS.find((n) => n.view === mainView)?.label
    ?? (mainView === 'process' ? 'Process' : mainView === 'postman' ? 'Playground' : mainView === 'observability' ? 'Observability' : 'Proxync');

  return (
    <div className="app-frame flex flex-col h-screen w-screen overflow-hidden bg-surface">
      {/* ── Top Header Bar (48px) ── */}
      <header
        className="app-titlebar h-[48px] min-h-[48px] w-full flex items-center border-b border-outline-variant bg-surface px-4 justify-between select-none z-50 cursor-default"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.tagName !== 'BUTTON' &&
            target.tagName !== 'INPUT' &&
            target.tagName !== 'SELECT' &&
            !target.closest('button') &&
            !target.closest('input') &&
            !target.closest('select')
          ) {
            void getCurrentWindow().startDragging();
          }
        }}
      >
        <div className="flex items-center gap-6">
          <div className="app-brand flex items-center gap-2">
            <img src="/logo.svg" className="w-5 h-5 object-contain select-none" alt="Logo" />
            <span className="text-headline-sm font-bold text-on-surface">Proxync</span>
          </div>
          {viewLabel !== 'Explore' && (
            <>
              <span className="text-outline-variant">|</span>
              <span className="text-body-md text-on-surface-variant">{viewLabel}</span>
            </>
          )}
          <div className="app-search flex items-center bg-surface-container-low px-3 py-1 rounded border border-outline-variant">
            <span className="material-symbols-outlined text-outline text-[18px] mr-2">search</span>
            <input
              type="text"
              placeholder="Search workspaces..."
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-body-md w-48 placeholder:text-outline text-on-surface"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="window-controls flex items-center h-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              void getCurrentWindow().minimize();
            }}
            className="window-control window-control-hover text-on-surface-variant hover:text-on-surface cursor-pointer"
            title="Minimize"
            aria-label="Minimize"
          >
            <span className="material-symbols-outlined text-[12px]">remove</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              void getCurrentWindow().toggleMaximize();
            }}
            className="window-control window-control-hover text-on-surface-variant hover:text-on-surface cursor-pointer"
            title="Maximize"
            aria-label="Maximize"
          >
            <span className="material-symbols-outlined text-[11px]">check_box_outline_blank</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              void getCurrentWindow().close();
            }}
            className="window-control close-hover text-on-surface-variant cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
          </button>
        </div>
      </header>

      {/* ── Body: Sidebar + Content ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar (260px) ── */}
        <aside className="app-sidebar w-[260px] min-w-[260px] flex flex-col py-4 bg-surface-container-low border-r border-outline-variant z-40">
          <div className="px-6 mb-6">
            <h2 className="text-headline-sm font-bold text-primary">Proxync Engine</h2>
            <p className="text-code-sm text-on-surface-variant opacity-60">v0.2.0-stable</p>
          </div>

          {/* Active Workspace Selector Section */}
          <div className="px-6 mb-6">
            <p className="text-[11px] font-bold text-on-surface-variant/70 tracking-wider uppercase mb-2">Active Workspace</p>
            <div
              onClick={() => setMainView('lobby')}
              className="workspace-selector flex items-center justify-between border border-outline-variant bg-surface-container rounded-lg px-3.5 py-2.5 cursor-pointer hover:bg-surface-container-high transition-all text-sm text-on-surface select-none"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                <span className="truncate font-semibold text-sm">{activeWorkspace?.name ?? 'Select Workspace'}</span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">unfold_more</span>
            </div>
          </div>

          {/* Menu Items Section */}
          <div className="px-6 mb-2">
            <p className="text-[11px] font-bold text-on-surface-variant/70 tracking-wider uppercase">Menu</p>
          </div>

          <nav className="app-nav flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isSelected = mainView === item.view;
              const isDisabled = item.view !== 'lobby' && item.view !== 'settings' && item.view !== 'docs' && !activeWorkspace;
              return (
                <button
                  key={item.view}
                  disabled={isDisabled}
                  className={`nav-item flex items-center gap-3 px-6 py-2.5 w-full text-left transition-colors font-label-md text-label-md border-l-2 ${isSelected
                    ? 'active text-on-surface border-secondary-container bg-surface-container-high'
                    : 'text-on-surface-variant hover:bg-surface-container-highest border-l-2 border-transparent'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (item.view === 'settings') {
                      setSettingsSection('general');
                    }
                    setMainView(item.view);
                  }}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-outline-variant/30 space-y-1">
            <button onClick={() => openUrl("https://github.com/Inilax/Proxync/issues")}
              className="nav-item flex items-center gap-3 px-6 py-2.5 w-full text-left text-on-surface-variant hover:bg-surface-container-highest transition-colors font-label-md text-label-md cursor-pointer">
              <span className="material-symbols-outlined">help</span> Support
            </button>
            <div className="px-6 py-4 mt-2">
              <button
                onClick={() => setAuthDialogOpen(true)}
                className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 w-full rounded-lg text-xs font-bold font-label-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                Sign In
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* ── Main Content Area ── */}
          <main className="app-main flex-1 min-w-0 overflow-y-auto p-8 bg-surface-container-lowest">
            {mainView === 'lobby' && (
              <LobbyView workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} newWorkspaceName={newWorkspaceName} onWorkspaceNameChange={setNewWorkspaceName} onCreateWorkspace={createWorkspace} onSelectWorkspace={selectWorkspace} onDeleteWorkspace={initiateDeleteWorkspace} onPurgeWorkspace={purgeWorkspace} onUpdateWorkspace={updateWorkspaceSettings} searchQuery={searchQuery} requests={requests} />
            )}
            {mainView === 'welcome' && (
              <WelcomeView
                tunnels={tunnels}
                requests={requests}
                activeTunnel={activeTunnel}
                onDiscover={() => setDiscoverOpen(true)}
                onNavigateToCustomDomains={() => {
                  setSettingsSection('domains');
                  setMainView('settings');
                }}
                onStopTunnel={stopTunnel}
              />
            )}
            {mainView === 'process' && (
              <ProcessView workspace={activeWorkspace} process={selectedProcess} profile={selectedProfile} tunnel={activeTunnel} sharingPort={sharingPort} suggestions={starterSuggestions} hasVerifiedDomain={domains.some((d) => d.verified)} localIp={localIp} onDiscover={() => setDiscoverOpen(true)} onShare={initiatePublicShare} onShareLocal={shareProcessLocal} onStop={stopTunnel} onStopLocalShare={() => setSharingPort(null)} onCopy={copyText} onImportStarterRequests={importStarterRequests} />
            )}
            {mainView === 'traffic' && (
              <TrafficView requests={requests} activeTunnel={activeTunnel} onOpen={openRequestDetail} onSendToPostman={sendToPostman} onClear={clearTrafficLogs} />
            )}
            {mainView === 'postman' && (
              <PostmanView draft={draftRequest} savedRequests={savedRequests} response={postmanResponse} sending={sendingRequest} starterSuggestions={starterSuggestions} activeTunnel={activeTunnel} selectedProcessPort={selectedProcess?.port} onDraftChange={setDraftRequest} onHeaderTextChange={updateDraftHeader} onRun={runPostmanRequest} onSave={saveDraftRequest} onLoad={setDraftRequest} onImportStarterRequests={importStarterRequests} onDeleteRequest={deleteSavedRequest} onUpdateSavedRequests={updateSavedRequests} />
            )}
            {mainView === 'swagger' && (
              <SwaggerView
                document={openApiDocument}
                swaggerPanel={swaggerPanel}
                workspace={activeWorkspace}
                languageHint={effectiveLanguageHint}
                scannedEndpoints={scannedEndpoints}
                generating={generatingSwagger}
                onGenerateSpec={handleGenerateSwaggerSpec}
                onChangePanel={setSwaggerPanel}
                onCopy={(content, msg) => copyText(content || JSON.stringify(openApiDocument, null, 2), msg || 'OpenAPI JSON copied')}
                onExportPostman={(_collection) => {
                  const spec = (openApiDocument.paths && Object.keys(openApiDocument.paths).length > 0)
                    ? openApiDocument
                    : generateOpenApiSpec(
                        scannedEndpoints,
                        activeWorkspace?.capturedRequests ?? [],
                        activeWorkspace?.name ?? 'Workspace',
                        effectiveLanguageHint
                      );
                  const importedReqs = importSwaggerToSavedRequests(spec);
                  if (importedReqs.length > 0) {
                    updateSavedRequests(mergeRequests(savedRequests, importedReqs));
                    showToast(`Exported ${importedReqs.length} endpoints to Postman Collections`, 'success');
                  } else {
                    showToast('Exported spec to Postman Collections', 'success');
                  }
                  setMainView('postman');
                }}
                onImportSpec={(importedDoc) => {
                  setOpenApiDocument(importedDoc);
                  showToast('Imported OpenAPI Spec', 'success');
                }}
              />
            )}
            {mainView === 'docs' && (
              <DocsView />
            )}
            {mainView === 'observability' && (
              <ObservabilityView
                workspace={activeWorkspace}
                process={selectedProcess}
                tunnel={activeTunnel}
                requests={requests}
                telemetryMode={appSettings.telemetry ?? 'enhanced'}
                onNavigateView={setMainView}
                onOpenDetail={openRequestDetail}
                onSendToPostman={sendToPostman}
                onReplayRequest={replayRequest}
              />
            )}
            {mainView === 'settings' && (
              <SettingsView workspace={activeWorkspace} appSettings={appSettings} domains={domains} domainDraft={domainDraft} loadingDomains={loadingDomains} busyDomainId={busyDomainId} scanningProject={scanningProject} onUpdateGuardrails={updateGuardrails} onUpdateAppNotes={updateAppNotes} onUpdateProjectRootPath={updateProjectRootPath} onScanProjectFolder={scanProjectFolder} onDomainDraftChange={setDomainDraft} onAddDomain={addDomain} onVerifyDomain={verifyDomain} onRemoveDomain={removeDomain} onUpdateTheme={updateTheme} onUpdateAutoUpdate={updateAutoUpdate} onUpdateTelemetry={updateTelemetry} onUpdateEnableDevTools={updateEnableDevTools} initialSection={settingsSection} />
            )}
          </main>

          {/* ── Global Console Drawer ── */}
          {terminalOpen && (
            <div
              style={{ height: `${terminalHeight}px` }}
              className="w-full bg-black border-t border-outline-variant flex flex-col overflow-hidden relative shrink-0 z-40"
            >
              {/* Resize Handle */}
              <div
                onMouseDown={startResize}
                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/40 transition-colors z-50"
              />

              {/* Console Header */}
              <div className="flex items-center justify-between px-4 py-1.5 bg-surface-container-low border-b border-outline-variant/30 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">terminal</span>
                  <span className="font-label-md text-[10px] uppercase tracking-widest text-primary font-bold">
                    Console Output
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    onClick={() => setRequests([])}
                    className="material-symbols-outlined text-on-surface-variant text-[16px] cursor-pointer hover:text-on-surface"
                    title="Clear Logs"
                  >
                    delete
                  </span>
                  <span
                    onClick={() => {
                      const logText = requests.map(req => `[${req.method}] ${req.path} — ${req.status || '200'}`).join('\n');
                      navigator.clipboard.writeText(logText);
                      showToast('Console logs copied!', 'success');
                    }}
                    className="material-symbols-outlined text-on-surface-variant text-[16px] cursor-pointer hover:text-on-surface"
                    title="Copy Logs"
                  >
                    content_copy
                  </span>
                  <span
                    onClick={() => setTerminalOpen(false)}
                    className="material-symbols-outlined text-on-surface-variant text-[16px] cursor-pointer hover:text-on-surface"
                    title="Close Console"
                  >
                    close
                  </span>
                </div>
              </div>

              {/* Console logs */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed text-on-surface select-text bg-[#030303]">
                {requests.length === 0 ? (
                  <div className="space-y-1 opacity-75">
                    <div className="flex gap-3">
                      <span className="text-outline opacity-50 shrink-0">12:04:10</span>
                      <span className="text-secondary shrink-0">[SYS]</span>
                      <span>Initializing Proxync Core v2.4.0...</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-outline opacity-50 shrink-0">12:04:12</span>
                      <span className="text-primary shrink-0">[RUN]</span>
                      <span className="text-primary">scanning local dev servers...</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-outline opacity-50 shrink-0">12:04:14</span>
                      <span className="text-secondary shrink-0">[OK]</span>
                      <span className="font-bold">Ready to expose local tunnels.</span>
                    </div>
                    {tunnels.filter(t => t.status === 'ACTIVE').map((tunnel) => (
                      <div key={tunnel.id} className="flex gap-3">
                        <span className="text-outline opacity-50 shrink-0">12:04:14</span>
                        <span className="text-on-surface-variant shrink-0">[INF]</span>
                        <span className="text-primary underline cursor-pointer">{tunnel.publicUrl}</span>
                      </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <span className="text-primary">❯</span>
                      <span className="border-r-2 border-primary animate-pulse h-4 w-[2px]"></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {requests.slice(-50).map((req) => {
                      const isSuccess = Number(req.status) >= 200 && Number(req.status) < 400;
                      const logTime = req.capturedAt ? new Date(req.capturedAt).toTimeString().split(' ')[0] : '12:04:10';
                      return (
                        <div key={req.id} className="flex gap-3">
                          <span className="text-outline opacity-50 shrink-0">
                            {logTime}
                          </span>
                          <span className={`shrink-0 font-bold ${req.method === 'GET' ? 'text-primary' : 'text-secondary'}`}>
                            [{req.method}]
                          </span>
                          <span className="text-on-surface-variant shrink-0 truncate max-w-md">{req.path}</span>
                          <span className={`shrink-0 ${isSuccess ? 'text-secondary' : 'text-error'}`}>
                            — {req.status || '200'}
                          </span>
                          {req.durationMs && (
                            <span className="text-outline shrink-0">({req.durationMs}ms)</span>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex gap-3 pt-2">
                      <span className="text-primary">❯</span>
                      <span className="border-r-2 border-primary animate-pulse h-4 w-[2px]"></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Status Footer (24px) ── */}
      <footer className="app-footer h-6 min-h-6 w-full flex justify-between items-center px-3 border-t border-outline-variant bg-surface-container-lowest text-code-sm select-none z-50">
        <div className="flex items-center gap-4 text-secondary">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${activeTunnel ? 'bg-primary animate-pulse' : 'bg-outline'}`} />
            {activeTunnel ? `Connected: ${new URL(activeTunnel.publicUrl).hostname}` : 'Disconnected'}
          </span>
          <span className="text-outline">|</span>
          <span className="hover:text-primary cursor-default transition-colors">Port {activeTunnel?.localPort ?? '—'}</span>
          <span className="hover:text-primary cursor-default transition-colors">Latency: 14ms</span>

          <span className="text-outline">|</span>
          <button
            onClick={() => setTerminalOpen(!terminalOpen)}
            className={`flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded ${terminalOpen ? 'bg-primary/20 text-primary font-bold' : 'hover:text-primary text-outline'
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            Console
          </button>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant opacity-60">
          <span>Encoding: UTF-8</span>
          <span className="text-primary font-bold">{bootstrapError ? 'OFFLINE' : 'STABLE'}</span>
        </div>
      </footer>

      {/* ── Overlays & Dialogs ── */}
      {panelView && <CompanionPanel panel={panelView} onClose={() => setPanelView(null)} />}

      {discoverOpen && (
        <DiscoverDialog processes={processes} discovering={discovering} sharingPort={sharingPort} onClose={() => setDiscoverOpen(false)} onRefresh={discoverProcesses} onShare={initiatePublicShare} onShareLocal={shareProcessLocal} />
      )}

      {sharingProcessCandidate && (
        <DomainSelectDialog
          process={sharingProcessCandidate}
          domains={domains.filter((d) => d.verified)}
          onClose={() => setSharingProcessCandidate(null)}
          onConfirm={(selectedOption, ltSubdomain) => {
            if (selectedOption === 'localtunnel') { void shareProcessLocaltunnel(sharingProcessCandidate, ltSubdomain); }
            else if (selectedOption === 'cloudflare') { void shareProcessCloudflare(sharingProcessCandidate); }
            else { void shareProcess(sharingProcessCandidate, selectedOption === 'default' ? undefined : selectedOption); }
            setSharingProcessCandidate(null);
          }}
        />
      )}

      {selectedRequest && (
        <RequestDetailDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} onReplay={replayRequest} onSendToPostman={sendToPostman} />
      )}

      {deletingWorkspace && (
        <ConfirmDeleteDialog
          workspaceName={deletingWorkspace.name}
          onClose={() => setDeletingWorkspace(null)}
          onConfirm={() => confirmDeleteWorkspace(deletingWorkspace.id)}
        />
      )}

      {authDialogOpen && (
        <div className="dialog-backdrop glass" onClick={() => setAuthDialogOpen(false)}>
          <section className="workspace-settings-dialog slide-up max-w-sm text-center p-8 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
              <span className="material-symbols-outlined text-[36px]">lock_person</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface">Coming Soon</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Sign in, team authentication, and cloud workspace syncing are currently under development. Stay tuned!
            </p>
            <button className="btn-primary w-full mt-2 cursor-pointer" onClick={() => setAuthDialogOpen(false)}>
              Got it
            </button>
          </section>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

/* ══════════════════════════════════════════════
   UTILITY FUNCTIONS (preserved from original)
   ══════════════════════════════════════════════ */

async function readNativeProcesses(bypassCache: boolean = false): Promise<ProcessCandidate[]> {
  try {
    const nativeProcesses = await invoke<ProcessCandidate[]>('scan_processes', { bypassCache });
    if (nativeProcesses.length > 0) return nativeProcesses;
  } catch { /* fall back */ }
  const ports = await invoke<number[]>('scan_ports').catch(() => []);
  return ports.map((port) => ({
    id: `port-${port}`, name: PORT_NAMES[port] ?? 'Development server', port,
    framework: PORT_NAMES[port] ?? 'HTTP', command: `localhost:${port}`,
    directory: 'unknown', executable: 'unknown', access: 'ready', uptime: 'live',
  }));
}

async function measureLocalPortLatency(port: number): Promise<number> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);

  try {
    await fetch(`http://127.0.0.1:${port}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return performance.now() - start;
  } catch (err: any) {
    clearTimeout(timeoutId);
    return Infinity;
  }
}

function hydrateStoredWorkspaces(remoteWorkspace: { id: string; name: string } | null, defaultGuardrails: Guardrails, defaultProjectRootPath: string) {
  const stored = localStorage.getItem(LOCAL_WORKSPACES_KEY);
  let parsed = stored ? (JSON.parse(stored) as WorkspaceConfig[]) : [];
  if (remoteWorkspace) {
    const exists = parsed.some((w) => w.remoteWorkspaceId === remoteWorkspace.id);
    if (!exists) {
      const initial = createWorkspaceConfig(remoteWorkspace.name, remoteWorkspace.id, defaultGuardrails, defaultProjectRootPath);
      parsed = [initial, ...parsed];
      localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(parsed));
    }
  }
  const activeWorkspaceId = localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? (parsed.length > 0 ? parsed[0].id : null);
  return { workspaces: parsed, activeWorkspaceId };
}

function createWorkspaceConfig(name: string, remoteWorkspaceId?: string, defaultGuardrails: Guardrails = DEFAULT_GUARDRAILS, defaultProjectRootPath = ''): WorkspaceConfig {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), name, remoteWorkspaceId, profiles: [], savedRequests: [],
    capturedRequests: [], domains: [], guardrails: { ...defaultGuardrails }, languageHint: 'Undetermined',
    selectedProfileId: undefined, projectRootPath: defaultProjectRootPath,
    scannedFiles: [], notes: '', lastSwaggerGeneratedAt: now,
    createdAt: now,
    lastActivityAt: now,
  };
}

function loadAppSettings(): AppSettings {
  const stored = localStorage.getItem(APP_SETTINGS_KEY);
  if (!stored) return { ...DEFAULT_APP_SETTINGS, guardrails: { ...DEFAULT_GUARDRAILS } };
  try {
    const parsed = JSON.parse(stored) as Partial<AppSettings>;
    return {
      guardrails: { ...DEFAULT_GUARDRAILS, ...(parsed.guardrails ?? {}) },
      defaultProjectRootPath: parsed.defaultProjectRootPath ?? '',
      notes: parsed.notes ?? '',
      theme: parsed.theme ?? 'slate',
      autoUpdate: parsed.autoUpdate ?? true,
      telemetry: parsed.telemetry ?? 'enhanced',
    };
  } catch { return { ...DEFAULT_APP_SETTINGS, guardrails: { ...DEFAULT_GUARDRAILS } }; }
}

function buildStarterRequests(process: ProcessCandidate): SavedRequest[] {
  const languageHint = detectLanguageLabel(process).toLowerCase();
  const presets = ['/', '/health', '/api/health', '/openapi.json', '/swagger-json'];
  if (process.framework?.toLowerCase().includes('vite')) { presets.push('/src/main.ts', '/@vite/client'); }
  if (languageHint.includes('javascript') || languageHint.includes('typescript')) { presets.push('/api', '/api/status', '/api/version'); }
  if (languageHint.includes('python')) { presets.push('/docs', '/redoc', '/openapi.json'); }
  if (languageHint.includes('java')) { presets.push('/actuator/health', '/v3/api-docs'); }
  return Array.from(new Set(presets)).map((path) => ({
    id: `starter-${process.id}-${path}`, name: `Probe ${path}`, method: 'GET', path,
    headers: { Accept: 'application/json' }, body: '', source: 'starter-scan',
  }));
}

function mergeRequests(current: SavedRequest[], incoming: SavedRequest[]): SavedRequest[] {
  const map = new Map<string, SavedRequest>();
  for (const r of [...incoming, ...current]) { map.set(`${r.method}:${r.path}:${r.name}`, r); }
  return Array.from(map.values());
}

function makeProfileId(process: ProcessCandidate) { return `${process.name}-${process.port}`.toLowerCase().replace(/\s+/g, '-'); }

function upsertProfile(profiles: ProcessProfile[], process: ProcessCandidate, starterRequestCount: number): ProcessProfile[] {
  const nextProfile: ProcessProfile = {
    id: makeProfileId(process), processName: process.name, port: process.port,
    framework: process.framework ?? 'HTTP', languageHint: detectLanguageLabel(process),
    command: process.command ?? process.name, directory: process.directory ?? 'unknown',
    executable: process.executable ?? 'unknown', lastSharedAt: new Date().toISOString(), starterRequestCount,
  };
  const existing = profiles.some((p) => p.id === nextProfile.id);
  if (existing) return profiles.map((p) => p.id === nextProfile.id ? { ...p, ...nextProfile } : p);
  return [nextProfile, ...profiles];
}

function detectLanguageLabel(process: Pick<ProcessCandidate, 'framework' | 'command' | 'directory'>) {
  const sig = `${process.framework ?? ''} ${process.command ?? ''} ${process.directory ?? ''}`.toLowerCase();
  if (sig.includes('node') || sig.includes('vite') || sig.includes('next') || sig.includes('react')) return 'TypeScript / JavaScript';
  if (sig.includes('django') || sig.includes('fastapi') || sig.includes('flask') || sig.includes('python')) return 'Python';
  if (sig.includes('spring') || sig.includes('java')) return 'Java';
  if (sig.includes('.net') || sig.includes('dotnet')) return '.NET';
  return 'Undetermined';
}

function inferLanguageFromFiles(files: string[]) {
  const counts = { ts: 0, js: 0, py: 0, java: 0, cs: 0, go: 0 };
  for (const file of files) {
    const lower = file.toLowerCase();
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) counts.ts += 1;
    if (lower.endsWith('.js') || lower.endsWith('.jsx')) counts.js += 1;
    if (lower.endsWith('.py')) counts.py += 1;
    if (lower.endsWith('.java')) counts.java += 1;
    if (lower.endsWith('.cs')) counts.cs += 1;
    if (lower.endsWith('.go')) counts.go += 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [winner, amount] = ranked[0];
  if (!amount) return 'Undetermined';
  const labels: Record<string, string> = { ts: 'TypeScript', js: 'JavaScript', py: 'Python', java: 'Java', cs: '.NET', go: 'Go' };
  return labels[winner] ?? 'Undetermined';
}






