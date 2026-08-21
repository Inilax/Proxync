"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Folder,
  FolderOpen,
  Keyboard,
  Lock,
  Plus,
  Radio,
  Search,
  Send,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_BADGE, METHOD_STYLE } from "./types";

interface SavedRequestItem {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  port: number;
  collection: string;
  active?: boolean;
}

const INITIAL_REQUESTS: SavedRequestItem[] = [
  {
    id: "req-1",
    name: "List users",
    method: "GET",
    path: "/api/v1/users",
    port: 5173,
    collection: "Default Collection",
    active: true,
  },
  {
    id: "req-2",
    name: "Create session",
    method: "POST",
    path: "/api/v1/session",
    port: 8000,
    collection: "Default Collection",
  },
  {
    id: "req-3",
    name: "Stripe Webhook",
    method: "POST",
    path: "/api/webhooks/stripe",
    port: 4000,
    collection: "Default Collection",
  },
  {
    id: "req-4",
    name: "Probe API Root",
    method: "GET",
    path: "/",
    port: 5173,
    collection: "Scanned Endpoints",
  },
  {
    id: "req-5",
    name: "Health check",
    method: "GET",
    path: "/api/v1/health",
    port: 5173,
    collection: "Scanned Endpoints",
  },
];

export function PostmanView() {
  const [requests, setRequests] = useState<SavedRequestItem[]>(INITIAL_REQUESTS);
  const [activeReqId, setActiveReqId] = useState<string>("req-1");
  const [requestTab, setRequestTab] = useState<"body" | "headers" | "auth" | "response">("body");
  const [responseSubTab, setResponseSubTab] = useState<"body" | "headers">("body");
  const [bearerToken, setBearerToken] = useState<string>("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
  const [bearerApplied, setBearerApplied] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [targetRoute, setTargetRoute] = useState<"native" | "cloudflare" | "loopback">("native");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showHotkeys, setShowHotkeys] = useState<boolean>(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const activeReq = requests.find((r) => r.id === activeReqId) || requests[0];

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setRequestTab("response");
    }, 300);
  };

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const filteredRequests = requests.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folders = Array.from(new Set(requests.map((r) => r.collection)));

  return (
    <div className="flex h-full w-full p-3.5 gap-3 fade-in select-none items-stretch font-mono overflow-hidden">
      {/* ── 1. Left Collections Rail ── */}
      <aside className="hidden w-56 shrink-0 flex-col rounded-xl border border-outline-variant/30 bg-surface-container p-3 sm:flex justify-between">
        <div className="space-y-2.5">
          {/* Rail Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface">Collections</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary transition-colors cursor-pointer"
                title="Import Swagger / Postman Collection"
              >
                <Upload className="h-3 w-3" />
              </button>
              <button
                className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary transition-colors cursor-pointer"
                title="New Collection"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-outline" />
            <input
              type="text"
              placeholder="Filter endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-7 pr-2 py-1 text-[10px] text-on-surface focus:outline-none focus:border-primary placeholder:text-outline"
            />
          </div>

          {/* Folders & Endpoints Tree */}
          <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
            {folders.map((folder) => {
              const folderReqs = filteredRequests.filter((r) => r.collection === folder);
              const isCollapsed = collapsedFolders[folder];
              return (
                <div key={folder} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(folder)}
                    className="flex items-center justify-between p-1 hover:bg-surface-container-high rounded cursor-pointer text-xs font-bold text-on-surface"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3 text-outline shrink-0" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-outline shrink-0" />
                      )}
                      <Folder className="h-3 w-3 text-secondary shrink-0" />
                      <span className="truncate text-[10.5px]">{folder}</span>
                    </div>
                    <span className="text-[9px] text-outline bg-black/40 px-1.5 py-0.2 rounded font-bold shrink-0">
                      {folderReqs.length}
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className="pl-2 space-y-0.5 border-l border-outline-variant/20 ml-2">
                      {folderReqs.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveReqId(item.id);
                            setRequests((prev) =>
                              prev.map((r) => ({ ...r, active: r.id === item.id }))
                            );
                          }}
                          className={cn(
                            "flex items-center justify-between gap-1.5 rounded px-2 py-1 text-xs cursor-pointer transition-all",
                            item.id === activeReqId
                              ? "bg-primary/15 border border-primary/30 font-bold text-on-surface shadow-sm"
                              : "hover:bg-surface-container-high text-on-surface-variant",
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn("text-[9px] font-bold px-1 py-0.2 rounded shrink-0", METHOD_BADGE[item.method])}>
                              {item.method}
                            </span>
                            <span className="truncate text-[10.5px]">{item.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shortcuts button */}
        <button
          onClick={() => setShowHotkeys(true)}
          className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-2.5 py-1.5 text-[10px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Keyboard className="h-3 w-3 text-primary" />
            <span>Shortcuts</span>
          </span>
          <kbd className="text-[9px] bg-surface-container px-1 rounded text-outline">Ctrl+/</kbd>
        </button>
      </aside>

      {/* ── 2. Main Request & Response Workspace ── */}
      <div className="min-w-0 flex-1 flex flex-col justify-between rounded-xl border border-outline-variant/30 bg-surface-container p-3 space-y-2.5 overflow-hidden">
        {/* Top Control Bar: Route Badge, Method, URL, Send, Save */}
        <div className="space-y-2">
          {/* Target Route Switcher */}
          <div className="flex items-center justify-between text-[10px] text-outline border-b border-outline-variant/20 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span>Target Route:</span>
              <button
                onClick={() => setTargetRoute("native")}
                className={cn(
                  "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                  targetRoute === "native"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "hover:text-on-surface"
                )}
              >
                ● Proxync Native (:2222)
              </button>
              <button
                onClick={() => setTargetRoute("cloudflare")}
                className={cn(
                  "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                  targetRoute === "cloudflare"
                    ? "bg-secondary/20 text-secondary border border-secondary/30"
                    : "hover:text-on-surface"
                )}
              >
                Cloudflare Edge
              </button>
              <button
                onClick={() => setTargetRoute("loopback")}
                className={cn(
                  "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                  targetRoute === "loopback"
                    ? "bg-tertiary/20 text-tertiary border border-tertiary/30"
                    : "hover:text-on-surface"
                )}
              >
                Local Loopback
              </button>
            </div>
            <span className="text-secondary font-bold hidden md:inline">● Replay Engine Ready</span>
          </div>

          {/* URL & Send Bar */}
          <div className="flex items-center gap-2">
            <span className={cn("px-2.5 py-1.5 rounded-lg font-bold text-xs border shrink-0", METHOD_BADGE[activeReq.method])}>
              {activeReq.method}
            </span>

            <div className="flex flex-1 items-center bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-outline">http://localhost:{activeReq.port}</span>
              <span className="text-on-surface font-semibold pl-1">{activeReq.path}</span>
            </div>

            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary font-bold text-xs text-on-primary shadow-sm hover:opacity-90 transition-all cursor-pointer shrink-0"
            >
              <Send className={cn("h-3.5 w-3.5", isSending ? "animate-spin" : "")} />
              <span>{isSending ? "Sending..." : "Send"}</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs: Body | Headers | Auth | Response */}
        <div className="flex flex-col flex-1 min-h-0 space-y-2">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1">
            <div className="flex items-center gap-1 text-[11px]">
              {(["body", "headers", "auth", "response"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRequestTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-t-lg font-bold uppercase transition-all cursor-pointer",
                    requestTab === tab
                      ? "border-b-2 border-primary text-primary bg-surface-container-high"
                      : "text-outline hover:text-on-surface"
                  )}
                >
                  {tab === "headers" ? "Headers (2)" : tab === "auth" ? "Auth (Bearer)" : tab}
                </button>
              ))}
            </div>

            {requestTab === "response" && (
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-secondary font-bold">
                  <Check className="h-3 w-3" /> 200 OK
                </span>
                <span className="text-outline">14 ms</span>
                <span className="text-outline">1.2 KB</span>
              </div>
            )}
          </div>

          {/* Sub-Tab Content Area */}
          <div className="flex-1 overflow-auto rounded-lg bg-surface-container-lowest border border-outline-variant/20 p-2.5 text-[11px]">
            {requestTab === "body" && (
              <div className="space-y-1 text-slate-300 leading-relaxed font-mono">
                <div><span className="text-on-surface-variant">{"{"}</span></div>
                <div className="pl-4">
                  <span className="text-primary">&quot;email&quot;</span>: <span className="text-secondary">&quot;ada@acme.dev&quot;</span>,
                </div>
                <div className="pl-4">
                  <span className="text-primary">&quot;role&quot;</span>: <span className="text-secondary">&quot;admin&quot;</span>,
                </div>
                <div className="pl-4">
                  <span className="text-primary">&quot;plan&quot;</span>: <span className="text-secondary">&quot;enterprise&quot;</span>
                </div>
                <div><span className="text-on-surface-variant">{"}"}</span></div>
              </div>
            )}

            {requestTab === "headers" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant/15 text-outline text-[10px]">
                  <span>Header Key</span>
                  <span>Value</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-semibold">Content-Type</span>
                  <span className="text-on-surface">application/json</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-semibold">Authorization</span>
                  <span className="text-on-surface truncate max-w-[240px]">
                    Bearer {bearerToken.slice(0, 24)}...
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-semibold">X-Proxync-Origin</span>
                  <span className="text-tertiary">http://localhost:{activeReq.port}</span>
                </div>
              </div>
            )}

            {requestTab === "auth" && (
              <div className="space-y-3 p-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Bearer Token Auth Helper
                  </span>
                  <span className="text-[10px] text-secondary font-semibold">
                    {bearerApplied ? "● Active in Headers" : "Pending"}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-surface-container p-2 rounded-lg border border-outline-variant/30">
                  <input
                    type="text"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    className="flex-1 bg-transparent border-none text-[11px] text-on-surface focus:outline-none font-mono"
                    placeholder="Enter Bearer token or JWT..."
                  />
                  <button
                    onClick={() => {
                      setBearerApplied(true);
                    }}
                    className="px-2.5 py-1 bg-primary text-on-primary rounded text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[10px] text-outline">
                  Auto-injects `Authorization: Bearer &lt;token&gt;` into outgoing requests.
                </p>
              </div>
            )}

            {requestTab === "response" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-1">
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      onClick={() => setResponseSubTab("body")}
                      className={cn(
                        "font-bold",
                        responseSubTab === "body" ? "text-primary" : "text-outline"
                      )}
                    >
                      Response Body
                    </button>
                    <button
                      onClick={() => setResponseSubTab("headers")}
                      className={cn(
                        "font-bold",
                        responseSubTab === "headers" ? "text-primary" : "text-outline"
                      )}
                    >
                      Headers (4)
                    </button>
                  </div>
                  <span className="text-[10px] text-secondary">application/json</span>
                </div>

                {responseSubTab === "body" ? (
                  <pre className="text-secondary leading-relaxed font-mono">
                    {`{\n  "success": true,\n  "data": {\n    "id": "usr_99a8b7c6",\n    "email": "ada@acme.dev",\n    "role": "admin",\n    "activeTunnels": 2,\n    "timestamp": "${new Date().toISOString()}"\n  }\n}`}
                  </pre>
                ) : (
                  <div className="space-y-1 text-[10px]">
                    <div><span className="text-outline">content-type:</span> <span className="text-on-surface">application/json; charset=utf-8</span></div>
                    <div><span className="text-outline">x-powered-by:</span> <span className="text-on-surface">Proxync-Rust-Core</span></div>
                    <div><span className="text-outline">x-response-time:</span> <span className="text-secondary">14ms</span></div>
                    <div><span className="text-outline">connection:</span> <span className="text-on-surface">keep-alive</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Quick Help Bar */}
        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2 text-[10px] text-outline">
          <div className="flex items-center gap-2">
            <span>Send: <strong className="text-on-surface">Ctrl+Enter</strong></span>
            <span>&middot;</span>
            <span>Save: <strong className="text-on-surface">Ctrl+S</strong></span>
          </div>
          <span className="text-primary font-semibold">100% Local JSON Storage</span>
        </div>
      </div>
    </div>
  );
}
