import { useState, useEffect } from 'react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import type { WorkspaceConfig, AppSettings, DomainRecord, Guardrails, Tunnel, ProcessCandidate } from './SharedComponents';
import { showToast } from '../../lib/toast';
import { ConfirmPurgeDialog } from './Dialogs';
import { api, openDashboard, type AuthUser, type ConnectedProvider } from '../../lib/api';
import {
  readLogsSummary,
  openLogsFolder,
  clearLogs,
  exportSupportBundle,
  type LogsSummary,
} from '../../lib/logger';
import {
  checkCliStatus,
  installCliToPath,
  uninstallCliFromPath,
  type CliStatus,
} from '../../lib/cliInstaller';


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
  onCheckForUpdates,
  checkingUpdates = false,
  appVersion = 'v0.2.4',
  initialSection = 'general',
  currentUser = null,
  onSignIn,
  onSignOut,
  onUpdateUser,
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
  onCheckForUpdates?: () => void;
  checkingUpdates?: boolean;
  appVersion?: string;
  initialSection?: 'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger';
  currentUser?: AuthUser | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onUpdateUser?: (updated: AuthUser) => void;
  authStatus?: 'idle' | 'awaiting_approval';
}) {
  const [activeSection, setActiveSection] = useState<'general' | 'networking' | 'account' | 'security' | 'domains' | 'danger'>(initialSection);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [logsSummary, setLogsSummary] = useState<LogsSummary | null>(null);
  const [cliStatus, setCliStatus] = useState<CliStatus | null>(null);
  const [cliBusy, setCliBusy] = useState(false);

  // Account profile & password editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(currentUser?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic connected authentication providers state
  const [providers, setProviders] = useState<ConnectedProvider[]>(() => {
    if (currentUser?.providers && currentUser.providers.length > 0) {
      return currentUser.providers;
    }
    return [
      {
        id: 'local',
        name: 'Email & Password',
        type: 'credentials',
        connected: Boolean(currentUser?.hasPassword !== false),
        enabled: true,
        identifier: currentUser?.email || null,
        status: currentUser?.hasPassword !== false ? 'connected' : 'not_connected',
        badge: currentUser?.hasPassword !== false ? 'Active' : 'Not Linked',
        description: 'Primary email & password credential',
      },
      {
        id: 'google',
        name: 'Google',
        type: 'oauth',
        connected: Boolean(currentUser?.googleConnected || currentUser?.authProvider === 'GOOGLE'),
        enabled: true,
        identifier: (currentUser?.googleConnected || currentUser?.authProvider === 'GOOGLE') ? currentUser?.email || null : null,
        status: (currentUser?.googleConnected || currentUser?.authProvider === 'GOOGLE') ? 'connected' : 'not_connected',
        badge: (currentUser?.googleConnected || currentUser?.authProvider === 'GOOGLE') ? 'Connected' : 'Not Linked',
        description: 'Connect your Google account for 1-click login',
        connectUrl: '/api/v1/auth/google',
      },
    ];
  });
  const fetchConnectedProviders = async () => {
    if (!currentUser) return;
    try {
      const list = await api.auth.getProviders();
      if (Array.isArray(list) && list.length > 0) {
        setProviders(list);
      }
    } catch (err) {
      console.warn('Failed to fetch dynamic providers:', err);
    }
  };

  useEffect(() => {
    if (currentUser && activeSection === 'account') {
      fetchConnectedProviders();
    }
  }, [currentUser?.id, activeSection]);

  // Real-time password criteria calculations
  const hasMinLength = newPassword.length >= 6;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const hasUpperAndLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);

  const passwordStrength = !newPassword
    ? 0
    : (hasMinLength ? 1 : 0) + ((hasMinLength && (hasNumberOrSymbol || hasUpperAndLower)) ? 1 : 0) + ((newPassword.length >= 10 && hasNumberOrSymbol && hasUpperAndLower) ? 1 : 0);

  const strengthLabels = ['Too short', 'Basic', 'Good', 'Strong'];
  const strengthColors = ['bg-outline/30', 'bg-error', 'bg-amber-400', 'bg-emerald-400'];

  useEffect(() => {
    if (currentUser?.name) {
      setNameDraft(currentUser.name);
    }
  }, [currentUser?.name]);

  const handleUpdateUsername = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      showToast('Username cannot be empty', 'warning');
      return;
    }
    setSavingName(true);
    try {
      const updated = await api.auth.updateProfile(trimmed);
      if (onUpdateUser) onUpdateUser(updated);
      showToast(`Username updated to "${trimmed}"`, 'success');
      setIsEditingName(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update username', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);
    if (!newPassword || newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters';
      setPasswordStatusMsg({ type: 'error', text: msg });
      showToast(msg, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation do not match';
      setPasswordStatusMsg({ type: 'error', text: msg });
      showToast(msg, 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await api.auth.changePassword(currentPassword, newPassword);
      const msg = res.message || 'Password updated successfully!';
      setPasswordStatusMsg({ type: 'success', text: msg });
      showToast(msg, 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchConnectedProviders();
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password';
      setPasswordStatusMsg({ type: 'error', text: msg });
      showToast(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (activeSection === 'danger') {
      readLogsSummary().then(setLogsSummary).catch(() => {});
    } else if (activeSection === 'general') {
      checkCliStatus().then(setCliStatus).catch(() => {});
    }
  }, [activeSection, appSettings.debugLogging]);

  const handleInstallCli = async () => {
    setCliBusy(true);
    try {
      const msg = await installCliToPath();
      showToast(msg, 'success');
      const updated = await checkCliStatus();
      setCliStatus(updated);
    } catch (err: any) {
      showToast(err?.message || String(err), 'error');
    } finally {
      setCliBusy(false);
    }
  };

  const handleUninstallCli = async () => {
    setCliBusy(true);
    try {
      const msg = await uninstallCliFromPath();
      showToast(msg, 'info');
      const updated = await checkCliStatus();
      setCliStatus(updated);
    } catch (err: any) {
      showToast(err?.message || String(err), 'error');
    } finally {
      setCliBusy(false);
    }
  };

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

              <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
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
                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    Current Version: <code className="px-1.5 py-0.5 rounded bg-surface-container-high font-mono text-[11px] text-on-surface">{appVersion}</code>
                  </span>
                  {onCheckForUpdates && (
                    <button
                      type="button"
                      disabled={checkingUpdates}
                      onClick={() => onCheckForUpdates()}
                      className="px-3 py-1 rounded-lg bg-surface-container-high hover:bg-primary/20 text-primary border border-outline-variant/40 font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${checkingUpdates ? 'animate-spin' : ''}`}>
                        {checkingUpdates ? 'sync' : 'update'}
                      </span>
                      <span>{checkingUpdates ? 'Checking...' : 'Check for updates'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Terminal Companion (CLI) */}
              <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-body-lg text-body-lg text-on-surface">Terminal Companion (CLI)</p>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border border-primary/30 bg-primary/10 text-primary">
                        proxync
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-[13px] mt-0.5">
                      Run public tunnels, port scans, and HTTP traffic interception directly from your shell.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cliStatus?.is_installed ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        In PATH
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Not in PATH
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5 truncate max-w-md">
                    Location: <code className="px-1.5 py-0.5 rounded bg-surface-container-high font-mono text-[11px] text-on-surface truncate">
                      {cliStatus?.is_installed ? (cliStatus.binary_path || cliStatus.install_dir) : (cliStatus?.install_dir ? `Target: ${cliStatus.install_dir}` : 'Not installed')}
                    </code>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={cliBusy}
                      onClick={handleInstallCli}
                      className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 text-xs"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${cliBusy ? 'animate-spin' : ''}`}>
                        {cliBusy ? 'sync' : (cliStatus?.is_installed ? 'refresh' : 'download')}
                      </span>
                      <span>{cliStatus?.is_installed ? 'Reinstall to PATH' : 'Install to PATH'}</span>
                    </button>
                    {cliStatus?.is_installed && (
                      <button
                        type="button"
                        disabled={cliBusy}
                        onClick={handleUninstallCli}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-error/20 text-on-surface-variant hover:text-error border border-outline-variant/30 font-medium transition-colors cursor-pointer text-xs disabled:opacity-50"
                        title="Remove CLI binary and unlink from PATH"
                      >
                        Uninstall
                      </button>
                    )}
                  </div>
                </div>
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
                    { id: 'dark', name: 'Obsidian Dark', colors: ['bg-[#0d1117]', 'bg-[#38bdf8]', 'bg-[#0284c7]'] },
                    { id: 'slate', name: 'Midnight Slate', colors: ['bg-[#0b1326]', 'bg-[#c0c1ff]', 'bg-[#89ceff]'] },
                    { id: 'emerald', name: 'Deep Emerald', colors: ['bg-[#031411]', 'bg-[#10b981]', 'bg-[#34d399]'] },
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
                      placeholder="e.g. /path/to/project"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-4">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Account</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Manage your personal profile, active subscription plan, and cloud connectivity.</p>
                </div>
                {currentUser && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Authenticated Session</span>
                    </span>
                  </div>
                )}
              </div>

              {currentUser ? (
                <>
                  {/* User Profile Card */}
                  <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Circular Avatar with Online Status Dot */}
                        <div className="w-14 h-14 rounded-full bg-[#1e293b] text-white flex items-center justify-center text-xl font-bold shrink-0 relative select-none border border-outline-variant/40 shadow-sm">
                          <span className="leading-none">{currentUser.name.charAt(0).toUpperCase()}</span>
                          <span
                            className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#10b981] ring-2 ring-surface-container"
                            title="Online"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {isEditingName ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={nameDraft}
                                  onChange={(e) => setNameDraft(e.target.value)}
                                  className="px-2.5 py-1 text-sm font-semibold text-on-surface bg-surface-container-high border border-primary/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-56"
                                  placeholder="Your name"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={savingName}
                                  onClick={handleUpdateUsername}
                                  className="btn-primary compact text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  {savingName ? (
                                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                  )}
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={savingName}
                                  onClick={() => {
                                    setNameDraft(currentUser.name);
                                    setIsEditingName(false);
                                  }}
                                  className="btn-secondary compact text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface leading-tight">
                                  {currentUser.name}
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNameDraft(currentUser.name);
                                    setIsEditingName(true);
                                  }}
                                  className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                                  title="Change username"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                              </>
                            )}
                            {/* Blue PRO pill with Crown Icon */}
                            {currentUser.role === 'PRO' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] bg-[#0c2a4a]/80 text-[#38bdf8] text-[11px] font-bold tracking-wider uppercase leading-none border border-[#0284c7]/25 select-none">
                                <svg width="11" height="10" viewBox="0 0 24 20" fill="currentColor" className="shrink-0 -mt-px">
                                  <path d="M2 4l4.5 3.5L12 1.5l5.5 6L22 4v10.5H2V4zm0 13h20v2.5H2V17z" />
                                </svg>
                                <span>PRO</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[5px] bg-surface-container-high text-on-surface-variant text-[11px] font-semibold border border-outline-variant/30">
                                <span>{currentUser.role || 'FREE'}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-outline">mail</span>
                            <span>{currentUser.email}</span>
                          </p>
                        </div>
                      </div>

                      {/* Log Out Button */}
                      {onSignOut && (
                        <button
                          type="button"
                          onClick={onSignOut}
                          className="px-3.5 py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error border border-error/20 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">logout</span>
                          <span>Log Out</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px]">
                        <span className="material-symbols-outlined text-[14px] text-emerald-400">verified_user</span>
                        <span>Direct Cloud Tunnel Session Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Accounts & Authentication Providers */}
                  {(() => {
                    const isGoogleConnected = Boolean(
                      currentUser.authProvider === 'GOOGLE' ||
                      currentUser.googleConnected ||
                      providers.find((p) => p.id === 'google')?.connected
                    );
                    const isGitHubConnected = Boolean(
                      currentUser.authProvider === 'GITHUB' ||
                      currentUser.githubConnected ||
                      providers.find((p) => p.id === 'github')?.connected
                    );

                    return (
                      <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px]">vpn_key</span>
                          </div>
                          <div>
                            <h3 className="font-body-lg text-body-lg text-on-surface font-bold">Connected Authentication Providers</h3>
                            <p className="text-xs text-on-surface-variant mt-0.5">Manage identity providers linked to your Proxync account.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-outline-variant/20">
                          {/* Google Auth */}
                          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
                                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.41 7.36 24 12 24z"/>
                                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.27 2.59 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                                </svg>
                                <span className="font-semibold text-xs text-on-surface">Google</span>
                              </div>
                              {isGoogleConnected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Connected</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-medium border border-outline-variant/30">
                                  Not Linked
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-on-surface-variant truncate">
                              {isGoogleConnected
                                ? currentUser.email
                                : 'Sign in with your Google account'}
                            </p>
                          </div>

                          {/* GitHub Auth */}
                          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-on-surface">
                                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                                </svg>
                                <span className="font-semibold text-xs text-on-surface">GitHub</span>
                              </div>
                              {isGitHubConnected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Connected</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-medium border border-outline-variant/30">
                                  Available Soon
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-on-surface-variant truncate">
                              {isGitHubConnected
                                ? 'Linked GitHub Account'
                                : 'Link your GitHub for code syncing'}
                            </p>
                          </div>

                          {/* Email / Local Auth */}
                          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-[20px] text-primary">mail</span>
                                <span className="font-semibold text-xs text-on-surface">Email & Password</span>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Active</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant truncate">
                              {currentUser.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Redesigned Security & Password Card */}
                  <div
                    id="security-password-section"
                    className="p-5 sm:p-6 bg-surface-container border border-outline-variant/30 rounded-xl space-y-5 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/20">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 text-primary flex items-center justify-center shadow-inner shrink-0">
                          <span className="material-symbols-outlined text-[24px]">lock_reset</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface leading-tight">
                              Security & Password
                            </h3>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {currentUser.hasPassword !== false
                              ? 'Manage and update your account login password.'
                              : 'Set up an account password to enable direct email & password authentication alongside Google.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inline Status Message */}
                    {passwordStatusMsg && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                          passwordStatusMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-error/10 border-error/30 text-error'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            {passwordStatusMsg.type === 'success' ? 'check_circle' : 'error'}
                          </span>
                          <span className="font-medium">{passwordStatusMsg.text}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPasswordStatusMsg(null)}
                          className="text-on-surface-variant hover:text-on-surface cursor-pointer text-xs p-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
                      {/* Current Password Field */}
                      {currentUser.hasPassword !== false && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-semibold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-outline">key</span>
                              Current Password
                            </label>
                            <span className="text-[11px] text-on-surface-variant">Required for verification</span>
                          </div>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                if (passwordStatusMsg) setPasswordStatusMsg(null);
                              }}
                              placeholder="Enter current password"
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all pr-10 font-mono"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                              tabIndex={-1}
                              title={showCurrentPassword ? 'Hide password' : 'Show password'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {showCurrentPassword ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* New Password & Confirm Password Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* New Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-outline">lock</span>
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (passwordStatusMsg) setPasswordStatusMsg(null);
                              }}
                              placeholder="Min. 6 characters"
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all pr-10 font-mono"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                              tabIndex={-1}
                              title={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {showNewPassword ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-outline">verified</span>
                            Confirm Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (passwordStatusMsg) setPasswordStatusMsg(null);
                              }}
                              placeholder="Re-enter new password"
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all pr-10 font-mono"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                              tabIndex={-1}
                              title={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {showConfirmPassword ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Strength & Quality Checklist */}
                      {newPassword.length > 0 && (
                        <div className="p-3 bg-surface-container-low/70 rounded-xl border border-outline-variant/20 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-on-surface-variant font-medium">Password Strength:</span>
                            <span
                              className={`font-semibold ${
                                passwordStrength >= 2
                                  ? 'text-emerald-400'
                                  : passwordStrength === 1
                                  ? 'text-amber-400'
                                  : 'text-error'
                              }`}
                            >
                              {strengthLabels[passwordStrength]}
                            </span>
                          </div>
                          {/* Strength Meter Bar */}
                          <div className="grid grid-cols-3 gap-1.5 h-1.5">
                            <div
                              className={`rounded-full transition-colors ${
                                passwordStrength >= 1 ? strengthColors[passwordStrength] : 'bg-outline-variant/30'
                              }`}
                            />
                            <div
                              className={`rounded-full transition-colors ${
                                passwordStrength >= 2 ? strengthColors[passwordStrength] : 'bg-outline-variant/30'
                              }`}
                            />
                            <div
                              className={`rounded-full transition-colors ${
                                passwordStrength >= 3 ? strengthColors[passwordStrength] : 'bg-outline-variant/30'
                              }`}
                            />
                          </div>
                          {/* Validation Criteria Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
                                hasMinLength
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {hasMinLength ? 'check' : 'close'}
                              </span>
                              At least 6 characters
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
                                passwordsMatch
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {passwordsMatch ? 'check' : 'close'}
                              </span>
                              {passwordsMatch ? 'Passwords match' : 'Passwords must match'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="submit"
                            disabled={
                              savingPassword ||
                              !hasMinLength ||
                              !passwordsMatch ||
                              (currentUser.hasPassword !== false && !currentPassword)
                            }
                            className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary/20 hover:shadow-primary/30 transition-all"
                          >
                            {savingPassword ? (
                              <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                            ) : (
                              <span className="material-symbols-outlined text-[15px]">lock</span>
                            )}
                            <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
                          </button>

                          {(currentPassword || newPassword || confirmPassword) && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                                setPasswordStatusMsg(null);
                              }}
                              className="btn-secondary px-3.5 py-2 text-xs rounded-xl cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Subscription & Plan Status Card */}
                  <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-body-lg text-body-lg text-on-surface font-bold">
                              {currentUser.role === 'PRO' ? 'Proxync Pro Tier' : 'Proxync Community Edition'}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              currentUser.role === 'PRO' 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                            }`}>
                              {currentUser.role === 'PRO' ? 'Active Subscription' : 'Free Tier'}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {currentUser.role === 'PRO' 
                              ? 'All developer and cloud relay features unlocked on this machine.'
                              : 'Basic local developer mode active. Upgrade to unlock full edge tunnels and custom subdomains.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openDashboard('billing')}
                        className="btn-primary compact text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">credit_card</span>
                        <span>{currentUser.role === 'PRO' ? 'Manage Billing' : 'Upgrade to Pro'}</span>
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20 text-xs">
                      <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                        <span className="text-on-surface font-medium">Unlimited Native SSH Tunnels</span>
                      </div>
                      <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                        <span className="text-on-surface font-medium">Verified Custom Domains & Subdomains</span>
                      </div>
                      <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                        <span className="text-on-surface font-medium">Low-Latency Global Edge Relays</span>
                      </div>
                      <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                        <span className="text-on-surface font-medium">360° Workbench & Traffic Inspection</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Unauthenticated / Sign-in CTA Card */
                <div className="p-6 bg-surface-container border border-outline-variant/30 rounded-xl space-y-5 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[28px]">account_circle</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                        Sign In to Proxync
                      </h3>
                      <p className="text-xs text-on-surface-variant max-w-xl">
                        Connect your Proxync account to activate Pro features, automatically verify custom domains, and sync tunnels across devices.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-sm">workspace_premium</span>
                      <span className="text-on-surface font-medium">Unlock Pro Features</span>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-sm">public</span>
                      <span className="text-on-surface font-medium">Custom Subdomains</span>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-sm">sync</span>
                      <span className="text-on-surface font-medium">Cloud Workspace Sync</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-outline-variant/20">
                    <span className="text-[11px] text-outline font-mono">Current Mode: Local Studio (Free / Open-Source)</span>
                    {onSignIn && (
                      <button
                        type="button"
                        onClick={onSignIn}
                        className="btn-primary compact text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          lock_open
                        </span>
                        <span>Sign In with Proxync</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                      {logsSummary?.logs_dir || 'Loading logs directory...'}
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
                        showToast('Opening logs directory...', 'info');
                      }}
                    >
                      <span className="material-symbols-outlined text-[15px]">folder_open</span>
                      Open Logs Folder
                    </button>

                    <button
                      className="btn-primary compact text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3.5"
                      onClick={async () => {
                        const res = await exportSupportBundle({
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
                        if (res.success && res.path) {
                          showToast(`Support diagnostic bundle saved to: ${res.path}`, 'success');
                        } else if (!res.cancelled) {
                          showToast('Support diagnostic bundle exported', 'info');
                        }
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
