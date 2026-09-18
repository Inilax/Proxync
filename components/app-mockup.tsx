"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cloud, Radio, Settings, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLatestRelease } from "@/lib/releases";

import { LobbyView } from "./mockup/lobby-view";
import { ObservabilityView } from "./mockup/observability-view";
import { PostmanView } from "./mockup/postman-view";
import { ProcessView } from "./mockup/process-view";
import { SettingsView } from "./mockup/settings-view";
import { Sidebar } from "./mockup/sidebar";
import { SwaggerView } from "./mockup/swagger-view";
import { TrafficView } from "./mockup/traffic-view";
import { ThemeId, ViewId } from "./mockup/types";
import { WelcomeView } from "./mockup/welcome-view";
import { WorkbenchView } from "./mockup/workbench-view";

export function AppMockup() {
  const release = useLatestRelease();
  const [active, setActive] = useState<ViewId>("welcome");
  const [theme, setTheme] = useState<ThemeId>("slate");
  const [showConsole, setShowConsole] = useState<boolean>(true);

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -top-8 h-40 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-10 bottom-6 h-24 rounded-full bg-primary/10 blur-2xl"
      />

      <div className={cn("relative overflow-hidden rounded-2xl border border-outline-variant/40 shadow-panel transition-all duration-300", `theme-${theme}`)}>
        {/* Titlebar */}
        <div className="relative flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-4 py-2.5 select-none gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>

            <div className="font-mono text-xs font-bold text-on-surface-variant hidden sm:flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-primary" />
              <span>Proxync Studio</span>
            </div>
          </div>

          {/* Center Workspace Search Command Bar (Ctrl+K) */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-1 font-mono text-[11px] text-on-surface-variant max-w-xs w-full justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-on-surface font-semibold truncate">proxync-workspace</span>
            </div>
            <span className="text-[9.5px] font-bold text-outline bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/40 shrink-0">
              Ctrl+K
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Theme Switcher */}
            <div className="flex items-center rounded-lg border border-outline-variant/40 bg-surface-container px-1 py-0.5">
              {[
                { id: "slate", label: "Slate", color: "#8aebff" },
                { id: "dracula", label: "Dracula", color: "#ff79c6" },
                { id: "dark", label: "Obsidian", color: "#38bdf8" },
                { id: "emerald", label: "Emerald", color: "#10b981" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as ThemeId)}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold transition-all cursor-pointer",
                    theme === t.id ? "bg-surface-bright text-on-surface shadow-sm" : "text-outline hover:text-on-surface",
                  )}
                  title={`Switch to ${t.label} theme`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="hidden lg:inline">{t.label}</span>
                </button>
              ))}
            </div>

            <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 bg-primary/10 rounded border border-primary/30 hidden sm:inline">
              v0.2.1-stable
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="relative flex h-[640px] min-h-[640px] max-h-[640px] lg:h-[650px] lg:min-h-[650px] lg:max-h-[650px] w-full overflow-hidden">
          <Sidebar active={active} onSelect={setActive} />

          <div className="min-w-0 flex-1 flex flex-col justify-between bg-surface-container-lowest overflow-hidden h-full">
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="flex-1 flex flex-col h-full"
                >
                  {active === "welcome" && <WelcomeView onNavigate={setActive} />}
                  {active === "lobby" && <LobbyView />}
                  {active === "process" && <ProcessView />}
                  {active === "traffic" && <TrafficView />}
                  {active === "postman" && <PostmanView />}
                  {active === "workbench" && <WorkbenchView />}
                  {active === "swagger" && <SwaggerView />}
                  {active === "observability" && <ObservabilityView />}
                  {active === "settings" && <SettingsView theme={theme} onThemeChange={setTheme} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Global Live Engine Terminal Console Panel — Appears on ALL screens when toggled */}
            {showConsole && (
              <div className="border-t border-outline-variant/30 bg-black/95 p-3 font-mono text-[11px] space-y-1 select-text shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-36 overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between text-outline text-[9.5px] font-bold uppercase tracking-wider pb-1 border-b border-white/10 mb-1 gap-x-3">
                  <div className="flex items-center gap-1.5 text-primary min-w-0">
                    <Terminal className="h-3 w-3 shrink-0" />
                    <span className="truncate">Proxync Engine Log &amp; Network Terminal Stream</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConsole(false)}
                    className="text-secondary font-bold hover:underline cursor-pointer shrink-0 text-[9.5px]"
                  >
                    ● Live — Click to Hide
                  </button>
                </div>
                <div className="text-secondary truncate"><span className="text-outline">[17:18:02]</span> <span className="font-bold">INFO</span> TCP Proxy Forwarder → 127.0.0.1:5173 → Cloudflare Edge</div>
                <div className="text-tertiary truncate"><span className="text-outline">[17:18:04]</span> <span className="font-bold">200 OK</span> GET /api/v1/users (14ms · 248 B)</div>
                <div className="text-primary truncate"><span className="text-outline">[17:18:05]</span> <span className="font-bold">201 CREATED</span> POST /api/v1/session (42ms · 512 B)</div>
                <div className="text-tertiary truncate"><span className="text-outline">[17:18:08]</span> <span className="font-bold">200 OK</span> GET /api/v1/health (2ms · 42 B)</div>
                <div className="text-error truncate"><span className="text-outline">[17:18:11]</span> <span className="font-bold">404 NOT FOUND</span> DELETE /api/v1/users/42 (11ms · 0 B)</div>
              </div>
            )}

            {/* Bottom Status Footer */}
            <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container px-3 py-1 font-mono text-[10px] shrink-0 select-none">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <span className="flex items-center gap-1 text-outline">
                  <span className="h-1.5 w-1.5 rounded-full bg-outline" />
                  No Active Tunnels
                </span>
                <span className="text-outline">|</span>
                <span className="text-outline">Port -</span>
                <span className="text-outline">|</span>
                <span className="text-outline">Latency: 14ms</span>
                <span className="text-outline hidden sm:inline">|</span>
                <button
                  type="button"
                  onClick={() => setShowConsole(!showConsole)}
                  className="hidden sm:inline-flex items-center gap-1 text-primary hover:underline cursor-pointer font-bold"
                >
                  <Terminal className="h-2.5 w-2.5" />
                  <span>Console {showConsole ? "(Open)" : ""}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-outline">
                <span>Encoding: UTF-8</span>
                <span>|</span>
                <span className="text-secondary font-bold">STABLE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
