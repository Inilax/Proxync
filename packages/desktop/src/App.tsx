import React, { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './index.css';
import { ToastContainer, showToast } from './lib/toast';
import {
  ensureLocalWorkspace,
  type LocalWorkspaceContext,
} from './lib/api';

/* ── Extracted View Components ── */
import {
  type MainView,
  type SwaggerPanel,
  type ProcessCandidate,
  type Tunnel,
  type RequestLog,
  type SavedRequest,
  type PostmanResponse,
  type ProcessProfile,
  type WorkspaceConfig,
  type AppSettings,
  type DomainRecord,
  Icons,
  parseHeaderText,
} from './components/views/SharedComponents';
import { WelcomeView } from './components/views/WelcomeView';
import { LobbyView } from './components/views/LobbyView';
import { ProcessView } from './components/views/ProcessView';
import { TrafficView } from './components/views/TrafficView';
import { PostmanView } from './components/views/PostmanView';
import { SwaggerView } from './components/views/SwaggerView';
import { SettingsView } from './components/views/SettingsView';
import { DiscoverDialog, DomainSelectDialog, RequestDetailDialog } from './components/views/Dialogs';

/* ══════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════ */

const PORT_NAMES: Record<number, string> = {
  3000: 'Node app', 3001: 'Node app', 4000: 'GraphQL service',
  4200: 'Angular app', 5000: 'Flask or .NET app', 5173: 'Vite server',
  8000: 'Django or FastAPI app', 8080: 'HTTP service', 8888: 'Notebook server',
};

const DEFAULT_REQUEST: SavedRequest = {
  id: 'draft', name: 'Draft request', method: 'GET', path: '/',
  headers: { 'Content-Type': 'application/json' }, body: '', source: 'manual',
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultProjectRootPath: '', notes: '',
};

const LOCAL_WORKSPACES_KEY = 'proxync_local_workspaces_v1';
const ACTIVE_WORKSPACE_KEY = 'proxync_local_active_workspace_v1';
const APP_SETTINGS_KEY = 'proxync_app_settings_v1';

/* ══════════════════════════════════════════════
   NAV CONFIG
   ══════════════════════════════════════════════ */

const NAV_ITEMS: { view: MainView; label: string; icon: React.ReactNode }[] = [
  { view: 'lobby', label: 'Lobby', icon: Icons.grid },
  { view: 'welcome', label: 'Overview', icon: Icons.home },
  { view: 'traffic', label: 'Traffic', icon: Icons.activity },
  { view: 'postman', label: 'Postman', icon: Icons.send },
  { view: 'swagger', label: 'Swagger', icon: Icons.code },
  { view: 'settings', label: 'Settings', icon: Icons.settings },
];

/* ══════════════════════════════════════════════
   APP COMPONENT
   ══════════════════════════════════════════════ */

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState<LocalWorkspaceContext | null>(null);
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
  const [mainView, setMainView] = useState<MainView>('lobby');
  const [swaggerPanel, setSwaggerPanel] = useState<SwaggerPanel>('preview');
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [sharingPort, setSharingPort] = useState<number | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [starterSuggestions, setStarterSuggestions] = useState<SavedRequest[]>([]);
  const [scanningProject, setScanningProject] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [domainDraft, setDomainDraft] = useState('');
  const [busyDomainId, setBusyDomainId] = useState<string | null>(null);
  const [sharingProcessCandidate, setSharingProcessCandidate] = useState<ProcessCandidate | null>(null);
  const [localIp, setLocalIp] = useState<string>('127.0.0.1');
  const [isLoaded, setIsLoaded] = useState(false);

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

  const openApiDocument = useMemo(
    () =>
      buildOpenApi(
        requests, savedRequests, activeTunnel,
        effectiveLanguageHint,
      ),
    [requests, savedRequests, activeTunnel, effectiveLanguageHint, activeWorkspace],
  );

  /* ── Effects ── */

  useEffect(() => {
    let mounted = true;
    invoke<string>('get_local_ip')
      .then((ip) => { if (mounted) setLocalIp(ip); })
      .catch(() => undefined);

    async function loadState() {
      try {
        const raw = await invoke<string>('load_app_state');
        const state = JSON.parse(raw);
        if (state.workspaces) {
          setWorkspaces(state.workspaces);
          setActiveWorkspaceId(state.activeWorkspaceId ?? null);
          setAppSettings(state.appSettings ?? { defaultProjectRootPath: '', notes: '' });
          if (state.workspaces.length === 0) {
            setMainView('lobby');
          } else {
            setMainView('welcome');
          }
        } else {
          // Migration from localStorage if present
          const storedW = localStorage.getItem(LOCAL_WORKSPACES_KEY);
          const storedWId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
          const storedS = localStorage.getItem(APP_SETTINGS_KEY);
          const loadedWorkspaces = storedW ? JSON.parse(storedW) : [];
          const loadedActiveWorkspaceId = storedWId ?? (loadedWorkspaces.length > 0 ? loadedWorkspaces[0].id : null);
          let parsedSettings = { defaultProjectRootPath: '', notes: '' };
          if (storedS) {
            try {
              const p = JSON.parse(storedS);
              parsedSettings = { defaultProjectRootPath: p.defaultProjectRootPath ?? '', notes: p.notes ?? '' };
            } catch {}
          }
          setWorkspaces(loadedWorkspaces);
          setActiveWorkspaceId(loadedActiveWorkspaceId);
          setAppSettings(parsedSettings);
          if (loadedWorkspaces.length === 0) {
            setMainView('lobby');
          } else {
            setMainView('welcome');
          }
        }
      } catch (err) {
        console.error('Failed to load standalone app state:', err);
      } finally {
        if (mounted) {
          setIsLoaded(true);
          ensureLocalWorkspace().then((nextContext) => {
            if (mounted) setContext(nextContext);
          });
        }
      }
    }
    void loadState();
    return () => { mounted = false; };
  }, []);

  useEffect(() => { void discoverProcesses(); }, []);

  useEffect(() => {
    if (!isLoaded) return;
    async function saveState() {
      try {
        const state = JSON.stringify({ workspaces, activeWorkspaceId, appSettings });
        await invoke('save_app_state', { state });
      } catch (err) {
        console.error('Failed to save standalone app state:', err);
      }
    }
    void saveState();
  }, [workspaces, activeWorkspaceId, appSettings, isLoaded]);

  useEffect(() => {
    if (!activeWorkspace) return;
    setSavedRequests(activeWorkspace.savedRequests || []);
    setRequests(activeWorkspace.capturedRequests || []);
    setStarterSuggestions((activeWorkspace.savedRequests || []).filter((r) => r.source === 'starter-scan'));
    setDomains(activeWorkspace.domains || []);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspace) return;
    setWorkspaces((current) =>
      current.map((ws) =>
        ws.id === activeWorkspace.id
          ? { ...ws, savedRequests, capturedRequests: requests, domains, languageHint: effectiveLanguageHint, lastSwaggerGeneratedAt: new Date().toISOString() }
          : ws,
      ),
    );
  }, [savedRequests, requests, domains, effectiveLanguageHint]);

  useEffect(() => {
    let unlistenRequest: (() => void) | undefined;
    let unlistenResponse: (() => void) | undefined;
    let unlistenClosed: (() => void) | undefined;
    async function bindEvents() {
      unlistenRequest = await listen<RequestLog>('request:log', (event) => {
        setRequests((current) => [
          { ...event.payload, status: 'pending', capturedAt: new Date().toISOString() },
          ...current,
        ].slice(0, 150));
      });
      unlistenResponse = await listen<{ requestId: string; status: number }>('request:log:response', (event) => {
        setRequests((current) =>
          current.map((r) => r.id === event.payload.requestId ? { ...r, status: event.payload.status } : r),
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

  /* ── Action handlers ── */

  async function discoverProcesses(bypassCache: boolean = false) {
    setDiscovering(true);
    try {
      const discovered = await readNativeProcesses(bypassCache);
      setProcesses(discovered);
      if (!selectedProcessId && discovered[0]) setSelectedProcessId(discovered[0].id);
      showToast(discovered.length > 0 ? `Discovered ${discovered.length} local process${discovered.length === 1 ? '' : 'es'}` : 'No local development ports found', discovered.length > 0 ? 'success' : 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Process discovery failed', 'error');
    } finally { setDiscovering(false); }
  }

  async function createWorkspace() {
    const name = newWorkspaceName.trim();
    if (!name) return;
    const workspace = createWorkspaceConfig(name, appSettings.defaultProjectRootPath);
    setWorkspaces((current) => [workspace, ...current]);
    setActiveWorkspaceId(workspace.id);
    setNewWorkspaceName('');
    setMainView('welcome');
    showToast(`Workspace "${name}" created`, 'success');
  }

  function selectWorkspace(workspaceId: string) {
    if (activeWorkspaceId !== workspaceId) { setActiveWorkspaceId(workspaceId); setActiveTunnel(null); }
    setMainView('process');
  }

  async function deleteWorkspace(workspaceId: string) {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    const confirmDelete = window.confirm(`Are you sure you want to completely delete and purge the workspace "${ws.name}"? This will terminate all active tunnels and delete all history.`);
    if (!confirmDelete) return;
    if (activeTunnel && activeWorkspaceId === workspaceId) { try { await stopTunnel(activeTunnel); } catch {} }
    const remaining = workspaces.filter((w) => w.id !== workspaceId);
    setWorkspaces(remaining);
    if (activeWorkspaceId === workspaceId) {
      if (remaining.length > 0) { setActiveWorkspaceId(remaining[0].id); }
      else { setActiveWorkspaceId(null); setMainView('lobby'); }
    }
    showToast(`Workspace "${ws.name}" completely deleted and purged`, 'success');
  }

  function updateActiveWorkspace(mutator: (workspace: WorkspaceConfig) => WorkspaceConfig) {
    if (!activeWorkspace) return;
    setWorkspaces((current) => current.map((ws) => ws.id === activeWorkspace.id ? mutator(ws) : ws));
  }

  function initiatePublicShare(process: ProcessCandidate) { setSharingProcessCandidate(process); }

  async function shareProcessCloudflare(process: ProcessCandidate) {
    if (!activeWorkspace) return;
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));
    
    setSharingPort(process.port);
    try {
      showToast('Starting local proxy server...', 'info');
      const proxyPort = await invoke<number>('start_proxy', { localPort: process.port });

      showToast('Starting Cloudflare Tunnel service...', 'info');
      const cfTunnelUrl = await invoke<string>('open_cloudflare_tunnel', { tunnelId: `cf-${crypto.randomUUID()}`, localPort: proxyPort });
      
      const cloudflareBoundTunnel: Tunnel = {
        id: `cf-${crypto.randomUUID()}`,
        publicUrl: cfTunnelUrl,
        localPort: process.port,
        status: 'ACTIVE',
        subdomain: cfTunnelUrl.replace('https://', '').replace('.trycloudflare.com', ''),
        createdAt: new Date().toISOString()
      };
      setActiveTunnel(cloudflareBoundTunnel);
      setTunnels((current) => [cloudflareBoundTunnel, ...current.filter((item) => item.status === 'ACTIVE')]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false); setRequests([]);
      showToast(`Cloudflare Tunnel is active! URL: ${cfTunnelUrl}`, 'success');
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: cfTunnelUrl } : p) }));
    } catch (error) { showToast(error instanceof Error ? error.message : String(error), 'error'); }
    finally { setSharingPort(null); }
  }

  async function shareProcessLocaltunnel(process: ProcessCandidate, customSubdomain?: string) {
    if (!activeWorkspace) return;
    const starterScan = buildStarterRequests(process);
    setStarterSuggestions(starterScan);
    setSavedRequests((current) => mergeRequests(current, starterScan));
    updateActiveWorkspace((ws) => ({ ...ws, profiles: upsertProfile(ws.profiles, process, starterScan.length), selectedProfileId: makeProfileId(process), languageHint: detectLanguageLabel(process) }));
    
    setSharingPort(process.port);
    try {
      showToast('Starting local proxy server...', 'info');
      const proxyPort = await invoke<number>('start_proxy', { localPort: process.port });

      const suggestedSub = customSubdomain || `${activeWorkspace.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${process.port}`;
      showToast('Starting localtunnel service...', 'info');
      const localtunnelUrl = await invoke<string>('open_localtunnel', { tunnelId: `lt-${crypto.randomUUID()}`, localPort: proxyPort, subdomain: suggestedSub });
      const localtunnelBoundTunnel: Tunnel = {
        id: `lt-${crypto.randomUUID()}`,
        publicUrl: localtunnelUrl,
        localPort: process.port,
        status: 'ACTIVE',
        subdomain: localtunnelUrl.replace('https://', '').replace('.localtunnel.me', ''),
        createdAt: new Date().toISOString()
      };
      setActiveTunnel(localtunnelBoundTunnel);
      setTunnels((current) => [localtunnelBoundTunnel, ...current.filter((item) => item.status === 'ACTIVE')]);
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
    
    setSharingPort(process.port);
    try {
      showToast('Starting local proxy server...', 'info');
      const proxyPort = await invoke<number>('start_proxy', { localPort: process.port });

      const tunnel: Tunnel = {
        id: `tunnel-${crypto.randomUUID()}`,
        publicUrl: customDomain ? `http://${customDomain}` : `http://localhost:${proxyPort}`,
        localPort: process.port,
        status: 'ACTIVE',
        subdomain: customDomain ?? '',
        createdAt: new Date().toISOString()
      };
      setActiveTunnel(tunnel);
      setTunnels((current) => [tunnel, ...current.filter((item) => item.status === 'ACTIVE')]);
      setSelectedProcessId(process.id); setMainView('process'); setDiscoverOpen(false); setRequests([]);
      updateActiveWorkspace((ws) => ({ ...ws, profiles: ws.profiles.map((p) => p.id === makeProfileId(process) ? { ...p, lastSharedAt: new Date().toISOString(), lastTunnelUrl: tunnel.publicUrl } : p) }));
      showToast(customDomain ? `Custom Domain routing active at http://${customDomain}` : `Local proxy active on port ${proxyPort}`, 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to share process', 'error'); }
    finally { setSharingPort(null); }
  }

  function shareProcessLocal(process: ProcessCandidate) {
    setSelectedProcessId(process.id); setMainView('process'); setSharingPort(process.port);
    showToast(`Exposed local share at http://localhost:${process.port} and http://${localIp}:${process.port}`, 'success');
  }

  async function stopTunnel(tunnel: Tunnel) {
    if (!activeWorkspace) return;
    try {
      await invoke('close_tunnel', { tunnelId: tunnel.id }).catch(() => undefined);
      setTunnels((current) => current.map((item) => item.id === tunnel.id ? { ...item, status: 'CLOSED' } : item));
      setActiveTunnel((current) => (current?.id === tunnel.id ? null : current));
      showToast('Tunnel stopped', 'info');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to stop tunnel', 'error'); }
  }

  async function openRequestDetail(request: RequestLog) {
    setSelectedRequest(request);
  }

  function sendToPostman(request: RequestLog) {
    const nextRequest: SavedRequest = { id: `captured-${request.id}`, name: `${request.method} ${request.path}`, method: request.method, path: request.path, headers: request.headers ?? { 'Content-Type': 'application/json' }, body: request.bodyPreview ?? '', source: 'captured' };
    setDraftRequest(nextRequest);
    setSavedRequests((current) => mergeRequests(current, [nextRequest]));
    setSelectedRequest(null); setMainView('postman');
  }

  async function replayRequest(_request: RequestLog) {
    showToast('Replay local request is not supported in standalone offline mode.', 'info');
  }

  async function runPostmanRequest() {
    setSendingRequest(true); setPostmanResponse(null);
    const startedAt = Date.now();
    try {
      const response = await fetch(draftRequest.path, { method: draftRequest.method, headers: draftRequest.headers, body: ['GET', 'HEAD'].includes(draftRequest.method) ? undefined : draftRequest.body });
      setPostmanResponse({ status: response.status, duration: Date.now() - startedAt, headers: Object.fromEntries(response.headers.entries()), body: await response.text() });
      showToast('Request completed', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Request failed', 'error'); }
    finally { setSendingRequest(false); }
  }

  function saveDraftRequest() {
    const saved = { ...draftRequest, id: draftRequest.id === 'draft' ? crypto.randomUUID() : draftRequest.id, name: draftRequest.name.trim() || `${draftRequest.method} ${draftRequest.path}` };
    setSavedRequests((current) => mergeRequests(current, [saved]));
    setDraftRequest(saved); showToast('Request saved to collection', 'success');
  }

  function importStarterRequests() {
    if (starterSuggestions.length === 0) return;
    setSavedRequests((current) => mergeRequests(current, starterSuggestions));
    setDraftRequest(starterSuggestions[0]); setMainView('postman');
    showToast(`Loaded ${starterSuggestions.length} starter requests. Test the likely endpoints and refine from there.`, 'success');
  }

  function updateDraftHeader(rawHeaders: string) { setDraftRequest((current) => ({ ...current, headers: parseHeaderText(rawHeaders) })); }

  function updateWorkspaceNotes(notes: string) { if (!activeWorkspace) return; updateActiveWorkspace((ws) => ({ ...ws, notes })); }
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
      updateActiveWorkspace((ws) => ({ ...ws, scannedFiles: files, languageHint: inferredLanguage }));
      showToast(`Scanned ${files.length} files. Language hint updated to ${inferredLanguage}.`, 'success');
      void discoverProcesses(true);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Project scan failed', 'error'); }
    finally { setScanningProject(false); }
  }

  function updateAppNotes(notes: string) { setAppSettings((current) => ({ ...current, notes })); }

  const updateWorkspaceDomains = (newDomains: DomainRecord[]) => {
    setDomains(newDomains);
    updateActiveWorkspace((ws) => ({ ...ws, domains: newDomains }));
  };

  async function addDomain() {
    if (!activeWorkspace) return;
    if (!domainDraft.trim()) { showToast('Enter a domain name first', 'info'); return; }
    setBusyDomainId('new');
    const newDomain: DomainRecord = {
      id: `domain-${crypto.randomUUID()}`,
      name: domainDraft.trim(),
      verificationToken: `proxync-verification-${crypto.randomUUID().substring(0, 8)}`,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateWorkspaceDomains([newDomain, ...domains]);
    setDomainDraft('');
    showToast('Domain added. Configure DNS and then verify it.', 'success');
    setBusyDomainId(null);
  }

  async function verifyDomain(domainId: string) {
    if (!activeWorkspace) return;
    setBusyDomainId(domainId);
    const updated = domains.map((d) => (d.id === domainId ? { ...d, verified: true } : d));
    updateWorkspaceDomains(updated);
    showToast('Domain verification succeeded', 'success');
    setBusyDomainId(null);
  }

  async function removeDomain(domainId: string) {
    if (!activeWorkspace) return;
    setBusyDomainId(domainId);
    const updated = domains.filter((d) => d.id !== domainId);
    updateWorkspaceDomains(updated);
    showToast('Domain removed', 'success');
    setBusyDomainId(null);
  }

  function selectProfile(profileId: string) {
    if (!activeWorkspace) return;
    updateActiveWorkspace((ws) => ({ ...ws, selectedProfileId: profileId }));
    const matchingProcess = processes.find((p) => makeProfileId(p) === profileId);
    if (matchingProcess) setSelectedProcessId(matchingProcess.id);
    setMainView('process');
  }

  function copyText(value: string, message: string) {
    navigator.clipboard.writeText(value).then(() => showToast(message, 'success')).catch(() => showToast('Clipboard access failed', 'error'));
  }

  /* ══════════════════════════════════════════════
     RENDER — Redesigned Shell
     ══════════════════════════════════════════════ */

  const viewTitle = mainView === 'lobby' ? 'Workspace Lobby'
    : mainView === 'welcome' ? 'Overview'
    : mainView === 'traffic' ? 'Traffic'
    : mainView === 'postman' ? 'Postman'
    : mainView === 'swagger' ? 'Swagger'
    : mainView === 'settings' ? 'Settings'
    : mainView === 'process' ? 'Process'
    : 'Proxync';

  return (
    <div className="mvp-shell">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            {Icons.menu}
          </button>
          <img className="brand-mark" src="/logo.svg" alt="Proxync Logo" />
          <div>
            <div className="brand-name">Proxync</div>
            <div className="brand-caption">workspace studio</div>
          </div>
        </div>

        <div className="workspace-summary">
          <span className="workspace-summary-label">Active workspace</span>
          <strong>{activeWorkspace?.name ?? 'No active workspace'}</strong>
          <small>{activeWorkspace?.languageHint ?? 'Create or select a workspace to begin'}</small>
          <button className="sidebar-action secondary" onClick={() => { setMainView('lobby'); setSidebarOpen(false); }}>
            Open workspace lobby
          </button>
        </div>

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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              className={mainView === item.view ? 'active' : ''}
              disabled={item.view !== 'lobby' && !activeWorkspace}
              onClick={() => { setMainView(item.view); setSidebarOpen(false); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <button
          className="sidebar-action secondary"
          disabled={!activeWorkspace}
          onClick={() => { setDiscoverOpen(true); setSidebarOpen(false); }}
        >
          {Icons.search} Discover process
        </button>

        <div className="sidebar-section">
          <div className="sidebar-section-title">
            Live processes
            <button onClick={() => { void discoverProcesses(true); }} disabled={discovering}>
              {Icons.refresh} {discovering ? 'Scanning' : 'Rescan'}
            </button>
          </div>
          <div className="process-list">
            {processes.length === 0 ? (
              <div className="sidebar-empty">No local dev servers found yet.</div>
            ) : (
              processes.map((process) => (
                <button
                  key={process.id}
                  className={process.id === selectedProcessId ? 'process-row active' : 'process-row'}
                  onClick={() => { setSelectedProcessId(process.id); setMainView('process'); setSidebarOpen(false); }}
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
                  className={profile.id === activeWorkspace.selectedProfileId ? 'workspace-row active' : 'workspace-row'}
                  onClick={() => { selectProfile(profile.id); setSidebarOpen(false); }}
                >
                  <strong>{profile.processName}</strong>
                  <small>{profile.framework} | {profile.languageHint}</small>
                </button>
              ))
            ) : (
              <div className="sidebar-empty">Share a process once and it will stay here.</div>
            )}
          </div>
        </div>

        <div className="local-card">
          <span>{activeWorkspace?.name ?? context?.workspace?.name ?? 'No Workspace'}</span>
          <small>Ready</small>
        </div>
      </aside>

      <section className="workspace-shell">
        <div className="mobile-nav-bar">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation menu">
            {Icons.menu}
          </button>
          <span className="mobile-nav-title">{viewTitle}</span>
          <div className={(activeTunnel || sharingPort) ? 'live-ring active' : 'live-ring'} style={{ flexShrink: 0 }} />
        </div>

        <main className="content-stage">
          {mainView === 'lobby' && (
            <LobbyView workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} newWorkspaceName={newWorkspaceName} onWorkspaceNameChange={setNewWorkspaceName} onCreateWorkspace={createWorkspace} onSelectWorkspace={selectWorkspace} onDeleteWorkspace={deleteWorkspace} />
          )}
          {mainView === 'welcome' && (
            <WelcomeView workspace={activeWorkspace} processCount={processes.length} tunnelCount={tunnels.filter((t) => t.status === 'ACTIVE').length} requestCount={requests.length} onDiscover={() => setDiscoverOpen(true)} onUpdateNotes={updateWorkspaceNotes} />
          )}
          {mainView === 'process' && (
            <ProcessView workspace={activeWorkspace} process={selectedProcess} profile={selectedProfile} tunnel={activeTunnel} sharingPort={sharingPort} suggestions={starterSuggestions} hasVerifiedDomain={domains.some((d) => d.verified)} localIp={localIp} onDiscover={() => setDiscoverOpen(true)} onShare={initiatePublicShare} onShareLocal={shareProcessLocal} onStop={stopTunnel} onStopLocalShare={() => setSharingPort(null)} onCopy={copyText} onImportStarterRequests={importStarterRequests} />
          )}
          {mainView === 'traffic' && (
            <TrafficView requests={requests} activeTunnel={activeTunnel} onOpen={openRequestDetail} onSendToPostman={sendToPostman} />
          )}
          {mainView === 'postman' && (
            <PostmanView draft={draftRequest} savedRequests={savedRequests} response={postmanResponse} sending={sendingRequest} starterSuggestions={starterSuggestions} activeTunnel={activeTunnel} onDraftChange={setDraftRequest} onHeaderTextChange={updateDraftHeader} onRun={runPostmanRequest} onSave={saveDraftRequest} onLoad={setDraftRequest} onImportStarterRequests={importStarterRequests} />
          )}
          {mainView === 'swagger' && (
            <SwaggerView document={openApiDocument} swaggerPanel={swaggerPanel} workspace={activeWorkspace} languageHint={effectiveLanguageHint} onChangePanel={setSwaggerPanel} onCopy={() => copyText(JSON.stringify(openApiDocument, null, 2), 'OpenAPI JSON copied')} />
          )}
          {mainView === 'settings' && (
            <SettingsView workspace={activeWorkspace} appSettings={appSettings} domains={domains} domainDraft={domainDraft} busyDomainId={busyDomainId} activeTunnel={activeTunnel} scanningProject={scanningProject} onUpdateAppNotes={updateAppNotes} onUpdateProjectRootPath={updateProjectRootPath} onScanProjectFolder={scanProjectFolder} onDomainDraftChange={setDomainDraft} onAddDomain={addDomain} onVerifyDomain={verifyDomain} onRemoveDomain={removeDomain} />
          )}
        </main>
      </section>

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
            else { void shareProcess(sharingProcessCandidate, selectedOption); }
            setSharingProcessCandidate(null);
          }}
        />
      )}

      {selectedRequest && (
        <RequestDetailDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} onReplay={replayRequest} onSendToPostman={sendToPostman} />
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

function createWorkspaceConfig(name: string, defaultProjectRootPath = ''): WorkspaceConfig {
  return {
    id: crypto.randomUUID(), name, profiles: [], savedRequests: [],
    capturedRequests: [], domains: [], languageHint: 'Undetermined',
    selectedProfileId: undefined, projectRootPath: defaultProjectRootPath,
    scannedFiles: [], notes: '', lastSwaggerGeneratedAt: new Date().toISOString(),
  };
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

function buildOpenApi(requests: RequestLog[], savedRequests: SavedRequest[], activeTunnel: Tunnel | null, languageHint: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const item of [...requests, ...savedRequests]) {
    const path = normalizePath(item.path);
    const method = item.method.toLowerCase();
    const status = 'status' in item ? item.status ?? 200 : 200;
    paths[path] = { ...paths[path], [method]: { summary: `${item.method} ${path}`, description: 'Generated from Proxync capture and workspace request collection.', responses: { [String(status)]: { description: 'Observed response' } } } };
  }
  return {
    openapi: '3.1.0',
    info: { title: 'Proxync generated API', version: '0.1.0', description: `Language hint: ${languageHint}.` },
    servers: [{ url: activeTunnel?.publicUrl ?? 'http://localhost' }],
    paths,
  };
}

function normalizePath(path: string) {
  if (!path) return '/';
  try { const parsed = new URL(path); return parsed.pathname || '/'; }
  catch { return path.startsWith('/') ? path : `/${path}`; }
}


