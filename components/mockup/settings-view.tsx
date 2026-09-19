import { Bug, Download, FileText, FolderOpen, Key, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeId } from "./types";

export function SettingsView({
  theme,
  onThemeChange,
}: {
  theme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
}) {
  return (
    <div className="space-y-2.5 sm:space-y-3.5 p-2 sm:p-4 fade-in select-none h-full overflow-y-auto overflow-x-hidden font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-outline-variant/30 pb-2 sm:pb-3 shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xs sm:text-base font-bold text-white truncate">Settings &amp; Engine Preferences</h1>
          <p className="text-[10px] sm:text-xs text-white/70 mt-0.5 truncate">
            System configuration, theme selection, diagnostics &amp; security radar
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded-full border border-tertiary/40 bg-tertiary/10 px-2 sm:px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-tertiary flex items-center gap-1 whitespace-nowrap">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span>CVE Radar Active</span>
          </span>
        </div>
      </div>

      {/* Pro Debugger & Dual-Stream Logging Engine (v0.2.1) */}
      <div className="rounded-xl border border-secondary/30 bg-surface-container p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Bug className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary shrink-0" />
            <span className="font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white truncate">
              Pro Debugger &amp; Dual-Stream Logging
            </span>
          </div>
          <span className="font-mono text-[9.5px] sm:text-[10px] text-secondary font-bold shrink-0 whitespace-nowrap">
            Native Rust storage.rs
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-3 space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-xs font-bold text-primary truncate">app.log</span>
              <span className="text-[9.5px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 font-bold shrink-0 whitespace-nowrap">
                ✓ Enabled
              </span>
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-white/80 leading-snug">
              Engine lifecycle, recon scans, proxy binds &amp; tunnel events.
            </p>
            <div className="font-mono text-[9.5px] sm:text-[10px] text-white/60 pt-0.5 truncate">
              Ring buffer: 1,000 entries · PII Redacted
            </div>
          </div>

          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-3 space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-xs font-bold text-white truncate">traffic.log</span>
              <span className="text-[9.5px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-surface-container-high text-white/90 border border-outline-variant/40 font-bold shrink-0 whitespace-nowrap">
                On-Demand
              </span>
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-white/80 leading-snug">
              Full HTTP request/response payloads, headers, &amp; JSONL latencies.
            </p>
            <div className="font-mono text-[9.5px] sm:text-[10px] text-white/60 pt-0.5 truncate">
              Ring buffer: 2,000 entries · Zero overhead
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-2 border-t border-outline-variant/20">
          <div className="font-mono text-[9px] sm:text-[10px] text-white/70 truncate">
            Path: ~/.proxync/logs (42.8 KB)
          </div>
          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 sm:px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-bold text-white hover:bg-surface-container-high transition-all cursor-pointer whitespace-nowrap"
            >
              <FolderOpen className="h-3 w-3 text-white/70" />
              <span>Folder</span>
            </button>
            <button
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-2.5 sm:px-3 py-1 font-mono text-[10px] sm:text-[11px] font-bold text-on-primary hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3 w-3" />
              <span>Export Bundle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
            Appearance &amp; Color Themes
          </span>
          <span className="font-mono text-[9.5px] sm:text-[10px] text-tertiary font-bold shrink-0 whitespace-nowrap">
            1-Click Live Switch
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 sm:grid-cols-4">
          {[
            { id: "dark", name: "Obsidian Dark", color: "#38bdf8", desc: "Default Dark" },
            { id: "slate", name: "Midnight Slate", color: "#8aebff", desc: "Slate Glow" },
            { id: "dracula", name: "Dracula Dark", color: "#ff79c6", desc: "Pink / Purple" },
            { id: "emerald", name: "Deep Emerald", color: "#10b981", desc: "Forest Green" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onThemeChange(item.id as ThemeId)}
              className={cn(
                "flex flex-col items-start rounded-xl border p-1.5 sm:p-3 text-left transition-all cursor-pointer min-w-0",
                theme === item.id
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/10 ring-2 ring-primary/40"
                  : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant",
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10.5px] sm:text-xs font-bold text-white truncate">{item.name}</span>
              </div>
              <span className="mt-0.5 sm:mt-1 font-mono text-[8.5px] sm:text-[10px] text-white/70 truncate w-full">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3 Status Tiles */}
      <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-3">
        {[
          { label: "Active Workspace", value: "proxync-workspace" },
          { label: "Telemetry Mode", value: "Enhanced (P50/P90/P99)" },
          { label: "Active Tunnel", value: "https://px-a1b2c3d4.proxync.dev", mono: true },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-3.5 min-w-0 overflow-hidden">
            <span className="font-mono text-[9.5px] sm:text-[10px] uppercase tracking-wider text-white/60 font-bold block truncate">
              {tile.label}
            </span>
            <div
              className={cn(
                "mt-0.5 sm:mt-1 truncate text-xs font-bold text-white",
                tile.mono && "font-mono text-secondary",
              )}
            >
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Domain DNS Verification Card */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-2.5 sm:p-4 space-y-2 sm:space-y-3 min-w-0">
        <div className="font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
          Custom Domain DNS Verification
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-3.5 min-w-0">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-bold text-white">demo.example.com</span>
              <span className="font-mono text-[10.5px] sm:text-xs font-bold text-secondary flex items-center gap-1">
                <span>✓</span> Ownership Verified
              </span>
            </div>
            <p className="font-mono text-[10px] sm:text-xs text-white/70 break-all leading-relaxed">
              TXT _proxync.demo.example.com = proxync-verification-1f4a9c2d
            </p>
          </div>
          <div className="flex items-center sm:self-center shrink-0">
            <span className="rounded-full border border-secondary/40 bg-secondary/10 px-2.5 sm:px-3 py-0.5 sm:py-1 font-mono text-[10px] sm:text-xs font-bold text-secondary shrink-0 whitespace-nowrap">
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* Enterprise API Key & Cloud Sync Preview Card */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-surface-container to-surface-container-lowest p-2.5 sm:p-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Key className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white truncate">
                Enterprise API Key &amp; Cloud Sync Preview
              </div>
              <div className="text-[10px] sm:text-xs text-white/70 mt-0.5 truncate">
                RBAC policies and team workspace sync features.
              </div>
            </div>
          </div>
          <span className="self-start sm:self-center rounded border border-primary/40 bg-primary/20 px-2.5 py-0.5 sm:px-3 sm:py-1 font-mono text-[10px] sm:text-xs font-bold text-primary shrink-0 whitespace-nowrap">
            v0.2.2 Enterprise Preview
          </span>
        </div>
      </div>
    </div>
  );
}

