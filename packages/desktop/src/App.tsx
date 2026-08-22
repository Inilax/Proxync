import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from "@tauri-apps/plugin-opener";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import './index.css';
import { ToastContainer, showToast, dismissToast } from './lib/toast';
import { scanCodebaseEndpoints, type ScannedEndpoint } from './lib/codebaseScanner';
import { generateOpenApiSpec, importSwaggerToSavedRequests, isNoiseOrScannerProbe } from './lib/openApiGenerator';
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
import { WorkspaceDashboardView } from './components/views/WorkspaceDashboardView';
import { LobbyView } from './components/views/LobbyView';
import { ProcessView } from './components/views/ProcessView';
import { TrafficView } from './components/views/TrafficView';
import { PostmanView } from './components/views/PostmanView';
import { SwaggerView } from './components/views/SwaggerView';
import { ObservabilityView } from './components/views/ObservabilityView';
import { SettingsView } from './components/views/SettingsView';
import { DocsView } from './components/views/DocsView';
import { DiscoverDialog, DomainSelectDialog, RequestDetailDialog, ConfirmDeleteDialog } from './components/views/Dialogs';
import { RequestWorkbenchDialog } from './components/views/RequestWorkbenchDialog';
import { TerminalDrawer, type TerminalLogEntry } from './components/ui/TerminalDrawer';
import type { WorkbenchTab, ExecutionRun } from './lib/types';
import {
  initLogger,
  setAppLogging,
  setTrafficLogging,
  logApp,
  logError,
  logTraffic,
  clearLogs,
} from './lib/logger';

/* ══════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════ */

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
  appLogging: true,
  trafficLogging: false,
};

const LOCAL_WORKSPACES_KEY = 'proxync_local_workspaces_v1';
const ACTIVE_WORKSPACE_KEY = 'proxync_local_active_workspace_v1';
const APP_SETTINGS_KEY = 'proxync_app_settings_v1';
const ACTIVE_TUNNEL_KEY = 'proxync_active_tunnel_v1';

/* ══════════════════════════════════════════════
   NAV CONFIG
   ══════════════════════════════════════════════ */

