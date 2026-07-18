import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './index.css';
import { ToastContainer, showToast } from './lib/toast';
import {
  api,
  ensureLocalWorkspace,
  getToken,
  type LocalWorkspaceContext,
} from './lib/api';
import type {
  MainView,
  SwaggerPanel,
  PanelView,
  ProcessCandidate,
  Tunnel,
  RequestLog,
  SavedRequest,
  PostmanResponse,
  Guardrails,
  ProcessProfile,
  WorkspaceConfig,
  AppSettings,
  DomainRecord,
} from './lib/types';
import { WelcomeView, LobbyView } from './screens/LobbyView';
import { ProcessView } from './screens/ProcessView';
import { TrafficView } from './screens/TrafficView';
import { PostmanView } from './screens/PostmanView';
import { SwaggerView } from './screens/SwaggerView';
import { ObservabilityView } from './screens/ObservabilityView';
import { SettingsView } from './screens/SettingsView';
import { CompanionPanel } from './components/CompanionPanel';
import { DiscoverDialog } from './components/DiscoverDialog';
import { DomainSelectDialog } from './components/DomainSelectDialog';
import { RequestDetailDialog } from './components/RequestDetailDialog';

const LOCAL_WORKSPACES_KEY = 'proxync_local_workspaces_v1';
const ACTIVE_WORKSPACE_KEY = 'proxync_local_active_workspace_v1';
const APP_SETTINGS_KEY = 'proxync_app_settings_v1';

const PORT_NAMES: Record<number, string> = {
  3000: 'Node app',
  3001: 'Node app',
  4000: 'GraphQL service',
  4200: 'Angular app',
  5000: 'Flask or .NET app',
  5173: 'Vite server',
  8000: 'Django or FastAPI app',
  8080: 'HTTP service',
  8888: 'Notebook server',
};

const DEFAULT_GUARDRAILS: Guardrails = {
  authMode: 'guest',
  piiRedaction: true,
  captureBodies: true,
  autoUpdateSwagger: true,
  rateLimit: '250 req/min',
};

