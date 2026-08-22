import { useState, useEffect } from 'react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import type { WorkspaceConfig, AppSettings, DomainRecord, Guardrails, Tunnel, ProcessCandidate } from './SharedComponents';
import { showToast } from '../../lib/toast';
import { ConfirmPurgeDialog } from './Dialogs';
import {
  readLogsSummary,
  openLogsFolder,
  clearLogs,
  exportSupportBundle,
  type LogsSummary,
} from '../../lib/logger';

export function SettingsView({
  workspace,
  appSettings,
  domains,
  domainDraft,
  loadingDomains,
  busyDomainId,
  scanningProject,
  activeTunnel,
  processes = [],
  tunnels = [],
  onUpdateGuardrails,
  onUpdateAppNotes,
  onUpdateProjectRootPath,
  onScanProjectFolder,
  onDomainDraftChange,
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
  onUpdateTheme,
  onUpdateAutoUpdate,
  onUpdateTelemetry,
  onUpdateEnableDevTools,
  onUpdateAppLogging,
  onUpdateTrafficLogging,
  initialSection = 'general',
}: {
  workspace: WorkspaceConfig | null;
  appSettings: AppSettings;
  domains: DomainRecord[];
  domainDraft: string;
  loadingDomains: boolean;
  busyDomainId: string | null;
  scanningProject: boolean;
  activeTunnel?: Tunnel | null;
  processes?: ProcessCandidate[];
  tunnels?: Tunnel[];
  onUpdateGuardrails: (patch: Partial<Guardrails>) => void;
  onUpdateAppNotes: (notes: string) => void;
  onUpdateProjectRootPath: (projectRootPath: string) => void;
  onScanProjectFolder: () => void;
  onDomainDraftChange: (value: string) => void;
  onAddDomain: () => void;
  onVerifyDomain: (domainId: string) => void;
  onRemoveDomain: (domainId: string) => void;
  onUpdateTheme: (theme: string) => void;
  onUpdateAutoUpdate: (enabled: boolean) => void;
  onUpdateTelemetry?: (telemetry: 'enhanced' | 'basic') => void;
  onUpdateEnableDevTools?: (enabled: boolean) => void;
  onUpdateAppLogging?: (enabled: boolean) => void;
  onUpdateTrafficLogging?: (enabled: boolean) => void;
  initialSection?: 'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger';
}) {
  const [activeSection, setActiveSection] = useState<'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger'>(initialSection);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [logsSummary, setLogsSummary] = useState<LogsSummary | null>(null);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (activeSection === 'danger') {
      readLogsSummary().then(setLogsSummary).catch(() => {});
    }
  }, [activeSection, appSettings.debugLogging]);

  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    isEnabled()
      .then((enabled: boolean) => setAutostart(enabled))
      .catch(() => {});
  }, []);

  const handleAutostartToggle = async (checked: boolean) => {
    setAutostart(checked);
    try {
      if (checked) {
        await enable();
        showToast('Enabled Auto-start on system boot', 'success');
      } else {
        await disable();
        showToast('Disabled Auto-start on system boot', 'info');
      }
    } catch (err: any) {
      console.error('Autostart toggle failed:', err);
      showToast(err?.message || 'Failed to update auto-start setting', 'error');
    }
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

  const copyVal = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 fade-in select-none">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Settings</h1>
          <p className="text-on-surface-variant font-body-md mt-1 text-xs sm:text-sm">Manage your engine configuration and security credentials.</p>
        </div>

      </div>

      {/* Settings Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
        {/* Settings Tab Sidebar / Horizontal Pills on Compact Screens */}
        <div className="flex flex-row overflow-x-auto gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 md:border-none md:bg-transparent md:flex-col md:p-0 md:col-span-1 shrink-0">
          <button
            onClick={() => setActiveSection('general')}
            className={`text-left px-3.5 py-2 md:py-2.5 rounded-lg font-label-md text-xs md:text-sm cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'general'
                ? 'bg-surface-container-high text-primary md:border-l-2 md:border-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveSection('networking')}
            className={`text-left px-3.5 py-2 md:py-2.5 rounded-lg font-label-md text-xs md:text-sm cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'networking'
                ? 'bg-surface-container-high text-primary md:border-l-2 md:border-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Networking
          </button>
          <button
            onClick={() => setActiveSection('account')}
            className={`text-left px-3.5 py-2 md:py-2.5 rounded-lg font-label-md text-xs md:text-sm cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'account'
                ? 'bg-surface-container-high text-primary md:border-l-2 md:border-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`text-left px-3.5 py-2 md:py-2.5 rounded-lg font-label-md text-xs md:text-sm cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'security'
                ? 'bg-surface-container-high text-primary md:border-l-2 md:border-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Security (Guardrails)
          </button>
          <button
            onClick={() => setActiveSection('domains')}
            className={`text-left px-3.5 py-2 md:py-2.5 rounded-lg font-label-md text-xs md:text-sm cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'domains'
                ? 'bg-surface-container-high text-primary md:border-l-2 md:border-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Custom Domains
          </button>
          <button
            onClick={() => setActiveSection('danger')}
            className={`text-left px-3.5 py-2 md:py-2.5 rounded-lg font-label-md text-xs md:text-sm cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'danger'
                ? 'bg-surface-container-high text-error md:border-l-2 md:border-error font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Settings Tab Content */}
        <div className="space-y-8 md:col-span-3">
          {/* General Settings */}
          {activeSection === 'general' && (
            <section className="space-y-6">
              <h2 className="font-headline-md text-headline-md border-b border-outline-variant/30 pb-4">General</h2>
              
              <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl border border-outline-variant/30">
                <div>
                  <p className="font-body-lg text-body-lg text-on-surface">Auto-start on Boot</p>
                  <p className="text-on-surface-variant text-[13px]">Launch Proxync Engine automatically when your system starts.</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autostart}
                    onChange={(e) => handleAutostartToggle(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl border border-outline-variant/30">
                <div>
                  <p className="font-body-lg text-body-lg text-on-surface">Automatic Updates</p>
                  <p className="text-on-surface-variant text-[13px]">Keep the engine updated with the latest security patches.</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={appSettings.autoUpdate}
                    onChange={(e) => {
                      onUpdateAutoUpdate(e.target.checked);
                      showToast(
                        e.target.checked
                          ? 'Auto-update enabled — checks every 2 hours'
                          : 'Auto-update set to weekly checks',
                        'info'
                      );
                    }}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/30 space-y-3">
                <div>
                  <p className="font-body-lg text-body-lg text-on-surface">Telemetry</p>
                  <p className="text-on-surface-variant text-[13px]">Control metrics collection depth and processing overhead.</p>
                </div>
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="telemetry"
                      className="mt-1 bg-surface border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                      checked={(appSettings.telemetry ?? 'enhanced') === 'enhanced'}
                      onChange={() => {
                        onUpdateTelemetry?.('enhanced');
                        showToast('Telemetry set to Enhanced mode', 'info');
                      }}
                    />
                    <div>
                      <p className="text-on-surface font-label-md">Enhanced (Recommended)</p>
                      <p className="text-on-surface-variant text-[12px]">Full performance analytics, P50/P90/P99 latency metrics, and crash reporting.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="telemetry"
                      className="mt-1 bg-surface border-outline-variant text-emerald-400 focus:ring-emerald-400/20 cursor-pointer"
                      checked={(appSettings.telemetry ?? 'enhanced') === 'basic'}
                      onChange={() => {
                        onUpdateTelemetry?.('basic');
                        showToast('Telemetry set to Basic mode (Minimal CPU)', 'info');
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-on-surface font-label-md">Basic</p>
                        <span className="material-symbols-outlined text-[14px] text-emerald-400">eco</span>
                        <span className="text-[11px] text-emerald-400 font-medium font-mono">(Low CPU Mode)</span>
                      </div>
                      <p className="text-on-surface-variant text-[12px]">Minimal CPU overhead — skips non-fatal metric calculations; only logs critical 5xx errors.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-5 bg-surface-container rounded-xl border border-outline-variant/30 space-y-4">
                <div>
                  <p className="font-body-lg text-body-lg text-on-surface">Choose Theme</p>
                  <p className="text-on-surface-variant text-[13px] mt-0.5">Customize the appearance of Proxync Studio.</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                  {[
                    { id: 'slate', name: 'Midnight Slate', colors: ['bg-[#0b1326]', 'bg-[#c0c1ff]', 'bg-[#89ceff]'] },
                    { id: 'emerald', name: 'Deep Emerald', colors: ['bg-[#031411]', 'bg-[#10b981]', 'bg-[#34d399]'] },
                    { id: 'cyberpunk', name: 'Cyberpunk Void', colors: ['bg-[#0a0114]', 'bg-[#ec4899]', 'bg-[#a855f7]'] },
                    { id: 'dracula', name: 'Dracula Dark', colors: ['bg-[#1e1f29]', 'bg-[#ff79c6]', 'bg-[#8be9fd]'] },
                  ].map((theme) => {
                    const isSelected = (appSettings.theme ?? 'slate') === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => onUpdateTheme(theme.id)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-3 relative select-none hover:bg-surface-container-high ${
                          isSelected 
                            ? 'border-primary bg-surface-container-high ring-2 ring-primary/20' 
                            : 'border-outline-variant/30 bg-surface-container-low'
                        }`}
                      >
                        {/* Theme Colors Preview */}
                        <div className="flex gap-1.5 p-2 rounded bg-surface-container-lowest border border-outline-variant/10">
                          <span className={`w-4 h-4 rounded-full border border-outline-variant/20 ${theme.colors[0]}`} />
                          <span className={`w-4 h-4 rounded-full border border-outline-variant/20 ${theme.colors[1]}`} />
                          <span className={`w-4 h-4 rounded-full border border-outline-variant/20 ${theme.colors[2]}`} />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-xs text-on-surface truncate">{theme.name}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[16px] shrink-0">check_circle</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Networking & Project Scan */}
          {activeSection === 'networking' && (
            <section className="space-y-6">
              <h2 className="font-headline-md text-headline-md border-b border-outline-variant/30 pb-4">Networking</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">Default Listener Port</label>
                  <input
                    type="text"
                    disabled
                    value="8080"
                    className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-4 py-2.5 font-code-sm text-code-sm text-primary focus:ring-2 focus:ring-primary/50 outline-none transition-all opacity-80"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">Admin Dashboard Port</label>
                  <input
                    type="text"
                    disabled
                    value="9001"
                    className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-4 py-2.5 font-code-sm text-code-sm text-primary focus:ring-2 focus:ring-primary/50 outline-none transition-all opacity-80"
                  />
                </div>
              </div>

              <div className="space-y-4 p-5 bg-surface-container border border-outline-variant/30 rounded-xl">
                <h3 className="font-body-lg text-body-lg text-on-surface">Workspace Directory Scan</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant block">Project Root Path</label>
                    <input
                      className="form-input"
                      value={workspace?.projectRootPath ?? appSettings.defaultProjectRootPath}
                      onChange={(event) => onUpdateProjectRootPath(event.target.value)}
                      placeholder="E:\path\to\project"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="btn-primary"
                      onClick={onScanProjectFolder}
                      disabled={scanningProject}
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      {scanningProject ? 'Scanning...' : 'Scan Project Folder'}
                    </button>
                    <span className="text-xs text-on-surface-variant">
                      {workspace?.scannedFiles?.length ?? 0} files indexed ({workspace?.languageHint ?? 'no framework'})
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Account Settings */}
          {activeSection === 'account' && (
            <section className="space-y-6">
              <h2 className="font-headline-md text-headline-md border-b border-outline-variant/30 pb-4">Account & Enterprise Edition</h2>
              
              <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">corporate_fare</span>
                  </div>
                  <div>
                    <h3 className="font-body-lg text-body-lg text-on-surface font-bold">Proxync Enterprise & Cloud Sync</h3>
                    <p className="text-xs text-on-surface-variant">Local-first mode active. Upgrade to Enterprise Edition for team collaboration.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20 text-xs">
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-secondary text-sm">sync</span>
                    <span className="text-on-surface">Team Workspace Cloud Sync</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-secondary text-sm">verified_user</span>
                    <span className="text-on-surface">SSO / SAML Authentication</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-secondary text-sm">key</span>
                    <span className="text-on-surface">Centralized API Key Management</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-secondary text-sm">shield</span>
                    <span className="text-on-surface">Dedicated Relay Infrastructure</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-outline font-mono">Current Tier: Local Studio (Free / Open-Source)</span>
                  <a
                    href="https://proxync.dev/"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary compact text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Learn More at proxync.dev</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Security & Guardrails */}
          {activeSection === 'security' && (
            <section className="space-y-6">
              <h2 className="font-headline-md text-headline-md border-b border-outline-variant/30 pb-4">Security & Guardrails</h2>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">API Key Management</h3>
                    <span className="badge muted" style={{ background: 'rgba(192, 193, 255, 0.1)', color: 'var(--color-primary)' }}>Enterprise Feature</span>
                  </div>
                  <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-outline shrink-0">vpn_key</span>
                      <div>
                        <p className="text-xs text-on-surface font-medium">Local Anonymous Session</p>
                        <p className="text-[11px] text-outline">Team API keys & central token rotation available in Enterprise Edition.</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-surface-container-high text-on-surface-variant text-[11px] font-mono rounded border border-outline-variant/30">
                      Local Mode
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">Workspace Guardrails</h3>
                    <span className="text-[11px] text-outline font-mono">Local Dev Mode (Unrestricted)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-label-md text-label-md text-on-surface-variant block">Auth mode</label>
                        <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">Enterprise RBAC</span>
                      </div>
                      <select
                        className="form-select"
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
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-label-md text-label-md text-on-surface-variant block">Rate limit</label>
                        <span className="text-[10px] text-secondary font-mono bg-secondary/10 px-1.5 py-0.5 rounded">Enterprise Policy</span>
                      </div>
                      <input
                        className="form-input"
                        value={appSettings.guardrails.rateLimit}
                        onChange={(event) =>
                          onUpdateGuardrails({
                            rateLimit: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4 mt-4">
                    <label className="toggle-row">
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={appSettings.guardrails.piiRedaction}
                          onChange={(event) =>
                            onUpdateGuardrails({
                              piiRedaction: event.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </div>
                      Redact sensitive values from captured traffic
                    </label>

                    <label className="toggle-row">
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={appSettings.guardrails.captureBodies}
                          onChange={(event) =>
                            onUpdateGuardrails({
                              captureBodies: event.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </div>
                      Capture request and response bodies
                    </label>

                    <label className="toggle-row">
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={appSettings.guardrails.autoUpdateSwagger}
                          onChange={(event) =>
                            onUpdateGuardrails({
                              autoUpdateSwagger: event.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </div>
                      Auto-update Swagger when requests or saved tests change
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Custom Domains */}
          {activeSection === 'domains' && (
            <section className="space-y-6">
              <h2 className="font-headline-md text-headline-md border-b border-outline-variant/30 pb-4">Custom Domains</h2>
              
              <div className="space-y-6">
                <div className="domain-intro">
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    Configure custom subdomains or apex domains for local relay proxying and cloud tunnel routing.
                  </p>
                </div>
                
                <form
                  className="flex items-center gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (domainDraft.trim() && busyDomainId !== 'new') {
                      onAddDomain();
                    }
                  }}
                >
                  <input
                    className="form-input flex-1"
                    value={domainDraft}
                    onChange={(event) => onDomainDraftChange(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && domainDraft.trim() && busyDomainId !== 'new') {
                        e.preventDefault();
                        onAddDomain();
                      }
                    }}
                    placeholder="demo.example.com"
                  />
                  <button
                    type="submit"
                    className="btn-primary cursor-pointer shrink-0 h-[42px] px-5 flex items-center justify-center"
                    disabled={busyDomainId === 'new' || !domainDraft.trim()}
                  >
                    {busyDomainId === 'new' ? 'Adding...' : 'Add Domain'}
                  </button>
                </form>

                {loadingDomains ? (
                  <div className="settings-empty text-center p-6">Loading domains...</div>
                ) : (domains || []).length === 0 ? (
                  <div className="settings-empty text-center p-6 bg-surface-container rounded-xl border border-outline-variant/30 text-on-surface-variant text-xs">
                    No domains added yet. Start by adding a subdomain or apex domain you control.
                  </div>
                ) : (
                  <div className="space-y-4">
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

                      return (
                        <article key={domain.id} className="bg-surface-container border border-outline-variant p-6 rounded-xl flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <strong className="text-base text-on-surface">{domain.name}</strong>
                              <small className={`block mt-1 text-xs font-semibold ${domain.verified ? 'text-primary' : 'text-tertiary'}`}>
                                {domain.verified ? '✓ Ownership Verified' : '⚡ Pending verification'}
                              </small>
                            </div>
                            <span className={`badge ${domain.verified ? 'accent' : 'muted'}`}>
                              {domain.verified ? 'Live' : 'Pending'}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {!domain.verified && (
                              <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface-variant leading-relaxed">
                                💡 <strong>Registrar Tip:</strong> Namesilo/GoDaddy automatically suffixes your domain. Enter only the bold Host prefix into your registrar inputs.
                              </div>
                            )}
                            
                            <div className="dns-table-wrapper">
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
                                  {!domain.verified && (
                                    <tr>
                                      <td>
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1">
                                            <code className="font-bold font-mono bg-surface-container-lowest border border-outline-variant/30 px-2 py-0.5 rounded text-[11px] text-on-surface">{relativeTxtHost}</code>
                                            <span className="text-[11px] text-on-surface-variant">.{apexDomain}</span>
                                          </div>
                                          <span className="text-[10px] text-on-surface-variant/70">Full: {fullTxtHost}</span>
                                        </div>
                                      </td>
                                      <td><span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-secondary/10 text-secondary border border-secondary/20">TXT</span></td>
                                      <td><code className="text-xs font-mono select-all text-on-surface bg-surface-container-lowest px-2 py-1 rounded border border-outline-variant/20">proxync-verification={domain.verificationToken}</code></td>
                                      <td><span className="text-xs font-mono text-on-surface-variant">30 min</span></td>
                                      <td>
                                        <div className="flex items-center gap-1.5">
                                          <button className="btn-secondary compact text-[11px] px-2 py-1 cursor-pointer" onClick={() => copyVal(relativeTxtHost)}>Host</button>
                                          <button className="btn-secondary compact text-[11px] px-2 py-1 cursor-pointer" onClick={() => copyVal(`proxync-verification=${domain.verificationToken}`)}>Value</button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td>
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1">
                                          <code className="font-bold font-mono bg-surface-container-lowest border border-outline-variant/30 px-2 py-0.5 rounded text-[11px] text-on-surface">{relativeTrafficHost}</code>
                                          {relativeTrafficHost !== '@' && (
                                            <span className="text-[11px] text-on-surface-variant">.{apexDomain}</span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant/70">Full: {domain.name}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-primary/10 text-primary border border-primary/20">
                                        {isSub || domain.name !== apexDomain ? 'CNAME' : 'A'}
                                      </span>
                                    </td>
                                    <td><code className="text-xs font-mono select-all text-on-surface bg-surface-container-lowest px-2 py-1 rounded border border-outline-variant/20">{routingValue}</code></td>
                                    <td><span className="text-xs font-mono text-on-surface-variant">30 min</span></td>
                                    <td>
                                      <div className="flex items-center gap-1.5">
                                        <button className="btn-secondary compact text-[11px] px-2 py-1 cursor-pointer" onClick={() => copyVal(relativeTrafficHost)}>Host</button>
                                        <button className="btn-secondary compact text-[11px] px-2 py-1 cursor-pointer" onClick={() => copyVal(routingValue)}>Value</button>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                            <button
                              className="btn-primary compact cursor-pointer px-4 py-2 text-xs"
                              onClick={() => onVerifyDomain(domain.id)}
                              disabled={busyDomainId === domain.id}
                            >
                              {busyDomainId === domain.id ? 'Verifying...' : domain.verified ? '✓ Re-verify' : 'Verify Domain'}
                            </button>
                            <button
                              className="btn-danger compact cursor-pointer px-3 py-1.5 text-xs"
                              onClick={() => onRemoveDomain(domain.id)}
                              disabled={busyDomainId === domain.id}
                            >
                              Remove Domain
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Danger Zone & Global Notes */}
          {activeSection === 'danger' && (
            <section className="space-y-6">
              <h2 className="font-headline-md text-headline-md border-b border-error pb-4 text-error">Danger Zone</h2>

              <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">Global App Notes</h3>
                <p className="text-xs text-on-surface-variant">Keep general engine credentials, webhook addresses, or handoff comments here.</p>
                <textarea
                  className="form-textarea w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs placeholder:text-outline text-on-surface focus:outline-none focus:border-primary resize-y"
                  value={appSettings.notes}
                  onChange={(event) => onUpdateAppNotes(event.target.value)}
                  placeholder="Keep app-wide notes or default credentials..."
                  style={{ minHeight: '120px' }}
                />
              </div>

              <div className="flex items-center justify-between p-5 bg-surface-container rounded-xl border border-outline-variant/30">
                <div>
                  <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">Developer Inspect Tools</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Enable browser right-click Inspect Element & DOM debugging tools.</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={!!appSettings.enableDevTools}
                    onChange={(e) => {
                      if (onUpdateEnableDevTools) onUpdateEnableDevTools(e.target.checked);
                      showToast(
                        e.target.checked
                          ? 'Developer Inspect Tools enabled'
                          : 'Developer Inspect Tools disabled',
                        'info'
                      );
                    }}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">bug_report</span>
                    <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">Pro Debugger & Dual-Stream Logging</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        appSettings.appLogging !== false || appSettings.trafficLogging
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                      }`}
                    >
                      {appSettings.appLogging !== false || appSettings.trafficLogging ? 'DISK LOGGING ACTIVE' : 'LOGGING PAUSED'}
                    </span>
                  </div>
                </div>

                {/* Stream Controls Grid: App Logs (Default ON) & Traffic Logs (Default OFF) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Stream 1: Application Logs */}
                  <div className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-cyan-400 text-[18px]">description</span>
                          <span className="text-xs font-bold text-on-surface">Application Diagnostics</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={appSettings.appLogging !== false}
                            onChange={(e) => {
                              if (onUpdateAppLogging) onUpdateAppLogging(e.target.checked);
                            }}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed min-h-[34px]">
                        Engine lifecycle, recon port scans, proxy binds, tunnel spawn/close, and subprocess crashes.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-outline-variant/20">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          appSettings.appLogging !== false
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-surface-container-high text-outline border border-outline-variant/30'
                        }`}
                      >
                        {appSettings.appLogging !== false ? '● Enabled (Default)' : '○ Disabled'}
                      </span>
                      <span className="text-[11px] font-mono text-on-surface font-semibold">
                        app.log: {logsSummary ? formatBytes(logsSummary.app_log_bytes) : '0 B'}
                      </span>
                    </div>
                  </div>

                  {/* Stream 2: Traffic Logs */}
                  <div className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-amber-400 text-[18px]">swap_horiz</span>
                          <span className="text-xs font-bold text-on-surface">Traffic Stream & Payloads</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={!!appSettings.trafficLogging}
                            onChange={(e) => {
                              if (onUpdateTrafficLogging) onUpdateTrafficLogging(e.target.checked);
                            }}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed min-h-[34px]">
                        Full HTTP request/response payloads, headers, latency measurements, and tunnel interception.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-outline-variant/20">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          appSettings.trafficLogging
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-surface-container-high text-outline border border-outline-variant/30'
                        }`}
                      >
                        {appSettings.trafficLogging ? '● Active • Recording' : '○ Disabled (Default)'}
                      </span>
                      <span className="text-[11px] font-mono text-on-surface font-semibold">
                        traffic.log: {logsSummary ? formatBytes(logsSummary.traffic_log_bytes) : '0 B'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Local Storage Information */}
                <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="material-symbols-outlined text-outline text-[18px] shrink-0">folder_open</span>
                    <span className="text-[11px] font-mono text-on-surface-variant truncate select-all px-2 py-1 bg-surface-container/60 border border-outline-variant/20 rounded-md flex-1" title={logsSummary?.logs_dir}>
                      {logsSummary?.logs_dir || '%APPDATA%\\Proxync\\logs\\'}
                    </span>
                  </div>
                  <button
                    className="btn-secondary compact text-xs flex items-center gap-1.5 cursor-pointer shrink-0 py-1.5 px-3"
                    onClick={() => {
                      if (logsSummary?.logs_dir) {
                        navigator.clipboard.writeText(logsSummary.logs_dir);
                        showToast('Logs folder path copied to clipboard', 'success');
                      }
                    }}
                    title="Copy logs folder path"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    Copy Path
                  </button>
                </div>

                {/* 1-Click Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="btn-secondary compact text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3"
                      onClick={() => {
                        void openLogsFolder();
                        showToast('Opening logs directory in File Explorer...', 'info');
                      }}
                    >
                      <span className="material-symbols-outlined text-[15px]">folder_open</span>
                      Open Logs Folder
                    </button>

                    <button
                      className="btn-primary compact text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3.5"
                      onClick={() => {
                        exportSupportBundle({
                          settings: appSettings,
                          activeWorkspace: workspace,
                          activeTunnel,
                          activeTunnels: tunnels.filter((t) => t.status === 'ACTIVE').map((t) => ({
                            id: t.id,
                            publicUrl: t.publicUrl,
                            localPort: t.localPort,
                            subdomain: t.subdomain,
                            status: t.status,
                          })),
                          discoveredProcesses: processes.map((p) => ({
                            name: p.name,
                            port: p.port,
                            command: p.command,
                            framework: p.framework,
                            directory: p.directory,
                            executable: p.executable,
                          })),
                        });
                        showToast('Support diagnostic bundle downloaded (JSON)', 'success');
                      }}
                    >
                      <span className="material-symbols-outlined text-[15px]">archive</span>
                      Export Support Bundle
                    </button>
                  </div>

                  <button
                    className="btn-danger compact text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3"
                    onClick={async () => {
                      await clearLogs();
                      const updated = await readLogsSummary();
                      setLogsSummary(updated);
                      showToast('App and traffic logs cleared', 'info');
                    }}
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                    Clear Disk Logs
                  </button>
                </div>
              </div>

              <div className="p-5 bg-error/5 border border-error/20 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-body-lg text-body-lg text-error font-semibold">Purge Engine Data</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Clears all locally saved workspaces, process history, and credentials.</p>
                </div>
                <button
                  className="btn-danger cursor-pointer"
                  onClick={() => setShowPurgeConfirm(true)}
                >
                  Purge All Data
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {showPurgeConfirm && (
        <ConfirmPurgeDialog
          onClose={() => setShowPurgeConfirm(false)}
          onConfirm={async () => {
            try {
              await clearLogs();
            } catch (err) {
              console.error('Failed to clear logs on purge:', err);
            }
            localStorage.clear();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
