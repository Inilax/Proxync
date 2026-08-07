"use client";

import { Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeId, TUNNEL_URL } from "./types";

export function SettingsView({
  theme,
  onThemeChange,
}: {
  theme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
}) {
  return (
    <div className="space-y-6 p-6 fade-in select-none">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <h1 className="text-xl font-bold text-on-surface">Settings &amp; Engine Preferences</h1>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
          Smart Auto-Updater Active
        </span>
      </div>

      {/* Theme Selector */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-on-surface">
            Appearance &amp; Color Theme Selector
          </span>
          <span className="font-mono text-[10px] text-tertiary font-bold">1-Click Live Switch</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { id: "slate", name: "Midnight Slate", color: "#8aebff", desc: "Default Dark" },
            { id: "dracula", name: "Dracula Dark", color: "#ff79c6", desc: "Pink / Purple" },
            { id: "cyberpunk", name: "Cyberpunk Void", color: "#ec4899", desc: "Neon Magenta" },
            { id: "emerald", name: "Deep Emerald", color: "#10b981", desc: "Forest Green" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onThemeChange(item.id as ThemeId)}
              className={cn(
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer",
                theme === item.id
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/10 ring-2 ring-primary/40"
                  : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-bold text-on-surface">{item.name}</span>
              </div>
              <span className="mt-1 font-mono text-[10px] text-on-surface-variant">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active Workspace", value: "proxync-workspace" },
          { label: "Telemetry Mode", value: "Enhanced (P50/P90/P99)" },
          { label: "Active Tunnel", value: TUNNEL_URL, mono: true },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
            <span className="font-mono text-[10px] uppercase tracking-wider text-outline font-bold">
              {tile.label}
            </span>
            <div
              className={cn(
                "mt-1 truncate text-sm font-bold text-on-surface",
                tile.mono && "font-mono text-xs text-secondary",
              )}
            >
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 space-y-3">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-on-surface">Custom Domain DNS Verification</div>
        <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-surface">demo.example.com</span>
              <span className="font-mono text-xs font-bold text-secondary">✓ Ownership Verified</span>
            </div>
            <p className="mt-1 font-mono text-xs text-on-surface-variant">
              TXT _proxync.demo.example.com = proxync-verification-1f4a9c2d
            </p>
          </div>
          <span className="rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 font-mono text-xs font-bold text-secondary">
            Ready
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-surface-container to-surface-container-lowest p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-bold text-on-surface">Enterprise API Key &amp; Cloud Sync Preview</div>
              <div className="text-xs text-on-surface-variant mt-0.5">RBAC policies and team workspace sync features.</div>
            </div>
          </div>
          <span className="rounded border border-primary/40 bg-primary/20 px-3 py-1 font-mono text-xs font-bold text-primary">
            v0.2.0 Enterprise Preview
          </span>
        </div>
      </div>
    </div>
  );
}