const NAV_CATEGORIES: {
  category: string;
  items: { view: MainView; label: string; icon: string }[];
}[] = [
    {
      category: 'OVERVIEW',
      items: [
        { view: 'welcome', label: 'Explore', icon: 'explore' },
        { view: 'workspace_dashboard', label: 'Workspace Hub', icon: 'space_dashboard' },
      ],
    },
    {
      category: 'DEVELOPMENT & NETWORK',
      items: [
        { view: 'process', label: 'Tunnels', icon: 'lan' },
        { view: 'traffic', label: 'Traffic', icon: 'terminal' },
        { view: 'postman', label: 'Playground', icon: 'send' },
        { view: 'workbench', label: 'Workbench', icon: 'bolt' },
        { view: 'swagger', label: 'Swagger', icon: 'api' },
      ],
    },
    {
      category: 'OBSERVABILITY & TOOLS',
      items: [
        { view: 'observability', label: 'Observability', icon: 'insights' },
        { view: 'docs', label: 'Docs', icon: 'menu_book' },
        { view: 'settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ];

async function checkRealInternetConnection(timeoutMs = 1200): Promise<boolean> {
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
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ponytail: merge incoming requests with existing local requests without wiping state (ceiling: 300 logs)
function mergeUniqueRequests(existing: RequestLog[], incoming: RequestLog[]): RequestLog[] {
  if (!incoming || incoming.length === 0) return existing;
  const existingIds = new Set(existing.map((r) => r.id || (r as any).rawRequestId));
  const newItems = incoming.filter((r) => {
    const key = r.id || (r as any).rawRequestId;
    return key && !existingIds.has(key);
  });
  if (newItems.length === 0) return existing;
  return [...existing, ...newItems]
    .sort((a, b) => new Date(b.capturedAt || 0).getTime() - new Date(a.capturedAt || 0).getTime())
    .slice(0, 300);
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
  const [activeTunnel, setActiveTunnel] = useState<Tunnel | null>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_TUNNEL_KEY);
      return stored ? (JSON.parse(stored) as Tunnel) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (activeTunnel) {
      localStorage.setItem(ACTIVE_TUNNEL_KEY, JSON.stringify(activeTunnel));
    } else {
      localStorage.removeItem(ACTIVE_TUNNEL_KEY);
    }
  }, [activeTunnel]);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [requests, setRequests] = useState<RequestLog[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_WORKSPACES_KEY);
      const parsed = stored ? (JSON.parse(stored) as WorkspaceConfig[]) : [];
      const all: RequestLog[] = [];
      const seen = new Set<string>();
      parsed.forEach((ws) => {
        (ws.capturedRequests || []).forEach((r) => {
          const key = r.id || (r as any).rawRequestId;
          if (key && !seen.has(key)) {
            seen.add(key);
            all.push(r);
          }
        });
      });
      return all.sort((a, b) => new Date(b.capturedAt || 0).getTime() - new Date(a.capturedAt || 0).getTime()).slice(0, 300);
    } catch {
      return [];
    }
  });
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
  const [settingsSection, setSettingsSection] = useState<'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger'>('general');

  /* ── Sidebar Responsive State (Icon-only default on small screens, full/user preference on desktop/maximize) ── */
  const SIDEBAR_DESKTOP_PREF_KEY = 'proxync_sidebar_desktop_collapsed_v1';

  const getDesktopSidebarPref = (): boolean => {
    try {
      const stored = localStorage.getItem(SIDEBAR_DESKTOP_PREF_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // On smaller screens (< 1024px), always default to icons only (true)
    if (window.innerWidth < 1024) return true;
    // On bigger screen / maximized (>= 1024px), show full or user preference from localStorage
    return getDesktopSidebarPref();
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      // Only persist manual user preference when toggled on desktop/maximized screens
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        try {
          localStorage.setItem(SIDEBAR_DESKTOP_PREF_KEY, String(next));
        } catch { }
      }
      return next;
    });
  };

  // Dynamically adapt on window resize (e.g. maximize / restore window)
  useEffect(() => {
    let wasSmall = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

    const handleResize = () => {
      const isSmall = window.innerWidth < 1024;
      if (isSmall !== wasSmall) {
        wasSmall = isSmall;
        if (isSmall) {
          // Entering small screen -> default to icon-only
          setSidebarCollapsed(true);
        } else {
          // Entering desktop / maximized -> restore full menu (or user desktop preference)
          setSidebarCollapsed(getDesktopSidebarPref());
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global hotkey Ctrl+B / Cmd+B for toggling sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          toggleSidebar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* ── 360° Request Workbench Studio & Terminal Drawer State ── */
  const WORKBENCH_TABS_STORAGE_KEY = 'proxync_workbench_tabs_v1';
  const [workbenchTabs, setWorkbenchTabs] = useState<WorkbenchTab[]>(() => {
    try {
      const saved = localStorage.getItem(WORKBENCH_TABS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as WorkbenchTab[]) : [];
    } catch {
      return [];
    }
  });
  const [activeWorkbenchTabId, setActiveWorkbenchTabId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(WORKBENCH_TABS_STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as WorkbenchTab[]) : [];
      return parsed[0]?.id || null;
    } catch {
      return null;
    }
  });
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([]);

  // Security-safe persistence: strip secrets & denylist headers, omit response bodies from disk
  useEffect(() => {
    try {
      const DENYLIST_HEADERS = ['cookie', 'set-cookie', 'proxy-authorization', 'x-api-key'];
      const sanitizeHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
        const clean: Record<string, string> = {};
        Object.entries(headers).forEach(([k, v]) => {
          const lk = k.toLowerCase();
          if (DENYLIST_HEADERS.includes(lk)) return;
          if (lk === 'authorization') {
            const parts = (v || '').trim().split(' ');
            const scheme = parts[0] || 'Bearer';
            clean[k] = `${scheme} [REDACTED]`;
            return;
          }
          clean[k] = v;
        });
        return clean;
      };

      const sanitizedTabs = workbenchTabs.map((t) => ({
        ...t,
        draftRequest: {
          ...t.draftRequest,
          headers: sanitizeHeaders(t.draftRequest.headers),
        },
        requestLog: t.requestLog
          ? {
            ...t.requestLog,
            headers: sanitizeHeaders(t.requestLog.headers),
            responseHeaders: sanitizeHeaders(t.requestLog.responseHeaders),
            bodyPreview: '',
          }
          : undefined,
        executionHistory: t.executionHistory.map((run) => ({
          ...run,
          headers: sanitizeHeaders(run.headers),
          body: '',
        })),
        lastResponse: null,
      }));
      localStorage.setItem(WORKBENCH_TABS_STORAGE_KEY, JSON.stringify(sanitizedTabs));
    } catch {
      // Ignore localStorage write quota exceptions
    }
  }, [workbenchTabs]);

  const [discovering, setDiscovering] = useState(false);
  const [sharingPort, setSharingPort] = useState<number | null>(null);
  const [spawningPorts, setSpawningPorts] = useState<number[]>([]);

  const addSpawningPort = useCallback((port: number) => {
    setSpawningPorts((prev) => (prev.includes(port) ? prev : [...prev, port]));
    setSharingPort(port);
  }, []);

  const removeSpawningPort = useCallback((port: number) => {
    setSpawningPorts((prev) => {
      const next = prev.filter((p) => p !== port);
      setSharingPort(next[0] ?? null);
      return next;
    });
  }, []);
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

  const effectiveProjectRoot = useMemo(() => {
    if (selectedProcess?.directory && selectedProcess.directory.trim() !== '' && selectedProcess.directory !== 'unknown') {
      return selectedProcess.directory.trim();
    }
    if (selectedProfile?.directory && selectedProfile.directory.trim() !== '' && selectedProfile.directory !== 'unknown') {
      return selectedProfile.directory.trim();
    }
    if (activeWorkspace?.projectRootPath && activeWorkspace.projectRootPath.trim() !== '') {
      return activeWorkspace.projectRootPath.trim();
    }
    return '';
  }, [activeWorkspace, selectedProcess, selectedProfile]);

  const [scannedEndpoints, setScannedEndpoints] = useState<ScannedEndpoint[]>([]);
  const [openApiDocument, setOpenApiDocument] = useState<Record<string, unknown>>(() =>
    generateOpenApiSpec([], [], 'Proxync Workspace', 'HTTP Server')
  );
  const [generatingSwagger, setGeneratingSwagger] = useState<boolean>(false);

  // Auto-scan codebase endpoints when effective project root is detected or changed
  useEffect(() => {
    if (!effectiveProjectRoot) return;
    scanCodebaseEndpoints(effectiveProjectRoot, activeWorkspace?.scannedFiles)
      .then((eps) => {
        if (eps && eps.length > 0) {
          setScannedEndpoints(eps);
          console.log(`[Codebase Scanner] Auto-scanned ${eps.length} endpoints for ${effectiveProjectRoot}`);
        }
      })
      .catch(() => { });
  }, [effectiveProjectRoot, activeWorkspace?.scannedFiles]);

  const openRequestInWorkbench = useCallback((req: RequestLog | SavedRequest | { method: string; path: string }) => {
    const method = req.method.toUpperCase();
    const path = req.path;

    const targetPort =
      'port' in req && req.port
        ? req.port
        : 'tunnelId' in req && req.tunnelId
          ? tunnels.find((t) => t.id === req.tunnelId)?.localPort
          : undefined;

    if (targetPort) {
      const matchingProc = processes.find((p) => p.port === targetPort);
      if (matchingProc) {
        setSelectedProcessId(matchingProc.id);
      }
    }

    const existing = workbenchTabs.find((t) => t.method === method && t.path === path);
    const requestLog: RequestLog | undefined = 'capturedAt' in req ? req : undefined;

    if (existing) {
      if (requestLog) {
        const rawStatus = typeof requestLog.status === 'number' ? requestLog.status : parseInt(String(requestLog.status || 200), 10);
        const newRun: ExecutionRun = {
          id: `run-${existing.id}-${Date.now()}`,
          runIndex: existing.executionHistory.length + 1,
          timestamp: requestLog.capturedAt || new Date().toISOString(),
          status: rawStatus,
          durationMs: requestLog.durationMs || 12,
          headers: requestLog.responseHeaders || { 'Content-Type': 'application/json' },
          body: requestLog.bodyPreview || `[Captured HTTP ${rawStatus} Log]`,
          note: `Captured Traffic Log (${rawStatus})`,
        };

        setWorkbenchTabs((current) =>
          current.map((t) =>
            t.id === existing.id
              ? {
                ...t,
                requestLog,
                draftRequest: {
                  ...t.draftRequest,
                  headers: requestLog.headers || t.draftRequest.headers,
                  body: requestLog.bodyPreview !== undefined ? requestLog.bodyPreview : t.draftRequest.body,
                },
                executionHistory: [newRun, ...t.executionHistory.filter((r) => r.id !== newRun.id)],
                lastResponse: {
                  status: rawStatus,
                  duration: requestLog.durationMs || 12,
                  headers: requestLog.responseHeaders || {},
                  body: requestLog.bodyPreview || '',
                },
              }
              : t
          )
        );
      }
      setActiveWorkbenchTabId(existing.id);
      setMainView('workbench');
      return;
    }


    const tabId = crypto.randomUUID();
    const draftRequest: SavedRequest = 'source' in req ? req : {
      id: `draft-${tabId}`,
      name: `${method} ${path}`,
      method,
      path,
      headers: 'headers' in req && req.headers ? req.headers : { 'Content-Type': 'application/json' },
      body: 'bodyPreview' in req ? req.bodyPreview ?? '' : 'body' in req ? String(req.body ?? '') : '',
      source: 'captured',
    };

    const newTab: WorkbenchTab = {
      id: tabId,
      title: `${method} ${path}`,
      method,
      path,
      requestLog,
      draftRequest,
      activeSubTab: 'devtools',
      authSyncedState: 'unsynced',
      executionHistory: requestLog
        ? [
          {
            id: `run-${tabId}-1`,
            runIndex: 1,
            timestamp: requestLog.capturedAt || new Date().toISOString(),
            status: typeof requestLog.status === 'number' ? requestLog.status : parseInt(String(requestLog.status || 200), 10),
            durationMs: requestLog.durationMs || 12,
            headers: requestLog.responseHeaders || { 'Content-Type': 'application/json' },
            body: requestLog.bodyPreview || '{\n  "status": "initial captured log"\n}',
            note: 'Captured Log Intercept',
          },
        ]
        : [],
    };

    setWorkbenchTabs((current) => [...current, newTab]);
    setActiveWorkbenchTabId(tabId);
    setMainView('workbench');

    if (effectiveProjectRoot && scannedEndpoints.length === 0) {
      scanCodebaseEndpoints(effectiveProjectRoot, activeWorkspace?.scannedFiles)
        .then((eps) => {
          if (eps && eps.length > 0) {
            setScannedEndpoints(eps);
          }
        })
        .catch(() => { });
    }
  }, [workbenchTabs, effectiveProjectRoot, scannedEndpoints, activeWorkspace]);

  const handleGenerateSwaggerSpec = async (targetPort?: number) => {

    setGeneratingSwagger(true);
    try {
      let endpoints: ScannedEndpoint[] = scannedEndpoints;
      if (effectiveProjectRoot) {
        endpoints = await scanCodebaseEndpoints(effectiveProjectRoot, activeWorkspace?.scannedFiles);
        setScannedEndpoints(endpoints);
      }


      // Filter requests if targetPort is specified and exclude noise/bot scanner probes
      const filteredByPort = targetPort
        ? requests.filter((r) => r.port === targetPort || (!r.port && activeTunnel?.localPort === targetPort))
        : requests;

      const validTargetRequests = filteredByPort.filter(
        (r) => !isNoiseOrScannerProbe(r.path, r.bodyPreview, r.headers) && r.status !== 'pending' && r.status !== 502 && r.status !== 503 && r.status !== 404 && r.status !== '404' && r.status !== '502'
      );

      console.log(
        `[Swagger Engine] Generating OpenAPI Spec for Port :${targetPort || 'ALL'} — ` +
        `Processing ${validTargetRequests.length} valid requests (Filtered ${filteredByPort.length - validTargetRequests.length} scanner probes/errors).`
      );

      // Construct live server URLs dynamically
      const serverList: { url: string; description: string }[] = [];

      if (targetPort) {
        const matchingTunnel = tunnels.find((t) => t.localPort === targetPort && t.status === 'ACTIVE') || (activeTunnel?.localPort === targetPort ? activeTunnel : null);
        if (matchingTunnel?.publicUrl) {
          serverList.push({ url: matchingTunnel.publicUrl, description: `Proxync Tunnel (${matchingTunnel.subdomain || `Port ${targetPort}`})` });
        }
        serverList.push({ url: `http://localhost:${targetPort}`, description: `Local Dev Server (Port ${targetPort})` });
      } else {
        // Multi-server: add all active tunnels
        tunnels.filter((t) => t.status === 'ACTIVE').forEach((t) => {
          serverList.push({ url: t.publicUrl, description: `Proxync Tunnel (Port ${t.localPort}${t.subdomain ? ` - ${t.subdomain}` : ''})` });
        });
        // Add discovered processes
        processes.forEach((p) => {
          serverList.push({ url: `http://localhost:${p.port}`, description: `${p.name || 'Local Server'} (Port ${p.port})` });
        });
      }

      const spec = generateOpenApiSpec(
        endpoints,
        validTargetRequests,
        activeWorkspace?.name ?? 'Proxync Workspace',
        effectiveLanguageHint,
        serverList,
        openApiDocument
      );
      setOpenApiDocument(spec);
      const pathCount = Object.keys((spec.paths as any) || {}).length;
      logApp('SCANNER', 'INFO', `Generated OpenAPI spec (${pathCount} endpoint${pathCount === 1 ? '' : 's'}${targetPort ? ` for Port :${targetPort}` : ''})`);
      showToast(
        `Generated OpenAPI Spec (${pathCount} endpoint${pathCount === 1 ? '' : 's'}${targetPort ? ` for Port :${targetPort}` : ''})`,
        'success'
      );
    } catch (err: any) {
      logApp('SCANNER', 'ERROR', 'Failed to generate OpenAPI spec', err);
      showToast(err instanceof Error ? err.message : 'Failed to generate OpenAPI spec', 'error');
    } finally {
      setGeneratingSwagger(false);
    }
  };

  const handleClearSwaggerSpec = () => {
    const activeServerList: { url: string; description: string }[] = [];
    if (activeTunnel?.publicUrl) {
      activeServerList.push({
        url: activeTunnel.publicUrl,
        description: `Active Proxync Tunnel (${activeTunnel.subdomain || `Port ${activeTunnel.localPort}`})`,
      });
      activeServerList.push({
        url: `http://localhost:${activeTunnel.localPort}`,
        description: `Local Server (Port ${activeTunnel.localPort})`,
      });
    }
    setOpenApiDocument(
      generateOpenApiSpec([], [], activeWorkspace?.name ?? 'Proxync Workspace', effectiveLanguageHint, activeServerList)
    );
    logApp('SCANNER', 'INFO', 'Cleared OpenAPI specification routes');
    showToast('OpenAPI specification cleared — ready for new routes', 'info');
  };



  /* ── Effects ── */

  const SKIP_UPDATE_KEY = 'proxync_skipped_update_version';
  const LAST_UPDATE_CHECK_KEY = 'proxync_last_update_check_ts';

  // ── Semver Force-Update Helper ────────────────────────────────────
  function isForceUpdate(current: string, next: string): boolean {
    const parse = (v: string) => v.split('.').map(Number);
    const [curMajor, curMinor] = parse(current);
    const [nxtMajor, nxtMinor] = parse(next);
    return nxtMajor > curMajor || nxtMinor > curMinor;
  }

  // ── Emergency Security / CVE Update Detection Helper ──────────────
  // Detects explicit [SECURITY-CVE] tag in GitHub release notes or critical flag
  function isCriticalSecurityUpdate(update: any): boolean {
    if (!update) return false;
    if (update.critical === true || update.cve === true) return true;
    const body = (update.body || '').toUpperCase();
    return (
      body.includes('[SECURITY-CVE]') ||
      body.includes('[TYPE: CVE-PATCH]') ||
      body.includes('[CVE-') ||
      body.includes('[CVE]') ||
      body.includes('SECURITY ADVISORY')
    );
  }

  useEffect(() => {
    let mounted = true;
    let updaterInterval: ReturnType<typeof setInterval> | null = null;

    async function runUpdateCheck(isStartupCheck = false) {
      try {
        const update = await check();
        if (!mounted || !update) return;

        const isCVE = isCriticalSecurityUpdate(update);
        const forced = isCVE || isForceUpdate(update.currentVersion, update.version);

        // Standard Feature Release: Respect autoUpdate preference on startup if not forced/CVE
        if (!forced && !appSettings.autoUpdate && isStartupCheck) {
          return;
        }

        // Skip logic only applies to non-forced (patch-only) updates
        if (!forced) {
          const skipped = localStorage.getItem(SKIP_UPDATE_KEY);
          if (skipped === update.version) return;
        }

        if (forced) {
          // ── FORCE UPDATE TOAST ── No Skip, No Later ────────────────
          const forceToastId = showToast(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '1em' }}>
                {isCVE ? `🛡️ Required Security Update v${update.version}` : `⚠️ Required Update v${update.version}`}
              </div>
              <div style={{ fontSize: '0.82em', opacity: 0.85, lineHeight: 1.4 }}>
                {isCVE
                  ? `A critical security update (v${update.version}) is required to continue using Proxync securely. Please update now.`
                  : `This release (v${update.version}) is required to continue using Proxync. Please update now.`}
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
    // Startup pre-flight check runs unconditionally for CVE security radar
    void runUpdateCheck(true);

    if (appSettings.autoUpdate) {
      // Auto-update ON: check periodically every 2 hours
      updaterInterval = setInterval(() => { void runUpdateCheck(false); }, 2 * 60 * 60 * 1000);
    } else {
      // Auto-update OFF: check every 7 days as background fallback
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const lastCheck = parseInt(localStorage.getItem(LAST_UPDATE_CHECK_KEY) ?? '0', 10);
      const now = Date.now();
      if (now - lastCheck >= sevenDaysMs) {
        localStorage.setItem(LAST_UPDATE_CHECK_KEY, String(now));
        void runUpdateCheck(false);
      }
      updaterInterval = setInterval(() => {
        localStorage.setItem(LAST_UPDATE_CHECK_KEY, String(Date.now()));
        void runUpdateCheck(false);
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

  useEffect(() => { void discoverProcesses(false, true); }, []);

  /* ── Network Online/Offline Status Notification ── */
  useEffect(() => {
    initLogger({
      appLogging: appSettings.appLogging ?? true,
      trafficLogging: appSettings.trafficLogging ?? false,
    });
    logApp(
      'SYSTEM',
      'INFO',
      `Proxync studio initialized (Theme: ${appSettings.theme || 'slate'}, Telemetry: ${appSettings.telemetry || 'enhanced'}, AppLogging: ${appSettings.appLogging ?? true ? 'ON' : 'OFF'}, TrafficLogging: ${appSettings.trafficLogging ?? false ? 'ON' : 'OFF'})`
    );

    if (!navigator.onLine) {
      logApp('SYSTEM', 'WARN', 'Application started while offline');
      showToast(
        '⚠️ You are currently offline. Cloud tunnels (Cloudflare & Localtunnel) require internet connection. Local network sharing is active.',
        'warning'
      );
    }

    const handleOffline = () => {
      logApp('SYSTEM', 'WARN', 'Network connection disconnected — offline');
      showToast(
        '⚠️ Network disconnected: You are offline. Cloud tunnels require internet connection.',
        'warning'
      );
    };

    const handleOnline = () => {
      logApp('SYSTEM', 'INFO', 'Network connection restored — online');
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
    setSavedRequests(activeWorkspace.savedRequests || []);
    // ponytail: merge workspace requests into pool without wiping previous workspace captures
    if (activeWorkspace.capturedRequests && activeWorkspace.capturedRequests.length > 0) {
      setRequests((current) => mergeUniqueRequests(current, activeWorkspace.capturedRequests));
    }
    setStarterSuggestions((activeWorkspace.savedRequests || []).filter((r) => r.source === 'starter-scan'));
    if (activeWorkspace.remoteWorkspaceId) {
      localStorage.setItem('proxync_workspace', activeWorkspace.remoteWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const now = new Date().toISOString();
    setWorkspaces((current) =>
      current.map((ws) => {
        const wsRequests = requests.filter((r) => r.workspaceId === ws.id);
        const isCurrentActive = ws.id === activeWorkspaceId;
        return {
          ...ws,
          savedRequests: isCurrentActive ? savedRequests : ws.savedRequests,
          capturedRequests: wsRequests.length > 0 ? wsRequests : (isCurrentActive ? requests.filter(r => !r.workspaceId || r.workspaceId === ws.id) : ws.capturedRequests),
          languageHint: isCurrentActive ? effectiveLanguageHint : ws.languageHint,
          lastActivityAt: isCurrentActive ? now : ws.lastActivityAt,
        };
      }),
    );
  }, [savedRequests, requests, effectiveLanguageHint, activeWorkspaceId]);

  const activeWorkspaceRef = useRef(activeWorkspace);
  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  const tunnelsRef = useRef(tunnels);
  const activeTunnelRef = useRef(activeTunnel);
  const processesRef = useRef(processes);
  const selectedProcessRef = useRef(selectedProcess);

  useEffect(() => { activeWorkspaceRef.current = activeWorkspace; }, [activeWorkspace]);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspaceId; }, [activeWorkspaceId]);
  useEffect(() => { tunnelsRef.current = tunnels; }, [tunnels]);
  useEffect(() => { activeTunnelRef.current = activeTunnel; }, [activeTunnel]);
  useEffect(() => { processesRef.current = processes; }, [processes]);
  useEffect(() => { selectedProcessRef.current = selectedProcess; }, [selectedProcess]);

  useEffect(() => {
    let unlistenRequest: (() => void) | undefined;
    let unlistenResponse: (() => void) | undefined;
    let unlistenClosed: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;
    let active = true;

    async function bindEvents() {
      const uReq = await listen<any>('request:log', (event) => {
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
        const currentActiveTunnel = activeTunnelRef.current;
        const currentSelectedProcess = selectedProcessRef.current;
        const currentTunnels = tunnelsRef.current;
        const currentProcesses = processesRef.current;
        const currentActiveWorkspace = activeWorkspaceRef.current;
        const currentActiveWorkspaceId = activeWorkspaceIdRef.current;

        const portNum = payload.port || currentActiveTunnel?.localPort || currentSelectedProcess?.port || undefined;

        // Resolve matching tunnel and process dynamically
        const matchingTunnel = currentTunnels.find(
          (t) => (payload.tunnelId && t.id === payload.tunnelId) || (portNum && t.localPort === portNum && (t.status === 'ACTIVE' || t.status === 'STANDBY'))
        ) || (currentActiveTunnel?.localPort === portNum ? currentActiveTunnel : null);

        const matchingProcess = currentProcesses.find((p) => portNum && p.port === portNum) || (currentSelectedProcess?.port === portNum ? currentSelectedProcess : null);

        const isProbe = isNoiseOrScannerProbe(path, payload.bodyPreview || payload.body, payload.headers);

        const nowMs = Date.now();
        const item: RequestLog & { rawRequestId?: string; capturedAtMs?: number } = {
          id: crypto.randomUUID(),
          rawRequestId,
          method,
          path,
          status: payload.status || 'pending',
          durationMs: payload.durationMs || null,
          headers: payload.headers,
          bodyPreview: payload.bodyPreview || payload.body,
          capturedAt: new Date(nowMs).toISOString(),
          capturedAtMs: nowMs,
          workspaceId: currentActiveWorkspaceId || undefined,
          workspaceName: currentActiveWorkspace?.name || undefined,
          port: portNum,
          serverName: matchingProcess?.name || matchingTunnel?.subdomain || (portNum ? `Port :${portNum}` : undefined),
          tunnelUrl: matchingTunnel?.publicUrl,
          subdomain: matchingTunnel?.subdomain,
          tunnelId: payload.tunnelId || matchingTunnel?.id,
          isProbe,
        };

        // Developer Console Logger for rich operational context
        console.log(
          `[Proxync Logger] ${isProbe ? '🛡️ [Probe Ignored]' : '⚡ [Traffic]'} ${method} ${path} | Port: :${portNum || 'unknown'} | Tunnel: ${matchingTunnel?.subdomain || 'direct'} | Status: ${payload.status || 'pending'}`
        );

        logTraffic(item);
        logApp(
          'HTTP',
          isProbe ? 'WARN' : 'INFO',
          `${method} ${path} -> ${payload.status || 'pending'} (Port :${portNum || '?'}${matchingTunnel?.subdomain ? ` via ${matchingTunnel.subdomain}` : ''})`,
          { isProbe, port: portNum, tunnelUrl: matchingTunnel?.publicUrl }
        );

        setRequests((current) => [item, ...current].slice(0, 150));
        setTerminalLogs((current) => [
          {
            id: item.id,
            timestamp: item.capturedAt!,
            source: 'proxy' as const,
            level: isProbe ? ('warn' as const) : ('info' as const),
            message: isProbe
              ? `[Security Filter] Filtered scanner probe ${method} ${path} on Port :${portNum || '?'}`
              : `Intercepted ${method} ${path} (${payload.status || 'pending'})${item.tunnelUrl ? ` via ${item.subdomain || 'tunnel'}` : ''}`,
          },
          ...current,
        ].slice(0, 300));
      });
      if (!active) { uReq(); } else { unlistenRequest = uReq; }

      const uRes = await listen<any>('request:log:response', (event) => {
        const payload = event.payload;
        const targetId = payload.id || payload.requestId;
        if (!targetId) return;
        const resolvedDuration = typeof payload.durationMs === 'number' ? payload.durationMs : null;
        console.log(`[Proxync Response] Req ID ${targetId} -> Status ${payload.status} (${resolvedDuration ?? 0}ms)`);
        logApp('HTTP', 'DEBUG', `Response received for req ${targetId} -> Status ${payload.status} (${resolvedDuration ?? 0}ms)`);
        setRequests((current) =>
          current.map((r: any) => {
            if (r.id === targetId || r.rawRequestId === targetId) {
              const dur = resolvedDuration !== null ? resolvedDuration : (r.capturedAtMs ? Math.max(1, Date.now() - r.capturedAtMs) : (r.durationMs || 12));
              return { ...r, status: payload.status, durationMs: dur };
            }
            return r;
          }),
        );
      });
      if (!active) { uRes(); } else { unlistenResponse = uRes; }

      const uClose = await listen<{ tunnelId: string }>('tunnel:auto-closed', (event) => {
        logApp('TUNNEL', 'WARN', `Tunnel ${event.payload.tunnelId} closed`);
        setTunnels((current) => current.map((t) => t.id === event.payload.tunnelId ? { ...t, status: 'CLOSED' } : t));
        setActiveTunnel((current) => current?.id === event.payload.tunnelId ? null : current);
        showToast('Tunnel closed.', 'info');
      });
      if (!active) { uClose(); } else { unlistenClosed = uClose; }

      const uStatus = await listen<{ port: number; status: 'ACTIVE' | 'STANDBY'; tunnelId?: string }>('tunnel:status-changed', (event) => {
        const { port, status, tunnelId } = event.payload;
        logApp('TUNNEL', status === 'STANDBY' ? 'WARN' : 'INFO', `Tunnel on port :${port} status changed to ${status}`);
        setTunnels((current) => current.map((t) => (t.localPort === port || (tunnelId && t.id === tunnelId)) ? { ...t, status } : t));
        setActiveTunnel((current) => (current && (current.localPort === port || (tunnelId && current.id === tunnelId))) ? { ...current, status } : current);
        if (status === 'STANDBY') {
          showToast(`Local server on :${port} stopped — tunnel in standby mode (URL preserved)`, 'warning');
        } else if (status === 'ACTIVE') {
          showToast(`Local server on :${port} resumed — tunnel is active!`, 'success');
        }
      });
      if (!active) { uStatus(); } else { unlistenStatus = uStatus; }
    }
    void bindEvents();
    return () => {
      active = false;
      unlistenRequest?.();
      unlistenResponse?.();
      unlistenClosed?.();
      unlistenStatus?.();
    };
  }, []);

  useEffect(() => {
    if (!activeWorkspace?.remoteWorkspaceId || !activeTunnel) return;
    api.requests.list(activeWorkspace.remoteWorkspaceId, activeTunnel.id)
      .then((history) => {
        if (history && history.length > 0) {
          setRequests((current) => mergeUniqueRequests(current, history));
        }
      })
      .catch(() => undefined);
  }, [activeTunnel, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoadingDomains(true);
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspaceId;
    api.domains.list(wsId)
      .then((items) => {
        setDomains(items);
      })
      .catch(() => setDomains([]))
      .finally(() => setLoadingDomains(false));
  }, [activeWorkspaceId, activeWorkspace?.remoteWorkspaceId]);

  useEffect(() => {
    const pendingDomains = domains.filter((d) => !d.verified);
    if (!activeWorkspaceId || pendingDomains.length === 0) return;
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspaceId;

    const timer = setInterval(() => {
      pendingDomains.forEach((d) => {
        api.domains.checkDomainStatus(wsId, d).then((res) => {
          if (res.verified) {
            setDomains((curr) => curr.map((item) => (item.id === d.id ? res.domain : item)));
            if (activeWorkspace) {
              updateActiveWorkspace((ws) => ({
                ...ws,
                domains: ws.domains.map((item) => (item.id === d.id ? res.domain : item)),
              }));
            }
            showToast(`🎉 Domain ${d.name} ownership verified automatically!`, 'success');
          }
        }).catch(() => undefined);
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [domains, activeWorkspaceId]);

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

  async function discoverProcesses(bypassCache: boolean = false, silent: boolean = false) {
    setDiscovering(true);
    try {
      const discovered = await readNativeProcesses(bypassCache);
      setProcesses(discovered);
      logApp('RECON', 'INFO', `Scanned and discovered ${discovered.length} local services: [${discovered.map((p) => `:${p.port} (${p.framework || p.name})`).join(', ')}]`);
      if (!selectedProcessId && discovered[0]) setSelectedProcessId(discovered[0].id);
      if (!silent) {
        showToast(discovered.length > 0 ? `Discovered ${discovered.length} local process${discovered.length === 1 ? '' : 'es'}` : 'No local development ports found', discovered.length > 0 ? 'success' : 'info');
      }

      // Async ping/latency check for all discovered processes
      const withLatency = await Promise.all(
        discovered.map(async (p) => {
          const latency = await measureLocalPortLatency(p.port);
          if (latency !== Infinity) {
            logApp('RECON', 'DEBUG', `Port :${p.port} reachable -> latency ${Math.round(latency)}ms`);
          }
          return { ...p, latency };
        })
      );
      setProcesses(withLatency);
    } catch (error) {
      logError('RECON', 'Process discovery scan failed', error, 'Verify OS network permissions and CIM/WMI availability');
      if (!silent) {
        showToast(error instanceof Error ? error.message : 'Process discovery failed', 'error');
      }
    } finally { setDiscovering(false); }
  }

  async function createWorkspace() {
    const name = newWorkspaceName.trim();
    if (!name) return;
    if (tunnels.length > 0 || activeTunnel) {
      const prevName = activeWorkspace?.name || activeWorkspaceId || 'previous workspace';
      logApp('TUNNEL', 'INFO', `Creating workspace: terminating all active tunnels from "${prevName}"`);
      await stopAllTunnels(true);
    }
    let remoteWorkspaceId: string | undefined;
    if (context && context.workspace && context.workspace.id !== 'local') {
      try { const remote = await api.workspaces.create(name); remoteWorkspaceId = remote.id; } catch { remoteWorkspaceId = undefined; }
    }
    const workspace = createWorkspaceConfig(name, remoteWorkspaceId, appSettings.guardrails, appSettings.defaultProjectRootPath);
    setWorkspaces((current) => [workspace, ...current]);
    setActiveWorkspaceId(workspace.id);
    setActiveTunnel(null);
    setTunnels([]);
    setSelectedProcessId(null);
    setSharingPort(null);
    setNewWorkspaceName('');
    setMainView('workspace_dashboard');
    logApp('SYSTEM', 'INFO', `Created workspace "${name}" (${workspace.id})`);
    void discoverProcesses(false, true);
    showToast(`Workspace "${name}" created`, 'success');
  }

  function touchWorkspaceActivity(workspaceId: string) {
    const now = new Date().toISOString();
    setWorkspaces((current) =>
      current.map((w) => (w.id === workspaceId ? { ...w, lastActivityAt: now } : w))
    );
  }

  async function selectWorkspace(workspaceId: string) {
    if (activeWorkspaceId !== workspaceId) {
      if (tunnels.length > 0 || activeTunnel) {
        const prevName = activeWorkspace?.name || activeWorkspaceId || 'previous workspace';
        logApp('TUNNEL', 'INFO', `Switching workspace: terminating all active tunnels from "${prevName}"`);
        await stopAllTunnels(true);
        showToast(`Closed tunnels from "${prevName}"`, 'info');
      }
      setActiveWorkspaceId(workspaceId);
      setActiveTunnel(null);
      setTunnels([]);
      setSelectedProcessId(null);
      setSharingPort(null);
      void discoverProcesses(false, true);
    }
    const ws = workspaces.find((w) => w.id === workspaceId);
    logApp('SYSTEM', 'INFO', `Switched active workspace to "${ws?.name || workspaceId}" (${workspaceId})`);
    touchWorkspaceActivity(workspaceId);
    setMainView('workspace_dashboard');
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
    logApp('SYSTEM', 'WARN', `Deleted workspace "${ws.name}" (${workspaceId})`);
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

    logApp('SYSTEM', 'WARN', `Purged workspace "${ws.name}" (${workspaceId})`);

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

  async function verifyPortIsLive(port: number): Promise<boolean> {
    try {
      const isLive = await invoke<boolean>('probe_port', { port });
      if (isLive) return true;
    } catch {
      const latency = await measureLocalPortLatency(port);
      if (latency !== Infinity) return true;
    }
    return false;
  }

  async function initiatePublicShare(process: ProcessCandidate) {
    if (!activeWorkspace) {
      showToast('Select or create a workspace first before sharing a port', 'info');
      return;
    }
    const existingActive = tunnels.find((t) => t.localPort === process.port && t.status === 'ACTIVE');
    if (existingActive) {
      showToast(`Tunnel is already active for port ${process.port} (${existingActive.publicUrl}). Stop the existing tunnel first.`, 'warning');
      setActiveTunnel(existingActive);
      setSelectedProcessId(process.id);
      return;
    }
    if (spawningPorts.includes(process.port) || sharingPort === process.port) {
      showToast(`A tunnel is currently launching for port ${process.port}. Please wait...`, 'info');
      return;
    }

    const isLive = await verifyPortIsLive(process.port);
    if (!isLive) {
      showToast(`⚠️ Port :${process.port} is offline or not running. Please start your local server on port ${process.port} before sharing.`, 'warning');
      void discoverProcesses(true, true);
      return;
    }

    setSharingProcessCandidate(process);
  }

  const refreshProcessDirectory = useCallback(async (process: ProcessCandidate | ProcessProfile): Promise<string> => {
    showToast('Re-scanning project directory & process configuration...', 'info');
    try {
      const port = process.port;
      const pid = 'pid' in process ? process.pid || null : null;

      const resolvedDir = await invoke<string>('resolve_process_directory', {
        port,
        pid,
      });

      if (resolvedDir && resolvedDir !== 'unknown') {
        setSelectedProcessId(`port-${port}`);
        setProcesses((curr) =>
          curr.map((p) => (p.port === port ? { ...p, directory: resolvedDir } : p))
        );

        if (activeWorkspace) {
          updateActiveWorkspace((ws) => ({
            ...ws,
            profiles: ws.profiles.map((p) =>
              p.port === port ? { ...p, directory: resolvedDir } : p
            ),
          }));
        }
        showToast(`Directory re-scanned successfully: ${resolvedDir}`, 'success');
        return resolvedDir;
      } else {
        showToast('Directory resolution completed (no local project folder found for process)', 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Directory re-scan failed', 'error');
    }
    return process.directory || 'Directory undetected';
  }, [activeWorkspace]);



  async function shareProcessCloudflare(process: ProcessCandidate) {
    if (!activeWorkspace) return;
    const existingActive = tunnels.find((t) => t.localPort === process.port && t.status === 'ACTIVE');
    if (existingActive) {
      showToast(`Tunnel is already active for port ${process.port} (${existingActive.publicUrl}). Stop the existing tunnel first.`, 'warning');
      setActiveTunnel(existingActive);
      setSelectedProcessId(process.id);
      return;
    }
    if (spawningPorts.includes(process.port) || sharingPort === process.port) {
      showToast(`A tunnel is currently launching for port ${process.port}. Please wait...`, 'info');
      return;
    }

    const isLive = await verifyPortIsLive(process.port);
    if (!isLive) {
      showToast(`⚠️ Port :${process.port} is offline. Please start your local server on port ${process.port} before creating a Cloudflare tunnel.`, 'warning');
      void discoverProcesses(true, true);
      return;
    }

    const isConnected = await checkRealInternetConnection();
    if (!isConnected) {
      showToast('⚠️ No internet connection detected. Cloudflare Tunnel requires an active internet connection. Please connect to the internet and try again.', 'error');
      return;
    }
    if (!process.directory || process.directory === 'unknown') {
      void refreshProcessDirectory(process);
    }
    addSpawningPort(process.port);
    setProcesses((curr) => [process, ...curr.filter((p) => p.id !== process.id)]);
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));

    const targetWorkspaceId = activeWorkspace.remoteWorkspaceId || activeWorkspace.id;
    const token = getToken();

    try {
      logApp('TUNNEL', 'INFO', `Initiating Cloudflare Tunnel for port :${process.port}...`);
      localStorage.setItem('proxync_workspace', targetWorkspaceId);
      const tunnel = await api.tunnels.create(targetWorkspaceId, process.port, 'http', undefined);
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;
      const [, proxyPort] = await Promise.all([
        invoke('open_tunnel', { tunnelId: tunnel.id, localPort: process.port, token, workspaceId: targetWorkspaceId, relayUrl }).catch(() => undefined),
        invoke<number>('start_proxy', { localPort: process.port }).catch(() => process.port),
      ]);
      logApp('PROXY', 'INFO', `Bound ephemeral proxy to 127.0.0.1:${proxyPort} -> :${process.port}`);
      showToast('Starting Cloudflare Tunnel service...', 'info');
      const cfTunnelUrl = await invoke<string>('open_cloudflare_tunnel', { tunnelId: tunnel.id, localPort: proxyPort });

      const cloudflareBoundTunnel: Tunnel = { ...tunnel, publicUrl: cfTunnelUrl, subdomain: cfTunnelUrl.replace('https://', '').replace('.trycloudflare.com', '') };
      setActiveTunnel(cloudflareBoundTunnel);
      setTunnels((current) => [cloudflareBoundTunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false);
      // ponytail: scope clear to active workspace only — preserve other workspaces' traffic history
      setRequests((current) => current.filter((r) => r.workspaceId && r.workspaceId !== activeWorkspaceIdRef.current));
      logApp('TUNNEL', 'INFO', `Cloudflare Tunnel online: ${cfTunnelUrl} (Port :${process.port})`);
      showToast(`Cloudflare Tunnel is active! URL: ${cfTunnelUrl}`, 'success');
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: cfTunnelUrl } : p) }));
    } catch (error) {
      logApp('TUNNEL', 'ERROR', `Failed to open Cloudflare Tunnel on port :${process.port}`, error);
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
    finally { removeSpawningPort(process.port); }
  }

  function generateRandomSubdomain(prefix = 'px'): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${rand}`;
  }

  async function shareProcessNative(process: ProcessCandidate) {
    if (!activeWorkspace) return;
    const existingActive = tunnels.find((t) => t.localPort === process.port && t.status === 'ACTIVE');
    if (existingActive) {
      showToast(`Tunnel is already active for port ${process.port} (${existingActive.publicUrl}). Stop the existing tunnel first.`, 'warning');
      setActiveTunnel(existingActive);
      setSelectedProcessId(process.id);
      return;
    }
    if (spawningPorts.includes(process.port) || sharingPort === process.port) {
      showToast(`A tunnel is currently launching for port ${process.port}. Please wait...`, 'info');
      return;
    }

    const isLive = await verifyPortIsLive(process.port);
    if (!isLive) {
      showToast(`⚠️ Port :${process.port} is offline or not running. Please start your local server on port ${process.port} before sharing.`, 'warning');
      void discoverProcesses(true, true);
      return;
    }

    addSpawningPort(process.port);
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));

    const targetWorkspaceId = activeWorkspace.remoteWorkspaceId || activeWorkspace.id;
    const token = getToken();

    try {
      logApp('TUNNEL', 'INFO', `Initiating Proxync Native SSH Tunnel for port :${process.port}...`);
      localStorage.setItem('proxync_workspace', targetWorkspaceId);
      const tunnel = await api.tunnels.create(targetWorkspaceId, process.port, 'http', undefined);
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;
      const [, proxyPort] = await Promise.all([
        invoke('open_tunnel', { tunnelId: tunnel.id, localPort: process.port, token, workspaceId: targetWorkspaceId, relayUrl }).catch(() => undefined),
        invoke<number>('start_proxy', { localPort: process.port }).catch(() => process.port),
      ]);
      logApp('PROXY', 'INFO', `Bound ephemeral proxy to 127.0.0.1:${proxyPort} -> :${process.port}`);
      const suggestedSub = generateRandomSubdomain('px');
      showToast('Starting Proxync Native SSH tunnel...', 'info');
      const nativeTunnelUrl = await invoke<string>('open_native_tunnel', { tunnelId: tunnel.id, localPort: proxyPort, subdomain: suggestedSub });
      const boundTunnel: Tunnel = { ...tunnel, publicUrl: nativeTunnelUrl, subdomain: suggestedSub };
      setActiveTunnel(boundTunnel);
      setTunnels((current) => [boundTunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false);
      // ponytail: scope clear to active workspace only — preserve other workspaces' traffic history
      setRequests((current) => current.filter((r) => r.workspaceId && r.workspaceId !== activeWorkspaceIdRef.current));
      logApp('TUNNEL', 'INFO', `Proxync Native Tunnel online: ${nativeTunnelUrl} (Port :${process.port})`);
      showToast(`Tunnel is active! URL: ${nativeTunnelUrl}`, 'success');
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: nativeTunnelUrl } : p) }));
    } catch (error) {
      logApp('TUNNEL', 'ERROR', `Failed to open Proxync Native Tunnel on port :${process.port}`, error);
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
    finally { removeSpawningPort(process.port); }
  }

  async function shareProcessLocaltunnel(process: ProcessCandidate, customSubdomain?: string) {
    if (!activeWorkspace) return;
    const existingActive = tunnels.find((t) => t.localPort === process.port && t.status === 'ACTIVE');
    if (existingActive) {
      showToast(`Tunnel is already active for port ${process.port} (${existingActive.publicUrl}). Stop the existing tunnel first.`, 'warning');
      setActiveTunnel(existingActive);
      setSelectedProcessId(process.id);
      return;
    }
    if (spawningPorts.includes(process.port) || sharingPort === process.port) {
      showToast(`A tunnel is currently launching for port ${process.port}. Please wait...`, 'info');
      return;
    }

    const isLive = await verifyPortIsLive(process.port);
    if (!isLive) {
      showToast(`⚠️ Port :${process.port} is offline. Please start your local server on port ${process.port} before creating a localtunnel.`, 'warning');
      void discoverProcesses(true, true);
      return;
    }

    const isConnected = await checkRealInternetConnection();
    if (!isConnected) {
      showToast('⚠️ No internet connection detected. Localtunnel service requires an active internet connection. Please connect to the internet and try again.', 'error');
      return;
    }
    if (!process.directory || process.directory === 'unknown') {
      void refreshProcessDirectory(process);
    }
    addSpawningPort(process.port);
    setProcesses((curr) => [process, ...curr.filter((p) => p.id !== process.id)]);
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));

    const targetWorkspaceId = activeWorkspace.remoteWorkspaceId || activeWorkspace.id;
    const token = getToken();

    try {
      localStorage.setItem('proxync_workspace', targetWorkspaceId);
      const tunnel = await api.tunnels.create(targetWorkspaceId, process.port, 'http', undefined);
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;
      const [, proxyPort] = await Promise.all([
        invoke('open_tunnel', { tunnelId: tunnel.id, localPort: process.port, token, workspaceId: targetWorkspaceId, relayUrl }).catch(() => undefined),
        invoke<number>('start_proxy', { localPort: process.port }).catch(() => process.port),
      ]);
      const suggestedSub = customSubdomain || `${activeWorkspace.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${process.port}`;
      showToast('Starting localtunnel service...', 'info');
      const localtunnelUrl = await invoke<string>('open_localtunnel', { tunnelId: tunnel.id, localPort: proxyPort, subdomain: suggestedSub });
      const localtunnelBoundTunnel: Tunnel = { ...tunnel, publicUrl: localtunnelUrl, subdomain: localtunnelUrl.replace('https://', '').replace('.localtunnel.me', '') };
      setActiveTunnel(localtunnelBoundTunnel);
      setTunnels((current) => [localtunnelBoundTunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false);
      // ponytail: scope clear to active workspace only — preserve other workspaces' traffic history
      setRequests((current) => current.filter((r) => r.workspaceId && r.workspaceId !== activeWorkspaceIdRef.current));
      showToast(`Localtunnel is active! URL: ${localtunnelUrl}`, 'success');
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: localtunnelUrl } : p) }));
    } catch (error) { showToast(error instanceof Error ? error.message : String(error), 'error'); }
    finally { removeSpawningPort(process.port); }
  }

  async function shareProcess(process: ProcessCandidate, customDomain?: string) {
    if (!activeWorkspace) return;
    const existingActive = tunnels.find((t) => t.localPort === process.port && t.status === 'ACTIVE');
    if (existingActive) {
      showToast(`Tunnel is already active for port ${process.port} (${existingActive.publicUrl}). Stop the existing tunnel first.`, 'warning');
      setActiveTunnel(existingActive);
      setSelectedProcessId(process.id);
      return;
    }
    if (spawningPorts.includes(process.port) || sharingPort === process.port) {
      showToast(`A tunnel is currently launching for port ${process.port}. Please wait...`, 'info');
      return;
    }

    addSpawningPort(process.port);
    setProcesses((curr) => [process, ...curr.filter((p) => p.id !== process.id)]);
    const targetWorkspaceId = activeWorkspace.remoteWorkspaceId || activeWorkspace.id;
    const token = getToken();

    try {
      localStorage.setItem('proxync_workspace', targetWorkspaceId);

      if (customDomain) {
        const preFlightResult = await api.domains.verifyByName(targetWorkspaceId, customDomain);
        if (!preFlightResult.verified) {
          if (preFlightResult.domain) {
            setDomains((curr) =>
              curr.map((item) => (item.id === preFlightResult.domain!.id ? preFlightResult.domain! : item))
            );
            if (activeWorkspace) {
              updateActiveWorkspace((ws) => ({
                ...ws,
                domains: ws.domains.map((item) =>
                  item.id === preFlightResult.domain!.id ? preFlightResult.domain! : item
                ),
              }));
            }
          }
          showToast(
            `Cannot go live: DNS TXT record for '${customDomain}' is missing or expired. Open Settings → Custom Domains to re-verify.`,
            'error'
          );
          return;
        }
      }

      // DNS pre-flight passed — now set up starter scan and update UI
      const starterScan = buildStarterRequests(process);
      setStarterSuggestions(starterScan);
      setSavedRequests((current) => mergeRequests(current, starterScan));
      updateActiveWorkspace((ws) => ({
        ...ws,
        profiles: upsertProfile(ws.profiles, process, starterScan.length),
        selectedProfileId: makeProfileId(process),
        languageHint: detectLanguageLabel(process),
      }));
      const proxyPort = await invoke<number>('start_proxy', { localPort: process.port }).catch(() => process.port);
      const tunnel = await api.tunnels.create(targetWorkspaceId, process.port, 'http', undefined, customDomain);
      if (customDomain) {
        tunnel.publicUrl = customDomain.includes(':') ? customDomain : `http://${customDomain}:${proxyPort}`;
      }
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;
      await invoke('open_tunnel', { tunnelId: tunnel.id, localPort: proxyPort, token, workspaceId: targetWorkspaceId, relayUrl }).catch(() => undefined);
      setActiveTunnel(tunnel);
      setTunnels((current) => [tunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false);
      // ponytail: scope clear to active workspace only — preserve other workspaces' traffic history
      setRequests((current) => current.filter((r) => r.workspaceId && r.workspaceId !== activeWorkspaceIdRef.current));
      updateActiveWorkspace((ws) => ({
        ...ws,
        profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: tunnel.publicUrl } : p)
      }));
      showToast(`Tunnel active on ${tunnel.publicUrl}. Traffic interception enabled!`, 'success');
    } catch (error) {
      logError('TUNNEL', `Unable to share process on Port :${process.port}`, error, 'Check if local server is listening and port is available', `Port :${process.port}`);
      showToast(error instanceof Error ? error.message : 'Unable to share process', 'error');
    }
    finally { removeSpawningPort(process.port); }
  }

  function shareProcessLocal(process: ProcessCandidate) {
    if (!activeWorkspace) {
      showToast('Select or create a workspace first before sharing a port', 'info');
      return;
    }
    if (!process.directory || process.directory === 'unknown') {
      void refreshProcessDirectory(process);
    }
    touchWorkspaceActivity(activeWorkspace.id);
    setProcesses((curr) => [process, ...curr.filter((p) => p.id !== process.id)]);
    setSelectedProcessId(process.id); setMainView('process'); setSharingPort(process.port);
    showToast(`Exposed local share at http://localhost:${process.port} and http://${localIp}:${process.port}`, 'success');
  }

  async function stopTunnel(tunnel: Tunnel) {
    if (!activeWorkspace) return;
    touchWorkspaceActivity(activeWorkspace.id);
    logApp('TUNNEL', 'INFO', `Stopping tunnel ${tunnel.id} (Port :${tunnel.localPort})`);
    try {
      await invoke('close_tunnel', { tunnelId: tunnel.id, localPort: tunnel.localPort }).catch(() => undefined);
      if (!tunnel.id.startsWith('lt-') && activeWorkspace.remoteWorkspaceId) {
        await api.tunnels.close(activeWorkspace.remoteWorkspaceId, tunnel.id).catch(() => undefined);
      }
      setTunnels((current) => current.filter((item) => item.id !== tunnel.id));
      setActiveTunnel((current) => (current?.id === tunnel.id ? null : current));
      logApp('TUNNEL', 'INFO', `Closed tunnel ${tunnel.id} on port :${tunnel.localPort}`);
      showToast('Tunnel stopped', 'info');
    } catch (error) {
      logError('TUNNEL', `Failed to stop tunnel ${tunnel.id}`, error, 'Verify if tunnel process was already killed', tunnel.id);
      showToast(error instanceof Error ? error.message : 'Unable to stop tunnel', 'error');
    }
  }

  async function stopAllTunnels(silent = false) {
    const listToClose = [...tunnels];
    if (activeTunnel && !listToClose.some((t) => t.id === activeTunnel.id)) {
      listToClose.push(activeTunnel);
    }
    if (listToClose.length === 0) {
      try {
        await invoke('close_all_tunnels');
      } catch { }
      setTunnels([]);
      setActiveTunnel(null);
      return;
    }
    if (activeWorkspace) {
      touchWorkspaceActivity(activeWorkspace.id);
    }
    logApp('TUNNEL', 'INFO', `Stopping all active tunnels (${listToClose.length})`);
    try {
      await Promise.all(
        listToClose.map(async (tunnel) => {
          await invoke('close_tunnel', { tunnelId: tunnel.id, localPort: tunnel.localPort }).catch(() => undefined);
          if (!tunnel.id.startsWith('lt-') && activeWorkspace?.remoteWorkspaceId) {
            await api.tunnels.close(activeWorkspace.remoteWorkspaceId, tunnel.id).catch(() => undefined);
          }
        })
      );
      try {
        await invoke('close_all_tunnels');
      } catch { }
      setTunnels([]);
      setActiveTunnel(null);
      logApp('TUNNEL', 'INFO', `All ${listToClose.length} tunnels closed`);
      if (!silent) {
        showToast(`Stopped all active tunnels (${listToClose.length})`, 'info');
      }
    } catch (error) {
      logError('TUNNEL', 'Failed to stop all tunnels cleanly', error, 'Some tunnel subprocesses may require manual termination');
      if (!silent) {
        showToast(error instanceof Error ? error.message : 'Unable to stop all tunnels', 'error');
      }
    }
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

      logApp('HTTP', 'INFO', `Replayed request: ${request.method} ${request.path} -> Status ${status} (${durationMs}ms)`);
      setRequests((current) => [replayedLog, ...current].slice(0, 150));
      showToast(`Replayed ${request.method} ${request.path} (${status})`, 'success');
    } catch (error) {
      logApp('HTTP', 'ERROR', `Replay failed: ${request.method} ${request.path}`, error);
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
      if (activeTunnel?.publicUrl) {
        const base = activeTunnel.publicUrl.replace(/\/+$/, '');
        return `${base}${trimmed}`;
      }
      if (selectedProcess?.port) {
        return `http://localhost:${selectedProcess.port}${trimmed}`;
      }
      return `http://localhost:3000${trimmed}`;
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
      logApp('HTTP', 'INFO', `Manual request: ${draftRequest.method} ${targetUrl} -> Status ${status} (${durationMs}ms)`);
      setRequests((current) => [newLog, ...current].slice(0, 150));
      showToast(`Request to ${targetUrl} completed (${status})`, 'success');
    } catch (error) {
      logApp('HTTP', 'ERROR', `Manual request failed: ${draftRequest.method} ${targetUrl}`, error);
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
      logApp('SCANNER', 'INFO', `Scanned ${files.length} project files. Language hint: ${inferredLanguage}`);
      showToast(`Scanned ${files.length} files. Language hint updated to ${inferredLanguage}.`, 'success');
      void discoverProcesses(true);
    } catch (error) {
      logApp('SCANNER', 'ERROR', 'Project folder scan failed', error);
      showToast(error instanceof Error ? error.message : 'Project scan failed', 'error');
    }
    finally { setScanningProject(false); }
  }

  function updateAppNotes(notes: string) { setAppSettings((current) => ({ ...current, notes })); }

  function updateTheme(theme: string) {
    logApp('SYSTEM', 'INFO', `Theme changed to "${theme}"`);
    setAppSettings((current) => ({ ...current, theme }));
  }

  function updateAutoUpdate(enabled: boolean) {
    logApp('UPDATER', 'INFO', `Auto-update background checking ${enabled ? 'enabled' : 'disabled'}`);
    setAppSettings((current) => ({ ...current, autoUpdate: enabled }));
  }

  function updateEnableDevTools(enabled: boolean) {
    logApp('SYSTEM', 'INFO', `Developer Inspect Tools ${enabled ? 'enabled' : 'disabled'}`);
    setAppSettings((current) => ({ ...current, enableDevTools: enabled }));
  }

  function updateTelemetry(telemetry: 'enhanced' | 'basic') {
    logApp('SYSTEM', 'INFO', `Telemetry mode changed to "${telemetry}"`);
    setAppSettings((current) => ({ ...current, telemetry }));
  }

  async function updateAppLogging(enabled: boolean) {
    setAppSettings((current) => ({ ...current, appLogging: enabled }));
    await setAppLogging(enabled, {
      appVersion: 'v0.2.1-stable',
      theme: appSettings.theme,
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'desktop',
    });
    showToast(
      enabled
        ? '🛡️ Application engine logging enabled (%APPDATA%\\Proxync\\logs\\app.log)'
        : 'Application engine logging disabled',
      enabled ? 'success' : 'info'
    );
  }

  async function updateTrafficLogging(enabled: boolean) {
    setAppSettings((current) => ({ ...current, trafficLogging: enabled }));
    await setTrafficLogging(enabled, {
      appVersion: 'v0.2.1-stable',
    });
    showToast(
      enabled
        ? '⚡ Traffic stream logging enabled (%APPDATA%\\Proxync\\logs\\traffic.log)'
        : 'Traffic stream logging disabled',
      enabled ? 'success' : 'info'
    );
  }

  async function addDomain() {
    if (!domainDraft.trim()) { showToast('Enter a domain name first', 'info'); return; }
    setBusyDomainId('new');
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspace?.id || 'local';
    try {
      const created = await api.domains.create(wsId, domainDraft.trim().toLowerCase());
      setDomains((current) => {
        const next = [...current.filter((d) => d.id !== created.id), created];
        if (activeWorkspace) {
          updateActiveWorkspace((ws) => ({ ...ws, domains: next }));
        }
        return next;
      });
      setDomainDraft('');
      logApp('SYSTEM', 'INFO', `Added custom domain: "${domainDraft.trim()}"`);
      showToast('Domain added successfully!', 'success');
    } catch (error) {
      logApp('SYSTEM', 'ERROR', `Failed to add domain "${domainDraft.trim()}"`, error);
      showToast(error instanceof Error ? error.message : 'Unable to add domain', 'error');
    } finally {
      setBusyDomainId(null);
    }
  }

  async function verifyDomain(domainId: string) {
    setBusyDomainId(domainId);
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspace?.id || 'local';
    try {
      const updated = await api.domains.verify(wsId, domainId);
      setDomains((current) => {
        const next = current.map((d) => (d.id === domainId ? updated : d));
        if (activeWorkspace) {
          updateActiveWorkspace((ws) => ({ ...ws, domains: next }));
        }
        return next;
      });
      logApp('SYSTEM', 'INFO', `Verified domain: ${domainId}`);
      showToast('Domain verification succeeded!', 'success');
    } catch (error) {
      const refreshed = await api.domains.list(wsId).catch(() => []);
      if (refreshed.length > 0) {
        setDomains(refreshed);
        if (activeWorkspace) {
          updateActiveWorkspace((ws) => ({ ...ws, domains: refreshed }));
        }
      }
      logApp('SYSTEM', 'WARN', `Domain verification check failed for ${domainId}`, error);
      showToast(error instanceof Error ? error.message : 'Verification failed', 'error');
    } finally {
      setBusyDomainId(null);
    }
  }

  async function removeDomain(domainId: string) {
    setBusyDomainId(domainId);
    const wsId = activeWorkspace?.remoteWorkspaceId || activeWorkspace?.id || 'local';
    try {
      await api.domains.delete(wsId, domainId);
      setDomains((current) => {
        const next = current.filter((d) => d.id !== domainId);
        if (activeWorkspace) {
          updateActiveWorkspace((ws) => ({ ...ws, domains: next }));
        }
        return next;
      });
      logApp('SYSTEM', 'WARN', `Removed domain: ${domainId}`);
      showToast('Domain removed', 'success');
    } catch (error) {
      logApp('SYSTEM', 'ERROR', `Failed to remove domain ${domainId}`, error);
      showToast(error instanceof Error ? error.message : 'Unable to remove domain', 'error');
    } finally {
      setBusyDomainId(null);
    }
  }

  function clearTrafficLogs() {
    setRequests([]);
    setSelectedRequest(null);
    setWorkspaces((current) =>
      current.map((ws) => ({
        ...ws,
        capturedRequests: [],
      }))
    );
    void clearLogs();
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

  const viewLabel = NAV_CATEGORIES.flatMap((c) => c.items).find((n) => n.view === mainView)?.label
    ?? (mainView === 'process' ? 'Process' : mainView === 'postman' ? 'Playground' : mainView === 'observability' ? 'Observability' : 'Proxync');

  return (
    <div className="app-frame flex flex-col h-screen w-screen overflow-hidden bg-surface">
      {/* ── Top Header Bar (48px) ── */}
      <header
        className="app-titlebar h-[48px] min-h-[48px] w-full flex items-center border-b border-outline-variant bg-surface px-2 sm:px-4 justify-between select-none z-50 cursor-default"
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
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer shrink-0"
            title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>

          <div className="app-brand flex items-center gap-2 shrink-0">
            <img src="/logo.svg" className="w-5 h-5 object-contain select-none" alt="Logo" />
            <span className="text-headline-sm font-bold text-on-surface hidden sm:inline">Proxync</span>
          </div>
          {viewLabel !== 'Explore' && (
            <div className="hidden md:flex items-center gap-2 text-on-surface-variant">
              <span className="text-outline-variant">|</span>
              <span className="text-body-md truncate max-w-[140px]">{viewLabel}</span>
            </div>
          )}
          <div className="app-search flex items-center bg-surface-container-low px-2.5 py-1 rounded border border-outline-variant w-28 sm:w-44 md:w-56 lg:w-64 transition-all">
            <span className="material-symbols-outlined text-outline text-[18px] mr-1.5 shrink-0">search</span>
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-body-md w-full placeholder:text-outline text-on-surface text-xs"
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
        {/* ── Sidebar (260px or 68px) ── */}
        <aside className={`app-sidebar ${sidebarCollapsed ? 'w-[52px] min-w-[52px]' : 'w-[240px] md:w-[260px] min-w-[240px] md:min-w-[260px]'} flex flex-col py-3 bg-surface-container-low border-r border-outline-variant z-40 transition-all overflow-hidden`}>
          {!sidebarCollapsed ? (
            <div className="px-6 mb-5">
              <h2 className="text-headline-sm font-bold text-primary truncate">Proxync Engine</h2>
              <p className="text-code-sm text-on-surface-variant opacity-60">v0.2.1-stable</p>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-4">
              <span
                className="material-symbols-outlined text-primary text-[20px] cursor-pointer hover:text-secondary transition-colors"
                title="Workspace Dashboard"
                onClick={() => setMainView('workspace_dashboard')}
              >hub</span>
            </div>
          )}

          {/* Active Workspace Selector Section */}
          <div className={`${sidebarCollapsed ? 'px-1.5 mb-3' : 'px-6 mb-5'}`}>
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-on-surface-variant/70 tracking-widest uppercase">Active Workspace</p>
                <button
                  onClick={() => setMainView('lobby')}
                  className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all cursor-pointer flex items-center justify-center"
                  title="All Workspaces Studio (Manage & Search 100+ Workspaces)"
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                </button>
              </div>
            )}
            <div
              onClick={() => setMainView('workspace_dashboard')}
              className={`workspace-selector flex items-center border border-outline-variant/60 bg-surface-container hover:border-primary/50 hover:bg-surface-container-high rounded-lg cursor-pointer transition-all text-sm text-on-surface select-none group shadow-sm ${sidebarCollapsed ? 'p-1.5 justify-center' : 'px-3.5 py-2.5'
                }`}
              title={`Active Workspace: ${activeWorkspace?.name ?? 'Select Workspace'}`}
            >
              <div className={`flex items-center gap-2.5 truncate ${sidebarCollapsed ? 'justify-center' : ''}`}>
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                    {activeWorkspace?.name ?? 'Select Workspace'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Categorized Menu Section */}
          <nav className="app-nav flex-1 space-y-3 overflow-y-auto">
            {NAV_CATEGORIES.map((cat) => (
              <div key={cat.category} className="space-y-0.5">
                {!sidebarCollapsed ? (
                  <div className="px-6 mb-1.5">
                    <p className="text-[10px] font-bold text-on-surface-variant/60 tracking-widest uppercase">
                      {cat.category}
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-outline-variant/20 my-1.5 mx-2" />
                )}
                {cat.items.map((item) => {
                  const isSelected = mainView === item.view;
                  const isDisabled = item.view !== 'lobby' && item.view !== 'settings' && item.view !== 'docs' && !activeWorkspace;
                  return (
                    <button
                      key={item.view}
                      disabled={isDisabled}
                      title={item.label}
                      className={`nav-item flex items-center ${sidebarCollapsed ? 'collapsed justify-center px-1.5 py-2 mx-auto w-[42px] rounded-xl' : 'gap-3 px-6 py-2'} w-full text-left transition-colors font-label-md text-sm ${isSelected
                          ? 'active text-on-surface border-secondary-container bg-surface-container-high font-semibold'
                          : 'text-on-surface-variant hover:bg-surface-container-highest border-l-2 border-transparent'
                        } ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                      onClick={() => {
                        if (item.view === 'settings') {
                          setSettingsSection('general');
                        }
                        if (item.view === 'workbench' && workbenchTabs.length === 0) {
                          openRequestInWorkbench({ method: 'GET', path: '/api/user/profile' });
                        }
                        setMainView(item.view);
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className={`pt-3 border-t border-outline-variant/30 space-y-1 ${sidebarCollapsed ? 'px-1.5' : ''}`}>
            <button
              onClick={() => openUrl("https://github.com/Inilax/Proxync/issues")}
              title="Support"
              className={`nav-item flex items-center ${sidebarCollapsed ? 'collapsed justify-center px-1.5 py-2 mx-auto w-[42px] rounded-xl' : 'gap-3 px-6 py-2.5'} w-full text-left text-on-surface-variant hover:bg-surface-container-highest transition-colors font-label-md text-label-md cursor-pointer`}
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              {!sidebarCollapsed && <span>Support</span>}
            </button>
            <div className={`${sidebarCollapsed ? 'px-1.5 py-1.5' : 'px-6 py-3 mt-1'}`}>
              <button
                onClick={() => setAuthDialogOpen(true)}
                title="Sign In"
                className={`btn-primary flex items-center justify-center ${sidebarCollapsed ? 'p-1.5 w-full' : 'gap-2 px-4 py-2.5'} w-full rounded-lg text-xs font-bold font-label-md cursor-pointer`}
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                {!sidebarCollapsed && <span>Sign In</span>}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* ── Main Content Area (Responsive Fluid Padding) ── */}
          <main className="app-main flex-1 min-h-0 min-w-0 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8 bg-surface-container-lowest">
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
                onStopAllTunnels={stopAllTunnels}
                onInspectTraffic={(tunnel) => {
                  if (tunnel) {
                    const proc = processes.find((p) => p.port === tunnel.localPort);
                    if (proc) setSelectedProcessId(proc.id);
                  }
                  setMainView('traffic');
                }}
              />
            )}
            {mainView === 'workspace_dashboard' && (
              <WorkspaceDashboardView
                workspace={activeWorkspace}
                tunnels={tunnels}
                requests={requests}
                activeTunnel={activeTunnel}
                processes={processes}
                discovering={discovering}
                sharingPort={sharingPort}
                spawningPorts={spawningPorts}
                onScan={() => void discoverProcesses(true)}
                onSelectProcess={(processId) => {
                  setSelectedProcessId(processId);
                  setMainView('process');
                  const found = processes.find(p => p.id === processId);
                  if (found && activeWorkspace) {
                    updateActiveWorkspace((ws) => ({
                      ...ws,
                      selectedProfileId: ws.profiles.find((prof) => prof.port === found.port)?.id,
                    }));
                  }
                }}
                onSharePublic={initiatePublicShare}
                onShareNative={shareProcessNative}
                onShareLocal={shareProcessLocal}
                onStopTunnel={stopTunnel}
                onStopAllTunnels={stopAllTunnels}
                onInspectTraffic={(proc) => {
                  if (proc) {
                    setSelectedProcessId(proc.id);
                    if (activeWorkspace) {
                      updateActiveWorkspace((ws) => ({
                        ...ws,
                        selectedProfileId: ws.profiles.find((prof) => prof.port === proc.port)?.id,
                      }));
                    }
                  }
                  setMainView('traffic');
                }}
              />
            )}
            {mainView === 'traffic' && (
              <TrafficView requests={requests} workspaces={workspaces} processes={processes} activeTunnel={activeTunnel} onOpen={openRequestDetail} onSendToPostman={sendToPostman} onClear={clearTrafficLogs} onOpenWorkbench={openRequestInWorkbench} />
            )}
            {mainView === 'postman' && (
              <PostmanView
                draft={draftRequest}
                savedRequests={savedRequests}
                response={postmanResponse}
                sending={sendingRequest}
                starterSuggestions={starterSuggestions}
                activeTunnel={activeTunnel}
                tunnels={tunnels}
                processes={processes}
                onSelectTunnel={setActiveTunnel}
                onSelectProcessPort={(port) => {
                  if (port) {
                    const found = processes.find((p) => p.port === port);
                    if (found) setSelectedProcessId(found.id);
                  }
                }}
                selectedProcessPort={selectedProcess?.port}
                onDraftChange={setDraftRequest}
                onHeaderTextChange={updateDraftHeader}
                onRun={runPostmanRequest}
                onClearResponse={() => setPostmanResponse(null)}
                onSave={saveDraftRequest}
                onLoad={setDraftRequest}
                onImportStarterRequests={importStarterRequests}
                onDeleteRequest={deleteSavedRequest}
                onUpdateSavedRequests={updateSavedRequests}
                onOpenWorkbench={openRequestInWorkbench}
              />
            )}
            {mainView === 'swagger' && (
              <SwaggerView
                document={openApiDocument}
                swaggerPanel={swaggerPanel}
                workspace={activeWorkspace}
                languageHint={effectiveLanguageHint}
                scannedEndpoints={scannedEndpoints}
                tunnels={tunnels}
                processes={processes}
                requests={requests}
                activeTunnel={activeTunnel}
                generating={generatingSwagger}
                onGenerateSpec={handleGenerateSwaggerSpec}
                onClearSpec={handleClearSwaggerSpec}
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
                onOpenWorkbench={(ep) => openRequestInWorkbench({ method: ep.method, path: ep.path })}
              />
            )}
            {mainView === 'workbench' && (
              <RequestWorkbenchDialog
                isOpen={true}
                isFullView={true}
                tabs={workbenchTabs}
                activeTabId={activeWorkbenchTabId}
                workspace={activeWorkspace}
                projectRootPath={effectiveProjectRoot}
                scannedEndpoints={scannedEndpoints}
                trafficLogs={requests}
                terminalLogs={terminalLogs}
                processes={processes}
                tunnels={tunnels}
                activeProcessPort={selectedProcess?.port}
                activeTunnelUrl={activeTunnel?.publicUrl}
                onClose={() => setMainView('traffic')}
                onTabsChange={(updatedTabs, nextActiveId) => {
                  setWorkbenchTabs(updatedTabs);
                  setActiveWorkbenchTabId(nextActiveId);
                }}
                onSaveRequestToCollection={saveDraftRequest}
                onUpdateProjectRoot={updateProjectRootPath}
                onScannedEndpointsUpdate={setScannedEndpoints}
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
                onOpenWorkbench={openRequestInWorkbench}
              />
            )}
            {mainView === 'settings' && (
              <SettingsView
                workspace={activeWorkspace}
                appSettings={appSettings}
                domains={domains}
                domainDraft={domainDraft}
                loadingDomains={loadingDomains}
                busyDomainId={busyDomainId}
                scanningProject={scanningProject}
                activeTunnel={activeTunnel}
                processes={processes}
                tunnels={tunnels}
                onUpdateGuardrails={updateGuardrails}
                onUpdateAppNotes={updateAppNotes}
                onUpdateProjectRootPath={updateProjectRootPath}
                onScanProjectFolder={scanProjectFolder}
                onDomainDraftChange={setDomainDraft}
                onAddDomain={addDomain}
                onVerifyDomain={verifyDomain}
                onRemoveDomain={removeDomain}
                onUpdateTheme={updateTheme}
                onUpdateAutoUpdate={updateAutoUpdate}
                onUpdateTelemetry={updateTelemetry}
                onUpdateEnableDevTools={updateEnableDevTools}
                onUpdateAppLogging={updateAppLogging}
                onUpdateTrafficLogging={updateTrafficLogging}
                initialSection={settingsSection}
              />
            )}
            {mainView === 'process' && (
              <ProcessView
                workspace={activeWorkspace}
                process={selectedProcess}
                profile={selectedProfile}
                tunnel={tunnels.find((t) => t.localPort === (selectedProcess?.port || selectedProfile?.port) && (t.status === 'ACTIVE' || t.status === 'STANDBY')) || null}
                sharingPort={sharingPort}
                suggestions={starterSuggestions}
                hasVerifiedDomain={domains.some((d) => d.verified)}
                localIp={localIp}
                onDiscover={() => {
                  setDiscoverOpen(true);
                  void discoverProcesses(true);
                }}
                onShare={initiatePublicShare}
                onShareLocal={shareProcessLocal}
                onStop={stopTunnel}
                onStopLocalShare={() => setSharingPort(null)}
                onCopy={copyText}
                onImportStarterRequests={importStarterRequests}
                onRefreshConfig={(p) => void refreshProcessDirectory(p as ProcessCandidate)}
                onInspectTraffic={() => {
                  if (selectedProcess) {
                    setSelectedProcessId(selectedProcess.id);
                  }
                  setMainView('traffic');
                }}
              />
            )}
          </main>

          {terminalOpen && (
            <TerminalDrawer
              isOpen={terminalOpen}
              onClose={() => setTerminalOpen(false)}
              logs={terminalLogs}
              onClearLogs={() => setTerminalLogs([])}
            />
          )}
        </div>
      </div>

      {/* ── Bottom Status Footer (24px) ── */}
      <footer className="app-footer h-6 min-h-6 w-full flex justify-between items-center px-3 border-t border-outline-variant bg-surface-container-lowest text-code-sm select-none z-50 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-2 sm:gap-3 text-secondary min-w-0 overflow-hidden shrink">
          <span className="flex items-center gap-1.5 min-w-0 shrink truncate">
            {tunnels.some((t) => t.status === 'ACTIVE') ? (
              <span className="w-2 h-2 rounded-full shrink-0 bg-primary animate-pulse" />
            ) : tunnels.some((t) => t.status === 'STANDBY') ? (
              <span className="w-2 h-2 rounded-full shrink-0 bg-amber-400" />
            ) : (
              <span className="w-2 h-2 rounded-full shrink-0 bg-outline" />
            )}
            <span className="truncate max-w-[130px] sm:max-w-[240px] md:max-w-[360px] lg:max-w-none font-mono">
              {tunnels.filter((t) => t.status === 'ACTIVE').length > 0
                ? `${tunnels.filter((t) => t.status === 'ACTIVE').length} Live ${tunnels.filter((t) => t.status === 'ACTIVE').length === 1 ? 'Tunnel' : 'Tunnels'} (${tunnels.filter((t) => t.status === 'ACTIVE').map((t) => `:${t.localPort}`).join(', ')})${tunnels.some((t) => t.status === 'STANDBY') ? ` + ${tunnels.filter((t) => t.status === 'STANDBY').length} Standby` : ''}`
                : tunnels.filter((t) => t.status === 'STANDBY').length > 0
                ? `${tunnels.filter((t) => t.status === 'STANDBY').length} Standby (${tunnels.filter((t) => t.status === 'STANDBY').map((t) => `:${t.localPort}`).join(', ')})`
                : 'No Active Tunnels'}
            </span>
          </span>
          <span className="text-outline/50 shrink-0">|</span>
          <span className="hover:text-primary cursor-default transition-colors shrink-0">
            Port {activeTunnel?.localPort ?? '—'}
          </span>
          <span className="text-outline/50 shrink-0 hidden sm:inline">|</span>
          <span className="hover:text-primary cursor-default transition-colors shrink-0 hidden sm:inline">
            Latency: 14ms
          </span>

          <span className="text-outline/50 shrink-0">|</span>
          <button
            onClick={() => setTerminalOpen(!terminalOpen)}
            className={`flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded shrink-0 ${terminalOpen ? 'bg-primary/20 text-primary font-bold' : 'hover:text-primary text-outline'
              }`}
            title="Toggle Console Dock"
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <span className="hidden sm:inline">Console</span>
          </button>

        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-on-surface-variant opacity-60 shrink-0 ml-2">
          <span className="hidden md:inline">Encoding: UTF-8</span>
          <span className="text-primary font-bold">{bootstrapError ? 'OFFLINE' : 'STABLE'}</span>
        </div>
      </footer>

      {/* ── Overlays & Dialogs ── */}
      {panelView && <CompanionPanel panel={panelView} onClose={() => setPanelView(null)} />}

      {discoverOpen && (
        <DiscoverDialog
          processes={processes}
          discovering={discovering}
          sharingPort={sharingPort}
          tunnels={tunnels}
          onClose={() => setDiscoverOpen(false)}
          onRefresh={discoverProcesses}
          onShare={initiatePublicShare}
          onShareLocal={shareProcessLocal}
          onInspectTraffic={(p) => {
            setSelectedProcessId(p.id);
            setMainView('traffic');
          }}
          onSelectProcess={(p) => {
            setSelectedProcessId(p.id);
            setMainView('process');
            if (activeWorkspace) {
              updateActiveWorkspace((ws) => ({
                ...ws,
                selectedProfileId: ws.profiles.find((prof) => prof.port === p.port)?.id,
              }));
            }
          }}
        />
      )}

      {sharingProcessCandidate && (
        <DomainSelectDialog
          process={sharingProcessCandidate}
          domains={domains.filter((d) => d.verified)}
          onClose={() => setSharingProcessCandidate(null)}
          onConfirm={(selectedOption, ltSubdomain) => {
            if (selectedOption === 'proxync_native') { void shareProcessNative(sharingProcessCandidate); }
            else if (selectedOption === 'localtunnel') { void shareProcessLocaltunnel(sharingProcessCandidate, ltSubdomain); }
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
    id: `port-${port}`, name: `Port ${port}`, port,
    framework: 'HTTP Service', command: `localhost:${port}`,
    directory: 'unknown', executable: 'unknown', access: 'ready', uptime: 'live',
  }));
}

async function measureLocalPortLatency(port: number): Promise<number> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);

  try {
    await fetch(`http://localhost:${port}`, {
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
      enableDevTools: parsed.enableDevTools ?? false,
      appLogging: parsed.appLogging ?? true,
      trafficLogging: parsed.trafficLogging ?? false,
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






