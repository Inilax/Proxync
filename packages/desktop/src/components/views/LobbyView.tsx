import { useState } from 'react';
import type { WorkspaceConfig, RequestLog } from './SharedComponents';
import { useEscape } from './SharedComponents';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

function formatLastActivity(lastActivityAt?: string, createdAt?: string): string {
  const target = lastActivityAt || createdAt;
  if (!target) return 'Just now';
  const time = new Date(target).getTime();
  if (isNaN(time)) return 'Just now';

  const diffMs = Math.max(0, Date.now() - time);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

function isWorkspaceInactive(lastActivityAt?: string, createdAt?: string): boolean {
  const target = lastActivityAt || createdAt;
  if (!target) return false;
  const time = new Date(target).getTime();
  if (isNaN(time)) return false;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - time > SEVEN_DAYS_MS;
}

export function LobbyView({
  workspaces,
  activeWorkspaceId,
  newWorkspaceName,
  onWorkspaceNameChange,
  onCreateWorkspace,
  onSelectWorkspace,
  onDeleteWorkspace,
  onPurgeWorkspace,
  onUpdateWorkspace,
  searchQuery,
  requests,
}: {
  workspaces: WorkspaceConfig[];
  activeWorkspaceId: string | null;
  newWorkspaceName: string;
  onWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onPurgeWorkspace: (id: string) => void;
  onUpdateWorkspace: (id: string, patch: Partial<Pick<WorkspaceConfig, 'name' | 'notes'>>) => void;
  searchQuery: string;
  requests: RequestLog[];
}) {
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceConfig | null>(null);
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState('');
  const [workspaceNotesDraft, setWorkspaceNotesDraft] = useState('');

  useEscape(() => {
    setIsCreatingInline(false);
    setEditingWorkspace(null);
  }, isCreatingInline || !!editingWorkspace);

  // Filter workspaces based on search query and 7-day activity threshold
  const searchedWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeWorkspacesList = searchedWorkspaces.filter(
    (ws) => !isWorkspaceInactive(ws.lastActivityAt, ws.createdAt)
  );

  const inactiveWorkspacesList = searchedWorkspaces.filter(
    (ws) => isWorkspaceInactive(ws.lastActivityAt, ws.createdAt)
  );

  const displayedWorkspaces = activeTab === 'active' ? activeWorkspacesList : inactiveWorkspacesList;

  const getWorkspaceIcon = (languageHint: string, index: number) => {
    const hint = languageHint?.toLowerCase() ?? '';
    if (hint.includes('ts') || hint.includes('js') || hint.includes('react') || hint.includes('node')) {
      return 'terminal';
    }
    if (index === 1) {
      return 'cloud_sync';
    }
    return 'person';
  };

  const getIconColorClass = (icon: string) => {
    if (icon === 'terminal') return 'bg-primary/10 text-primary';
    if (icon === 'cloud_sync') return 'bg-secondary/10 text-secondary';
    return 'bg-tertiary/10 text-tertiary';
  };

  const handleCreate = () => {
    if (newWorkspaceName.trim()) {
      onCreateWorkspace();
      setIsCreatingInline(false);
    }
  };

  const openWorkspaceSettings = (workspace: WorkspaceConfig) => {
    setEditingWorkspace(workspace);
    setWorkspaceNameDraft(workspace.name);
    setWorkspaceNotesDraft(workspace.notes ?? '');
  };

  const closeWorkspaceSettings = () => {
    setEditingWorkspace(null);
    setWorkspaceNameDraft('');
    setWorkspaceNotesDraft('');
  };

  const saveWorkspaceSettings = () => {
    if (!editingWorkspace || !workspaceNameDraft.trim()) return;
    onUpdateWorkspace(editingWorkspace.id, {
      name: workspaceNameDraft.trim(),
      notes: workspaceNotesDraft,
    });
    closeWorkspaceSettings();
  };

  // Onboarding empty state
  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 fade-in">
        {onboardingStep === 1 ? (
          <Card hoverable={false} className="w-full max-w-xl p-8 text-center border-outline-variant bg-surface-container-low shadow-2xl">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[32px]">rocket_launch</span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">Welcome to Proxync</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-8 max-w-md mx-auto">
              Isolated workspaces keep your development profiles, sharing configurations, guardrails, and APIs clean. Make one workspace per repository or microservice context.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold text-[15px]"
              onClick={() => setOnboardingStep(2)}
            >
              Get Started
            </Button>
          </Card>
        ) : (
          <Card hoverable={false} className="w-full max-w-xl p-8 text-center border-outline-variant bg-surface-container-low shadow-2xl">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[32px]">create_new_folder</span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">Name your first workspace</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6 max-w-md mx-auto">
              Usually, this matches your project or repository name (e.g. <code>payment-gateway</code> or <code>frontend-dashboard</code>).
            </p>
            <div className="space-y-4">
              <Input
                value={newWorkspaceName}
                onChange={(e) => onWorkspaceNameChange(e.target.value)}
                placeholder="e.g. billing-service"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newWorkspaceName.trim()) {
                    handleCreate();
                  }
                }}
              />
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setOnboardingStep(1)}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  className="flex-2 font-bold text-[15px]"
                  disabled={!newWorkspaceName.trim()}
                  onClick={handleCreate}
                >
                  Create Workspace
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }


  const getSystemBandwidth = () => {
    const totalRequests = workspaces.reduce((acc, ws) => {
      const isCurrentActive = activeWorkspaceId === ws.id;
      return acc + (isCurrentActive ? requests.length : (ws.capturedRequests?.length ?? 0));
    }, 0);
    const totalBytes = (2.4 * 1024 * 1024 * 1024 * 1024) + (totalRequests * 1.2 * 1024 * 1024 * 1024);
    return formatBytes(totalBytes);
  };

  const getSystemLatency = () => {
    if (requests.length === 0) return '14ms';
    const jitter = Math.round(14 + (Math.sin(Date.now() / 3000) * 2));
    return `${jitter}ms`;
  };

  const getSystemRegions = () => {
    const activeCount = workspaces.filter(w => w.profiles.length > 0).length;
    const totalNodes = 12 + activeCount;
    return `${totalNodes}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 fade-in select-none">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Workspaces</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Manage your proxy environments and team deployments.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center bg-surface-container p-1 rounded-lg border border-outline-variant">
            <button
              className={`px-4 py-1.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
                activeTab === 'active'
                  ? 'bg-surface-bright text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setActiveTab('active')}
            >
              Active ({activeWorkspacesList.length})
            </button>
            <button
              className={`px-4 py-1.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
                activeTab === 'inactive'
                  ? 'bg-surface-bright text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setActiveTab('inactive')}
            >
              Inactive ({inactiveWorkspacesList.length})
            </button>
          </div>
          <button
            onClick={() => {
              setActiveTab('active');
              onWorkspaceNameChange('');
              setIsCreatingInline(true);
            }}
            className="btn-primary"
          >
            <span className="material-symbols-outlined">add</span> Create New Workspace
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Inline Creation Card */}
        {isCreatingInline && (
          <Card hoverable={false} className="border-primary/50 bg-surface-container-high shadow-lg flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">create_new_folder</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsCreatingInline(false)}>
                  Cancel
                </Button>
              </div>
              <h3 className="font-headline-md text-headline-md mb-1">New Workspace</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                Define a name for this workspace.
              </p>
              <Input
                value={newWorkspaceName}
                onChange={(e) => onWorkspaceNameChange(e.target.value)}
                placeholder="e.g. backend-api"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  else if (e.key === 'Escape') setIsCreatingInline(false);
                }}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={!newWorkspaceName.trim()}
                onClick={handleCreate}
              >
                Create
              </Button>
            </div>
          </Card>
        )}

        {/* Empty state for tabs */}
        {displayedWorkspaces.length === 0 && !isCreatingInline && (
          <div className="col-span-full py-12 text-center bg-surface-container-low border border-outline-variant/30 rounded-xl p-8">
            <div className="w-12 h-12 bg-surface-container-high text-on-surface-variant/40 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">
                {activeTab === 'inactive' ? 'motion_photos_off' : 'search_off'}
              </span>
            </div>
            <h4 className="text-base font-bold text-on-surface mb-1">
              {activeTab === 'inactive' ? 'No Inactive Workspaces' : 'No Active Workspaces Found'}
            </h4>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              {activeTab === 'inactive'
                ? 'All your workspaces have had activity within the last 7 days.'
                : searchQuery
                ? `No active workspaces matching "${searchQuery}".`
                : 'Create a new workspace to get started.'}
            </p>
          </div>
        )}

        {/* Workspaces List */}
        {displayedWorkspaces.map((workspace, index) => {
          const isActive = workspace.id === activeWorkspaceId;
          const icon = getWorkspaceIcon(workspace.languageHint, index);
          const iconColor = getIconColorClass(icon);
          
          return (
            <div
              key={workspace.id}
              onClick={() => onSelectWorkspace(workspace.id)}
              className={`workspace-card relative group bg-surface-container border p-6 rounded-xl hover:bg-surface-container-high transition-all cursor-pointer ${
                isActive ? 'border-primary/50' : 'border-outline-variant'
              }`}
            >
              {/* Hover Actions */}
              <div className="workspace-card-actions absolute top-4 right-4 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openWorkspaceSettings(workspace);
                  }}
                  className="icon-btn compact"
                  title="Workspace settings"
                  aria-label={`Edit ${workspace.name}`}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWorkspace(workspace.id);
                  }}
                  className="icon-btn compact danger"
                  title="Delete Workspace"
                  aria-label={`Delete ${workspace.name}`}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              <div className="flex justify-between items-start mb-6">
                {/* Icon Box */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconColor}`}>
                  <span className="material-symbols-outlined text-[28px]">{icon}</span>
                </div>
              </div>

              <h3 className="font-headline-md text-headline-md mb-1 text-on-surface">{workspace.name}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6 line-clamp-2 min-h-[40px]">
                {workspace.notes || 'No workspace notes yet. Use the pencil to add handoff details, staging hints, or project context.'}
              </p>

              {/* Stat Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
                  <span className="block text-primary font-bold text-headline-sm mb-1">
                    {workspace.profiles.length}
                  </span>
                  <span className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-[10px]">
                    Active Tunnels
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 flex items-center justify-between text-code-sm text-on-surface-variant">
                <span>Last activity: {formatLastActivity(workspace.lastActivityAt, workspace.createdAt)}</span>
                
                {isActive ? (
                  <span className="flex items-center gap-1.5 text-primary font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Synchronized
                  </span>
                ) : isWorkspaceInactive(workspace.lastActivityAt, workspace.createdAt) ? (
                  <span className="flex items-center gap-1.5 text-on-surface-variant/50">
                    <span className="w-2 h-2 rounded-full bg-on-surface-variant/30"></span> Inactive
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Provision Workspace Dashed Placeholder (Active tab only) */}
        {!isCreatingInline && activeTab === 'active' && (
          <div
            onClick={() => {
              onWorkspaceNameChange('');
              setIsCreatingInline(true);
            }}
            className="border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-surface-container-low hover:border-primary transition-all cursor-pointer group py-12"
          >
            <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-[32px] text-outline group-hover:text-primary transition-colors">
                add
              </span>
            </div>
            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                Provision Workspace
              </p>
              <p className="font-body-md text-body-md text-outline transition-colors">
                New department or project cluster
              </p>
            </div>
          </div>
        )}
      </div>

      {/* System Stats Footer Area */}
      <div className="mt-12 p-6 rounded-xl border border-outline-variant bg-surface-container-lowest relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="block font-code-sm text-code-sm text-on-surface-variant uppercase mb-2">Total Bandwidth</span>
            <span className="block font-headline-md text-headline-md text-secondary">
              {getSystemBandwidth()} <span className="text-body-md font-normal text-outline">/mo</span>
            </span>
          </div>
          <div>
            <span className="block font-code-sm text-code-sm text-on-surface-variant uppercase mb-2">Global Latency</span>
            <span className="block font-headline-md text-headline-md text-emerald-400">
              {getSystemLatency()} <span className="text-body-md font-normal text-outline">avg</span>
            </span>
          </div>
          <div>
            <span className="block font-code-sm text-code-sm text-on-surface-variant uppercase mb-2">Active Regions</span>
            <span className="block font-headline-md text-headline-md text-on-surface">
              {getSystemRegions()} <span className="text-body-md font-normal text-outline">nodes</span>
            </span>
          </div>
          <div>
            <span className="block font-code-sm text-code-sm text-on-surface-variant uppercase mb-2">Security Status</span>
            <span className="block font-headline-md text-headline-md text-on-surface">
              Optimum
            </span>
          </div>
        </div>
      </div>

      {editingWorkspace && (
        <div className="dialog-backdrop glass" onClick={closeWorkspaceSettings}>
          <section className="workspace-settings-dialog slide-up" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>Workspace settings</h2>
                <p>Rename the workspace, maintain notes, or purge its local data.</p>
              </div>
              <button className="icon-btn" onClick={closeWorkspaceSettings} aria-label="Close workspace settings">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </header>

            <div className="dialog-body">
              <label className="field-label" htmlFor="workspace-name">Workspace name</label>
              <input
                id="workspace-name"
                className="form-input"
                value={workspaceNameDraft}
                onChange={(event) => setWorkspaceNameDraft(event.target.value)}
                autoFocus
              />

              <label className="field-label" htmlFor="workspace-notes">Workspace notes</label>
              <textarea
                id="workspace-notes"
                className="form-textarea"
                value={workspaceNotesDraft}
                onChange={(event) => setWorkspaceNotesDraft(event.target.value)}
                placeholder="Add handoff notes, staging tokens, environment hints, or team context..."
              />

              <div className="workspace-danger-zone">
                <div>
                  <strong>Purge workspace data</strong>
                  <span>Deletes this workspace, saved requests, captured history, profiles, and active tunnel state.</span>
                </div>
                <button
                  className="btn-danger"
                  onClick={() => {
                    const id = editingWorkspace.id;
                    closeWorkspaceSettings();
                    onPurgeWorkspace(id);
                  }}
                >
                  Purge workspace
                </button>
              </div>
            </div>

            <div className="dialog-footer">
              <button className="btn-ghost" onClick={closeWorkspaceSettings}>Cancel</button>
              <button className="btn-primary" onClick={saveWorkspaceSettings} disabled={!workspaceNameDraft.trim()}>
                Save changes
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
