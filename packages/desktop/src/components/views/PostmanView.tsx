import { useState, useMemo, useEffect } from 'react';
import type { SavedRequest, PostmanResponse, Tunnel } from './SharedComponents';
import { formatHeaders } from './SharedComponents';
import { showToast } from '../../lib/toast';
import { importSwaggerToSavedRequests, importPostmanToOpenApi } from '../../lib/openApiGenerator';

export function PostmanView({
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
  onDeleteRequest,
  onUpdateSavedRequests,
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
  onDeleteRequest?: (id: string) => void;
  onUpdateSavedRequests?: (next: SavedRequest[]) => void;
}) {
  // Request Sub-Tabs: 'body' | 'headers' | 'auth' | 'response'
  const [requestTab, setRequestTab] = useState<'body' | 'headers' | 'auth' | 'response'>('body');
  const [responseSubTab, setResponseSubTab] = useState<'body' | 'headers'>('body');

  // Auth Helper State
  const [bearerToken, setBearerToken] = useState<string>('');

  // Resizable Panel Width for Collections Rail
  const [collectionsWidth, setCollectionsWidth] = useState<number>(() => {
    const saved = localStorage.getItem('postman_collections_width');
    return saved ? Math.max(200, Math.min(500, parseInt(saved, 10))) : 260;
  });

  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);

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

  // Handle Send button click -> Auto-switch to Response tab!
  const handleSendRequest = () => {
    setRequestTab('response');
    onRun();
  };

  // Global Keyboard Shortcuts (Ctrl + Enter to Send, Ctrl + S to Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendRequest();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRun, onSave]);

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
  const handleDeleteRequestItem = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteRequest) {
      onDeleteRequest(reqId);
    } else if (onUpdateSavedRequests) {
      onUpdateSavedRequests(savedRequests.filter((r) => r.id !== reqId));
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

  // Delete Folder Handler
  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = savedRequests.filter((r) => {
      const folder = r.collectionName || (r.source === 'starter-scan' ? 'Scanned Endpoints' : r.source === 'captured' ? 'Captured Traffic' : 'Default Collection');
      return folder !== folderName;
    });

    if (onUpdateSavedRequests) onUpdateSavedRequests(next);
    showToast(`Deleted collection "${folderName}"`, 'info');
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
    if (!response?.body) return '0 B';
    const bytes = new Blob([response.body]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [response]);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-3 fade-in items-stretch">
      {/* ── 1. Left Collections Rail ── */}
      <div 
        style={{ width: `${collectionsWidth}px` }} 
        className="shrink-0 bg-surface-container border border-outline-variant/30 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto transition-none select-none"
      >
        {/* Rail Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">folder_open</span>
            <h2 className="font-bold text-xs uppercase tracking-wider text-on-surface">Collections</h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setImportSwaggerModalOpen(true)}
              className="p-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-primary transition-colors text-xs font-bold flex items-center gap-1"
              title="Import Swagger / OpenAPI Spec"
            >
              <span className="material-symbols-outlined text-base">file_upload</span>
            </button>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="p-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-primary transition-colors text-xs font-bold flex items-center gap-1"
              title="Create new collection folder"
            >
              <span className="material-symbols-outlined text-base">create_new_folder</span>
            </button>
          </div>
        </div>

        {/* Create Folder Input */}
        {isCreatingFolder && (
          <div className="p-2.5 bg-surface-container-high rounded-xl border border-primary/40 space-y-2 fade-in">
            <input
              type="text"
              value={newFolderNameInput}
              onChange={(e) => setNewFolderNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
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
                className="px-3 py-1 rounded bg-primary text-on-primary font-bold"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Static Tree Folders & Request Items */}
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
          {orderedFoldersList.map((folderName, idx) => {
            const requests = groupedCollections[folderName] || [];
            const isCollapsed = !!collapsedFolders[folderName];
            const isEditingThisFolder = editingFolderId === folderName;

            return (
              <div key={folderName} className="space-y-1">
                {/* Folder Header Item */}
                <div 
                  onClick={() => handleSelectFolder(folderName)}
                  className="group flex items-center justify-between p-1.5 hover:bg-surface-container-high rounded-lg cursor-pointer transition-all border border-transparent hover:border-outline-variant/20"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <button
                      onClick={(e) => toggleFolder(folderName, e)}
                      className="p-0.5 rounded hover:bg-surface-container-highest transition-colors"
                      title={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                    >
                      <span className="material-symbols-outlined text-outline text-base">
                        {isCollapsed ? 'chevron_right' : 'expand_more'}
                      </span>
                    </button>

                    <span className="material-symbols-outlined text-secondary text-base">folder</span>

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
                        className="bg-surface-container-lowest border border-primary rounded px-2 py-0.5 text-xs text-on-surface focus:outline-none font-bold w-full"
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs font-bold text-on-surface truncate flex-1">
                        {folderName}
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-outline font-bold px-1.5 py-0.5 bg-black/40 rounded shrink-0">
                      {requests.length}
                    </span>
                  </div>

                  {/* Folder Actions & Move Up/Down Controls */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    {idx > 0 && (
                      <button
                        onClick={(e) => moveFolderUp(idx, e)}
                        className="p-0.5 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface"
                        title="Move folder up"
                      >
                        <span className="material-symbols-outlined text-xs">arrow_upward</span>
                      </button>
                    )}
                    {idx < orderedFoldersList.length - 1 && (
                      <button
                        onClick={(e) => moveFolderDown(idx, e)}
                        className="p-0.5 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface"
                        title="Move folder down"
                      >
                        <span className="material-symbols-outlined text-xs">arrow_downward</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleStartRenameFolder(folderName, e)}
                      className="p-0.5 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface"
                      title="Rename folder"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                    </button>
                    {folderName !== 'Default Collection' && (
                      <button
                        onClick={(e) => handleDeleteFolder(folderName, e)}
                        className="p-0.5 rounded hover:bg-error/20 text-outline hover:text-error"
                        title="Delete folder"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Nested Requests */}
                {!isCollapsed && (
                  <div className="pl-4 space-y-1 border-l border-outline-variant/20 ml-3">
                    {requests.map((request) => {
                      const isGet = request.method === 'GET';
                      const isPost = ['POST', 'PUT', 'PATCH'].includes(request.method);
                      const methodColor = isGet ? 'text-primary' : isPost ? 'text-secondary' : 'text-error';
                      const bgClass = isGet ? 'bg-primary/10' : isPost ? 'bg-secondary/10' : 'bg-error/10';
                      const isEditingThisReq = editingRequestId === request.id;
                      const isActiveDraft = draft.id === request.id;

                      return (
                        <div
                          key={request.id}
                          onClick={() => {
                            handleSelectFolder(folderName);
                            onLoad(request);
                          }}
                          className={`group/req w-full text-left flex items-center justify-between p-2 hover:bg-surface-container-high rounded-xl cursor-pointer transition-colors border ${
                            isActiveDraft ? 'bg-primary/10 border-primary/30' : 'border-transparent hover:border-outline-variant/20'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-9 h-5 rounded text-[10px] font-bold font-mono flex items-center justify-center shrink-0 ${bgClass} ${methodColor}`}>
                              {request.method}
                            </span>

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
                                className="bg-surface-container-lowest border border-primary rounded px-1.5 py-0.5 text-xs text-on-surface focus:outline-none w-full"
                                autoFocus
                              />
                            ) : (
                              <span className="text-xs font-semibold text-on-surface truncate flex-1">{request.name}</span>
                            )}
                          </div>

                          {/* Request Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover/req:opacity-100 transition-opacity ml-1">
                            <button
                              onClick={(e) => handleStartRenameRequest(request, e)}
                              className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface"
                              title="Rename request"
                            >
                              <span className="material-symbols-outlined text-xs">edit</span>
                            </button>
                            <button
                              onClick={(e) => handleDeleteRequestItem(request.id, e)}
                              className="p-1 rounded hover:bg-error/20 text-outline hover:text-error"
                              title="Delete request"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          </div>
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
        </div>
      </div>

      {/* Left Resizer Handle */}
      <div
        onMouseDown={handleCollectionsMouseDown}
        className={`w-2.5 -mx-1.5 z-20 cursor-col-resize flex items-center justify-center group transition-colors select-none ${
          isResizingLeft ? 'bg-primary/20' : 'hover:bg-primary/10'
        }`}
        title="Drag left/right to resize Collections pane"
      >
        <div className={`w-1 h-10 rounded-full transition-colors ${
          isResizingLeft ? 'bg-primary' : 'bg-outline-variant/40 group-hover:bg-primary'
        }`} />
      </div>

      {/* ── 2. Main Request & Response Workspace (Flex-1) ── */}
      <div className="flex-1 min-w-0 bg-surface-container border border-outline-variant/30 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto shadow-sm select-none">
        {/* Starter Suggestion Banner */}
        {starterSuggestions.length > 0 && (
          <div className="p-3.5 bg-primary-container/10 border-l-4 border-primary rounded-r-xl flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <strong className="text-xs text-on-surface font-bold">Starter endpoints detected</strong>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Endpoints inferred from workspace files. Click import to add them to your collection.
              </p>
            </div>
            <button
              className="btn-primary compact shrink-0"
              onClick={onImportStarterRequests}
            >
              Import Scan
            </button>
          </div>
        )}

        {/* Clean Request Title & Save Bar */}
        <div className="flex items-center justify-between gap-3">
          <input
            className="w-full bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant/60 focus:border-primary rounded-xl px-3.5 py-2 text-sm text-on-surface font-bold focus:outline-none transition-all placeholder:text-outline"
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            aria-label="Request name"
            placeholder="Request Title (e.g. Fetch User Profile)"
          />

          <button
            className="btn-secondary shrink-0 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            onClick={onSave}
            title="Save request (Ctrl + S)"
          >
            <span className="material-symbols-outlined text-sm">bookmark</span>
            <span>Save</span>
          </button>
        </div>

        {/* Unified Method + URL Toolbar */}
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/40 p-1.5 rounded-xl shadow-inner">
          <select
            className="shrink-0 font-mono font-bold text-center cursor-pointer border border-outline-variant/40 bg-surface-container-high text-primary rounded-lg py-2 text-xs focus:outline-none focus:border-primary"
            style={{ width: '110px', minWidth: '110px' }}
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
            onChange={(event) => onDraftChange({ ...draft, path: event.target.value })}
            placeholder={activeTunnel ? '/api/users' : 'https://example.com/api'}
            aria-label="Request URL or path"
          />

          <button
            className="btn-primary shrink-0 font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.01] transition-transform"
            onClick={handleSendRequest}
            disabled={sending}
            title="Send request (Ctrl + Enter)"
          >
            {sending ? (
              <>
                <span className="w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
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

        {/* Workspace Sub-Tabs Switcher */}
        <div className="flex flex-col flex-1 min-h-0 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
          {/* Sub-Tabs Bar */}
          <div className="flex items-center gap-1 bg-surface-container-low px-4 py-2 border-b border-outline-variant/20">
            <button
              onClick={() => setRequestTab('body')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                requestTab === 'body'
                  ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">code</span>
              <span>Body (JSON)</span>
            </button>

            <button
              onClick={() => setRequestTab('headers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                requestTab === 'headers'
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                requestTab === 'auth'
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                requestTab === 'response'
                  ? 'bg-surface-container-highest text-secondary border border-secondary/40 shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">output</span>
              <span>Response</span>
              {response && (
                <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded font-bold ${
                  response.status >= 200 && response.status < 300
                    ? 'bg-secondary/20 text-secondary'
                    : 'bg-error/20 text-error'
                }`}>
                  {response.status}
                </span>
              )}
            </button>
          </div>

          {/* Sub-Tab Content View */}
          <div className="flex-1 p-4 flex flex-col min-h-0 overflow-y-auto">
            {requestTab === 'body' && (
              <div className="flex flex-col flex-1 gap-2">
                <span className="text-[11px] font-mono text-outline font-bold uppercase tracking-wider">Request Payload (JSON)</span>
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
                {response ? (
                  <>
                    {/* Status & Copy Header Bar */}
                    <div className="flex items-center justify-between text-xs font-mono bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                          response.status >= 200 && response.status < 300
                            ? 'bg-secondary/20 text-secondary border border-secondary/30'
                            : 'bg-error/20 text-error border border-error/30'
                        }`}>
                          {response.status} {response.status === 200 ? 'OK' : ''}
                        </span>
                        <span className="text-on-surface font-bold">{response.duration}ms</span>
                        <span className="text-outline font-bold">{responseSize}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Response Sub-Tabs Toggle */}
                        <div className="flex items-center gap-1 bg-surface-container-high p-0.5 rounded-lg border border-outline-variant/30 text-xs font-bold">
                          <button
                            onClick={() => setResponseSubTab('body')}
                            className={`px-2.5 py-0.5 rounded transition-all ${responseSubTab === 'body' ? 'bg-primary/20 text-primary font-bold' : 'text-outline hover:text-on-surface'}`}
                          >
                            Body
                          </button>
                          <button
                            onClick={() => setResponseSubTab('headers')}
                            className={`px-2.5 py-0.5 rounded transition-all ${responseSubTab === 'headers' ? 'bg-primary/20 text-primary font-bold' : 'text-outline hover:text-on-surface'}`}
                          >
                            Headers ({Object.keys(response.headers || {}).length})
                          </button>
                        </div>

                        <button
                          onClick={() => copyText(responseSubTab === 'body' ? response.body : formatHeaders(response.headers || {}), responseSubTab === 'body' ? 'Response body' : 'Response headers')}
                          className="px-3 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold text-xs flex items-center gap-1 border border-outline-variant/30"
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
                          {response.body || '[empty response]'}
                        </pre>
                      ) : (
                        <pre className="whitespace-pre-wrap text-secondary font-mono">
                          {formatHeaders(response.headers || {})}
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
    </div>
  );
}
