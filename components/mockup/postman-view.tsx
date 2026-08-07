"use client";

import { useState } from "react";
import {
  Bookmark,
  ChevronDown,
  Copy,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Keyboard,
  Lock,
  Plus,
  Send,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_BADGE } from "./types";

const COLLECTIONS_TREE = [
  {
    name: "Default Collection",
    open: true,
    requests: [
      { method: "GET", name: "List users", path: "/api/v1/users", source: "captured", active: true },
      { method: "POST", name: "Create session", path: "/api/v1/session", source: "captured" },
    ],
  },
  {
    name: "Scanned Endpoints",
    open: true,
    requests: [
      { method: "GET", name: "Probe /", path: "/", source: "starter-scan" },
      { method: "GET", name: "Health check", path: "/api/v1/health", source: "starter-scan" },
    ],
  },
];

export function PostmanView() {
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "auth">("body");

  return (
    <div className="flex h-[490px] w-full p-4 gap-3 fade-in select-none items-stretch">
      {/* 1. Collections Rail */}
      <aside className="hidden w-52 shrink-0 flex-col rounded-xl border border-outline-variant/30 bg-surface-container p-3 sm:flex justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2.5">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-on-surface">Collections</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary transition-colors cursor-pointer" title="Import Swagger spec">
                <Upload className="h-3.5 w-3.5" />
              </button>
              <button className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary transition-colors cursor-pointer" title="Create folder">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
            {COLLECTIONS_TREE.map((folder) => (
              <div key={folder.name} className="space-y-1">
                <div className="flex items-center justify-between p-1 hover:bg-surface-container-high rounded-lg cursor-pointer text-xs font-bold text-on-surface">
                  <div className="flex items-center gap-1 min-w-0">
                    <ChevronDown className="h-3 w-3 text-outline shrink-0" />
                    <Folder className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span className="truncate text-[11px]">{folder.name}</span>
                  </div>
                  <span className="font-mono text-[9px] text-outline bg-black/40 px-1.5 py-0.5 rounded font-bold shrink-0">
                    {folder.requests.length}
                  </span>
                </div>

                <div className="pl-2 space-y-1 border-l border-outline-variant/20 ml-2">
                  {folder.requests.map((item) => (
                    <div
                      key={item.name}
                      className={cn(
                        "flex items-center justify-between gap-1.5 rounded-lg px-2 py-1 text-xs cursor-pointer transition-all",
                        item.active
                          ? "bg-primary/10 border border-primary/30 font-bold text-on-surface"
                          : "hover:bg-surface-container-high text-on-surface-variant",
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={cn("font-mono text-[9px] font-bold px-1 py-0.2 rounded shrink-0", METHOD_BADGE[item.method])}>
                          {item.method}
                        </span>
                        <span className="truncate text-[11px]">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 font-mono text-[9px] text-primary">
          Right-click glass context menu enabled
        </div>
      </aside>

      {/* 2. Central Workspace Runner */}
      <div className="flex-1 min-w-0 flex flex-col justify-between rounded-xl border border-outline-variant/30 bg-surface-container p-3.5 space-y-3">
        {/* Title Bar */}
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            defaultValue="List users"
            className="flex-1 min-w-0 bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant/60 focus:border-primary rounded-lg px-3 py-1.5 text-xs font-bold text-on-surface focus:outline-none transition-all"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high border border-outline-variant/40 px-3 py-1.5 font-mono text-xs font-bold text-on-surface hover:border-primary/50 transition-all cursor-pointer">
              <Bookmark className="h-3.5 w-3.5 text-secondary" />
              Save
            </button>
            <button className="p-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-outline hover:text-primary transition-all cursor-pointer">
              <Keyboard className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Method & URL Toolbar */}
        <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/40 p-1.5 rounded-xl">
          <select className="w-20 shrink-0 font-mono text-xs font-bold bg-surface-container-high text-primary border border-outline-variant/40 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <input
            type="text"
            defaultValue="/api/v1/users"
            className="flex-1 min-w-0 bg-surface-container-low border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-on-surface font-semibold focus:outline-none"
          />
          <span className="hidden lg:inline-flex shrink-0 items-center gap-1 rounded-full border border-tertiary/40 bg-tertiary/10 px-2.5 py-1 font-mono text-[10px] font-bold text-tertiary">
            Cloudflare Edge
          </span>
          <button className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-mono text-xs font-bold text-on-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer">
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </div>

        {/* Request Sub-Tabs & Code Area */}
        <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
          <div className="flex items-center gap-1 bg-surface-container-low px-2.5 py-1 border-b border-outline-variant/20">
            <button
              onClick={() => setActiveTab("body")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                activeTab === "body" ? "bg-surface-container-highest text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <FileCode2 className="h-3 w-3" />
              Body (JSON)
            </button>
            <button
              onClick={() => setActiveTab("headers")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                activeTab === "headers" ? "bg-surface-container-highest text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <FileText className="h-3 w-3" />
              Headers (2)
            </button>
            <button
              onClick={() => setActiveTab("auth")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                activeTab === "auth" ? "bg-surface-container-highest text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <Lock className="h-3 w-3" />
              Authorization
            </button>
          </div>

          <div className="flex-1 p-2.5 min-h-0">
            {activeTab === "body" && (
              <textarea
                readOnly
                defaultValue={'{\n  "email": "ada@acme.dev"\n}'}
                className="w-full h-full bg-black/60 border border-outline-variant/30 rounded-lg p-2.5 font-mono text-xs text-on-surface resize-none leading-relaxed focus:outline-none"
              />
            )}
            {activeTab === "headers" && (
              <textarea
                readOnly
                defaultValue={"Content-Type: application/json\nAuthorization: Bearer eyJhbGciOiJIUzI1Ni..."}
                className="w-full h-full bg-black/60 border border-outline-variant/30 rounded-lg p-2.5 font-mono text-xs text-on-surface resize-none leading-relaxed focus:outline-none"
              />
            )}
            {activeTab === "auth" && (
              <div className="p-2.5 bg-surface-container-low rounded-lg space-y-2">
                <div className="text-xs font-bold text-on-surface flex items-center gap-1">
                  <Lock className="h-3 w-3 text-primary" /> Bearer Token Auth Helper
                </div>
                <input
                  type="password"
                  defaultValue="eyJhbGciOiJIUzI1Ni..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs font-mono text-on-surface"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Response Pane Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-3.5 space-y-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-on-surface">Response Pane</span>
            <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-[9px] text-outline font-bold">
              Ctrl + /
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-secondary font-bold">200 OK</span>
            <span className="text-on-surface-variant font-bold">12 ms</span>
            <span className="text-outline text-[10px]">gzip decompressed</span>
          </div>

          <pre className="bg-surface-container p-3 rounded-xl font-mono text-xs text-on-surface leading-relaxed overflow-x-auto border border-outline-variant/20">
            {`{\n  "id": 42,\n  "email": "ada@acme.dev",\n  "role": "admin",\n  "verified": true\n}`}
          </pre>
        </div>

        <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 px-3 py-2 font-mono text-xs font-bold text-on-surface hover:text-primary hover:border-primary/40 transition-all cursor-pointer">
          <Copy className="h-3.5 w-3.5 text-secondary" />
          Copy Response JSON
        </button>
      </aside>
    </div>
  );
}