const DEFAULT_REQUEST: SavedRequest = {
  id: 'draft',
  name: 'Draft request',
  method: 'GET',
  path: '/',
  headers: { 'Content-Type': 'application/json' },
  body: '',
  source: 'manual',
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  guardrails: { ...DEFAULT_GUARDRAILS },
  defaultProjectRootPath: '',
  relayDeploymentHint: '',
  notes: '',
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const openApiDocument = useMemo(
    () =>
      buildOpenApi(
        requests,
        savedRequests,
        activeTunnel,
        effectiveLanguageHint,
        activeWorkspace?.guardrails ?? DEFAULT_GUARDRAILS,
      ),
    [requests, savedRequests, activeTunnel, effectiveLanguageHint, activeWorkspace],
  );

  useEffect(() => {
    let mounted = true;

    invoke<string>('get_local_ip')
      .then((ip) => {
        if (mounted) setLocalIp(ip);
      })
      .catch(() => undefined);

    ensureLocalWorkspace()
      .then(async (nextContext) => {
        if (!mounted) return;
        setContext(nextContext);
        setBootstrapError('');
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setBootstrapError(error.message);
        setContext({
          user: { id: 'local', name: 'Local Developer', email: 'local@proxync.dev' },
        });
      });

    return () => {
      mounted = false;
    };
  }, [appSettings.defaultProjectRootPath, appSettings.guardrails]);

  useEffect(() => {
    void discoverProcesses();
  }, []);

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
    if (!activeWorkspace) return;
    setSavedRequests(activeWorkspace.savedRequests);
    setRequests(activeWorkspace.capturedRequests);
    setStarterSuggestions(
      activeWorkspace.savedRequests.filter((request) => request.source === 'starter-scan'),
    );

    if (activeWorkspace.remoteWorkspaceId) {
      localStorage.setItem('proxync_workspace', activeWorkspace.remoteWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspace) return;
    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === activeWorkspace.id
          ? {
              ...workspace,
              savedRequests,
              capturedRequests: requests,
              languageHint: effectiveLanguageHint,
              lastSwaggerGeneratedAt: new Date().toISOString(),
            }
          : workspace,
      ),
    );
  }, [savedRequests, requests, effectiveLanguageHint]);

  useEffect(() => {
    let unlistenRequest: (() => void) | undefined;
    let unlistenResponse: (() => void) | undefined;
    let unlistenClosed: (() => void) | undefined;

    async function bindEvents() {
      unlistenRequest = await listen<RequestLog>('request:log', (event) => {
        setRequests((current) => [
          {
            ...event.payload,
            status: 'pending',
            capturedAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 150));
      });

      unlistenResponse = await listen<{ requestId: string; status: number }>(
        'request:log:response',
        (event) => {
          setRequests((current) =>
            current.map((request) =>
              request.id === event.payload.requestId
                ? { ...request, status: event.payload.status }
                : request,
            ),
          );
        },
      );

      unlistenClosed = await listen<{ tunnelId: string }>('tunnel:auto-closed', (event) => {
        setTunnels((current) =>
          current.map((tunnel) =>
            tunnel.id === event.payload.tunnelId ? { ...tunnel, status: 'CLOSED' } : tunnel,
          ),
        );
        setActiveTunnel((current) =>
          current?.id === event.payload.tunnelId ? null : current,
        );
        showToast('Local process stopped. Tunnel closed.', 'info');
      });
    }

    void bindEvents();
    return () => {
      unlistenRequest?.();
      unlistenResponse?.();
      unlistenClosed?.();
    };
  }, []);

  useEffect(() => {
    if (!activeWorkspace?.remoteWorkspaceId || !activeTunnel) return;
    api.requests
      .list(activeWorkspace.remoteWorkspaceId, activeTunnel.id)
      .then((history) => setRequests(history))
      .catch(() => undefined);
  }, [activeTunnel, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspace?.remoteWorkspaceId) {
      setDomains([]);
      return;
    }

    setLoadingDomains(true);
    api.domains
      .list()
      .then((items) => setDomains(items))
      .catch(() => setDomains([]))
      .finally(() => setLoadingDomains(false));
  }, [activeWorkspace?.remoteWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspace?.remoteWorkspaceId) {
      setTunnels([]);
      setActiveTunnel(null);
      return;
    }

    api.tunnels
      .list(activeWorkspace.remoteWorkspaceId)
      .then((existing) => {
        setTunnels(existing);
        const active = existing.find((t) => t.status === 'ACTIVE');
        if (active) {
          setActiveTunnel(active);
          setSelectedProcessId(`port-${active.localPort}`);
        } else {
          setActiveTunnel(null);
        }
      })
      .catch(() => {
        setTunnels([]);
        setActiveTunnel(null);
      });
  }, [activeWorkspace?.remoteWorkspaceId]);

  async function discoverProcesses() {
    setDiscovering(true);
    try {
      const discovered = await readNativeProcesses();
      setProcesses(discovered);
      if (!selectedProcessId && discovered[0]) {
        setSelectedProcessId(discovered[0].id);
      }
      showToast(
        discovered.length > 0
          ? `Discovered ${discovered.length} local process${discovered.length === 1 ? '' : 'es'}`
          : 'No local development ports found',
        discovered.length > 0 ? 'success' : 'info',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Process discovery failed', 'error');
    } finally {
      setDiscovering(false);
    }
  }

  async function createWorkspace() {
    const name = newWorkspaceName.trim();
    if (!name) return;

    let remoteWorkspaceId: string | undefined;
    if (context && context.user && context.user.id !== 'local') {
      try {
        const remote = await api.workspaces.create(name);
        remoteWorkspaceId = remote.id;
      } catch {
        remoteWorkspaceId = undefined;
      }
    }

    const workspace = createWorkspaceConfig(
      name,
      remoteWorkspaceId,
      appSettings.guardrails,
      appSettings.defaultProjectRootPath,
    );
    setWorkspaces((current) => [workspace, ...current]);
    setActiveWorkspaceId(workspace.id);
    setNewWorkspaceName('');
    setMainView('welcome');
    showToast(`Workspace "${name}" created`, 'success');
  }

  function selectWorkspace(workspaceId: string) {
    if (activeWorkspaceId !== workspaceId) {
      setActiveWorkspaceId(workspaceId);
      setActiveTunnel(null);
    }
    setMainView('process');
  }

  async function deleteWorkspace(workspaceId: string) {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;

    const confirmDelete = window.confirm(`Are you sure you want to completely delete and purge the workspace "${ws.name}"? This will terminate all active tunnels and delete all history.`);
    if (!confirmDelete) return;

    // 1. Terminate local tunnel if active
    if (activeTunnel && activeWorkspaceId === workspaceId) {
      try {
        await stopTunnel(activeTunnel);
      } catch {}
    }

    // 2. Call backend DELETE API if workspace is synced
    if (ws.remoteWorkspaceId) {
      try {
        await api.workspaces.delete(ws.remoteWorkspaceId);
      } catch (error: any) {
        showToast(error instanceof Error ? error.message : 'Unable to delete workspace on remote API', 'error');
      }
    }

    // 3. Remove workspace from state and localStorage
    const remaining = workspaces.filter((w) => w.id !== workspaceId);
    setWorkspaces(remaining);
    localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(remaining));

    // 4. Handle active workspace change if deleting current workspace
    if (activeWorkspaceId === workspaceId) {
      if (remaining.length > 0) {
        setActiveWorkspaceId(remaining[0].id);
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, remaining[0].id);
      } else {
        setActiveWorkspaceId(null);
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify([]));
        setMainView('lobby');
      }
    }

    showToast(`Workspace "${ws.name}" completely deleted and purged`, 'success');
  }

  function updateActiveWorkspace(mutator: (workspace: WorkspaceConfig) => WorkspaceConfig) {
    if (!activeWorkspace) return;
    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === activeWorkspace.id ? mutator(workspace) : workspace,
      ),
    );
  }

  async function ensureSyncedWorkspace(workspace: WorkspaceConfig): Promise<string | null> {
    console.log('[ensureSyncedWorkspace] Input workspace:', workspace);
    console.log('[ensureSyncedWorkspace] Current context:', context);
    
    if (!context || !context.user || context.user.id === 'local') {
      showToast('Running in local-only fallback mode. Reconnect the API in Settings.', 'error');
      return null;
    }

    try {
      showToast('Connecting to remote workspaces list...', 'info');
      const remoteWorkspaces = await api.workspaces.list();
      console.log('[ensureSyncedWorkspace] Remote workspaces:', remoteWorkspaces);
      
      const exists = workspace.remoteWorkspaceId && remoteWorkspaces.some((w) => w.id === workspace.remoteWorkspaceId);
      console.log('[ensureSyncedWorkspace] Workspace exists on remote:', exists);
      
      if (exists && workspace.remoteWorkspaceId) {
        return workspace.remoteWorkspaceId;
      }

      showToast(`Syncing workspace "${workspace.name}" with remote API...`, 'info');
      const remote = await api.workspaces.create(workspace.name);
      console.log('[ensureSyncedWorkspace] Workspace created remote:', remote);
      
      setWorkspaces((current) =>
        current.map((w) =>
          w.id === workspace.id ? { ...w, remoteWorkspaceId: remote.id } : w,
        ),
      );
      
      return remote.id;
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[ensureSyncedWorkspace] Sync error:', error);
      showToast(`Workspace sync failed: ${msg}`, 'error');
      return null;
    }
  }

  function initiatePublicShare(process: ProcessCandidate) {
    setSharingProcessCandidate(process);
  }

  async function shareProcessLocaltunnel(process: ProcessCandidate, customSubdomain?: string) {
    if (!activeWorkspace) return;

    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      profiles: upsertProfile(workspace.profiles, process, starterScan.length),
      selectedProfileId: makeProfileId(process),
      languageHint: detectLanguageLabel(process),
    }));

    const remoteId = await ensureSyncedWorkspace(activeWorkspace);
    if (!remoteId) {
      setSelectedProcessId(process.id);
      setMainView('process');
      return;
    }

    const token = getToken();
    if (!token) {
      showToast('Local session is not ready yet', 'error');
      return;
    }

    setSharingPort(process.port);
    try {
      localStorage.setItem('proxync_workspace', remoteId);
      // 1. Create a regular database registered tunnel on the backend
      const tunnel = await api.tunnels.create(
        remoteId,
        process.port,
        'http',
        undefined,
      );
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;

      // 2. Open our agent websocket connection to NestJS relay
      await invoke('open_tunnel', {
        tunnelId: tunnel.id,
        localPort: process.port,
        token,
        workspaceId: remoteId,
        relayUrl,
      });

      // 3. Spawn localtunnel pointing to our NestJS port (3939)
      const suggestedSub = customSubdomain || `${activeWorkspace.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${process.port}`;
      showToast('Starting localtunnel service...', 'info');
      
      const localtunnelUrl = await invoke<string>('open_localtunnel', {
        tunnelId: tunnel.id,
        localPort: 3939, // Route traffic to the local NestJS server port!
        subdomain: suggestedSub,
      });

      // 4. Overwrite the publicUrl with the Localtunnel public address
      const localtunnelBoundTunnel: Tunnel = {
        ...tunnel,
        publicUrl: localtunnelUrl,
        subdomain: localtunnelUrl.replace('https://', '').replace('.localtunnel.me', ''),
      };

      setActiveTunnel(localtunnelBoundTunnel);
      setTunnels((current) => [localtunnelBoundTunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id);
      setMainView('process');
      setDiscoverOpen(false);
      setRequests([]);

      showToast(`Localtunnel is active! URL: ${localtunnelUrl}`, 'success');

      updateActiveWorkspace((workspace) => ({
        ...workspace,
        profiles: workspace.profiles.map((p) =>
          p.id === makeProfileId(process)
            ? {
                ...p,
                lastSharedAt: new Date().toISOString(),
                lastTunnelUrl: localtunnelUrl,
              }
            : p
        ),
      }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setSharingPort(null);
    }
  }

  async function shareProcessCloudflare(process: ProcessCandidate) {
    if (!activeWorkspace) return;

    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      profiles: upsertProfile(workspace.profiles, process, starterScan.length),
      selectedProfileId: makeProfileId(process),
      languageHint: detectLanguageLabel(process),
    }));

    const remoteId = await ensureSyncedWorkspace(activeWorkspace);
    if (!remoteId) {
      setSelectedProcessId(process.id);
      setMainView('process');
      return;
    }

    const token = getToken();
    if (!token) {
      showToast('Local session is not ready yet', 'error');
      return;
    }

    setSharingPort(process.port);
    try {
      localStorage.setItem('proxync_workspace', remoteId);
      // 1. Create a regular database registered tunnel on the backend
      const tunnel = await api.tunnels.create(
        remoteId,
        process.port,
        'http',
        undefined,
      );
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;

      // 2. Open our agent websocket connection to NestJS relay
      await invoke('open_tunnel', {
        tunnelId: tunnel.id,
        localPort: process.port,
        token,
        workspaceId: remoteId,
        relayUrl,
      });

      // 3. Spawn cloudflared pointing to our NestJS port (3939)
      showToast('Starting Cloudflare Tunnel service...', 'info');
      
      const cfTunnelUrl = await invoke<string>('open_cloudflare_tunnel', {
        tunnelId: tunnel.id,
        localPort: 3939,
      });

      // 4. Overwrite the publicUrl with the Cloudflare public address
      const cloudflareBoundTunnel: Tunnel = {
        ...tunnel,
        publicUrl: cfTunnelUrl,
        subdomain: cfTunnelUrl.replace('https://', '').replace('.trycloudflare.com', ''),
      };

      setActiveTunnel(cloudflareBoundTunnel);
      setTunnels((current) => [cloudflareBoundTunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id);
      setMainView('process');
      setDiscoverOpen(false);
      setRequests([]);

      showToast(`Cloudflare Tunnel is active! URL: ${cfTunnelUrl}`, 'success');

      updateActiveWorkspace((workspace) => ({
        ...workspace,
        profiles: workspace.profiles.map((p) =>
          p.id === makeProfileId(process)
            ? {
                ...p,
                lastSharedAt: new Date().toISOString(),
                lastTunnelUrl: cfTunnelUrl,
              }
            : p
        ),
      }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setSharingPort(null);
    }
  }

  async function shareProcess(process: ProcessCandidate, customDomain?: string) {
    if (!activeWorkspace) return;

    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      profiles: upsertProfile(workspace.profiles, process, starterScan.length),
      selectedProfileId: makeProfileId(process),
      languageHint: detectLanguageLabel(process),
    }));

    const remoteId = await ensureSyncedWorkspace(activeWorkspace);
    if (!remoteId) {
      setSelectedProcessId(process.id);
      setMainView('process');
      return;
    }

    const token = getToken();
    if (!token) {
      showToast('Local session is not ready yet', 'error');
      return;
    }

    setSharingPort(process.port);
    try {
      localStorage.setItem('proxync_workspace', remoteId);
      const tunnel = await api.tunnels.create(
        remoteId,
        process.port,
        'http',
        undefined,
        customDomain,
      );
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;

      await invoke('open_tunnel', {
        tunnelId: tunnel.id,
        localPort: process.port,
        token,
        workspaceId: remoteId,
        relayUrl,
      });

      setActiveTunnel(tunnel);
      setTunnels((current) => [tunnel, ...current.filter((item) => item.id !== tunnel.id)]);
      setSelectedProcessId(process.id);
      setMainView('process');
      setDiscoverOpen(false);
      setRequests([]);

      updateActiveWorkspace((workspace) => ({
        ...workspace,
        profiles: workspace.profiles.map((profile) =>
          profile.id === makeProfileId(process)
            ? {
                ...profile,
                lastSharedAt: new Date().toISOString(),
                lastTunnelUrl: tunnel.publicUrl,
              }
            : profile,
        ),
      }));

      showToast(
        `Tunnel is live. Imported ${starterScan.length} starter requests into Postman.`,
        'success',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to share process', 'error');
    } finally {
      setSharingPort(null);
    }
  }

  function shareProcessLocal(process: ProcessCandidate) {
    setSelectedProcessId(process.id);
    setMainView('process');
    setSharingPort(process.port);
    showToast(
      `Exposed local share at http://localhost:${process.port} and http://${localIp}:${process.port}`,
      'success',
    );
  }

  async function stopTunnel(tunnel: Tunnel) {
    if (!activeWorkspace) return;
    try {
      await invoke('close_tunnel', { tunnelId: tunnel.id }).catch(() => undefined);
      if (!tunnel.id.startsWith('lt-') && activeWorkspace.remoteWorkspaceId) {
        await api.tunnels.close(activeWorkspace.remoteWorkspaceId, tunnel.id);
      }
      setTunnels((current) =>
        current.map((item) =>
          item.id === tunnel.id ? { ...item, status: 'CLOSED' } : item,
        ),
      );
      setActiveTunnel((current) => (current?.id === tunnel.id ? null : current));
      showToast('Tunnel stopped', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to stop tunnel', 'error');
    }
  }

  async function openRequestDetail(request: RequestLog) {
    if (!activeWorkspace?.remoteWorkspaceId || !activeTunnel) {
      setSelectedRequest(request);
      return;
    }

    try {
      const detail = await api.requests.get(
        activeWorkspace.remoteWorkspaceId,
        activeTunnel.id,
        request.id,
      );
      setSelectedRequest(detail);
    } catch {
      setSelectedRequest(request);
    }
  }

  function sendToPostman(request: RequestLog) {
    const nextRequest: SavedRequest = {
      id: `captured-${request.id}`,
      name: `${request.method} ${request.path}`,
      method: request.method,
      path: request.path,
      headers: request.headers ?? { 'Content-Type': 'application/json' },
      body: request.bodyPreview ?? '',
      source: 'captured',
    };
    setDraftRequest(nextRequest);
    setSavedRequests((current) => mergeRequests(current, [nextRequest]));
    setSelectedRequest(null);
    setMainView('postman');
  }

  async function replayRequest(request: RequestLog) {
    if (!activeWorkspace?.remoteWorkspaceId || !activeTunnel) return;
    try {
      await api.requests.replay(
        activeWorkspace.remoteWorkspaceId,
        activeTunnel.id,
        request.id,
      );
      showToast('Request replayed through the active tunnel', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Replay failed', 'error');
    }
  }

  async function runPostmanRequest() {
    setSendingRequest(true);
    setPostmanResponse(null);
    const startedAt = Date.now();

    try {
      if (activeWorkspace?.remoteWorkspaceId && activeTunnel) {
        const response = await api.requests.execute(
          activeWorkspace.remoteWorkspaceId,
          activeTunnel.id,
          draftRequest.method,
          draftRequest.path,
          draftRequest.headers,
          draftRequest.body,
        );
        setPostmanResponse({
          status: response.status,
          duration: Date.now() - startedAt,
          headers: response.headers ?? {},
          body: decodeResponseBody(response.body),
        });
      } else {
        const response = await fetch(draftRequest.path, {
          method: draftRequest.method,
          headers: draftRequest.headers,
          body: ['GET', 'HEAD'].includes(draftRequest.method)
            ? undefined
            : draftRequest.body,
        });
        setPostmanResponse({
          status: response.status,
          duration: Date.now() - startedAt,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
        });
      }
      showToast('Request completed', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Request failed', 'error');
    } finally {
      setSendingRequest(false);
    }
  }

  function saveDraftRequest() {
    const saved = {
      ...draftRequest,
      id: draftRequest.id === 'draft' ? crypto.randomUUID() : draftRequest.id,
      name: draftRequest.name.trim() || `${draftRequest.method} ${draftRequest.path}`,
    };
    setSavedRequests((current) => mergeRequests(current, [saved]));
    setDraftRequest(saved);
    showToast('Request saved to collection', 'success');
  }

  function importStarterRequests() {
    if (starterSuggestions.length === 0) return;
    setSavedRequests((current) => mergeRequests(current, starterSuggestions));
    setDraftRequest(starterSuggestions[0]);
    setMainView('postman');
    showToast(
      `Loaded ${starterSuggestions.length} starter requests. Test the likely endpoints and refine from there.`,
      'success',
    );
  }

  function updateDraftHeader(rawHeaders: string) {
    setDraftRequest((current) => ({
      ...current,
      headers: parseHeaderText(rawHeaders),
    }));
  }

  function updateGuardrails(patch: Partial<Guardrails>) {
    const nextGuardrails = {
      ...appSettings.guardrails,
      ...patch,
    };
    setAppSettings((current) => ({
      ...current,
      guardrails: nextGuardrails,
    }));
    setWorkspaces((current) =>
      current.map((workspace) => ({
        ...workspace,
        guardrails: nextGuardrails,
      })),
    );
  }

  function updateWorkspaceNotes(notes: string) {
    if (!activeWorkspace) return;
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      notes,
    }));
  }

  function updateProjectRootPath(projectRootPath: string) {
    setAppSettings((current) => ({
      ...current,
      defaultProjectRootPath: projectRootPath,
    }));
    if (!activeWorkspace) return;
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      projectRootPath,
    }));
  }

  async function scanProjectFolder() {
    if (!activeWorkspace?.projectRootPath) {
      showToast('Add a project root path first', 'info');
      return;
    }

    setScanningProject(true);
    try {
      const files = await invoke<string[]>('scan_directory', {
        path: activeWorkspace.projectRootPath,
      });
      const inferredLanguage = inferLanguageFromFiles(files);
      updateActiveWorkspace((workspace) => ({
        ...workspace,
        scannedFiles: files,
        languageHint: inferredLanguage,
      }));
      showToast(
        `Scanned ${files.length} files. Language hint updated to ${inferredLanguage}.`,
        'success',
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Project scan failed',
        'error',
      );
    } finally {
      setScanningProject(false);
    }
  }

  function updateAppNotes(notes: string) {
    setAppSettings((current) => ({
      ...current,
      notes,
    }));
  }

  function updateRelayHint(relayDeploymentHint: string) {
    setAppSettings((current) => ({
      ...current,
      relayDeploymentHint,
    }));
  }

  async function addDomain() {
    if (!activeWorkspace?.remoteWorkspaceId) {
      showToast('Select a synced workspace before adding a domain', 'info');
      return;
    }
    if (!domainDraft.trim()) {
      showToast('Enter a domain name first', 'info');
      return;
    }

    setBusyDomainId('new');
    try {
      const created = await api.domains.create(
        domainDraft.trim(),
      );
      setDomains((current) => [created, ...current]);
      setDomainDraft('');
      showToast('Domain added. Configure DNS and then verify it.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to add domain', 'error');
    } finally {
      setBusyDomainId(null);
    }
  }

  async function verifyDomain(domainId: string) {
    if (!activeWorkspace?.remoteWorkspaceId) return;
    setBusyDomainId(domainId);
    try {
      const updated = await api.domains.verify(domainId);
      setDomains((current) =>
        current.map((domain) => (domain.id === domainId ? updated : domain)),
      );
      showToast('Domain verification succeeded', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Verification failed', 'error');
    } finally {
      setBusyDomainId(null);
    }
  }

  async function removeDomain(domainId: string) {
    if (!activeWorkspace?.remoteWorkspaceId) return;
    setBusyDomainId(domainId);
    try {
      await api.domains.delete(domainId);
      setDomains((current) => current.filter((domain) => domain.id !== domainId));
      showToast('Domain removed', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to remove domain', 'error');
    } finally {
      setBusyDomainId(null);
    }
  }

  async function syncActiveWorkspace() {
    if (!activeWorkspace) return;
    try {
      const remote = await api.workspaces.create(activeWorkspace.name);
      updateActiveWorkspace((ws) => ({
        ...ws,
        remoteWorkspaceId: remote.id,
      }));
      showToast('Workspace synced to remote API!', 'success');
    } catch (error: any) {
      showToast(error instanceof Error ? error.message : 'Unable to sync workspace', 'error');
    }
  }

  async function reconnectApi() {
    setBootstrapError('');
    try {
      const nextContext = await ensureLocalWorkspace();
      setContext(nextContext);
      setBootstrapError('');
      
      const remoteWorkspaces = await api.workspaces.list();
      setWorkspaces((current) => {
        const updated = [...current];
        for (const remote of remoteWorkspaces) {
          const existingIdx = updated.findIndex(
            (w) => w.remoteWorkspaceId === remote.id || w.name.toLowerCase() === remote.name.toLowerCase()
          );
          if (existingIdx !== -1) {
            updated[existingIdx].remoteWorkspaceId = remote.id;
          } else {
            updated.push(
              createWorkspaceConfig(
                remote.name,
                remote.id,
                appSettings.guardrails,
                appSettings.defaultProjectRootPath
              )
            );
          }
        }
        return updated;
      });
      showToast('Successfully reconnected to API backend', 'success');
    } catch (error: any) {
      setBootstrapError(error.message);
      showToast(`Reconnection failed: ${error.message}`, 'error');
    }
  }

  function selectProfile(profileId: string) {
    if (!activeWorkspace) return;
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      selectedProfileId: profileId,
    }));
    const matchingProcess = processes.find(
      (process) => makeProfileId(process) === profileId,
    );
    if (matchingProcess) {
      setSelectedProcessId(matchingProcess.id);
    }
    setMainView('process');
  }

  function copyText(value: string, message: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => showToast(message, 'success'))
      .catch(() => showToast('Clipboard access failed', 'error'));
  }

  return (
    <div className="mvp-shell">
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 45,
            backdropFilter: 'blur(4px)'
          }}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <div className="brand-mark">PX</div>
          <div>
            <div className="brand-name">Proxync</div>
            <div className="brand-caption">workspace relay studio</div>
          </div>
        </div>

        <div className="workspace-summary">
          <span className="workspace-summary-label">Active workspace</span>
          <strong>{activeWorkspace?.name ?? 'No active workspace'}</strong>
          <small>{activeWorkspace?.languageHint ?? 'Workspace lobby keeps project configs separate'}</small>
          <button className="sidebar-action secondary" onClick={() => { setMainView('lobby'); setSidebarOpen(false); }}>
            Open workspace lobby
          </button>
        </div>

        {/* Tunnel Status Pill – moved from removed topbar */}
        <div className={(activeTunnel || sharingPort) ? 'sidebar-tunnel-status active' : 'sidebar-tunnel-status'}>
          <span className={(activeTunnel || sharingPort) ? 'live-ring active' : 'live-ring'} />
          <span className="sidebar-tunnel-text">
            {activeTunnel
              ? `🌐 ${activeTunnel.publicUrl}`
              : sharingPort
                ? `LAN :${sharingPort}`
                : 'No active tunnel'}
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          <button
            className={mainView === 'lobby' ? 'active' : ''}
            onClick={() => { setMainView('lobby'); setSidebarOpen(false); }}
          >
            Workspace lobby
          </button>
          <button
            className={mainView === 'welcome' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => { setMainView('welcome'); setSidebarOpen(false); }}
          >
            Overview
          </button>
          <button
            className={mainView === 'traffic' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => { setMainView('traffic'); setSidebarOpen(false); }}
          >
            Traffic
          </button>
          <button
            className={mainView === 'postman' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => { setMainView('postman'); setSidebarOpen(false); }}
          >
            Postman
          </button>
          <button
            className={mainView === 'swagger' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => { setMainView('swagger'); setSidebarOpen(false); }}
          >
            Swagger
          </button>
          <button
            className={mainView === 'observability' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => { setMainView('observability'); setSidebarOpen(false); }}
          >
            Observability
          </button>
          <button
            className={mainView === 'settings' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => { setMainView('settings'); setSidebarOpen(false); }}
          >
            Settings
          </button>
        </nav>

        <button
          className="sidebar-action secondary"
          disabled={!activeWorkspace}
          onClick={() => { setDiscoverOpen(true); setSidebarOpen(false); }}
        >
          Discover process
        </button>

        <div className="sidebar-section">
          <div className="sidebar-section-title">
            Live processes
            <button onClick={discoverProcesses} disabled={discovering}>
              {discovering ? 'Scanning' : 'Rescan'}
            </button>
          </div>
          <div className="process-list">
            {processes.length === 0 ? (
              <div className="sidebar-empty">No local dev servers found yet.</div>
            ) : (
              processes.map((process) => (
                <button
                  key={process.id}
                  className={
                    process.id === selectedProcessId
                      ? 'process-row active'
                      : 'process-row'
                  }
                  onClick={() => {
                    setSelectedProcessId(process.id);
                    setMainView('process');
                    setSidebarOpen(false);
                  }}
                >
                  <span className="status-dot" />
                  <span>
                    <strong>{process.name}</strong>
                    <small>:{process.port}</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Saved shares</div>
          <div className="workspace-list">
            {activeWorkspace?.profiles.length ? (
              activeWorkspace.profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={
                    profile.id === activeWorkspace.selectedProfileId
                      ? 'workspace-row active'
                      : 'workspace-row'
                  }
                  onClick={() => { selectProfile(profile.id); setSidebarOpen(false); }}
                >
                  <strong>{profile.processName}</strong>
                  <small>
                    {profile.framework} | {profile.languageHint}
                  </small>
                </button>
              ))
            ) : (
              <div className="sidebar-empty">Share a process once and it will stay here.</div>
            )}
          </div>
        </div>

        <div className="sidebar-section compact">
          <div className="sidebar-section-title">Companions</div>
          <button
            className="panel-button"
            onClick={() => { setPanelView(panelView === 'chat' ? null : 'chat'); setSidebarOpen(false); }}
          >
            Chat panel
          </button>
          <button
            className="panel-button"
            onClick={() => { setPanelView(panelView === 'voice' ? null : 'voice'); setSidebarOpen(false); }}
          >
            Voice room
          </button>
        </div>

        <div className="local-card">
          <span>{activeWorkspace?.name ?? context?.workspace?.name ?? 'No Workspace'}</span>
          <small>{bootstrapError ? 'API offline' : 'Ready'}</small>
        </div>
      </aside>

      <section className="workspace-shell">
        {/* Mobile-only nav bar — only visible on screens ≤ 820px where sidebar is a drawer */}
        <div className="mobile-nav-bar">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <span className="mobile-nav-title">
            {mainView === 'lobby' ? 'Workspace Lobby'
              : mainView === 'welcome' ? 'Overview'
              : mainView === 'traffic' ? 'Traffic'
              : mainView === 'postman' ? 'Postman'
              : mainView === 'swagger' ? 'Swagger'
              : mainView === 'observability' ? 'Observability'
              : mainView === 'settings' ? 'Settings'
              : mainView === 'process' ? 'Process'
              : 'Proxync'}
          </span>
          <div className={(activeTunnel || sharingPort) ? 'live-ring active' : 'live-ring'} style={{ flexShrink: 0 }} />
        </div>

        <main className="content-stage">
          {mainView === 'lobby' && (
            <LobbyView
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              newWorkspaceName={newWorkspaceName}
              onWorkspaceNameChange={setNewWorkspaceName}
              onCreateWorkspace={createWorkspace}
              onSelectWorkspace={selectWorkspace}
              onDeleteWorkspace={deleteWorkspace}
            />
          )}

          {mainView === 'welcome' && (
            <WelcomeView
              workspace={activeWorkspace}
              processCount={processes.length}
              tunnelCount={tunnels.filter((tunnel) => tunnel.status === 'ACTIVE').length}
              requestCount={requests.length}
              onDiscover={() => setDiscoverOpen(true)}
            />
          )}

          {mainView === 'process' && (
            <ProcessView
              workspace={activeWorkspace}
              process={selectedProcess}
              profile={selectedProfile}
              tunnel={activeTunnel}
              sharingPort={sharingPort}
              suggestions={starterSuggestions}
              hasVerifiedDomain={domains.some((d) => d.verified)}
              localIp={localIp}
              bootstrapError={bootstrapError}
              onDiscover={() => setDiscoverOpen(true)}
              onShare={initiatePublicShare}
              onShareLocal={shareProcessLocal}
              onStop={stopTunnel}
              onStopLocalShare={() => setSharingPort(null)}
              onCopy={copyText}
              onImportStarterRequests={importStarterRequests}
            />
          )}

          {mainView === 'traffic' && (
            <TrafficView
              requests={requests}
              activeTunnel={activeTunnel}
              onOpen={openRequestDetail}
              onSendToPostman={sendToPostman}
            />
          )}

          {mainView === 'postman' && (
            <PostmanView
              draft={draftRequest}
              savedRequests={savedRequests}
              response={postmanResponse}
              sending={sendingRequest}
              starterSuggestions={starterSuggestions}
              activeTunnel={activeTunnel}
              onDraftChange={setDraftRequest}
              onHeaderTextChange={updateDraftHeader}
              onRun={runPostmanRequest}
              onSave={saveDraftRequest}
              onLoad={setDraftRequest}
              onImportStarterRequests={importStarterRequests}
            />
          )}

          {mainView === 'swagger' && (
            <SwaggerView
              document={openApiDocument}
              swaggerPanel={swaggerPanel}
              workspace={activeWorkspace}
              languageHint={effectiveLanguageHint}
              onChangePanel={setSwaggerPanel}
              onCopy={() =>
                copyText(
                  JSON.stringify(openApiDocument, null, 2),
                  'OpenAPI JSON copied',
                )
              }
            />
          )}

          {mainView === 'observability' && (
            <ObservabilityView
              workspace={activeWorkspace}
              process={selectedProcess}
              tunnel={activeTunnel}
              requestCount={requests.length}
            />
          )}

          {mainView === 'settings' && (
            <SettingsView
              context={context}
              workspace={activeWorkspace}
              appSettings={appSettings}
              domains={domains}
              domainDraft={domainDraft}
              loadingDomains={loadingDomains}
              busyDomainId={busyDomainId}
              bootstrapError={bootstrapError}
              activeTunnel={activeTunnel}
              scanningProject={scanningProject}
              onUpdateGuardrails={updateGuardrails}
              onUpdateNotes={updateWorkspaceNotes}
              onUpdateAppNotes={updateAppNotes}
              onUpdateRelayHint={updateRelayHint}
              onUpdateProjectRootPath={updateProjectRootPath}
              onScanProjectFolder={scanProjectFolder}
              onDomainDraftChange={setDomainDraft}
              onAddDomain={addDomain}
              onVerifyDomain={verifyDomain}
              onRemoveDomain={removeDomain}
              onSyncWorkspace={syncActiveWorkspace}
              onReconnectApi={reconnectApi}
            />
          )}
        </main>
      </section>

      {panelView && <CompanionPanel panel={panelView} onClose={() => setPanelView(null)} />}

      {discoverOpen && (
        <DiscoverDialog
          processes={processes}
          discovering={discovering}
          sharingPort={sharingPort}
          onClose={() => setDiscoverOpen(false)}
          onRefresh={discoverProcesses}
          onShare={initiatePublicShare}
          onShareLocal={shareProcessLocal}
        />
      )}

      {sharingProcessCandidate && (
        <DomainSelectDialog
          process={sharingProcessCandidate}
          domains={domains.filter((d) => d.verified)}
          onClose={() => setSharingProcessCandidate(null)}
          onConfirm={(selectedOption, ltSubdomain) => {
            if (selectedOption === 'localtunnel') {
              void shareProcessLocaltunnel(sharingProcessCandidate, ltSubdomain);
            } else if (selectedOption === 'cloudflare') {
              void shareProcessCloudflare(sharingProcessCandidate);
            } else {
              void shareProcess(sharingProcessCandidate, selectedOption === 'default' ? undefined : selectedOption);
            }
            setSharingProcessCandidate(null);
          }}
        />
      )}

      {selectedRequest && (
        <RequestDetailDialog
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onReplay={replayRequest}
          onSendToPostman={sendToPostman}
        />
      )}

      <ToastContainer />
    </div>
  );
}

