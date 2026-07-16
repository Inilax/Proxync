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

type MainView =
  | 'lobby'
  | 'welcome'
  | 'process'
  | 'traffic'
  | 'postman'
  | 'swagger'
  | 'observability'
  | 'settings';
type SwaggerPanel = 'preview' | 'json';
type PanelView = 'chat' | 'voice' | null;

interface ProcessCandidate {
  id: string;
  name: string;
  port: number;
  pid?: number;
  command?: string;
  directory?: string;
  executable?: string;
  framework?: string;
  access: 'ready' | 'limited' | 'unknown';
  uptime?: string;
}

interface Tunnel {
  id: string;
  publicUrl: string;
  localPort: number;
  status: string;
  subdomain?: string;
  createdAt?: string;
}

interface RequestLog {
  id: string;
  method: string;
  path: string;
  status?: number | string;
  durationMs?: number | null;
  headers?: Record<string, string>;
  bodyPreview?: string;
  responseHeaders?: Record<string, string>;
  capturedAt?: string;
}

interface SavedRequest {
  id: string;
  name: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  source: 'manual' | 'starter-scan' | 'captured';
}

interface PostmanResponse {
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: string;
}

interface Guardrails {
  authMode: 'guest' | 'shared-secret' | 'workspace-only';
  piiRedaction: boolean;
  captureBodies: boolean;
  autoUpdateSwagger: boolean;
  rateLimit: string;
}

interface ProcessProfile {
  id: string;
  processName: string;
  port: number;
  framework: string;
  languageHint: string;
  command: string;
  directory: string;
  executable: string;
  lastSharedAt?: string;
  lastTunnelUrl?: string;
  starterRequestCount: number;
}

interface WorkspaceConfig {
  id: string;
  name: string;
  remoteWorkspaceId?: string;
  profiles: ProcessProfile[];
  savedRequests: SavedRequest[];
  capturedRequests: RequestLog[];
  guardrails: Guardrails;
  languageHint: string;
  selectedProfileId?: string;
  lastSwaggerGeneratedAt?: string;
  projectRootPath: string;
  scannedFiles: string[];
  notes: string;
}

interface AppSettings {
  guardrails: Guardrails;
  defaultProjectRootPath: string;
  relayDeploymentHint: string;
  notes: string;
}

