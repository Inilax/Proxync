export type MainView =
  | 'lobby'
  | 'welcome'
  | 'process'
  | 'traffic'
  | 'postman'
  | 'swagger'
  | 'observability'
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

