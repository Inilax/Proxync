export type MainView =
  | 'lobby'
  | 'welcome'
  | 'process'
  | 'traffic'
  | 'postman'
  | 'swagger'
  | 'settings';

export type SwaggerPanel = 'preview' | 'json';
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
}

export interface PostmanResponse {
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: string;
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
  remoteWorkspaceId?: string;
  profiles: ProcessProfile[];
  savedRequests: SavedRequest[];
  capturedRequests: RequestLog[];
  domains: DomainRecord[];
  languageHint: string;
  selectedProfileId?: string;
  lastSwaggerGeneratedAt?: string;
  projectRootPath: string;
  scannedFiles: string[];
  notes: string;
}

export interface AppSettings {
  defaultProjectRootPath: string;
  notes: string;
}

