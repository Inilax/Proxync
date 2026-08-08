"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cloud, Radio, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLatestRelease } from "@/lib/releases";

import { DocsView } from "./mockup/docs-view";
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
        <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>

          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-mono text-xs font-bold text-on-surface-variant hidden md:flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-primary" />
            Proxync — Network Hub &amp; Developer Studio
          </div>

          <div className="flex items-center gap-2">
            {/* Live Theme Switcher */}
            <div className="flex items-center rounded-lg border border-outline-variant/40 bg-surface-container px-1 py-0.5">
              {[
                { id: "slate", label: "Slate", color: "#8aebff" },
                { id: "dracula", label: "Dracula", color: "#ff79c6" },
                { id: "cyberpunk", label: "Cyberpunk", color: "#ec4899" },
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
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              ))}
            </div>

            <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 bg-primary/10 rounded border border-primary/30">
              {release.tagName}
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="relative flex min-h-[420px] sm:min-h-[540px]">
          <Sidebar active={active} onSelect={setActive} />

          <div className="min-w-0 flex-1 flex flex-col justify-between bg-surface-container-lowest overflow-hidden">
            <div className="flex-1 flex flex-col justify-between">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="flex-1 flex flex-col justify-between h-full"
                >
                  {active === "welcome" && (
                    <WelcomeView
                      onNavigate={setActive}
                      showConsole={showConsole}
                      onToggleConsole={() => setShowConsole(!showConsole)}
                    />
                  )}
                  {active === "lobby" && <LobbyView />}
                  {active === "process" && <ProcessView />}
                  {active === "traffic" && <TrafficView />}
                  {active === "postman" && <PostmanView />}
                  {active === "swagger" && <SwaggerView />}
                  {active === "docs" && <DocsView />}
                  {active === "observability" && <ObservabilityView />}
                  {active === "settings" && <SettingsView theme={theme} onThemeChange={setTheme} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Status Footer */}
            <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container px-4 py-2 font-mono text-xs shrink-0">
              <div className="flex items-center gap-4 text-on-surface-variant">
                <span className="flex items-center gap-1.5 text-secondary font-bold">
                  <span className="h-2 w-2 rounded-full bg-secondary animate-pulse-dot" />
                  Service: Active
                </span>
                <span className="hidden items-center gap-1 sm:flex text-on-surface">
                  <Cloud className="h-3.5 w-3.5 text-secondary" />
                  Cloudflare Quick Tunnel
                </span>
                <span className="hidden text-outline md:inline">Local proxy :5173</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConsole(!showConsole)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer",
                    showConsole ? "bg-primary/20 text-primary border border-primary/40" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
                  )}
                  title="Toggle Explore Engine Console Terminal"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Console {showConsole ? "(Live)" : "(Hidden)"}</span>
                </button>
                <div className="flex items-center gap-1.5 text-tertiary font-bold">
                  <Radio className="h-3.5 w-3.5" />
                  <span>34 ms ping</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
