export type MainView =
  | 'lobby'
  | 'welcome'
  | 'workspace_dashboard'
  | 'process'
  | 'traffic'
  | 'postman'
  | 'swagger'
  | 'observability'
  | 'workbench'
  | 'docs'
  | 'settings';

export type SwaggerPanel = 'preview' | 'json' | 'yaml';
export type SwaggerExportFormat = 'json' | 'yaml';
export type PanelView = null; // Companions removed

export interface ProcessCandidate {
  id: string;
  name: string;
  port: number;
  pid?: number;
  command?: string;
  directory?: string;
  executable?: string;
  framework?: string;
  access: 'ready' | 'limited' | 'unknown';
  uptime?: string;
  latency?: number;
}

export interface Tunnel {
  id: string;
  publicUrl: string;
  localPort: number;
  status: string;
  subdomain?: string;
  createdAt?: string;
}

export interface RequestLog {
  id: string;
  method: string;
  path: string;
  status?: number | string;
  durationMs?: number | null;
  headers?: Record<string, string>;
  bodyPreview?: string;
  responseHeaders?: Record<string, string>;
  capturedAt?: string;
  workspaceId?: string;
  workspaceName?: string;
  port?: number;
  serverName?: string;
  tunnelUrl?: string;
  subdomain?: string;
  tunnelId?: string;
  isProbe?: boolean;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  source: 'manual' | 'starter-scan' | 'captured';
  collectionName?: string;
}

export interface PostmanResponse {
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: string;
}

export interface Guardrails {
  authMode: 'guest' | 'shared-secret' | 'workspace-only';
  piiRedaction: boolean;
  captureBodies: boolean;
  autoUpdateSwagger: boolean;
  rateLimit: string;
}

export interface ProcessProfile {
  id: string;
  processName: string;
  port: number;
  framework: string;
  languageHint: string;
  command: string;
  directory: string;
  executable: string;
  lastSharedAt?: string;
  lastTunnelUrl?: string;
  starterRequestCount: number;
}

export interface DomainRecord {
  id: string;
  name: string;
  verificationToken: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  createdAt?: string;
  lastActivityAt?: string;
  remoteWorkspaceId?: string;
  profiles: ProcessProfile[];
  savedRequests: SavedRequest[];
  capturedRequests: RequestLog[];
  domains: DomainRecord[];
  guardrails: Guardrails;
  languageHint: string;
  selectedProfileId?: string;
  lastSwaggerGeneratedAt?: string;
  projectRootPath: string;
  scannedFiles: string[];
  notes: string;
}

export interface AppSettings {
  guardrails: Guardrails;
  defaultProjectRootPath: string;
  notes: string;
  theme?: string;
  autoUpdate: boolean;
  telemetry?: 'enhanced' | 'basic';
  enableDevTools?: boolean;
}

export interface ExecutionRun {
  id: string;
  runIndex: number;
  timestamp: string;
  status: number;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
  note?: string;
}

export interface WorkbenchTab {
  id: string;
  title: string;
  method: string;
  path: string;
  requestLog?: RequestLog;
  draftRequest: SavedRequest;
  activeSubTab: 'replay' | 'traffic' | 'telemetry' | 'swagger' | 'devtools';
  executionHistory: ExecutionRun[];
  lastResponse?: PostmanResponse | null;
  bypassCache?: boolean;
}


