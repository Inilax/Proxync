"use client";

import { useEffect, useRef, useState } from "react";
import { Folder, RefreshCw, Search, Zap } from "lucide-react";

interface LocalServer {
  id: string;
  runtime: string;
  framework: string;
  port: number;
  directory: string;
  endpoint: string;
  status: "Ready" | "Exposed";
}

const LOCAL_SERVERS: LocalServer[] = [
  {
    id: "srv-1",
    runtime: "node",
    framework: "Vite Dev Server",
    port: 5173,
    directory: "~/projects/web-frontend",
    endpoint: "http://localhost:5173",
    status: "Ready",
  },
  {
    id: "srv-2",
    runtime: "node",
    framework: "Next.js App",
    port: 3000,
    directory: "~/projects/portal-ui",
    endpoint: "http://localhost:3000",
    status: "Ready",
  },
  {
    id: "srv-3",
    runtime: "python",
    framework: "FastAPI Backend",
    port: 8000,
    directory: "~/projects/backend-api",
    endpoint: "http://localhost:8000",
    status: "Ready",
  },
  {
    id: "srv-4",
    runtime: "node",
    framework: "NestJS Microservice",
    port: 4000,
    directory: "~/projects/microservice-gateway",
    endpoint: "http://localhost:4000",
    status: "Ready",
  },
];

export function LobbyView() {
  const [servers, setServers] = useState<LocalServer[]>(LOCAL_SERVERS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleExpose = (server: LocalServer, type: "Proxync" | "Cloudflare" | "LAN") => {
    showToast(`Launched ${type} Tunnel for ${server.framework} on port :${server.port}`);
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-surface-container p-2.5 sm:p-3.5 gap-2.5 sm:gap-3 fade-in select-none font-mono text-xs overflow-y-auto overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-4 right-4 z-30 rounded-lg border border-primary/40 bg-surface-container-high/95 backdrop-blur-md px-3.5 py-2 text-primary shadow-xl animate-in fade-in slide-in-from-bottom-2 text-xs flex items-center gap-2 font-bold pointer-events-none">
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Active Workspace Header Card ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 sm:p-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-primary flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              ACTIVE WORKSPACE
            </span>
            <h1 className="text-base sm:text-lg font-bold text-on-surface">Local Workspace</h1>
            <p className="text-[10px] sm:text-[10.5px] text-outline max-w-xl leading-relaxed">
              Detected 4 local development servers. Select any server card below to expose a tunnel.
            </p>
          </div>

          <button
            onClick={() => showToast("Full scan complete: 4 listening dev ports found")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all cursor-pointer shrink-0"
          >
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Full Scan Local Ports</span>
          </button>
        </div>
      </div>

      {/* ── 2. Detected Local Servers Grid ── */}
      <div className="space-y-2 sm:space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-on-surface text-xs">Detected Local Servers</h2>
            <span className="rounded bg-surface-container-high border border-outline-variant/30 px-1.5 sm:px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-on-surface-variant">
              4 Running
            </span>
          </div>

          <button
            onClick={() => showToast("Scanning localhost ports via netstat -ano...")}
            className="flex items-center gap-1 text-[10.5px] sm:text-[11px] text-outline hover:text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Scan Ports</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {servers.map((srv) => (
            <div
              key={srv.id}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between min-w-0"
            >
              <div className="space-y-2">
                {/* Top Row: Runtime, Framework, Port */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded bg-surface-container flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                      &lt;&gt;
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-on-surface truncate">{srv.runtime}</div>
                      <div className="text-[10px] text-outline truncate">{srv.framework}</div>
                    </div>
                  </div>

                  <span className="rounded bg-surface-container-high border border-outline-variant/30 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[9.5px] font-bold text-outline shrink-0">
                    ● :{srv.port}
                  </span>
                </div>

                {/* Directory */}
                <div className="flex items-center gap-1.5 text-[10px] text-outline bg-surface-container px-2 py-1 rounded truncate">
                  <Folder className="h-3 w-3 text-secondary shrink-0" />
                  <span className="truncate">{srv.directory}</span>
                </div>

                {/* Endpoint & Status */}
                <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] gap-1">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[8px] sm:text-[8.5px] text-outline uppercase font-bold block">LOCAL ENDPOINT</span>
                    <span className="font-bold text-on-surface truncate block">{srv.endpoint}</span>
                  </div>
                  <span className="rounded bg-secondary/15 text-secondary border border-secondary/30 px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold shrink-0">
                    {srv.status}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 pt-2 border-t border-outline-variant/20">
                <button
                  onClick={() => handleExpose(srv, "Proxync")}
                  className="w-full sm:w-auto sm:flex-1 flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/40 text-[9.5px] sm:text-[10px] font-bold hover:bg-primary/30 transition-all cursor-pointer"
                >
                  <Zap className="h-3 w-3" />
                  <span>Expose (Proxync)</span>
                </button>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => handleExpose(srv, "Cloudflare")}
                    className="flex-1 sm:flex-none px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-outline hover:text-on-surface text-[9.5px] sm:text-[10px] font-semibold transition-all cursor-pointer text-center"
                  >
                    Cloudflare
                  </button>

                  <button
                    onClick={() => handleExpose(srv, "LAN")}
                    className="flex-1 sm:flex-none px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-outline hover:text-on-surface text-[9.5px] sm:text-[10px] font-semibold transition-all cursor-pointer text-center"
                  >
                    LAN
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Active Workspace Tunnels Section ── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <h2 className="font-bold text-on-surface">Active Workspace Tunnels</h2>
          <span className="rounded bg-surface-container-high border border-outline-variant/30 px-2 py-0.5 text-[10px] font-bold text-outline">
            0 Active
          </span>
        </div>
        <p className="text-[10px] text-outline">No public tunnels active. Click &quot;Expose (Proxync)&quot; on any server above to start a secure tunnel.</p>
      </div>
    </div>
  );
}