// Extracted sub-views and dialogs are imported from their respective screens/components files.

async function readNativeProcesses(): Promise<ProcessCandidate[]> {
  try {
    const nativeProcesses = await invoke<ProcessCandidate[]>('scan_processes');
    if (nativeProcesses.length > 0) return nativeProcesses;
  } catch {
    // Older agents expose scan_ports only. Fall back below.
  }

  const ports = await invoke<number[]>('scan_ports').catch(() => []);
  return ports.map((port) => ({
    id: `port-${port}`,
    name: PORT_NAMES[port] ?? 'Development server',
    port,
    framework: PORT_NAMES[port] ?? 'HTTP',
    command: `localhost:${port}`,
    directory: 'unknown',
    executable: 'unknown',
    access: 'ready',
    uptime: 'live',
  }));
}



function createWorkspaceConfig(
  name: string,
  remoteWorkspaceId?: string,
  defaultGuardrails: Guardrails = DEFAULT_GUARDRAILS,
  defaultProjectRootPath = '',
): WorkspaceConfig {
  return {
    id: crypto.randomUUID(),
    name,
    remoteWorkspaceId,
    profiles: [],
    savedRequests: [],
    capturedRequests: [],
    guardrails: { ...defaultGuardrails },
    languageHint: 'Undetermined',
    selectedProfileId: undefined,
    projectRootPath: defaultProjectRootPath,
    scannedFiles: [],
    notes: '',
    lastSwaggerGeneratedAt: new Date().toISOString(),
  };
}

