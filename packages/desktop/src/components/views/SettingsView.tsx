import { useState, useEffect } from 'react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import type { WorkspaceConfig, AppSettings, DomainRecord, Guardrails } from './SharedComponents';
import { showToast } from '../../lib/toast';

export function SettingsView({
  workspace,
  appSettings,
  domains,
  domainDraft,
  loadingDomains,
  busyDomainId,
  scanningProject,
  onUpdateGuardrails,
  onUpdateAppNotes,
  onUpdateProjectRootPath,
  onScanProjectFolder,
  onDomainDraftChange,
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
  onUpdateTheme,
  initialSection = 'general',
}: {
  workspace: WorkspaceConfig | null;
  appSettings: AppSettings;
  domains: DomainRecord[];
  domainDraft: string;
  loadingDomains: boolean;
  busyDomainId: string | null;
  scanningProject: boolean;
  onUpdateGuardrails: (patch: Partial<Guardrails>) => void;
  onUpdateAppNotes: (notes: string) => void;
  onUpdateProjectRootPath: (projectRootPath: string) => void;
  onScanProjectFolder: () => void;
  onDomainDraftChange: (value: string) => void;
  onAddDomain: () => void;
  onVerifyDomain: (domainId: string) => void;
  onRemoveDomain: (domainId: string) => void;
  onUpdateTheme: (theme: string) => void;
  initialSection?: 'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger';
}) {
  const [activeSection, setActiveSection] = useState<'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger'>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [autostart, setAutostart] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [telemetry, setTelemetry] = useState<'enhanced' | 'basic'>('enhanced');

  useEffect(() => {
    isEnabled()
      .then((enabled) => setAutostart(enabled))
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
    <div className="max-w-5xl mx-auto space-y-8 fade-in select-none">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8 border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Settings</h1>
          <p className="text-on-surface-variant font-body-md mt-1">Manage your engine configuration and security credentials.</p>
        </div>

      </div>

      {/* Settings Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Settings Tab Sidebar */}
        <div className="flex flex-col gap-1 md:col-span-1">
          <button
            onClick={() => setActiveSection('general')}
            className={`text-left px-3 py-2.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
              activeSection === 'general'
                ? 'bg-surface-container-high text-primary border-l-2 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveSection('networking')}
            className={`text-left px-3 py-2.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
              activeSection === 'networking'
                ? 'bg-surface-container-high text-primary border-l-2 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Networking
          </button>
          <button
            onClick={() => setActiveSection('account')}
            className={`text-left px-3 py-2.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
              activeSection === 'account'
                ? 'bg-surface-container-high text-primary border-l-2 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`text-left px-3 py-2.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
              activeSection === 'security'
                ? 'bg-surface-container-high text-primary border-l-2 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Security (Guardrails)
          </button>
          <button
            onClick={() => setActiveSection('domains')}
            className={`text-left px-3 py-2.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
              activeSection === 'domains'
                ? 'bg-surface-container-high text-primary border-l-2 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Custom Domains
          </button>
          <button
            onClick={() => setActiveSection('danger')}
            className={`text-left px-3 py-2.5 rounded font-label-md text-label-md cursor-pointer transition-all ${
              activeSection === 'danger'
                ? 'bg-surface-container-high text-error border-l-2 border-error'
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
                    checked={autoUpdate}
                    onChange={(e) => setAutoUpdate(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/30 space-y-4">
                <p className="font-body-lg text-body-lg text-on-surface">Telemetry</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="telemetry"
                      className="mt-1 bg-surface border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                      checked={telemetry === 'enhanced'}
                      onChange={() => setTelemetry('enhanced')}
                    />
                    <div>
                      <p className="text-on-surface font-label-md">Enhanced (Recommended)</p>
                      <p className="text-on-surface-variant text-[12px]">Send performance and crash data to improve the platform.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="telemetry"
                      className="mt-1 bg-surface border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                      checked={telemetry === 'basic'}
                      onChange={() => setTelemetry('basic')}
                    />
                    <div>
                      <p className="text-on-surface font-label-md">Basic</p>
                      <p className="text-on-surface-variant text-[12px]">Only send critical failure logs.</p>
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
              <h2 className="font-headline-md text-headline-md border-b border-outline-variant/30 pb-4">Account</h2>
              
              <div className="p-5 bg-primary-container/10 border-l-4 border-primary rounded-r-xl flex gap-4 mt-6">
                <span className="material-symbols-outlined text-primary shrink-0 text-[24px]">cloud_queue</span>
                <div>
                  <h4 className="font-body-lg font-bold text-on-surface text-sm mb-1">Coming Soon</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Next release will be there, stay tuned!
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Security & Guardrails */}
          {activeSection === 'security' && (
            <section className="space-y-6">
              <h2 className="font-headline-md text-headline-md border-b border-outline-variant/30 pb-4">Security & Guardrails</h2>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">Active API Tokens</h3>
                  </div>
                  <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full overflow-hidden">
                      <span className="material-symbols-outlined text-outline shrink-0">key</span>
                      <code className="text-xs text-primary font-mono truncate select-all">
                        px_live_a7f293b8e4c1902...
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyVal('px_live_a7f293b8e4c1902...')}
                        className="btn-ghost compact cursor-pointer hover:bg-surface-container-highest rounded"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                  <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">Workspace Guardrails</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-on-surface-variant block">Auth mode</label>
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
                      <label className="font-label-md text-label-md text-on-surface-variant block">Rate limit</label>
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
                
                <div className="flex gap-3">
                  <input
                    className="form-input"
                    value={domainDraft}
                    onChange={(event) => onDomainDraftChange(event.target.value)}
                    placeholder="demo.example.com"
                  />
                  <button
                    className="btn-primary cursor-pointer"
                    onClick={onAddDomain}
                    disabled={busyDomainId === 'new' || !domainDraft.trim()}
                  >
                    {busyDomainId === 'new' ? 'Adding...' : 'Add Domain'}
                  </button>
                </div>

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
                            
                            <div className="overflow-x-auto border border-outline-variant/30 rounded-lg">
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
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-1.5">
                                            <code className="font-bold font-mono bg-surface-container-lowest border border-outline-variant/20 px-1.5 py-0.5 rounded text-[11px]">{relativeTxtHost}</code>
                                            <span className="text-[11px] text-outline">.{apexDomain}</span>
                                          </div>
                                          <span className="text-[10px] text-outline mt-0.5">Full: {fullTxtHost}</span>
                                        </div>
                                      </td>
                                      <td><span className="badge muted">TXT</span></td>
                                      <td><code className="text-xs font-mono select-all">proxync-verification={domain.verificationToken}</code></td>
                                      <td>30 min</td>
                                      <td>
                                        <div className="flex gap-2.5">
                                          <button className="btn-ghost compact cursor-pointer" onClick={() => copyVal(relativeTxtHost)}>Host</button>
                                          <button className="btn-ghost compact cursor-pointer" onClick={() => copyVal(`proxync-verification=${domain.verificationToken}`)}>Value</button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td>
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                          <code className="font-bold font-mono bg-surface-container-lowest border border-outline-variant/20 px-1.5 py-0.5 rounded text-[11px]">{relativeTrafficHost}</code>
                                          {relativeTrafficHost !== '@' && (
                                            <span className="text-[11px] text-outline">.{apexDomain}</span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-outline mt-0.5">Full: {domain.name}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="badge muted" style={{ background: 'rgba(192, 193, 255, 0.1)', color: 'var(--color-primary)' }}>
                                        {isSub || domain.name !== apexDomain ? 'CNAME' : 'A'}
                                      </span>
                                    </td>
                                    <td><code className="text-xs font-mono select-all">{routingValue}</code></td>
                                    <td>30 min</td>
                                    <td>
                                      <div className="flex gap-2.5">
                                        <button className="btn-ghost compact cursor-pointer" onClick={() => copyVal(relativeTrafficHost)}>Host</button>
                                        <button className="btn-ghost compact cursor-pointer" onClick={() => copyVal(routingValue)}>Value</button>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              className="btn-primary compact"
                              onClick={() => onVerifyDomain(domain.id)}
                              disabled={busyDomainId === domain.id}
                            >
                              {busyDomainId === domain.id ? 'Working...' : 'Verify'}
                            </button>
                            <button
                              className="btn-ghost compact cursor-pointer"
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

              <div className="p-5 bg-error/5 border border-error/20 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-body-lg text-body-lg text-error font-semibold">Purge Engine Data</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Clears all locally saved workspaces, process history, and credentials.</p>
                </div>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all Proxync app data? This action is permanent.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  Purge All Data
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