interface DomainRecord {
  id: string;
  name: string;
  verificationToken: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

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

const getApexDomain = (domain: string) => {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  const secondToLast = parts[parts.length - 2].toLowerCase();
  const commonDoubleTlds = ['co', 'com', 'org', 'net', 'edu', 'gov', 'mil'];
  if (parts.length > 3 && commonDoubleTlds.includes(secondToLast)) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
};

const getRelayBase = () => {
  const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
  const parsed = apiBase.replace(/^https?:\/\//, '').split(':')[0];
  if (parsed === 'localhost' || parsed === '127.0.0.1') {
    return 'localtest.me';
  }
  return parsed;
};

export default function App() {
  const [context, setContext] = useState<LocalWorkspaceContext | null>(null);
  const [bootstrapError, setBootstrapError] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
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
  const [mainView, setMainView] = useState<MainView>('welcome');
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

        const hydrated = hydrateStoredWorkspaces(
          nextContext.workspace ?? null,
          appSettings.guardrails,
          appSettings.defaultProjectRootPath,
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
        setContext({
          user: { id: 'local', name: 'Local Developer', email: 'local@proxync.dev' },
        });
        const fallback = hydrateStoredWorkspaces(
          null,
          appSettings.guardrails,
          appSettings.defaultProjectRootPath,
        );
        setWorkspaces(fallback.workspaces);
        if (fallback.workspaces.length === 0) {
          setActiveWorkspaceId(null);
          setMainView('lobby');
        } else {
          setActiveWorkspaceId(fallback.activeWorkspaceId);
        }
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
      .list(activeWorkspace.remoteWorkspaceId)
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
    if (context && context.workspace && context.workspace.id !== 'local') {
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

  async function shareProcess(process: ProcessCandidate) {
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

    if (!activeWorkspace.remoteWorkspaceId || !context || !context.workspace || context.workspace.id === 'local') {
      setSelectedProcessId(process.id);
      setMainView('process');
      setSharingPort(process.port);
      showToast(
        'Saved this process configuration locally. Connect the API to create a public tunnel.',
        'info',
      );
      return;
    }

    const token = getToken();
    if (!token) {
      showToast('Local session is not ready yet', 'error');
      return;
    }

    setSharingPort(process.port);
    try {
      localStorage.setItem('proxync_workspace', activeWorkspace.remoteWorkspaceId);
      const tunnel = await api.tunnels.create(
        activeWorkspace.remoteWorkspaceId,
        process.port,
        'http',
      );
      const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3939') as string;
      const relayUrl = `${apiBase.replace(/^http/, 'ws')}/relay`;

      await invoke('open_tunnel', {
        tunnelId: tunnel.id,
        localPort: process.port,
        token,
        workspaceId: activeWorkspace.remoteWorkspaceId,
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
    if (!activeWorkspace?.remoteWorkspaceId) return;
    try {
      await invoke('close_tunnel', { tunnelId: tunnel.id }).catch(() => undefined);
      await api.tunnels.close(activeWorkspace.remoteWorkspaceId, tunnel.id);
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
        activeWorkspace.remoteWorkspaceId,
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
      const updated = await api.domains.verify(activeWorkspace.remoteWorkspaceId, domainId);
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
      await api.domains.delete(activeWorkspace.remoteWorkspaceId, domainId);
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
      <aside className="sidebar">
        <div className="brand-block">
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
          <button className="sidebar-action secondary" onClick={() => setMainView('lobby')}>
            Open workspace lobby
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          <button
            className={mainView === 'lobby' ? 'active' : ''}
            onClick={() => setMainView('lobby')}
          >
            Workspace lobby
          </button>
          <button
            className={mainView === 'welcome' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => setMainView('welcome')}
          >
            Overview
          </button>
          <button
            className={mainView === 'traffic' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => setMainView('traffic')}
          >
            Traffic
          </button>
          <button
            className={mainView === 'postman' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => setMainView('postman')}
          >
            Postman
          </button>
          <button
            className={mainView === 'swagger' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => setMainView('swagger')}
          >
            Swagger
          </button>
          <button
            className={mainView === 'observability' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => setMainView('observability')}
          >
            Observability
          </button>
          <button
            className={mainView === 'settings' ? 'active' : ''}
            disabled={!activeWorkspace}
            onClick={() => setMainView('settings')}
          >
            Settings
          </button>
        </nav>

        <button
          className="sidebar-action secondary"
          disabled={!activeWorkspace}
          onClick={() => setDiscoverOpen(true)}
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
                  onClick={() => selectProfile(profile.id)}
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
            onClick={() => setPanelView(panelView === 'chat' ? null : 'chat')}
          >
            Chat panel
          </button>
          <button
            className="panel-button"
            onClick={() => setPanelView(panelView === 'voice' ? null : 'voice')}
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
        <header className="topbar">
          <div className={(activeTunnel || sharingPort) ? 'session-pill active' : 'session-pill'}>
            <span className={(activeTunnel || sharingPort) ? 'live-ring active' : 'live-ring'} />
            {activeTunnel
              ? activeTunnel.publicUrl
              : sharingPort
                ? `LAN share active :${sharingPort}`
                : activeWorkspace?.selectedProfileId
                  ? 'Saved share ready to rerun'
                  : 'No active tunnel'}
          </div>
          <div className="window-actions">
            <button onClick={() => setPanelView(panelView === 'chat' ? null : 'chat')}>
              Chat
            </button>
            <button onClick={() => setPanelView(panelView === 'voice' ? null : 'voice')}>
              Voice
            </button>
          </div>
        </header>

        <div className="tab-strip">
          {(
            [
              'lobby',
              'welcome',
              'process',
              'traffic',
              'postman',
              'swagger',
              'observability',
              'settings',
            ] as MainView[]
          ).map((view) => (
            <button
              key={view}
              className={mainView === view ? 'tab active' : 'tab'}
              onClick={() => setMainView(view)}
            >
              {tabLabel(view)}
            </button>
          ))}
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
              onDiscover={() => setDiscoverOpen(true)}
              onShare={shareProcess}
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
          onShare={shareProcess}
          onShareLocal={shareProcessLocal}
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

function WelcomeView({
  workspace,
  processCount,
  tunnelCount,
  requestCount,
  onDiscover,
}: {
  workspace: WorkspaceConfig | null;
  processCount: number;
  tunnelCount: number;
  requestCount: number;
  onDiscover: () => void;
}) {
  return (
    <div className="welcome-view">
      <div className="terminal-orb">PX</div>
      <h1>Keep each project isolated, share faster, and let contracts evolve with the code.</h1>
      <p>
        Every workspace stores its own process profile, guardrails, captured traffic,
        Postman collection, and generated Swagger. When the project changes, the
        contract updates with it.
      </p>
      <button className="primary-command" onClick={onDiscover}>
        Discover running processes
      </button>
      <div className="metric-row">
        <Metric label="Workspace" value={workspace?.name ?? 'No active'} emphasis />
        <Metric label="Live processes" value={String(processCount)} />
        <Metric label="Active tunnels" value={String(tunnelCount)} />
        <Metric label="Captured requests" value={String(requestCount)} />
      </div>
    </div>
  );
}

function LobbyView({
  workspaces,
  activeWorkspaceId,
  newWorkspaceName,
  onWorkspaceNameChange,
  onCreateWorkspace,
  onSelectWorkspace,
  onDeleteWorkspace,
}: {
  workspaces: WorkspaceConfig[];
  activeWorkspaceId: string | null;
  newWorkspaceName: string;
  onWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
}) {
  return (
    <div className="lobby-view">
      <div className="page-heading">
        <div>
          <h1>Workspace lobby</h1>
          <p>
            Keep each project isolated here. Every workspace carries its own saved
            share profile, guardrails, Postman collection, Swagger contract, and notes.
          </p>
        </div>
      </div>

      <section className="console-section lobby-create">
        <div>
          <h2>Create a workspace</h2>
          <p>
            Make one workspace per project so you can come back to the same setup
            later without mixing configs.
          </p>
        </div>
        <div className="workspace-create">
          <input
            value={newWorkspaceName}
            onChange={(event) => onWorkspaceNameChange(event.target.value)}
            placeholder="New workspace"
            aria-label="New workspace"
          />
          <button className="sidebar-action" onClick={onCreateWorkspace}>
            Create
          </button>
        </div>
      </section>

      {workspaces.length === 0 ? (
        <div className="onboarding-welcome">
          <div className="welcome-icon">🚀</div>
          <h2>Welcome to Proxync!</h2>
          <p>Get started by creating your very first workspace above. Isolated workspaces keep your projects, shares, guardrails, and APIs organized.</p>
        </div>
      ) : (
        <section className="lobby-grid">
          {workspaces.map((workspace) => (
            <article
              key={workspace.id}
              className={
                workspace.id === activeWorkspaceId
                  ? 'lobby-card active'
                  : 'lobby-card'
              }
            >
              <div className="lobby-card-head">
                <div>
                  <strong>{workspace.name}</strong>
                  <small>{workspace.languageHint}</small>
                </div>
                <span className="badge neutral">
                  {workspace.id === activeWorkspaceId ? 'Current' : 'Saved'}
                </span>
              </div>
              <div className="lobby-card-meta">
                <span>{workspace.profiles.length} saved shares</span>
                <span>{workspace.savedRequests.length} requests</span>
                <span>{workspace.guardrails.authMode} auth</span>
              </div>
              <p>{workspace.notes || 'No notes yet. This workspace is ready for project-specific context.'}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  className="primary-command small"
                  onClick={() => onSelectWorkspace(workspace.id)}
                >
                  Open workspace
                </button>
                <button
                  className="danger-command small"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ff8b8b',
                    cursor: 'pointer'
                  }}
                  onClick={() => onDeleteWorkspace(workspace.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={emphasis ? 'metric-card emphasis' : 'metric-card'}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProcessView({
  workspace,
  process,
  profile,
  tunnel,
  sharingPort,
  suggestions,
  hasVerifiedDomain,
  localIp,
  onDiscover,
  onShare,
  onShareLocal,
  onStop,
  onStopLocalShare,
  onCopy,
  onImportStarterRequests,
}: {
  workspace: WorkspaceConfig | null;
  process: ProcessCandidate | null;
  profile: ProcessProfile | null;
  tunnel: Tunnel | null;
  sharingPort: number | null;
  suggestions: SavedRequest[];
  hasVerifiedDomain: boolean;
  localIp: string;
  onDiscover: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
  onStop: (tunnel: Tunnel) => void;
  onStopLocalShare: () => void;
  onCopy: (value: string, message: string) => void;
  onImportStarterRequests: () => void;
}) {
  if (!process && !profile) {
    return (
      <div className="empty-stage">
        <h2>No process selected</h2>
        <p>Scan localhost and choose a running server to create your first saved share.</p>
        <button className="primary-command" onClick={onDiscover}>
          Discover processes
        </button>
      </div>
    );
  }

  const processLike = process ?? {
    id: profile!.id,
    name: profile!.processName,
    port: profile!.port,
    command: profile!.command,
    directory: profile!.directory,
    executable: profile!.executable,
    framework: profile!.framework,
    access: 'unknown' as const,
    uptime: profile?.lastSharedAt ? 'saved configuration' : 'saved',
  };

  const isActive = tunnel?.localPort === processLike.port && tunnel.status === 'ACTIVE';

  return (
    <div className="process-view">
      <div className="page-heading">
        <div>
          <h1>{processLike.name}</h1>
          <div className="badge-row">
            <span className="badge good">
              {process ? 'Running locally' : 'Saved profile'}
            </span>
            <span className="badge neutral">Port {processLike.port}</span>
            <span className="badge neutral">{processLike.framework ?? 'HTTP'}</span>
            <span className="badge neutral">{workspace?.languageHint ?? 'Unknown language'}</span>
          </div>
        </div>
        {isActive && tunnel ? (
          <button className="danger-command" onClick={() => onStop(tunnel)}>
            Stop tunnel
          </button>
        ) : sharingPort === processLike.port ? (
          <button className="danger-command" onClick={onStopLocalShare}>
            Stop sharing
          </button>
        ) : process ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="primary-command small"
              onClick={() => onShareLocal(process)}
              style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              Share via Localhost/LAN
            </button>
            <button
              className="primary-command small"
              onClick={() => onShare(process)}
            >
              Share via Public Domain
            </button>
          </div>
        ) : (
          <button className="primary-command small" onClick={onDiscover}>
            Find running process
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <section className="console-section starter-section">
          <div className="starter-copy">
            <h2>Starter request scan</h2>
            <p>
              Proxync guessed likely endpoints for this app and prepared them for the
              Postman workspace. Test them, keep the winners, and the Swagger contract
              will update from what turns out to be real.
            </p>
          </div>
          <div className="starter-actions">
            <span>{suggestions.length} starter requests ready</span>
            <button className="primary-command small" onClick={onImportStarterRequests}>
              Import into Postman
            </button>
          </div>
        </section>
      )}

      <section className="console-section">
        <h2>Process status</h2>
        <div className="status-grid">
          <InfoTile label="Status" value={process ? 'Running' : 'Awaiting rerun'} />
          <InfoTile label="Uptime" value={processLike.uptime ?? 'unknown'} />
          <InfoTile label="PID" value={process?.pid?.toString() ?? 'saved only'} />
          <InfoTile label="Port" value={processLike.port.toString()} />
        </div>
      </section>

      <section className="console-section">
        <h2>Workspace configuration</h2>
        <div className="detail-grid">
          <InfoTile label="Guardrail auth" value={workspace?.guardrails.authMode ?? 'guest'} />
          <InfoTile
            label="Swagger mode"
            value={workspace?.guardrails.autoUpdateSwagger ? 'auto-updating' : 'manual'}
          />
          <InfoTile
            label="Profile saved"
            value={profile?.lastSharedAt ? formatDate(profile.lastSharedAt) : 'this session'}
          />
        </div>
      </section>

      <section className="console-section">
        <h2>Process details</h2>
        <div className="detail-grid">
          <InfoTile label="Command" value={processLike.command ?? processLike.name} monospace />
          <InfoTile label="Directory" value={processLike.directory ?? 'unknown'} monospace />
          <InfoTile label="Executable" value={processLike.executable ?? 'unknown'} monospace />
        </div>
      </section>

      <section className="console-section share-section">
        <h2>Connection and sharing</h2>
        {!hasVerifiedDomain && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--yellow)',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'start',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: '1' }}>⚠️</span>
            <div>
              <strong>No custom domain connected.</strong> The default wildcard link will only work within this local network. For public internet visibility, you must add and verify a custom domain in Settings.
            </div>
          </div>
        )}
        <div className={isActive ? 'share-box active' : 'share-box'}>
          <div>
            <strong>
              {isActive ? 'You are hosting this process' : 'Workspace is ready to reuse this share'}
            </strong>
            <p>
              {isActive
                ? 'Traffic capture, starter Postman requests, and workspace-specific Swagger are active now.'
                : 'The share configuration is saved with this workspace. Start the local process and rerun share when you need the link again.'}
            </p>
          </div>
          <div className="url-line">
            <span>Local</span>
            <code>http://localhost:{processLike.port}</code>
            <button
              onClick={() =>
                onCopy(`http://localhost:${processLike.port}`, 'Local address copied')
              }
            >
              Copy
            </button>
          </div>
          {localIp && localIp !== '127.0.0.1' && (
            <div className="url-line">
              <span>LAN</span>
              <code>http://{localIp}:{processLike.port}</code>
              <button
                onClick={() =>
                  onCopy(`http://${localIp}:${processLike.port}`, 'LAN address copied')
                }
              >
                Copy
              </button>
            </div>
          )}
          {isActive && tunnel && (
            <div className="url-line">
              <span>Public</span>
              <code>{tunnel.publicUrl}</code>
              <button
                onClick={() =>
                  onCopy(
                    tunnel.publicUrl,
                    'Share URL copied',
                  )
                }
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoTile({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="info-tile">
      <span>{label}</span>
      <strong className={monospace ? 'mono' : ''}>{value}</strong>
    </div>
  );
}

function TrafficView({
  requests,
  activeTunnel,
  onOpen,
  onSendToPostman,
}: {
  requests: RequestLog[];
  activeTunnel: Tunnel | null;
  onOpen: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
}) {
  return (
    <div className="traffic-view">
      <div className="page-heading">
        <div>
          <h1>Traffic</h1>
          <p>
            {activeTunnel
              ? `Listening on ${activeTunnel.publicUrl}`
              : 'Start a tunnel to capture live requests.'}
          </p>
        </div>
      </div>
      <div className="traffic-table">
        <div className="traffic-head">
          <span>Method</span>
          <span>Path</span>
          <span>Status</span>
          <span>Time</span>
          <span>Action</span>
        </div>
        {requests.length === 0 ? (
          <div className="traffic-empty">No requests captured yet.</div>
        ) : (
          requests.map((request) => (
            <button className="traffic-row" key={request.id} onClick={() => onOpen(request)}>
              <span className={`method ${request.method.toLowerCase()}`}>{request.method}</span>
              <code>{request.path}</code>
              <span>{request.status ?? 'pending'}</span>
              <span>{request.durationMs ? `${request.durationMs}ms` : '-'}</span>
              <span
                className="inline-action"
                onClick={(event) => {
                  event.stopPropagation();
                  onSendToPostman(request);
                }}
              >
                Send to Postman
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function PostmanView({
  draft,
  savedRequests,
  response,
  sending,
  starterSuggestions,
  activeTunnel,
  onDraftChange,
  onHeaderTextChange,
  onRun,
  onSave,
  onLoad,
  onImportStarterRequests,
}: {
  draft: SavedRequest;
  savedRequests: SavedRequest[];
  response: PostmanResponse | null;
  sending: boolean;
  starterSuggestions: SavedRequest[];
  activeTunnel: Tunnel | null;
  onDraftChange: (request: SavedRequest) => void;
  onHeaderTextChange: (value: string) => void;
  onRun: () => void;
  onSave: () => void;
  onLoad: (request: SavedRequest) => void;
  onImportStarterRequests: () => void;
}) {
  return (
    <div className="postman-view">
      <div className="collection-rail">
        <h2>Collection</h2>
        {savedRequests.map((request) => (
          <button key={request.id} onClick={() => onLoad(request)}>
            <span className={`method ${request.method.toLowerCase()}`}>{request.method}</span>
            <span>
              {request.name}
              <small>{request.source}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="request-builder">
        {starterSuggestions.length > 0 && (
          <div className="import-banner">
            <div>
              <strong>Starter scan available</strong>
              <p>
                Likely endpoints were inferred from the project shape. Import them and
                test what sticks.
              </p>
            </div>
            <button onClick={onImportStarterRequests}>Import scan</button>
          </div>
        )}

        <div className="request-name-row">
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            aria-label="Request name"
          />
          <button onClick={onSave}>Save</button>
        </div>
        <div className="url-builder">
          <select
            value={draft.method}
            onChange={(event) => onDraftChange({ ...draft, method: event.target.value })}
            aria-label="HTTP method"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
          <input
            value={draft.path}
            onChange={(event) => onDraftChange({ ...draft, path: event.target.value })}
            placeholder={activeTunnel ? '/api/users' : 'https://example.com/api'}
            aria-label="Request URL or path"
          />
          <button className="primary-command small" onClick={onRun} disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div className="builder-grid">
          <label>
            Headers
            <textarea
              value={formatHeaders(draft.headers)}
              onChange={(event) => onHeaderTextChange(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            Body
            <textarea
              value={draft.body}
              onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
              spellCheck={false}
            />
          </label>
        </div>
      </div>

      <div className="response-pane">
        <h2>Response</h2>
        {response ? (
          <>
            <div className="response-meta">
              <span>Status {response.status}</span>
              <span>{response.duration}ms</span>
            </div>
            <pre>{response.body || '[empty response]'}</pre>
          </>
        ) : (
          <div className="traffic-empty">Send a request to see the response.</div>
        )}
      </div>
    </div>
  );
}

function SwaggerView({
  document,
  swaggerPanel,
  workspace,
  languageHint,
  onChangePanel,
  onCopy,
}: {
  document: Record<string, unknown>;
  swaggerPanel: SwaggerPanel;
  workspace: WorkspaceConfig | null;
  languageHint: string;
  onChangePanel: (panel: SwaggerPanel) => void;
  onCopy: () => void;
}) {
  const endpointPreview = buildEndpointPreview(document);

  return (
    <div className="swagger-view">
      <div className="page-heading">
        <div>
          <h1>Swagger</h1>
          <p>
            {languageHint} project detected. This contract updates from saved requests,
            captured traffic, and workspace guardrails.
          </p>
        </div>
        <div className="action-cluster">
          <button
            className={swaggerPanel === 'preview' ? 'subtab active' : 'subtab'}
            onClick={() => onChangePanel('preview')}
          >
            Preview
          </button>
          <button
            className={swaggerPanel === 'json' ? 'subtab active' : 'subtab'}
            onClick={() => onChangePanel('json')}
          >
            JSON
          </button>
          <button className="primary-command small" onClick={onCopy}>
            Copy JSON
          </button>
        </div>
      </div>

      {swaggerPanel === 'preview' ? (
        <div className="swagger-preview">
          <section className="swagger-summary">
            <InfoTile label="Language hint" value={languageHint} />
            <InfoTile
              label="Auto update"
              value={workspace?.guardrails.autoUpdateSwagger ? 'enabled' : 'manual'}
            />
            <InfoTile
              label="Generated"
              value={
                workspace?.lastSwaggerGeneratedAt
                  ? formatDate(workspace.lastSwaggerGeneratedAt)
                  : 'just now'
              }
            />
          </section>

          <section className="swagger-endpoints">
            {endpointPreview.length === 0 ? (
              <div className="traffic-empty">Capture or save requests to generate endpoints.</div>
            ) : (
              endpointPreview.map((endpoint) => (
                <article key={`${endpoint.method}-${endpoint.path}`} className="endpoint-card">
                  <div className="endpoint-header">
                    <span className={`method ${endpoint.method.toLowerCase()}`}>
                      {endpoint.method}
                    </span>
                    <code>{endpoint.path}</code>
                  </div>
                  <p>{endpoint.summary}</p>
                  <small>{endpoint.responseLabel}</small>
                </article>
              ))
            )}
          </section>
        </div>
      ) : (
        <pre className="openapi-preview">{JSON.stringify(document, null, 2)}</pre>
      )}
    </div>
  );
}

function ObservabilityView({
  workspace,
  process,
  tunnel,
  requestCount,
}: {
  workspace: WorkspaceConfig | null;
  process: ProcessCandidate | null;
  tunnel: Tunnel | null;
  requestCount: number;
}) {
  const cards = [
    {
      label: 'Environment health',
      value: tunnel ? 'Healthy' : 'Waiting for tunnel',
      note: 'Static mock for now',
    },
    {
      label: 'Synthetic journeys',
      value: '4 passing / 1 flaky',
      note: 'Checkout, onboarding, auth, dashboards, uploads',
    },
    {
      label: 'Request load',
      value: `${requestCount} captured`,
      note: 'Useful once we wire real telemetry',
    },
    {
      label: 'Workspace posture',
      value: workspace?.guardrails.piiRedaction ? 'Redaction enabled' : 'Open capture',
      note: process?.framework ?? 'No process selected',
    },
  ];

  return (
    <div className="observability-view">
      <div className="page-heading">
        <div>
          <h1>Observability</h1>
          <p>
            A static environment dashboard for now. This is where live health,
            performance, and scenario testing will land next.
          </p>
        </div>
      </div>

      <div className="observability-grid">
        {cards.map((card) => (
          <article key={card.label} className="metric-card observability-card">
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <small>{card.note}</small>
          </article>
        ))}
      </div>

      <section className="console-section">
        <h2>Scenario queue</h2>
        <div className="scenario-list">
          <div>
            <strong>Landing page smoke</strong>
            <span>Ensures main route returns content and key assets.</span>
          </div>
          <div>
            <strong>API contract drift</strong>
            <span>Compares generated OpenAPI against last saved workspace snapshot.</span>
          </div>
          <div>
            <strong>Rate-limit pressure</strong>
            <span>Future synthetic traffic test based on the workspace guardrails.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsView({
  context,
  workspace,
  appSettings,
  domains,
  domainDraft,
  loadingDomains,
  busyDomainId,
  bootstrapError,
  activeTunnel,
  scanningProject,
  onUpdateGuardrails,
  onUpdateNotes,
  onUpdateAppNotes,
  onUpdateRelayHint,
  onUpdateProjectRootPath,
  onScanProjectFolder,
  onDomainDraftChange,
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
  onSyncWorkspace,
  onReconnectApi,
}: {
  context: LocalWorkspaceContext | null;
  workspace: WorkspaceConfig | null;
  appSettings: AppSettings;
  domains: DomainRecord[];
  domainDraft: string;
  loadingDomains: boolean;
  busyDomainId: string | null;
  bootstrapError: string;
  activeTunnel: Tunnel | null;
  scanningProject: boolean;
  onUpdateGuardrails: (patch: Partial<Guardrails>) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateAppNotes: (notes: string) => void;
  onUpdateRelayHint: (relayDeploymentHint: string) => void;
  onUpdateProjectRootPath: (projectRootPath: string) => void;
  onScanProjectFolder: () => void;
  onDomainDraftChange: (value: string) => void;
  onAddDomain: () => void;
  onVerifyDomain: (domainId: string) => void;
  onRemoveDomain: (domainId: string) => void;
  onSyncWorkspace: () => void;
  onReconnectApi: () => void;
}) {
  return (
    <div className="settings-view">
      <h1>Settings</h1>
      {bootstrapError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#ff8b8b',
          fontSize: '13px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>API Connection Offline.</strong> You are currently running in local-only fallback mode.
          </div>
          <button className="primary-command small" style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={onReconnectApi}>
            Reconnect
          </button>
        </div>
      )}
      <div className="settings-grid">
        <InfoTile label="Workspace" value={workspace?.name ?? 'starting'} />
        <InfoTile
          label="User mode"
          value={context?.user?.email?.endsWith('@proxync.local') ? 'guest relay session' : 'local'}
        />
        <InfoTile label="Remote workspace" value={workspace?.remoteWorkspaceId ?? 'not synced'} monospace />
        <InfoTile label="Relay state" value={bootstrapError || 'connected'} />
        <InfoTile label="Active tunnel" value={activeTunnel?.publicUrl ?? 'none'} monospace />
      </div>

      <section className="console-section settings-section">
        <h2>Project scan</h2>
        <div className="settings-form">
          <label>
            Project root
            <input
              value={workspace?.projectRootPath ?? appSettings.defaultProjectRootPath}
              onChange={(event) => onUpdateProjectRootPath(event.target.value)}
              placeholder="E:\\path\\to\\project"
            />
          </label>
          <div className="project-scan-row">
            <button
              className="primary-command small"
              onClick={onScanProjectFolder}
              disabled={scanningProject}
            >
              {scanningProject ? 'Scanning...' : 'Scan project folder'}
            </button>
            <span>
              {workspace?.scannedFiles?.length ?? 0} files indexed
            </span>
          </div>
        </div>
      </section>

      <section className="console-section settings-section">
        <h2>Guardrails</h2>
        <div className="settings-form">
          <label>
            Auth mode
            <select
              value={appSettings.guardrails.authMode}
              onChange={(event) =>
                onUpdateGuardrails({
                  authMode: event.target.value as Guardrails['authMode'],
                })
              }
            >
              <option value="guest">Guest</option>
              <option value="shared-secret">Shared secret</option>
              <option value="workspace-only">Workspace only</option>
            </select>
          </label>
          <label>
            Rate limit
            <input
              value={appSettings.guardrails.rateLimit}
              onChange={(event) =>
                onUpdateGuardrails({
                  rateLimit: event.target.value,
                })
              }
            />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={appSettings.guardrails.piiRedaction}
              onChange={(event) =>
                onUpdateGuardrails({
                  piiRedaction: event.target.checked,
                })
              }
            />
            Redact sensitive values from captured traffic
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={appSettings.guardrails.captureBodies}
              onChange={(event) =>
                onUpdateGuardrails({
                  captureBodies: event.target.checked,
                })
              }
            />
            Capture request and response bodies
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={appSettings.guardrails.autoUpdateSwagger}
              onChange={(event) =>
                onUpdateGuardrails({
                  autoUpdateSwagger: event.target.checked,
                })
              }
            />
            Auto-update Swagger when requests or saved tests change
          </label>
        </div>
      </section>

      <section className="console-section settings-section">
        <h2>Custom domains</h2>
        <div className="domain-intro">
          <p>
            Domains are registered against the currently selected synced workspace. Add
            the DNS records below, then click verify. For real public testing, your API
            relay must be deployed on the internet and the custom domain must point to it.
          </p>
        </div>
        <div className="domain-add-row">
          <input
            value={domainDraft}
            onChange={(event) => onDomainDraftChange(event.target.value)}
            placeholder="demo.example.com"
          />
          <button
            className="primary-command small"
            onClick={onAddDomain}
            disabled={busyDomainId === 'new' || !workspace?.remoteWorkspaceId}
          >
            {busyDomainId === 'new' ? 'Adding...' : 'Add domain'}
          </button>
        </div>
        {!workspace?.remoteWorkspaceId && (
          <div className="settings-empty" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'start' }}>
            <div>
              This workspace is not synced to a remote API workspace yet, so domains cannot
              be registered from here.
            </div>
            {context && context.workspace && context.workspace.id !== 'local' && (
              <button className="primary-command small" onClick={onSyncWorkspace}>
                Sync workspace to remote API
              </button>
            )}
          </div>
        )}
        {loadingDomains ? (
          <div className="settings-empty">Loading domains...</div>
        ) : (domains || []).length === 0 ? (
          <div className="settings-empty">
            No domains added yet. Start with a subdomain or apex domain you control.
          </div>
        ) : (
          <div className="domain-list">
            {(domains || []).map((domain) => {
              const apexDomain = getApexDomain(domain.name);
              const isSub = domain.name !== apexDomain && domain.name.endsWith(`.${apexDomain}`);
              
              const fullTxtHost = `_proxync.${domain.name}`;
              const relativeTxtHost = fullTxtHost.endsWith(`.${apexDomain}`) 
                ? fullTxtHost.slice(0, -(apexDomain.length + 1)) 
                : fullTxtHost;
                
              const relativeTrafficHost = domain.name === apexDomain
                ? '@'
                : isSub
                  ? domain.name.slice(0, -(apexDomain.length + 1))
                  : domain.name;

              const routingValue = isSub || domain.name !== apexDomain ? getRelayBase() : '127.0.0.1';

              const copyVal = (text: string) => {
                navigator.clipboard.writeText(text);
                showToast('Copied to clipboard!', 'success');
              };

              return (
                <article key={domain.id} className="domain-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <div className="domain-card-head" style={{ border: 'none', padding: 0 }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{domain.name}</strong>
                      <small style={{ display: 'block', color: domain.verified ? 'var(--green)' : 'var(--yellow)', marginTop: '4px', fontSize: '11px' }}>
                        {domain.verified ? '✓ Ownership Verified' : '⚡ Pending verification'}
                      </small>
                    </div>
                    <span className={domain.verified ? 'badge good' : 'badge neutral'}>
                      {domain.verified ? 'Live' : 'Pending'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!domain.verified && (
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                        💡 <strong>Registrar Tip:</strong> Namesilo/GoDaddy automatically suffixes your domain. Enter only the bold Host prefix into your registrar inputs.
                      </div>
                    )}
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                      <table className="dns-table">
                        <thead>
                          <tr>
                            <th>Host</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>TTL</th>
                            <th>Copy Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* 1. TXT Verification Record (Only needed if unverified) */}
                          {!domain.verified && (
                            <tr>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <code style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{relativeTxtHost}</code>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>.{apexDomain}</span>
                                  </div>
                                  <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Full: {fullTxtHost}</small>
                                </div>
                              </td>
                              <td><span className="badge neutral" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>TXT</span></td>
                              <td><code>proxync-verification={domain.verificationToken}</code></td>
                              <td>30 min</td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(relativeTxtHost)}>Copy Host</button>
                                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(`proxync-verification=${domain.verificationToken}`)}>Copy Value</button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* 2. Traffic Configuration Record */}
                          <tr>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <code style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{relativeTrafficHost}</code>
                                  {relativeTrafficHost !== '@' && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>.{apexDomain}</span>
                                  )}
                                </div>
                                <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>Full: {domain.name}</small>
                              </div>
                            </td>
                            <td>
                              <span className="badge neutral" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
                                {isSub || domain.name !== apexDomain ? 'CNAME' : 'A'}
                              </span>
                            </td>
                            <td><code>{routingValue}</code></td>
                            <td>30 min</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(relativeTrafficHost)}>Copy Host</button>
                                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyVal(routingValue)}>Copy Value</button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                <div className="domain-actions">
                  <button
                    onClick={() => onVerifyDomain(domain.id)}
                    disabled={busyDomainId === domain.id}
                  >
                    {busyDomainId === domain.id ? 'Working...' : 'Verify'}
                  </button>
                  <button
                    onClick={() => onRemoveDomain(domain.id)}
                    disabled={busyDomainId === domain.id}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
          </div>
        )}
      </section>

      <section className="console-section settings-section">
        <h2>Global notes</h2>
        <textarea
          value={appSettings.notes}
          onChange={(event) => onUpdateAppNotes(event.target.value)}
          placeholder="Keep app-wide relay or deployment notes here."
        />
      </section>

      <section className="console-section settings-section">
        <h2>Workspace notes</h2>
        <textarea
          value={workspace?.notes ?? ''}
          onChange={(event) => onUpdateNotes(event.target.value)}
          placeholder="Keep project-specific notes, handoff context, or testing reminders here."
        />
      </section>

      <section className="console-section settings-section">
        <h2>Relay deployment hint</h2>
        <textarea
          value={appSettings.relayDeploymentHint}
          onChange={(event) => onUpdateRelayHint(event.target.value)}
          placeholder="Example: relay.example.com behind wildcard TLS and public DNS."
        />
      </section>
    </div>
  );
}

function CompanionPanel({
  panel,
  onClose,
}: {
  panel: Exclude<PanelView, null>;
  onClose: () => void;
}) {
  return (
    <aside className="companion-panel">
      <header>
        <strong>{panel === 'chat' ? 'General chat' : 'Voice room'}</strong>
        <button onClick={onClose}>Close</button>
      </header>
      {panel === 'chat' ? (
        <div className="companion-empty">
          Workspace chat will attach to the selected project profile in the next
          collaboration pass.
        </div>
      ) : (
        <div className="voice-box">
          <button>Mute</button>
          <button>Deafen</button>
          <p>No participants yet.</p>
        </div>
      )}
    </aside>
  );
}

function DiscoverDialog({
  processes,
  discovering,
  sharingPort,
  onClose,
  onRefresh,
  onShare,
  onShareLocal,
}: {
  processes: ProcessCandidate[];
  discovering: boolean;
  sharingPort: number | null;
  onClose: () => void;
  onRefresh: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
}) {
  return (
    <div className="dialog-backdrop">
      <section className="discover-dialog">
        <header>
          <div>
            <h2>Discover processes</h2>
            <p>Find and share running local development servers.</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="scan-toolbar">
          <button className="scan-chip active">Localhost</button>
          <button className="scan-chip" onClick={onRefresh} disabled={discovering}>
            {discovering ? 'Scanning...' : 'Full scan'}
          </button>
        </div>
        <div className="discovery-list">
          {processes.map((process) => (
            <article key={process.id} className="discovery-row">
              <div>
                <strong>{process.name}</strong>
                <span>
                  Port {process.port} | {process.framework ?? 'HTTP service'}
                </span>
                <small>{process.command ?? 'local process'}</small>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="primary-command small"
                  style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.3)', padding: '6px 12px' }}
                  disabled={sharingPort === process.port}
                  onClick={() => {
                    onShareLocal(process);
                    onClose();
                  }}
                >
                  Local
                </button>
                <button
                  className="primary-command small"
                  disabled={sharingPort === process.port}
                  onClick={() => {
                    onShare(process);
                    onClose();
                  }}
                >
                  Public
                </button>
              </div>
            </article>
          ))}
          {processes.length === 0 && <div className="traffic-empty">No processes found.</div>}
        </div>
      </section>
    </div>
  );
}

function RequestDetailDialog({
  request,
  onClose,
  onReplay,
  onSendToPostman,
}: {
  request: RequestLog;
  onClose: () => void;
  onReplay: (request: RequestLog) => void;
  onSendToPostman: (request: RequestLog) => void;
}) {
  return (
    <div className="dialog-backdrop">
      <section className="request-dialog">
        <header>
          <div>
            <h2>
              {request.method} {request.path}
            </h2>
            <p>
              Status {request.status ?? 'pending'} | {request.durationMs ?? '-'}ms
            </p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="dialog-actions">
          <button onClick={() => onSendToPostman(request)}>Send to Postman</button>
          <button onClick={() => onReplay(request)}>Replay</button>
        </div>
        <h3>Request headers</h3>
        <pre>{JSON.stringify(request.headers ?? {}, null, 2)}</pre>
        <h3>Body</h3>
        <pre>{request.bodyPreview || '[empty body]'}</pre>
        <h3>Response headers</h3>
        <pre>{JSON.stringify(request.responseHeaders ?? {}, null, 2)}</pre>
      </section>
    </div>
  );
}

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

function hydrateStoredWorkspaces(
  remoteWorkspace: { id: string; name: string } | null,
  defaultGuardrails: Guardrails,
  defaultProjectRootPath: string,
) {
  const stored = localStorage.getItem(LOCAL_WORKSPACES_KEY);
  let parsed = stored ? (JSON.parse(stored) as WorkspaceConfig[]) : [];

  if (remoteWorkspace) {
    const exists = parsed.some((w) => w.remoteWorkspaceId === remoteWorkspace.id);
    if (!exists) {
      const initial = createWorkspaceConfig(
        remoteWorkspace.name,
        remoteWorkspace.id,
        defaultGuardrails,
        defaultProjectRootPath,
      );
      parsed = [initial, ...parsed];
      localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(parsed));
    }
  }

  const activeWorkspaceId =
    localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? (parsed.length > 0 ? parsed[0].id : null);
  return {
    workspaces: parsed,
    activeWorkspaceId,
  };
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

function buildEndpointPreview(document: Record<string, unknown>) {
  const paths = (document.paths ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, value]) => {
      const descriptor = value as {
        summary?: string;
        responses?: Record<string, unknown>;
      };
      return {
        method: method.toUpperCase(),
        path,
        summary: descriptor.summary ?? 'Generated endpoint',
        responseLabel: descriptor.responses
          ? `${Object.keys(descriptor.responses).join(', ')} responses`
          : 'No response metadata',
      };
    }),
  );
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

function formatHeaders(headers: Record<string, string>) {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function decodeResponseBody(value: string | undefined) {
  if (!value) return '';
  try {
    return atob(value);
  } catch {
    return value;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function tabLabel(view: MainView) {
  const labels: Record<MainView, string> = {
    lobby: 'Lobby',
    welcome: 'Welcome',
    process: 'Process',
    traffic: 'Traffic',
    postman: 'Postman',
    swagger: 'Swagger',
    observability: 'Observability',
    settings: 'Settings',
  };
  return labels[view];
}