function loadAppSettings(): AppSettings {
  const stored = localStorage.getItem(APP_SETTINGS_KEY);
  if (!stored) {
    return {
      ...DEFAULT_APP_SETTINGS,
      guardrails: { ...DEFAULT_GUARDRAILS },
    };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<AppSettings>;
    return {
      guardrails: {
        ...DEFAULT_GUARDRAILS,
        ...(parsed.guardrails ?? {}),
      },
      defaultProjectRootPath: parsed.defaultProjectRootPath ?? '',
      relayDeploymentHint: parsed.relayDeploymentHint ?? '',
      notes: parsed.notes ?? '',
    };
  } catch {
    return {
      ...DEFAULT_APP_SETTINGS,
      guardrails: { ...DEFAULT_GUARDRAILS },
    };
  }
}

function buildStarterRequests(process: ProcessCandidate): SavedRequest[] {
  const languageHint = detectLanguageLabel(process).toLowerCase();
  const presets = ['/', '/health', '/api/health', '/openapi.json', '/swagger-json'];

  if (process.framework?.toLowerCase().includes('vite')) {
    presets.push('/src/main.ts', '/@vite/client');
  }

  if (languageHint.includes('javascript') || languageHint.includes('typescript')) {
    presets.push('/api', '/api/status', '/api/version');
  }

  if (languageHint.includes('python')) {
    presets.push('/docs', '/redoc', '/openapi.json');
  }

  if (languageHint.includes('java')) {
    presets.push('/actuator/health', '/v3/api-docs');
  }

  return Array.from(new Set(presets)).map((path) => ({
    id: `starter-${process.id}-${path}`,
    name: `Probe ${path}`,
    method: 'GET',
    path,
    headers: { Accept: 'application/json' },
    body: '',
    source: 'starter-scan',
  }));
}

