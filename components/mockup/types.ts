import {
  Activity,
  BarChart3,
  Code2,
  Compass,
  Globe,
  LayoutGrid,
  Send,
  Settings,
  Zap,
} from "lucide-react";

export const TUNNEL_URL = "https://px-a1b2c3d4.proxync.dev";

export const NAV_CATEGORIES = [
  {
    category: "OVERVIEW",
    items: [
      { view: "welcome", label: "Explore", icon: Compass },
      { view: "lobby", label: "Workspace Hub", icon: LayoutGrid },
    ],
  },
  {
    category: "DEVELOPMENT & NETWORK",
    items: [
      { view: "process", label: "Tunnels", icon: Globe },
      { view: "traffic", label: "Traffic", icon: Activity },
      { view: "postman", label: "Playground", icon: Send },
      { view: "workbench", label: "Workbench", icon: Zap },
      { view: "swagger", label: "Swagger", icon: Code2 },
    ],
  },
  {
    category: "OBSERVABILITY & TOOLS",
    items: [
      { view: "observability", label: "Observability", icon: BarChart3 },
      { view: "settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

export type ViewId =
  | "welcome"
  | "lobby"
  | "process"
  | "traffic"
  | "postman"
  | "workbench"
  | "swagger"
  | "observability"
  | "settings";

export type ThemeId = "slate" | "dracula" | "dark" | "emerald";

export interface Process {
  name: string;
  port: number;
  pid: number;
  framework: string;
}

export const PROCESSES: Process[] = [
  { name: "Vite dev server", port: 5173, pid: 14292, framework: "Vite / React" },
  { name: "FastAPI backend", port: 8000, pid: 8921, framework: "FastAPI / Python" },
  { name: "Next.js app", port: 3000, pid: 1104, framework: "Next.js / TypeScript" },
  { name: "NestJS microservice", port: 4000, pid: 6520, framework: "NestJS / Node" },
];

export interface Row {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  status: number;
  latency: string;
  port: number;
  serverName: string;
  targetBadge: "Proxync Native" | "Cloudflare Edge" | "Public Tunnel" | "Local Loopback";
  active?: boolean;
}

export const ROWS: Row[] = [
  { id: "req-1", method: "GET", path: "/api/v1/users", status: 200, latency: "14ms", port: 5173, serverName: "Vite (:5173)", targetBadge: "Proxync Native", active: true },
  { id: "req-2", method: "POST", path: "/api/v1/session", status: 201, latency: "42ms", port: 8000, serverName: "FastAPI (:8000)", targetBadge: "Cloudflare Edge" },
  { id: "req-3", method: "GET", path: "/api/v1/health", status: 200, latency: "2ms", port: 5173, serverName: "Vite (:5173)", targetBadge: "Local Loopback" },
  { id: "req-4", method: "PUT", path: "/api/v1/users/42", status: 200, latency: "31ms", port: 4000, serverName: "NestJS (:4000)", targetBadge: "Proxync Native" },
  { id: "req-5", method: "DELETE", path: "/api/v1/users/42", status: 404, latency: "11ms", port: 8000, serverName: "FastAPI (:8000)", targetBadge: "Cloudflare Edge" },
];

export const METHOD_STYLE: Record<Row["method"], string> = {
  GET: "text-tertiary",
  POST: "text-primary",
  PUT: "text-secondary",
  PATCH: "text-secondary",
  DELETE: "text-error",
};

export const METHOD_BADGE: Record<string, string> = {
  GET: "border-tertiary/40 bg-tertiary/10 text-tertiary",
  POST: "border-primary/40 bg-primary/10 text-primary",
  PUT: "border-secondary/40 bg-secondary/10 text-secondary",
  PATCH: "border-secondary/40 bg-secondary/10 text-secondary",
  DELETE: "border-error/40 bg-error/10 text-error",
};

export const METHOD_EDGE: Record<string, string> = {
  GET: "border-l-tertiary/60",
  POST: "border-l-primary/60",
  PUT: "border-l-secondary/60",
  PATCH: "border-l-secondary/60",
  DELETE: "border-l-error/60",
};

export const STATUS_STYLE: Record<number, string> = {
  200: "text-secondary font-bold",
  201: "text-secondary font-bold",
  301: "text-tertiary font-bold",
  404: "text-error font-bold",
  500: "text-error font-bold",
};
