import { useState, useMemo, useEffect, useRef } from 'react';
import type { SavedRequest, PostmanResponse, Tunnel, ProcessCandidate } from './SharedComponents';
import { formatHeaders, stripMethodPrefix } from './SharedComponents';
import { showToast } from '../../lib/toast';
import { importSwaggerToSavedRequests, importPostmanToOpenApi } from '../../lib/openApiGenerator';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

// Default draft when collection empties — mirrors DEFAULT_REQUEST in App.tsx (keep in sync)
// ponytail: duplication ceiling; upgrade path = export DEFAULT_REQUEST from a shared constants file
const DEFAULT_FALLBACK_PATH = '/';

function parseQueryParamsFromPath(path: string): { key: string; value: string; enabled: boolean }[] {
  const qIdx = path.indexOf('?');
  if (qIdx === -1) return [];
  const qs = path.slice(qIdx + 1);
  if (!qs) return [];
  const parts = qs.split('&');
  return parts.map((part) => {
    const [k, ...rest] = part.split('=');
    return {
      key: decodeURIComponent(k || ''),
      value: decodeURIComponent(rest.join('=')),
      enabled: true,
    };
  });
}

function rebuildPathWithParams(baseOrFullUrl: string, params: { key: string; value: string; enabled: boolean }[]): string {
  const qIdx = baseOrFullUrl.indexOf('?');
  const base = qIdx === -1 ? baseOrFullUrl : baseOrFullUrl.slice(0, qIdx);
  const active = params.filter((p) => p.enabled && (p.key.trim() || p.value.trim()));
  if (active.length === 0) return base;
  const search = active
    .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`)
    .join('&');
  return `${base}?${search}`;
}

function getMethodBadgeStyle(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    case 'POST':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    case 'PUT':
      return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
    case 'PATCH':
      return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
    case 'DELETE':
      return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
    case 'HEAD':
    case 'OPTIONS':
    default:
      return 'bg-surface-container-highest text-outline border border-outline-variant/40';
  }
}

export function PostmanView({
  draft,
  savedRequests,
  response,
  sending,
  starterSuggestions,
  activeTunnel,
  tunnels = [],
  processes = [],
  selectedProcessPort,
  onSelectTunnel,
  onSelectProcessPort,
  onDraftChange,
  onHeaderTextChange,
  onRun,
  onSave,
  onLoad,
  onImportStarterRequests,
  onDeleteRequest,
  onUpdateSavedRequests,
  onOpenWorkbench,
  onClearResponse,
  onOpenShortcuts,
}: {
  draft: SavedRequest;
  savedRequests: SavedRequest[];
  response: PostmanResponse | null;
  sending: boolean;
  starterSuggestions: SavedRequest[];
  activeTunnel: Tunnel | null;
  tunnels?: Tunnel[];
  processes?: ProcessCandidate[];
  selectedProcessPort?: number;
  onSelectTunnel?: (tunnel: Tunnel | null) => void;
  onSelectProcessPort?: (port: number | null) => void;
  onClearResponse?: () => void;
  onDraftChange: (request: SavedRequest) => void;
  onHeaderTextChange: (value: string) => void;
  onRun: () => void;
  onSave: () => void;
  onLoad: (request: SavedRequest) => void;
  onImportStarterRequests: () => void;
  onDeleteRequest?: (id: string) => void;
  onUpdateSavedRequests?: (next: SavedRequest[]) => void;
  onOpenWorkbench?: (request: SavedRequest) => void;
  onOpenShortcuts?: () => void;
}) {
  // Request Sub-Tabs: 'params' | 'body' | 'headers' | 'auth' | 'response'
  const [requestTab, setRequestTab] = useState<'params' | 'body' | 'headers' | 'auth' | 'response'>('body');
  const [responseSubTab, setResponseSubTab] = useState<'body' | 'headers'>('body');

  // Response History State (Memory only, capped at 4 runs)
  const [responseHistory, setResponseHistory] = useState<PostmanResponse[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  // Collection Search & Filter State
  const [collectionSearch, setCollectionSearch] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inline Method Change State
  const [methodDropdownId, setMethodDropdownId] = useState<string | null>(null);

  // Request Description Expansion State
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);

  // Auth Helper State
  const [bearerToken, setBearerToken] = useState<string>('');

  // Resizable Panel Width for Collections Rail
  const [collectionsWidth, setCollectionsWidth] = useState<number>(() => {
    const saved = localStorage.getItem('postman_collections_width');
    return saved ? Math.max(240, Math.min(500, parseInt(saved, 10))) : 280;
  });
  const [isCollectionsCollapsed, setIsCollectionsCollapsed] = useState<boolean>(false);

  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; request?: SavedRequest; folderName?: string } | null>(null);

  // Folder Collapsed States
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Inline Editing States
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingRequestName, setEditingRequestName] = useState<string>('');

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');

  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [importSwaggerModalOpen, setImportSwaggerModalOpen] = useState<boolean>(false);
  const [importSwaggerText, setImportSwaggerText] = useState<string>('');

  const handleImportSwaggerSubmit = () => {
    if (!importSwaggerText.trim()) return;
    try {
      let parsed = JSON.parse(importSwaggerText);
      if (parsed.info && (parsed.info as any).schema?.includes('postman')) {
        parsed = importPostmanToOpenApi(parsed);
      }
      const importedReqs = importSwaggerToSavedRequests(parsed);
      if (importedReqs.length > 0 && onUpdateSavedRequests) {
        onUpdateSavedRequests([...savedRequests, ...importedReqs]);
        showToast(`Imported ${importedReqs.length} endpoints from Swagger spec`, 'success');
      }
      setImportSwaggerModalOpen(false);
      setImportSwaggerText('');
    } catch {
      showToast('Failed to parse Swagger JSON', 'error');
    }
  };

  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [deletingFolderTarget, setDeletingFolderTarget] = useState<string | null>(null);

  const deletingFolderRequestCount = useMemo(() => {
    if (!deletingFolderTarget) return 0;
    return savedRequests.filter((r) => {
      const folder = r.collectionName || (r.source === 'starter-scan' ? 'Scanned Endpoints' : r.source === 'captured' ? 'Captured Traffic' : 'Default Collection');
      return folder === deletingFolderTarget;
    }).length;
  }, [deletingFolderTarget, savedRequests]);

  // Active Pane Tracking (tracks whether user is interacting with Collections Rail vs Main Workbench)
  const activePaneRef = useRef<'collections' | 'workbench'>('collections');

  const switchActivePane = (pane: 'collections' | 'workbench') => {
    activePaneRef.current = pane;
  };

  const isTargetInWorkbench = (target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('[data-workbench-pane="true"]'));
  };

  const isTargetInCollections = (target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('[data-collections-rail="true"]'));
  };

  const getActivePane = (e?: KeyboardEvent | MouseEvent): 'collections' | 'workbench' => {
    const activeEl = document.activeElement as HTMLElement | null;
    const targetEl = e?.target as HTMLElement | null;

    if (isTargetInWorkbench(targetEl) || isTargetInWorkbench(activeEl)) {
      return 'workbench';
    }
    if (isTargetInCollections(targetEl) || isTargetInCollections(activeEl)) {
      return 'collections';
    }
    return activePaneRef.current;
  };

  // Synchronize activePaneRef on any pointer interaction or focus change (e.g. clicking a <select>, input, button, or tab)
  useEffect(() => {
    const handleCaptureActivity = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-workbench-pane="true"]')) {
        activePaneRef.current = 'workbench';
      } else if (target.closest('[data-collections-rail="true"]')) {
        activePaneRef.current = 'collections';
      }
    };
    window.addEventListener('pointerdown', handleCaptureActivity, true);
    window.addEventListener('focusin', handleCaptureActivity, true);
    return () => {
      window.removeEventListener('pointerdown', handleCaptureActivity, true);
      window.removeEventListener('focusin', handleCaptureActivity, true);
    };
  }, []);

  // ponytail: Focus Timer Ref to ensure DOM focus callbacks never leak across unmount
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  // Static Folder Ordering State (Stored in localStorage)
  const [folderOrder, setFolderOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('postman_folder_order');
    return saved ? JSON.parse(saved) : [];
  });

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  // Group Requests by Collection Name
  const groupedCollections = useMemo(() => {
    const map: Record<string, SavedRequest[]> = {};

    savedRequests.forEach((req) => {
      let folder = req.collectionName;
      if (!folder) {
        if (req.source === 'starter-scan') folder = 'Scanned Endpoints';
        else if (req.source === 'captured') folder = 'Captured Traffic';
        else folder = 'Default Collection';
      }
      if (!map[folder]) map[folder] = [];
      map[folder].push(req);
    });

    if (!map['Default Collection']) map['Default Collection'] = [];

    return map;
  }, [savedRequests]);

  // Filter out starter suggestions that are already saved in collections
  const unimportedSuggestions = useMemo(() => {
    if (!starterSuggestions || starterSuggestions.length === 0) return [];
    const savedKeys = new Set(
      savedRequests.map((r) => `${r.method.toUpperCase()}:${r.path.replace(/\/+$/, '')}`)
    );
    return starterSuggestions.filter(
      (s) => !savedKeys.has(`${s.method.toUpperCase()}:${s.path.replace(/\/+$/, '')}`)
    );
  }, [starterSuggestions, savedRequests]);

  // High-performance O(N) Static Folder Ordering Data Structure
  const orderedFoldersList = useMemo(() => {
    const keys = Object.keys(groupedCollections);

    const orderMap = new Map<string, number>();
    folderOrder.forEach((name, idx) => orderMap.set(name, idx));

    return keys.sort((a, b) => {
      const idxA = orderMap.has(a) ? orderMap.get(a)! : 999;
      const idxB = orderMap.has(b) ? orderMap.get(b)! : 999;
      if (idxA !== idxB) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [groupedCollections, folderOrder]);

  const searchLower = collectionSearch.trim().toLowerCase();

  const filteredCollections = useMemo(() => {
    if (!searchLower) return groupedCollections;
    const result: Record<string, SavedRequest[]> = {};
    for (const [folder, reqs] of Object.entries(groupedCollections)) {
      const folderMatches = folder.toLowerCase().includes(searchLower);
      const matchingReqs = reqs.filter((r) => {
        const name = stripMethodPrefix(r.name || '').toLowerCase();
        const path = (r.path || '').toLowerCase();
        const method = (r.method || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return name.includes(searchLower) || path.includes(searchLower) || method.includes(searchLower) || desc.includes(searchLower);
      });
      if (folderMatches) {
        result[folder] = reqs;
      } else if (matchingReqs.length > 0) {
        result[folder] = matchingReqs;
      }
    }
    return result;
  }, [groupedCollections, searchLower]);

  const visibleFoldersList = useMemo(() => {
    if (!searchLower) return orderedFoldersList;
    return orderedFoldersList.filter((f) => filteredCollections[f] !== undefined);
  }, [orderedFoldersList, filteredCollections, searchLower]);

  const totalSearchResultsCount = useMemo(() => {
    if (!searchLower) return 0;
    return Object.values(filteredCollections).reduce((acc, reqs) => acc + reqs.length, 0);
  }, [filteredCollections, searchLower]);

  const handleSelectFolder = (folderName: string) => {
    onDraftChange({ ...draft, collectionName: folderName });
  };

  // Up / Down Arrow Button Folder Re-ordering Handlers
  const moveFolderUp = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx <= 0) return;
    const nextOrder = [...orderedFoldersList];
    const [moved] = nextOrder.splice(idx, 1);
    nextOrder.splice(idx - 1, 0, moved);
    setFolderOrder(nextOrder);
    localStorage.setItem('postman_folder_order', JSON.stringify(nextOrder));
  };

  const moveFolderDown = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx >= orderedFoldersList.length - 1) return;
    const nextOrder = [...orderedFoldersList];
    const [moved] = nextOrder.splice(idx, 1);
    nextOrder.splice(idx + 1, 0, moved);
    setFolderOrder(nextOrder);
    localStorage.setItem('postman_folder_order', JSON.stringify(nextOrder));
  };

  // Count headers
  const headerCount = useMemo(() => {
    return Object.keys(draft.headers || {}).length;
  }, [draft.headers]);

  // Derived Query Params for Bidirectional Sync
  const currentParams = useMemo(() => {
    if (draft.queryParams && draft.queryParams.length > 0) {
      return draft.queryParams;
    }
    return parseQueryParamsFromPath(draft.path);
  }, [draft.queryParams, draft.path]);

  const activeParamCount = useMemo(() => {
    return currentParams.filter((p) => p.enabled && (p.key.trim() || p.value.trim())).length;
  }, [currentParams]);

  const handleUpdateParamRow = (index: number, patch: Partial<{ key: string; value: string; enabled: boolean }>) => {
    const nextParams = currentParams.map((p, i) => (i === index ? { ...p, ...patch } : p));
    const nextPath = rebuildPathWithParams(draft.path, nextParams);
    onDraftChange({ ...draft, path: nextPath, queryParams: nextParams });
  };

  const handleAddParamRow = () => {
    const nextParams = [...currentParams, { key: '', value: '', enabled: true }];
    onDraftChange({ ...draft, queryParams: nextParams });
  };

  const handleDeleteParamRow = (index: number) => {
    const nextParams = currentParams.filter((_, i) => i !== index);
    const nextPath = rebuildPathWithParams(draft.path, nextParams);
    onDraftChange({ ...draft, path: nextPath, queryParams: nextParams });
  };

  const handlePathChange = (newPath: string) => {
    const parsedFromUrl = parseQueryParamsFromPath(newPath);
    const disabledParams = (draft.queryParams || []).filter((p) => !p.enabled);
    const nextParams = [...parsedFromUrl, ...disabledParams];
    onDraftChange({ ...draft, path: newPath, queryParams: nextParams });
  };

  // Response History Tracking (Memory-only, capped at 4 entries)
  useEffect(() => {
    if (!response) return;
    setResponseHistory((prev) => {
      const filtered = prev.filter((r) => r !== response);
      return [response, ...filtered].slice(0, 4);
    });
    setSelectedHistoryIndex(0);
  }, [response]);

  const currentDisplayResponse = useMemo(() => {
    if (selectedHistoryIndex !== null && responseHistory[selectedHistoryIndex]) {
      return responseHistory[selectedHistoryIndex];
    }
    return response;
  }, [selectedHistoryIndex, responseHistory, response]);

  // Handle Send button click -> Auto-switch to Response tab!
  const handleSendRequest = () => {
    setRequestTab('response');
    onRun();
  };

  // Create New Request in Collection (Ctrl + T)
  const handleAddNewRequest = (targetFolder?: string) => {
    const folder = targetFolder || draft.collectionName || visibleFoldersList[0] || 'Default Collection';
    if (collapsedFolders[folder]) {
      setCollapsedFolders((prev) => ({ ...prev, [folder]: false }));
    }

    const existingInFolder = savedRequests.filter((r) => {
      const rFolder = r.collectionName || (r.source === 'starter-scan' ? 'Scanned Endpoints' : r.source === 'captured' ? 'Captured Traffic' : 'Default Collection');
      return rFolder === folder;
    });
    const existingNames = new Set(existingInFolder.map((r) => stripMethodPrefix(r.name || '').toLowerCase()));
    let newName = 'New Request';
    let counter = 2;
    while (existingNames.has(newName.toLowerCase())) {
      newName = `New Request ${counter}`;
      counter++;
    }

    const newReq: SavedRequest = {
      id: crypto.randomUUID(),
      name: newName,
      method: 'GET',
      path: '/',
      headers: { 'Content-Type': 'application/json' },
      body: '',
      source: 'manual',
      collectionName: folder,
    };

    if (onUpdateSavedRequests) {
      onUpdateSavedRequests([...savedRequests, newReq]);
    }
    onLoad(newReq);
    if (onClearResponse) onClearResponse();
    setEditingRequestId(newReq.id);
    setEditingRequestName(newName);
    setContextMenu(null);
    showToast(`Added "${newName}" to ${folder}`, 'success');
  };

  // Format JSON Body (Ctrl + Shift + F)
  const handleFormatJsonBody = () => {
    if (!draft.body || !draft.body.trim()) {
      showToast('No JSON payload to format', 'info');
      return;
    }
    try {
      const parsed = JSON.parse(draft.body);
      const formatted = JSON.stringify(parsed, null, 2);
      onDraftChange({ ...draft, body: formatted });
      showToast('JSON formatted', 'success');
    } catch {
      showToast('Invalid JSON — cannot format', 'error');
    }
  };

  // Inline Method Change Handler
  const handleInlineMethodChange = (reqId: string, newMethod: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = savedRequests.map((r) => (r.id === reqId ? { ...r, method: newMethod } : r));
    if (onUpdateSavedRequests) onUpdateSavedRequests(next);
    if (draft.id === reqId) onDraftChange({ ...draft, method: newMethod });
    setMethodDropdownId(null);
  };

  // Close context menu & method dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setMethodDropdownId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Duplicate Request Handler
  const handleDuplicateRequest = (req: SavedRequest, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dup: SavedRequest = {
      ...req,
      id: crypto.randomUUID(),
      name: `${req.name} (Copy)`,
    };
    if (onUpdateSavedRequests) {
      onUpdateSavedRequests([...savedRequests, dup]);
    }
    showToast(`Duplicated "${req.name}"`, 'success');
    setContextMenu(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendRequest();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onSave();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        const pane = getActivePane(e);
        const isExternalInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') &&
          !isTargetInCollections(document.activeElement);
        if (pane === 'collections' && !isExternalInput) {
          e.preventDefault();
          handleAddNewRequest();
        }
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        if (isCollectionsCollapsed) setIsCollectionsCollapsed(false);
        searchInputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleFormatJsonBody();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '?' || e.key === '/' || e.code === 'Slash')) {
        e.preventDefault();
        if (onOpenShortcuts) {
          onOpenShortcuts();
        } else {
          setShowHotkeysModal((prev) => !prev);
        }
      } else if (
        !(['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || (document.activeElement as HTMLElement)?.isContentEditable) &&
        (e.key === 'Delete' || ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')))
      ) {
        // Suspend background deletions when modals or method dropdowns are open
        if (importSwaggerModalOpen || showHotkeysModal || methodDropdownId || deletingFolderTarget) {
          return;
        }

        // 1. Right-Click Context Menu: Delete the right-clicked request or folder
        if (contextMenu?.request) {
          e.preventDefault();
          handleDeleteRequestItem(contextMenu.request.id);
          setContextMenu(null);
          return;
        }
        if (contextMenu?.folderName && contextMenu.folderName !== 'Default Collection') {
          e.preventDefault();
          const targetFolder = contextMenu.folderName;
          setContextMenu(null);
          handleRequestDeleteFolder(targetFolder);
          return;
        }

        // 2. Collections Rail is active (user clicked on a request, or in the empty whitespace at the bottom of collections)
        const pane = getActivePane(e);
        if (pane === 'collections') {
          const reqToDelete = savedRequests.find((r) => r.id === draft.id);
          if (reqToDelete) {
            e.preventDefault();
            handleDeleteRequestItem(reqToDelete.id);
            return;
          }
        }

        // 3. Main Workbench (Params, Headers, Response, Send button, whitespace):
        // ponytail: Intentionally do nothing. Saved requests are protected from accidental deletion.
      } else if (e.key === 'Escape') {
        if (deletingFolderTarget) {
          setDeletingFolderTarget(null);
        } else if (isCreatingFolder) {
          setIsCreatingFolder(false);
        } else if (editingFolderId) {
          setEditingFolderId(null);
        } else if (editingRequestId) {
          setEditingRequestId(null);
        } else if (contextMenu) {
          setContextMenu(null);
        } else if (methodDropdownId) {
          setMethodDropdownId(null);
        } else if (importSwaggerModalOpen) {
          setImportSwaggerModalOpen(false);
        } else if (showHotkeysModal) {
          setShowHotkeysModal(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRun, onSave, isCreatingFolder, editingFolderId, editingRequestId, contextMenu, methodDropdownId, importSwaggerModalOpen, showHotkeysModal, deletingFolderTarget, draft, savedRequests, visibleFoldersList, isCollectionsCollapsed]);

  // Drag handlers for Collections Rail
  const handleCollectionsMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
    const startX = e.clientX;
    const startWidth = collectionsWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(500, startWidth + delta));
      setCollectionsWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingLeft(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('postman_collections_width', collectionsWidth.toString());
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Toggle Folder Collapsed State
  const toggleFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  // Rename Request Handler
  const handleStartRenameRequest = (req: SavedRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRequestId(req.id);
    setEditingRequestName(req.name);
  };

  const handleSaveRenameRequest = (reqId: string) => {
    if (!editingRequestName.trim()) {
      setEditingRequestId(null);
      return;
    }

    const next = savedRequests.map((r) =>
      r.id === reqId ? { ...r, name: editingRequestName.trim() } : r
    );

    if (onUpdateSavedRequests) onUpdateSavedRequests(next);
    if (draft.id === reqId) onDraftChange({ ...draft, name: editingRequestName.trim() });

    setEditingRequestId(null);
    showToast('Request renamed', 'success');
  };

  // Delete Request Handler
  const handleDeleteRequestItem = (reqId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Determine the next request to select and focus before removing
    const deletingReq = savedRequests.find((r) => r.id === reqId);
    const folderName = deletingReq?.collectionName || draft.collectionName || 'Default Collection';
    let nextReq: SavedRequest | undefined;
    if (deletingReq) {
      const folderAll = savedRequests.filter((r) => (r.collectionName || 'Default Collection') === folderName);
      const idxInFolder = folderAll.findIndex((r) => r.id === reqId);
      if (idxInFolder !== -1) {
        if (idxInFolder < folderAll.length - 1) {
          nextReq = folderAll[idxInFolder + 1];
        } else if (idxInFolder > 0) {
          nextReq = folderAll[idxInFolder - 1];
        }
      }
    }
    if (!nextReq) {
      nextReq = savedRequests.filter((r) => r.id !== reqId).find((r) => (r.collectionName || 'Default Collection') === folderName)
        || savedRequests.filter((r) => r.id !== reqId)[0];
    }

    if (onDeleteRequest) {
      onDeleteRequest(reqId);
    } else if (onUpdateSavedRequests) {
      const remaining = savedRequests.filter((r) => r.id !== reqId);
      onUpdateSavedRequests(remaining);
      if (draft.id === reqId) {
        if (nextReq) {
          onLoad(nextReq);
        } else {
          // ponytail: fallback duplicates App.tsx deleteSavedRequest; only runs when onDeleteRequest is absent
          onDraftChange({
            id: 'draft',
            name: 'Draft request',
            method: 'GET',
            path: DEFAULT_FALLBACK_PATH,
            collectionName: folderName,
            headers: { 'Content-Type': 'application/json' },
            body: '',
            source: 'manual',
            queryParams: [],
            description: '',
          });
          if (onClearResponse) onClearResponse();
        }
      }
      showToast('Request deleted', 'success');
    }

    // Auto-advance keyboard focus to the newly selected request or folder header in the Collections Rail
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    if (nextReq) {
      const nextId = nextReq.id;
      focusTimerRef.current = setTimeout(() => {
        const nextEl = document.querySelector<HTMLElement>(`[data-collections-request-id="${nextId}"]`);
        nextEl?.focus();
      }, 50);
    } else {
      focusTimerRef.current = setTimeout(() => {
        const folderEl = document.querySelector<HTMLElement>(`[data-collections-folder="${folderName}"]`);
        folderEl?.focus();
      }, 50);
    }
  };

  // Rename Folder Handler
  const handleStartRenameFolder = (oldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(oldName);
    setEditingFolderName(oldName);
  };

  const handleSaveRenameFolder = (oldName: string) => {
    const trimmed = editingFolderName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingFolderId(null);
      return;
    }

    const next = savedRequests.map((r) => {
      const folder = r.collectionName || (r.source === 'starter-scan' ? 'Scanned Endpoints' : r.source === 'captured' ? 'Captured Traffic' : 'Default Collection');
      if (folder === oldName) {
        return { ...r, collectionName: trimmed };
      }
      return r;
    });

    if (onUpdateSavedRequests) onUpdateSavedRequests(next);

    if (draft.collectionName === oldName) onDraftChange({ ...draft, collectionName: trimmed });

    setFolderOrder((prev) => prev.map((f) => f === oldName ? trimmed : f));

    setCollapsedFolders((prev) => {
      const copy = { ...prev };
      if (copy[oldName] !== undefined) {
        copy[trimmed] = copy[oldName];
        delete copy[oldName];
      }
      return copy;
    });

    setEditingFolderId(null);
    showToast(`Folder renamed to ${trimmed}`, 'success');
  };

  // Confirm Delete Folder Handler (executed upon modal confirmation or directly when <= 1 request)
  const handleConfirmDeleteFolder = (folderName: string) => {
    const next = savedRequests.filter((r) => {
      const folder = r.collectionName || (r.source === 'starter-scan' ? 'Scanned Endpoints' : r.source === 'captured' ? 'Captured Traffic' : 'Default Collection');
      return folder !== folderName;
    });

    if (onUpdateSavedRequests) onUpdateSavedRequests(next);

    // If the active draft was inside the deleted collection, switch to next available request or reset to clean draft
    if ((draft.collectionName || 'Default Collection') === folderName) {
      if (next.length > 0) {
        onLoad(next[0]);
      } else {
        onDraftChange({
          id: 'draft',
          name: 'Draft request',
          method: 'GET',
          path: DEFAULT_FALLBACK_PATH,
          collectionName: 'Default Collection',
          headers: { 'Content-Type': 'application/json' },
          body: '',
          source: 'manual',
          queryParams: [],
          description: '',
        });
        if (onClearResponse) onClearResponse();
      }
    }

    setFolderOrder((prev) => prev.filter((f) => f !== folderName));
    setCollapsedFolders((prev) => {
      const copy = { ...prev };
      delete copy[folderName];
      return copy;
    });

    showToast(`Deleted collection "${folderName}"`, 'info');
  };

  // Request Delete Folder (opens confirmation modal only if multiple requests exist)
  const handleRequestDeleteFolder = (folderName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (folderName === 'Default Collection') return;

    const count = savedRequests.filter((r) => {
      const folder = r.collectionName || (r.source === 'starter-scan' ? 'Scanned Endpoints' : r.source === 'captured' ? 'Captured Traffic' : 'Default Collection');
      return folder === folderName;
    }).length;

    // If 1 or 0 requests in the collection, delete immediately without showing warning
    if (count <= 1) {
      handleConfirmDeleteFolder(folderName);
      return;
    }

    setDeletingFolderTarget(folderName);
  };

  // Create New Collection Folder
  const handleCreateFolder = () => {
    const trimmed = newFolderNameInput.trim();
    if (!trimmed) {
      setIsCreatingFolder(false);
      return;
    }

    const newReq: SavedRequest = {
      id: crypto.randomUUID(),
      name: 'New Request',
      method: 'GET',
      path: '/api/example',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      source: 'manual',
      collectionName: trimmed,
    };

    if (onUpdateSavedRequests) onUpdateSavedRequests([...savedRequests, newReq]);

    setFolderOrder((prev) => [...prev, trimmed]);

    onDraftChange({ ...draft, collectionName: trimmed });
    setNewFolderNameInput('');
    setIsCreatingFolder(false);
    showToast(`Collection "${trimmed}" created`, 'success');
  };

  // Apply Bearer Token to Headers
  const handleApplyBearerToken = () => {
    if (!bearerToken.trim()) return;
    const currentHeaders = { ...draft.headers };
    currentHeaders['Authorization'] = `Bearer ${bearerToken.trim()}`;
    onDraftChange({ ...draft, headers: currentHeaders });
    showToast('Bearer token added to headers', 'success');
  };

  // Get response body size
  const responseSize = useMemo(() => {
    if (!currentDisplayResponse?.body) return '0 B';
    const bytes = new Blob([currentDisplayResponse.body]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [currentDisplayResponse]);

  return (
    <div className="flex h-[calc(100dvh-120px)] gap-3 fade-in items-stretch">
      {/* ── 1. Left Collections Rail ── */}
      <div
        data-collections-rail="true"
        tabIndex={-1}
        onFocusCapture={() => switchActivePane('collections')}
        onMouseDown={() => switchActivePane('collections')}
        onClick={() => switchActivePane('collections')}
        style={{ width: isCollectionsCollapsed ? '52px' : `${collectionsWidth}px` }}
        className={`shrink-0 bg-surface-container border border-outline-variant/30 rounded-2xl ${isCollectionsCollapsed ? 'p-2 items-center' : 'p-4'} flex flex-col gap-3 overflow-y-auto transition-[width] duration-200 ease-out select-none outline-none`}
      >
        {/* Rail Header */}
        <div className={`flex items-center ${isCollectionsCollapsed ? 'flex-col gap-2' : 'justify-between'} border-b border-outline-variant/20 pb-3 w-full`}>
          {!isCollectionsCollapsed ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">folder_open</span>
              <h2 className="font-bold text-xs uppercase tracking-wider text-on-surface/90">Collections</h2>
            </div>
          ) : (
            <span className="material-symbols-outlined text-primary text-[18px]" title="Collections">folder_open</span>
          )}

          <div className={`flex items-center gap-1 ${isCollectionsCollapsed ? 'flex-col' : ''}`}>
            {!isCollectionsCollapsed && (
              <>
                <button
                  onClick={() => handleAddNewRequest(draft.collectionName || visibleFoldersList[0] || 'Default Collection')}
                  className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-primary transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="New Request in Collection (Ctrl + T)"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
                <button
                  onClick={() => setImportSwaggerModalOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-primary transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Import Swagger / OpenAPI Spec"
                >
                  <span className="material-symbols-outlined text-sm">file_upload</span>
                </button>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-primary transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Create new collection folder"
                >
                  <span className="material-symbols-outlined text-sm">create_new_folder</span>
                </button>
              </>
            )}
            <button
              onClick={() => setIsCollectionsCollapsed(!isCollectionsCollapsed)}
              className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors text-xs font-bold flex items-center justify-center cursor-pointer"
              title={isCollectionsCollapsed ? "Expand Collections Pane" : "Collapse Collections Pane"}
            >
              <span className="material-symbols-outlined text-sm">
                {isCollectionsCollapsed ? 'dock_to_right' : 'dock_to_left'}
              </span>
            </button>
          </div>
        </div>

        {!isCollectionsCollapsed && (
          <>
            {/* Search Collections Input */}
            <div className="relative w-full">
              <span className="material-symbols-outlined text-outline/70 text-sm absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search requests (Ctrl+F)..."
                value={collectionSearch}
                onChange={(e) => setCollectionSearch(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-8 pr-7 py-1.5 text-xs text-on-surface placeholder:text-outline/70 focus:outline-none focus:border-primary transition-colors"
              />
              {collectionSearch && (
                <button
                  onClick={() => setCollectionSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {collectionSearch && (
              <div className="text-[10px] font-mono text-outline px-1 flex items-center justify-between">
                <span>Filtered Results</span>
                <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                  {totalSearchResultsCount} found
                </span>
              </div>
            )}
            {/* Create Folder Input */}
            {isCreatingFolder && (
              <div className="p-2.5 bg-surface-container-high rounded-xl border border-primary/40 space-y-2 fade-in">
                <input
                  type="text"
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    else if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
                  placeholder="Collection name..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary font-sans"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5 text-xs">
                  <button
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-2.5 py-1 rounded text-outline hover:text-on-surface"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    className="px-3 py-1 rounded bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/25 cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* Static Tree Folders & Request Items */}
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
              {visibleFoldersList.map((folderName, idx) => {
                const requests = filteredCollections[folderName] || [];
                const isCollapsed = searchLower ? false : !!collapsedFolders[folderName];
                const isEditingThisFolder = editingFolderId === folderName;
                const isActiveFolder = (draft.collectionName || 'Default Collection') === folderName;

                return (
                  <div key={folderName} className="space-y-1">
                    {/* Folder Header Item */}
                    <div
                      tabIndex={-1}
                      data-collections-folder={folderName}
                      onClick={() => handleSelectFolder(folderName)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, folderName });
                      }}
                      className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors outline-none ${isActiveFolder
                        ? 'bg-surface-container-high/60 text-on-surface'
                        : 'hover:bg-surface-container-high/40 text-on-surface/80'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                        <button
                          onClick={(e) => toggleFolder(folderName, e)}
                          className="p-0.5 rounded hover:bg-surface-container-highest transition-colors cursor-pointer text-outline/70 hover:text-on-surface flex items-center justify-center shrink-0"
                          title={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                        >
                          <span className="material-symbols-outlined text-sm transition-transform duration-150">
                            {isCollapsed ? 'chevron_right' : 'expand_more'}
                          </span>
                        </button>

                        <span className={`material-symbols-outlined text-base transition-colors shrink-0 ${isActiveFolder ? 'text-primary' : 'text-primary/70 group-hover:text-primary'
                          }`}>
                          {isCollapsed ? 'folder' : 'folder_open'}
                        </span>

                        {isEditingThisFolder ? (
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRenameFolder(folderName);
                              if (e.key === 'Escape') setEditingFolderId(null);
                            }}
                            onBlur={() => handleSaveRenameFolder(folderName)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-surface-container-lowest border border-primary rounded px-2 py-0.5 text-[13px] text-on-surface focus:outline-none font-semibold w-full"
                            autoFocus
                          />
                        ) : (
                          <span className="text-[13px] font-semibold text-on-surface/90 truncate min-w-0" title={folderName}>
                            {folderName}
                          </span>
                        )}

                        {!isEditingThisFolder && (
                          <span className="text-[11px] font-mono font-medium text-outline/70 px-1.5 py-0.5 bg-surface-container-highest/60 rounded-md shrink-0">
                            {requests.length}
                          </span>
                        )}
                      </div>

                      {/* Folder Actions & Move Up/Down Controls */}
                      {!isEditingThisFolder && (
                        <div className="absolute right-1.5 inset-y-0 my-auto h-fit flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-high/95 px-1 py-0.5 rounded-lg shadow-sm pointer-events-none group-hover:pointer-events-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddNewRequest(folderName);
                            }}
                            className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-primary transition-colors cursor-pointer"
                            title="Add request to collection (Ctrl+T)"
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                          </button>
                          {!searchLower && idx > 0 && (
                            <button
                              onClick={(e) => moveFolderUp(idx, e)}
                              className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
                              title="Move folder up"
                            >
                              <span className="material-symbols-outlined text-xs">arrow_upward</span>
                            </button>
                          )}
                          {!searchLower && idx < visibleFoldersList.length - 1 && (
                            <button
                              onClick={(e) => moveFolderDown(idx, e)}
                              className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
                              title="Move folder down"
                            >
                              <span className="material-symbols-outlined text-xs">arrow_downward</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => handleStartRenameFolder(folderName, e)}
                            className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
                            title="Rename folder"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span>
                          </button>
                          {folderName !== 'Default Collection' && (
                            <button
                              onClick={(e) => handleRequestDeleteFolder(folderName, e)}
                              className="p-1 rounded hover:bg-error/20 text-outline hover:text-error transition-colors cursor-pointer"
                              title="Delete folder"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nested Requests */}
                    {!isCollapsed && (
                      <div className="pl-3.5 space-y-0.5 border-l border-outline-variant/20 ml-3.5 my-0.5">
                        {requests.map((request) => {
                          const isEditingThisReq = editingRequestId === request.id;
                          const isActiveDraft = draft.id === request.id;
                          const cleanReqName = stripMethodPrefix(request.name || '');

                          return (
                            <div
                              key={request.id}
                              tabIndex={-1}
                              data-collections-request-id={request.id}
                              onClick={() => {
                                handleSelectFolder(folderName);
                                onLoad(request);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenu({ x: e.clientX, y: e.clientY, request, folderName });
                              }}
                              className={`group/req relative w-full text-left flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors border outline-none ${isActiveDraft
                                ? 'bg-primary/15 border-primary/40 text-on-surface font-medium shadow-xs'
                                : 'border-transparent hover:bg-surface-container-high/60 text-on-surface/80 hover:text-on-surface'
                                }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                                {/* Inline Method Badge with Click-to-Change Dropdown */}
                                <div className="relative shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMethodDropdownId(methodDropdownId === request.id ? null : request.id);
                                    }}
                                    className={`w-[44px] h-[21px] rounded text-[11px] font-bold font-mono flex items-center justify-center transition-colors cursor-pointer ${getMethodBadgeStyle(request.method)}`}
                                    title="Click to change HTTP method"
                                  >
                                    {request.method}
                                  </button>

                                  {methodDropdownId === request.id && (
                                    <div
                                      className="absolute left-0 top-6 z-30 bg-surface-container-high border border-outline-variant/50 rounded-lg shadow-xl py-1 px-0.5 flex flex-col gap-0.5 min-w-[76px] animate-in fade-in zoom-in-95"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((m) => (
                                        <button
                                          key={m}
                                          onClick={(e) => handleInlineMethodChange(request.id, m, e)}
                                          className={`text-left px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center justify-between ${request.method === m
                                            ? 'bg-primary/20 text-primary'
                                            : 'text-on-surface hover:bg-surface-container-highest'
                                            }`}
                                        >
                                          <span>{m}</span>
                                          <span className={`w-1.5 h-1.5 rounded-full ${m === 'GET' ? 'bg-emerald-400' :
                                            m === 'POST' ? 'bg-amber-400' :
                                              m === 'PUT' ? 'bg-sky-400' :
                                                m === 'PATCH' ? 'bg-purple-400' :
                                                  m === 'DELETE' ? 'bg-rose-400' : 'bg-outline'
                                            }`} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {isEditingThisReq ? (
                                  <input
                                    type="text"
                                    value={editingRequestName}
                                    onChange={(e) => setEditingRequestName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRenameRequest(request.id);
                                      if (e.key === 'Escape') setEditingRequestId(null);
                                    }}
                                    onBlur={() => handleSaveRenameRequest(request.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-surface-container-lowest border border-primary rounded px-1.5 py-0.5 text-[13px] text-on-surface focus:outline-none w-full font-medium"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    className={`text-[13px] truncate flex-1 ${isActiveDraft ? 'font-semibold text-on-surface' : 'font-normal text-on-surface/85 group-hover/req:text-on-surface'
                                      }`}
                                    title={`${cleanReqName}${request.description ? `\n${request.description}` : ''}`}
                                  >
                                    {cleanReqName}
                                  </span>
                                )}
                              </div>

                              {/* Request Actions (Edit & Delete) */}
                              {!isEditingThisReq && (
                                <div className="absolute right-1.5 inset-y-0 my-auto h-fit flex items-center gap-0.5 opacity-0 group-hover/req:opacity-100 transition-opacity bg-surface-container-high/95 px-1 py-0.5 rounded-lg shadow-sm pointer-events-none group-hover/req:pointer-events-auto">
                                  <button
                                    onClick={(e) => handleStartRenameRequest(request, e)}
                                    className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
                                    title="Rename request"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">edit</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteRequestItem(request.id, e)}
                                    className="p-1 rounded hover:bg-error/20 text-outline hover:text-error transition-colors cursor-pointer"
                                    title="Delete request"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {savedRequests.length === 0 && !isCreatingFolder && (
                <div className="text-center p-8 text-xs text-on-surface-variant">
                  No collections yet. Click + to create a folder.
                </div>
              )}

              {savedRequests.length > 0 && visibleFoldersList.length === 0 && searchLower && (
                <div className="text-center p-6 text-xs text-on-surface-variant">
                  No matching requests found for "{collectionSearch}".
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Left Resizer Handle */}
      {!isCollectionsCollapsed && (
        <div
          onMouseDown={handleCollectionsMouseDown}
          className={`w-2.5 -mx-1.5 z-20 cursor-col-resize flex items-center justify-center group transition-colors select-none ${isResizingLeft ? 'bg-primary/20' : 'hover:bg-primary/10'
            }`}
          title="Drag left/right to resize Collections pane"
        >
          <div className={`w-1 h-10 rounded-full transition-colors ${isResizingLeft ? 'bg-primary' : 'bg-outline-variant/40 group-hover:bg-primary'
            }`} />
        </div>
      )}

      {/* ── 2. Main Request & Response Workspace (Flex-1) ── */}
      <div
        data-workbench-pane="true"
        tabIndex={-1}
        onFocusCapture={() => switchActivePane('workbench')}
        onMouseDown={() => switchActivePane('workbench')}
        onClick={() => switchActivePane('workbench')}
        className="flex-1 min-w-0 bg-surface-container border border-outline-variant/30 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto shadow-sm select-none outline-none"
      >
        {/* Starter Suggestion Banner */}
        {!bannerDismissed && unimportedSuggestions.length > 0 && (
          <div className="p-3.5 bg-primary-container/10 border-l-4 border-primary rounded-r-xl flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <strong className="text-xs text-on-surface font-bold">Starter endpoints detected</strong>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Endpoints inferred from workspace files. Click import to add them to your collection.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="btn-primary compact shrink-0"
                onClick={() => {
                  onImportStarterRequests();
                  setBannerDismissed(true);
                }}
              >
                Import Scan
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="p-1 rounded-lg hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors"
                title="Dismiss banner"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Clean Request Title & Save Bar */}
        <div className="flex items-center justify-between gap-3">
          <input
            className="w-full bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant/60 focus:border-primary rounded-xl px-3.5 py-2 text-sm text-on-surface font-bold focus:outline-none transition-all placeholder:text-outline"
            value={stripMethodPrefix(draft.name || '')}
            onChange={(event) => onDraftChange({ ...draft, name: stripMethodPrefix(event.target.value) })}
            aria-label="Request name"
            placeholder="Request Title (e.g. Fetch User Profile)"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenWorkbench && (
              <button
                className="btn-primary shrink-0 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                onClick={() => onOpenWorkbench(draft)}
                title="Open 360° Request Workbench Studio"
              >
                <span className="material-symbols-outlined text-sm">bolt</span>
                <span>Workbench</span>
              </button>
            )}
            <button
              className="btn-secondary shrink-0 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              onClick={onSave}
              title="Save request (Ctrl + S)"
            >
              <span className="material-symbols-outlined text-sm">bookmark</span>
              <span>Save</span>
            </button>
            <button
              className="p-2 rounded-xl bg-surface-container-high border border-outline-variant/40 hover:border-primary/50 text-outline hover:text-primary transition-all cursor-pointer"
              onClick={onOpenShortcuts ?? (() => setShowHotkeysModal(true))}
              title="Keyboard Shortcuts & Hotkeys"
            >
              <span className="material-symbols-outlined text-sm">keyboard</span>
            </button>
          </div>
        </div>

        {/* Request Description Field (Collapsible, Postman/Bruno-inspired) */}
        {!descriptionExpanded && !draft.description ? (
          <button
            onClick={() => setDescriptionExpanded(true)}
            className="text-[11px] text-outline hover:text-on-surface flex items-center gap-1 transition-colors w-fit pl-1 -mt-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">notes</span>
            <span>Add description...</span>
          </button>
        ) : (
          <div className="flex flex-col gap-1 -mt-2 p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-outline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">notes</span> Description / Documentation Notes
              </span>
              <button
                onClick={() => setDescriptionExpanded(false)}
                className="text-[10px] text-outline hover:text-on-surface cursor-pointer"
              >
                Collapse
              </button>
            </div>
            <textarea
              rows={2}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary resize-none font-sans"
              placeholder="Add request description, notes, or query requirements..."
              value={draft.description || ''}
              onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
            />
          </div>
        )}

        {/* Unified Method + URL Toolbar */}
        <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2 bg-surface-container-lowest border border-outline-variant/40 p-1.5 rounded-xl shadow-inner">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <select
              className={`shrink-0 font-mono font-bold text-center cursor-pointer border border-outline-variant/40 bg-surface-container-high rounded-lg py-2 text-xs focus:outline-none focus:border-primary ${draft.method === 'GET' ? 'text-emerald-400' :
                draft.method === 'POST' ? 'text-amber-400' :
                  draft.method === 'PUT' ? 'text-sky-400' :
                    draft.method === 'PATCH' ? 'text-purple-400' :
                      draft.method === 'DELETE' ? 'text-rose-400' : 'text-primary'
                }`}
              style={{ width: '90px', minWidth: '90px' }}
              value={draft.method}
              onChange={(event) => onDraftChange({ ...draft, method: event.target.value })}
              aria-label="HTTP method"
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((method) => (
                <option key={method} className="bg-surface-container-high text-on-surface font-mono">{method}</option>
              ))}
            </select>

            <input
              className="flex-1 min-w-0 bg-transparent border-none text-xs text-on-surface font-mono px-2 py-1.5 focus:outline-none placeholder:text-outline"
              value={draft.path}
              onChange={(event) => handlePathChange(event.target.value)}
              placeholder={activeTunnel ? '/api/users' : 'https://example.com/api'}
              aria-label="Request URL or path"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Target Environment & Public Tunnel Dropdown Selector */}
            <div className="relative flex-1 sm:flex-initial flex items-center min-w-0">
              <select
                className={`route-badge cursor-pointer appearance-none pr-6 pl-2.5 py-1.5 font-mono text-[11px] font-bold rounded-lg border focus:outline-none transition-all w-full sm:max-w-[180px] truncate ${activeTunnel
                  ? 'route-tunnel border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                  : 'route-local border-outline-variant/40 bg-surface-container-high text-on-surface hover:border-primary/40'
                  }`}
                value={
                  activeTunnel
                    ? `tunnel-${activeTunnel.id}`
                    : selectedProcessPort
                      ? `local-${selectedProcessPort}`
                      : 'local-default'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (onClearResponse) onClearResponse();
                  if (val.startsWith('tunnel-')) {
                    const tId = val.replace('tunnel-', '');
                    const chosen = tunnels.find((t) => t.id === tId) || null;
                    if (chosen && onSelectTunnel) {
                      onSelectTunnel(chosen);
                      showToast(`Target switched to Public Tunnel: ${chosen.publicUrl}`, 'info');
                    }
                  } else if (val.startsWith('local-')) {
                    const portStr = val.replace('local-', '');
                    const port = parseInt(portStr, 10);
                    if (onSelectTunnel) onSelectTunnel(null);
                    if (onSelectProcessPort && !isNaN(port)) {
                      onSelectProcessPort(port);
                      showToast(`Target switched to Localhost (:${port})`, 'info');
                    }
                  }
                }}
                title={`Target Base URL: ${activeTunnel ? activeTunnel.publicUrl : `http://localhost:${selectedProcessPort || 3000}`}\n(Click to switch target public tunnel or local server)`}
              >
                {tunnels.length > 0 && (
                  <optgroup label="── Active Public Tunnels ──">
                    {tunnels.map((t) => {
                      let displayHost = t.subdomain || '';
                      try {
                        displayHost = new URL(t.publicUrl).hostname;
                      } catch {
                        displayHost = t.publicUrl;
                      }
                      return (
                        <option key={t.id} value={`tunnel-${t.id}`} className="bg-surface-container-high text-primary font-mono truncate">
                          🌐 {displayHost} (:{t.localPort})
                        </option>
                      );
                    })}
                  </optgroup>
                )}

                <optgroup label="── Local Servers ──">
                  {processes.length > 0 ? (
                    processes.map((p) => (
                      <option key={p.id} value={`local-${p.port}`} className="bg-surface-container-high text-on-surface font-mono truncate">
                        ⚡ Localhost (:{p.port}) {p.name ? `[${p.name}]` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="local-default" className="bg-surface-container-high text-on-surface font-mono">
                      ⚡ Localhost (:{selectedProcessPort || 3000})
                    </option>
                  )}
                </optgroup>
              </select>
              <span className="material-symbols-outlined absolute right-1.5 pointer-events-none text-[13px] text-outline">
                unfold_more
              </span>
            </div>

            <button
              className="btn-primary shrink-0 font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.01] transition-transform flex-1 sm:flex-initial"
              onClick={handleSendRequest}
              disabled={sending}
              title="Send request (Ctrl + Enter)"
            >
              {sending ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Workspace Sub-Tabs Switcher */}
        <div className="flex flex-col flex-1 min-h-0 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
          {/* Sub-Tabs Bar */}
          <div className="flex items-center gap-1 bg-surface-container-low px-4 py-2 border-b border-outline-variant/20">
            <button
              onClick={() => setRequestTab('params')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${requestTab === 'params'
                ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>Params</span>
              {activeParamCount > 0 && (
                <span className="px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] font-mono rounded-full font-bold">
                  {activeParamCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setRequestTab('body')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${requestTab === 'body'
                ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-sm">code</span>
              <span>Body (JSON)</span>
            </button>

            <button
              onClick={() => setRequestTab('headers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${requestTab === 'headers'
                ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-sm">list_alt</span>
              <span>Headers</span>
              {headerCount > 0 && (
                <span className="px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] font-mono rounded-full font-bold">
                  {headerCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setRequestTab('auth')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${requestTab === 'auth'
                ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-sm">key</span>
              <span>Authorization</span>
            </button>

            {/* Response Sub-Tab directly beside Authorization */}
            <button
              onClick={() => setRequestTab('response')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${requestTab === 'response'
                ? 'bg-surface-container-highest text-secondary border border-secondary/40 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-sm">output</span>
              <span>Response</span>
              {currentDisplayResponse && (
                <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded font-bold ${currentDisplayResponse.status >= 200 && currentDisplayResponse.status < 300
                  ? 'bg-secondary/20 text-secondary'
                  : 'bg-error/20 text-error'
                  }`}>
                  {currentDisplayResponse.status}
                </span>
              )}
            </button>
          </div>

          {/* Sub-Tab Content View */}
          <div className="flex-1 p-4 flex flex-col min-h-0 overflow-y-auto">
            {requestTab === 'params' && (
              <div className="flex flex-col flex-1 gap-3 min-h-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-mono text-outline font-bold uppercase tracking-wider">
                      Query Parameters
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      Query parameters sync bidirectionally with the URL address bar above.
                    </p>
                  </div>
                  <button
                    onClick={handleAddParamRow}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary border border-outline-variant/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Parameter</span>
                  </button>
                </div>

                <div className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/30 text-[10px] uppercase font-mono font-bold text-outline bg-surface-container-high">
                        <th className="w-10 px-3 py-2 text-center">Active</th>
                        <th className="px-3 py-2">Key</th>
                        <th className="px-3 py-2">Value</th>
                        <th className="w-10 px-3 py-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 font-mono">
                      {currentParams.map((param, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-high/40 transition-colors">
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={param.enabled}
                              onChange={(e) => handleUpdateParamRow(idx, { enabled: e.target.checked })}
                              className="rounded accent-primary cursor-pointer"
                              title={param.enabled ? 'Disable parameter' : 'Enable parameter'}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              placeholder="key"
                              value={param.key}
                              onChange={(e) => handleUpdateParamRow(idx, { key: e.target.value })}
                              className={`w-full bg-transparent border-none focus:outline-none text-xs ${param.enabled ? 'text-on-surface' : 'text-outline line-through'
                                }`}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              placeholder="value"
                              value={param.value}
                              onChange={(e) => handleUpdateParamRow(idx, { value: e.target.value })}
                              className={`w-full bg-transparent border-none focus:outline-none text-xs ${param.enabled ? 'text-on-surface' : 'text-outline'
                                }`}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              onClick={() => handleDeleteParamRow(idx)}
                              className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                              title="Delete parameter"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {currentParams.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-xs text-outline font-sans">
                            No query parameters yet. Click "+ Add Parameter" or type <code className="text-primary font-mono">?key=value</code> in the URL above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {requestTab === 'body' && (
              <div className="flex flex-col flex-1 gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-outline font-bold uppercase tracking-wider">Request Payload (JSON)</span>
                  <button
                    onClick={handleFormatJsonBody}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary border border-outline-variant/30 text-xs font-mono font-bold flex items-center gap-1.5 hover:border-primary/40 transition-colors cursor-pointer"
                    title="Auto-format JSON body (Ctrl + Shift + F)"
                  >
                    <span className="material-symbols-outlined text-xs">data_object</span>
                    <span>Format JSON</span>
                  </button>
                </div>
                <textarea
                  className="w-full flex-1 bg-black/60 border border-outline-variant/30 rounded-xl p-3.5 font-mono text-xs text-on-surface focus:outline-none focus:border-primary resize-none leading-relaxed"
                  value={draft.body}
                  onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
                  spellCheck={false}
                  placeholder='{\n  "key": "value"\n}'
                />
              </div>
            )}

            {requestTab === 'headers' && (
              <div className="flex flex-col flex-1 gap-2">
                <span className="text-[11px] font-mono text-outline font-bold uppercase tracking-wider">Headers (Key: Value)</span>
                <textarea
                  className="w-full flex-1 bg-black/60 border border-outline-variant/30 rounded-xl p-3.5 font-mono text-xs text-on-surface focus:outline-none focus:border-primary resize-none leading-relaxed"
                  value={formatHeaders(draft.headers)}
                  onChange={(event) => onHeaderTextChange(event.target.value)}
                  spellCheck={false}
                  placeholder="Content-Type: application/json&#10;Authorization: Bearer token..."
                />
              </div>
            )}

            {requestTab === 'auth' && (
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-4 max-w-lg">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-sm">lock</span>
                  Bearer Token Auth Helper
                </span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Enter your authorization token below to automatically inject <code className="text-primary font-mono">Authorization: Bearer &lt;token&gt;</code> into headers.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1Ni..."
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleApplyBearerToken}
                    className="btn-primary compact shrink-0"
                  >
                    Apply to Headers
                  </button>
                </div>
              </div>
            )}

            {requestTab === 'response' && (
              <div className="flex flex-col flex-1 gap-3 min-h-0">
                {/* Response History Timeline (Insomnia-inspired, max 4 runs) */}
                {responseHistory.length > 0 && (
                  <div className="flex items-center justify-between bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/20 text-xs">
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-outline shrink-0 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">history</span>
                        History ({responseHistory.length}/4)
                      </span>
                      {responseHistory.map((hist, hIdx) => {
                        const isSelected = selectedHistoryIndex === hIdx;
                        const isSuccess = hist.status >= 200 && hist.status < 300;
                        return (
                          <button
                            key={hIdx}
                            onClick={() => setSelectedHistoryIndex(hIdx)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${isSelected
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30'
                              }`}
                            title={`Run #${hIdx + 1}: Status ${hist.status} in ${hist.duration}ms`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-secondary' : 'bg-error'}`} />
                            <span>#{hIdx + 1}: {hist.status}</span>
                            <span className="text-[10px] opacity-75 font-normal">({hist.duration}ms)</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setResponseHistory([]);
                        setSelectedHistoryIndex(null);
                        if (onClearResponse) onClearResponse();
                      }}
                      className="text-[10px] font-mono text-outline hover:text-error transition-colors px-1.5 py-0.5 rounded hover:bg-error/10 shrink-0 cursor-pointer"
                      title="Clear response history"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {currentDisplayResponse ? (
                  <>
                    {/* Status & Copy Header Bar */}
                    <div className="flex items-center justify-between text-xs font-mono bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${currentDisplayResponse.status >= 200 && currentDisplayResponse.status < 300
                          ? 'bg-secondary/20 text-secondary border border-secondary/30'
                          : 'bg-error/20 text-error border border-error/30'
                          }`}>
                          {currentDisplayResponse.status} {currentDisplayResponse.status === 200 ? 'OK' : ''}
                        </span>
                        <span className="text-on-surface font-bold">{currentDisplayResponse.duration}ms</span>
                        <span className="text-outline font-bold">{responseSize}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Response Sub-Tabs Toggle */}
                        <div className="flex items-center gap-1 bg-surface-container-high p-0.5 rounded-lg border border-outline-variant/30 text-xs font-bold">
                          <button
                            onClick={() => setResponseSubTab('body')}
                            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${responseSubTab === 'body' ? 'bg-primary/20 text-primary font-bold' : 'text-outline hover:text-on-surface'}`}
                          >
                            Body
                          </button>
                          <button
                            onClick={() => setResponseSubTab('headers')}
                            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${responseSubTab === 'headers' ? 'bg-primary/20 text-primary font-bold' : 'text-outline hover:text-on-surface'}`}
                          >
                            Headers ({Object.keys(currentDisplayResponse.headers || {}).length})
                          </button>
                        </div>

                        <button
                          onClick={() => copyText(responseSubTab === 'body' ? currentDisplayResponse.body : formatHeaders(currentDisplayResponse.headers || {}), responseSubTab === 'body' ? 'Response body' : 'Response headers')}
                          className="px-3 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold text-xs flex items-center gap-1 border border-outline-variant/30 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Full Width Response View */}
                    <div className="flex-1 bg-black/90 border border-outline-variant/30 rounded-xl p-4 font-mono text-xs overflow-auto select-text leading-relaxed">
                      {responseSubTab === 'body' ? (
                        <pre className="whitespace-pre-wrap text-on-surface font-mono">
                          {currentDisplayResponse.body || '[empty response]'}
                        </pre>
                      ) : (
                        <pre className="whitespace-pre-wrap text-secondary font-mono">
                          {formatHeaders(currentDisplayResponse.headers || {})}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-on-surface-variant space-y-2">
                    <span className="material-symbols-outlined text-3xl text-outline mb-1">output</span>
                    <span className="font-bold text-on-surface">No Response Payload Yet</span>
                    <p className="text-xs text-outline max-w-xs">
                      Click the ▶ Send button or press <kbd className="px-1 py-0.5 bg-surface-container-high font-mono text-primary font-bold rounded">Ctrl + Enter</kbd> to execute.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Import Swagger Modal ── */}
      {importSwaggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in">
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">file_upload</span>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">Import OpenAPI / Swagger into Postman</h3>
              </div>
              <button
                onClick={() => setImportSwaggerModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Paste valid OpenAPI 3.0 or Postman Collection JSON to import collections & saved requests directly into Postman Studio.
            </p>

            <textarea
              rows={10}
              placeholder="Paste openapi.json or Postman JSON collection content here..."
              value={importSwaggerText}
              onChange={(e) => setImportSwaggerText(e.target.value)}
              className="w-full bg-black border border-outline-variant rounded-xl p-3 font-mono text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setImportSwaggerModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-label-md text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSwaggerSubmit}
                className="btn-primary px-5 py-2 text-xs font-semibold"
              >
                Import Collections
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Collection Modal ── */}
      {deletingFolderTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in"
          onClick={() => setDeletingFolderTarget(null)}
        >
          <div
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmDeleteFolder(deletingFolderTarget);
                setDeletingFolderTarget(null);
              }
            }}
            className="bg-surface-container-low border border-outline-variant rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
              <div className="w-10 h-10 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">Delete Collection</h3>
                <p className="text-xs text-on-surface-variant">Permanent collection removal</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to delete collection <strong className="text-on-surface font-semibold">"{deletingFolderTarget}"</strong>
              {deletingFolderRequestCount > 0 ? (
                <> and all <strong className="text-error font-semibold">{deletingFolderRequestCount} saved {deletingFolderRequestCount === 1 ? 'request' : 'requests'}</strong> inside it</>
              ) : ''}? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingFolderTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-label-md text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleConfirmDeleteFolder(deletingFolderTarget);
                  setDeletingFolderTarget(null);
                }}
                className="btn-danger compact px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Collection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Right-Click Context Menu Overlay */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-surface-container-high/95 backdrop-blur-md border border-outline-variant/40 rounded-xl shadow-2xl p-1.5 min-w-[170px] flex flex-col gap-0.5 text-xs font-semibold select-none animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.request ? (
            <>
              <button
                onClick={(e) => {
                  handleStartRenameRequest(contextMenu.request!, e);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2 text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Rename Request</span>
              </button>
              <button
                onClick={() => {
                  copyText(contextMenu.request!.path, 'Request URL');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2 text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">content_copy</span>
                <span>Copy URL</span>
              </button>
              <button
                onClick={() => handleDuplicateRequest(contextMenu.request!)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2 text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">content_paste_go</span>
                <span>Duplicate Request</span>
              </button>
              <div className="h-px bg-outline-variant/30 my-1" />
              <button
                onClick={(e) => {
                  handleDeleteRequestItem(contextMenu.request!.id, e);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-error/20 text-error transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Delete Request</span>
              </button>
            </>
          ) : contextMenu.folderName ? (
            <>
              <button
                onClick={() => {
                  handleAddNewRequest(contextMenu.folderName);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2 text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Add Request</span>
              </button>
              <button
                onClick={(e) => {
                  handleStartRenameFolder(contextMenu.folderName!, e);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2 text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Rename Collection</span>
              </button>
              {contextMenu.folderName !== 'Default Collection' && (
                <button
                  onClick={(e) => {
                    handleRequestDeleteFolder(contextMenu.folderName!, e);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-error/20 text-error transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>Delete Collection</span>
                </button>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Keyboard Shortcuts Help Dialog (Standalone Fallback) */}
      {!onOpenShortcuts && (
        <KeyboardShortcutsDialog
          isOpen={showHotkeysModal}
          onClose={() => setShowHotkeysModal(false)}
          currentView="postman"
        />
      )}
    </div>
  );
}
