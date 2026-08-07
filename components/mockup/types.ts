import {
  Activity,
  BarChart3,
  BookOpen,
  Code2,
  Compass,
  Globe,
  LayoutGrid,
  Send,
  Settings,
} from "lucide-react";

export const TUNNEL_URL = "https://proxync.dev";

export const NAV_ITEMS = [
  { view: "welcome", label: "Explore", icon: Compass },
  { view: "lobby", label: "Workspaces", icon: LayoutGrid },
  { view: "process", label: "Tunnels", icon: Globe },
  { view: "traffic", label: "Traffic", icon: Activity },
  { view: "postman", label: "Playground", icon: Send },
  { view: "swagger", label: "Swagger", icon: Code2 },
  { view: "docs", label: "Docs", icon: BookOpen },
  { view: "observability", label: "Observability", icon: BarChart3 },
  { view: "settings", label: "Settings", icon: Settings },
] as const;

export type ViewId = (typeof NAV_ITEMS)[number]["view"];
export type ThemeId = "slate" | "dracula" | "cyberpunk" | "emerald";

export interface Process {
  name: string;
  port: number;
  pid: number;
  framework: string;
}

export const PROCESSES: Process[] = [
  { name: "Vite server", port: 5173, pid: 14292, framework: "Vite / React" },
  { name: "FastAPI app", port: 8000, pid: 8921, framework: "FastAPI / Python" },
  { name: "Next.js app", port: 3000, pid: 1104, framework: "Next.js / Node" },
];

export interface Row {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  status: number;
  latency: string;
  targetBadge: "Cloudflare Edge" | "Public Tunnel" | "Local Loopback";
  active?: boolean;
}

export const ROWS: Row[] = [
  { id: "req-1", method: "GET", path: "/api/v1/users", status: 200, latency: "14ms", targetBadge: "Cloudflare Edge", active: true },
  { id: "req-2", method: "POST", path: "/api/v1/session", status: 201, latency: "42ms", targetBadge: "Cloudflare Edge" },
  { id: "req-3", method: "GET", path: "/api/v1/health", status: 200, latency: "2ms", targetBadge: "Local Loopback" },
  { id: "req-4", method: "PUT", path: "/api/v1/users/42", status: 200, latency: "31ms", targetBadge: "Public Tunnel" },
  { id: "req-5", method: "DELETE", path: "/api/v1/users/42", status: 404, latency: "11ms", targetBadge: "Cloudflare Edge" },
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