function mergeRequests(
  current: SavedRequest[],
  incoming: SavedRequest[],
): SavedRequest[] {
  const map = new Map<string, SavedRequest>();
  for (const request of [...incoming, ...current]) {
    map.set(`${request.method}:${request.path}:${request.name}`, request);
  }
  return Array.from(map.values());
}

function makeProfileId(process: ProcessCandidate) {
  return `${process.name}-${process.port}`.toLowerCase().replace(/\s+/g, '-');
}

function upsertProfile(
  profiles: ProcessProfile[],
  process: ProcessCandidate,
  starterRequestCount: number,
): ProcessProfile[] {
  const nextProfile: ProcessProfile = {
    id: makeProfileId(process),
    processName: process.name,
    port: process.port,
    framework: process.framework ?? 'HTTP',
    languageHint: detectLanguageLabel(process),
    command: process.command ?? process.name,
    directory: process.directory ?? 'unknown',
    executable: process.executable ?? 'unknown',
    lastSharedAt: new Date().toISOString(),
    starterRequestCount,
  };

  const existing = profiles.some((profile) => profile.id === nextProfile.id);
  if (existing) {
    return profiles.map((profile) =>
      profile.id === nextProfile.id ? { ...profile, ...nextProfile } : profile,
    );
  }
  return [nextProfile, ...profiles];
}

function detectLanguageLabel(process: Pick<ProcessCandidate, 'framework' | 'command' | 'directory'>) {
  const signature = `${process.framework ?? ''} ${process.command ?? ''} ${process.directory ?? ''}`.toLowerCase();
  if (
    signature.includes('node') ||
    signature.includes('vite') ||
    signature.includes('next') ||
    signature.includes('react')
  ) {
    return 'TypeScript / JavaScript';
  }
  if (
    signature.includes('django') ||
    signature.includes('fastapi') ||
    signature.includes('flask') ||
    signature.includes('python')
  ) {
    return 'Python';
  }
  if (signature.includes('spring') || signature.includes('java')) {
    return 'Java';
  }
  if (signature.includes('.net') || signature.includes('dotnet')) {
    return '.NET';
  }
  return 'Undetermined';
}

function inferLanguageFromFiles(files: string[]) {
  const counts = {
    ts: 0,
    js: 0,
    py: 0,
    java: 0,
    cs: 0,
    go: 0,
  };

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

  const labels: Record<string, string> = {
    ts: 'TypeScript',
    js: 'JavaScript',
    py: 'Python',
    java: 'Java',
    cs: '.NET',
    go: 'Go',
  };
  return labels[winner] ?? 'Undetermined';
}

function buildOpenApi(
  requests: RequestLog[],
  savedRequests: SavedRequest[],
  activeTunnel: Tunnel | null,
  languageHint: string,
  guardrails: Guardrails,
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const item of [...requests, ...savedRequests]) {
    const path = normalizePath(item.path);
    const method = item.method.toLowerCase();
    const status = 'status' in item ? item.status ?? 200 : 200;
    paths[path] = {
      ...paths[path],
      [method]: {
        summary: `${item.method} ${path}`,
        description:
          'Generated from Proxync capture and workspace request collection.',
        responses: {
          [String(status)]: {
            description: 'Observed response',
          },
        },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Proxync generated API',
      version: '0.1.0',
      description: `Language hint: ${languageHint}. PII redaction: ${guardrails.piiRedaction ? 'enabled' : 'disabled'}.`,
    },
    servers: [
      {
        url: activeTunnel?.publicUrl ?? 'http://localhost',
      },
    ],
    paths,
  };
}


function normalizePath(path: string) {
  if (!path) return '/';
  try {
    const parsed = new URL(path);
    return parsed.pathname || '/';
  } catch {
    return path.startsWith('/') ? path : `/${path}`;
  }
}

function parseHeaderText(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':');
        if (separator === -1) return [line, ''];
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}


function decodeResponseBody(value: string | undefined) {
  if (!value) return '';
  try {
    return atob(value);
  } catch {
    return value;
  }
}


