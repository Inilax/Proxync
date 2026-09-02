import type { ScannedEndpoint } from './codebaseScanner';
import type { RequestLog } from './types';
function stripMethodPrefix(path: string): string {
  return path.replace(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+/i, '').trim();
}

export interface OpenApiSchema {
  type?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  example?: unknown;
  nullable?: boolean;
}

/**
 * Infers an OpenAPI 3.0 JSON Schema from a JavaScript value / JSON structure
 */
export function inferJsonSchemaFromValue(value: unknown): OpenApiSchema {
  if (value === null || value === undefined) {
    return { type: 'string', nullable: true };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', items: { type: 'string' } };
    }
    return {
      type: 'array',
      items: inferJsonSchemaFromValue(value[0]),
    };
  }

  const typeOf = typeof value;

  if (typeOf === 'number') {
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  }

  if (typeOf === 'boolean') {
    return { type: 'boolean' };
  }

  if (typeof value === 'string') {
    const strVal = value as string;
    return { type: 'string', example: strVal.length < 50 ? strVal : `${strVal.substring(0, 47)}...` };
  }

  if (typeOf === 'object') {
    const properties: Record<string, OpenApiSchema> = {};
    const required: string[] = [];

    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      properties[k] = inferJsonSchemaFromValue(v);
      if (v !== null && v !== undefined) {
        required.push(k);
      }
    });

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  return { type: 'string' };
}

/**
 * Safe JSON parser helper for request/response bodies
 */
export function inferSchemaFromRawBody(bodyStr?: string): OpenApiSchema | null {
  if (!bodyStr || !bodyStr.trim()) return null;

  let clean = bodyStr.trim();
  // Strip leading HTTP/1.1 chunked hex size prefix (e.g. "2a\r\n{..." or "1f\n{...")
  if (/^[0-9a-fA-F]+\r?\n/.test(clean)) {
    clean = clean.replace(/^[0-9a-fA-F]+\r?\n/, '').trim();
  }
  clean = clean.replace(/\r?\n0(?:\r?\n)*$/, '').trim();

  try {
    const parsed = JSON.parse(clean);
    return inferJsonSchemaFromValue(parsed);
  } catch {
    // If not JSON, default to text payload schema
    return { type: 'string', example: bodyStr.slice(0, 100) };
  }
}

/**
 * Helper to infer clean semantic OpenAPI Resource Tag from URL path
 * e.g. /api/todos/123 -> "Todos", /api/users -> "Users", /style.css -> "Static Assets"
 */
export function inferResourceTag(path: string, fallbackTag?: string): string {
  if (fallbackTag && fallbackTag !== 'Code Controllers' && fallbackTag !== 'Captured Traffic' && !fallbackTag.startsWith('Port :')) {
    return fallbackTag;
  }
  const clean = path.split('?')[0].replace(/^\/+|\/+$/g, '');
  if (!clean) return 'Root';
  const parts = clean.split('/');
  const nonPrefixParts = parts.filter((p) => !/^v\d+$/i.test(p) && p.toLowerCase() !== 'api');
  const target = nonPrefixParts[0] || parts[0];
  if (!target || target.startsWith('{')) return 'General';
  if (/\.(js|css|png|jpg|jpeg|ico|svg|json|map|html|txt)$/i.test(target)) {
    return 'Static Assets';
  }
  return target
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Detects whether a captured request path is noise, an SPA HTML fallback, or an automated scanner probe.
 * e.g. /.env, /.git, /.svn, *.yml, *.pem, *.key, /admin, /geoserver, config.php.bak, etc.
 */
export function isNoiseOrScannerProbe(path: string, bodyPreview?: string, headers?: Record<string, string>): boolean {
  if (!path) return true;
  const clean = path.split('?')[0].toLowerCase().trim();

  // Root or standard favicon / robots / crossdomain
  if (['/favicon.ico', '/robots.txt', '/sitemap.xml', '/crossdomain.xml', '/clientaccesspolicy.xml'].includes(clean)) return true;

  // Development bundler & HMR noise
  if (
    clean.includes('/@vite/') ||
    clean.includes('/@fs/') ||
    clean.includes('/@id/') ||
    clean.includes('__vite_ping') ||
    clean.includes('_next/webpack-hmr') ||
    clean.includes('hot-update')
  ) {
    return true;
  }

  // Security probes, CI/CD configs, and common automated internet scanners
  const probePatterns = [
    // Hidden folders and dotfiles
    /^\/\.(env|git|svn|hg|bzr|cvs|docker|terraform|circleci|aws|ssh|pip|netrc|pypirc|bash|zsh|sh|well-known|ds_store)/i,
    // CI/CD pipelines and infrastructure configs
    /^\/(bitbucket-pipelines|buildspec|cloudbuild|jenkinsfile|serverless|procfile|dockerfile|docker-compose|netlify\.toml|vercel\.json)/i,
    // Server administration / third-party software probes
    /^\/(geoserver|minio|actuator|admin|phpmyadmin|pma|adminer|cgi-bin|solr|nacos|druid|struts|graphiql|server-info|server-status)/i,
    // Certificates and keys
    /^\/(ssl|certs|keys|certificates|id_rsa|id_dsa|id_ed25519)/i,
    // Configuration and backup scripts
    /^\/(configuration|config|settings|database)\.(php|bak|old|orig)/i,
    // Sensitive file extensions
    /\.(pem|key|crt|csr|p12|pfx|pkcs8|bak|sql|tar|gz|zip|rar|7z|old|temp|tmp|yml|yaml|toml|ini|conf|config|cfg|db|sqlite|log|sh|bash)$/i,
  ];

  if (probePatterns.some((pattern) => pattern.test(clean))) {
    return true;
  }

  // Check for SPA index.html fallback serving HTML for non-root URLs
  const contentType = headers
    ? Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1]?.toLowerCase()
    : '';

  if ((contentType?.includes('text/html') || bodyPreview) && clean !== '' && clean !== '/') {
    const isHtmlBody = bodyPreview
      ? bodyPreview.trim().toLowerCase().startsWith('<!doctype html') || bodyPreview.trim().toLowerCase().startsWith('<html')
      : Boolean(contentType?.includes('text/html'));

    if (isHtmlBody) {
      // Non-root requests returning HTML document are SPA index fallback catch-alls, not REST APIs
      return true;
    }
  }

  return false;
}

/**
 * Automatically parameterizes dynamic URL segments into OpenAPI path templates.
 * e.g. /api/todos/todo-1787085033407-5x3gn -> /api/todos/{id}
 * e.g. /api/users/55 -> /api/users/{id}
 * e.g. /api/orders/c0a80101-0000-1000-8000-00805f9b34fb -> /api/orders/{id}
 */
export function parameterizePath(rawPath: string): { parameterizedPath: string; pathParams: string[] } {
  const parts = rawPath.split('/');
  const pathParams: string[] = [];
  const newParts = parts.map((part) => {
    if (!part) return part;
    const isNumeric = /^\d+$/.test(part);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
    const isMongoId = /^[0-9a-f]{24}$/i.test(part);
    const isPrefixedId = /^[a-z0-9]+[-_][a-z0-9-_]+$/i.test(part) && part.length >= 8;

    if (isNumeric || isUuid || isMongoId || isPrefixedId) {
      const paramName = 'id';
      if (!pathParams.includes(paramName)) {
        pathParams.push(paramName);
      }
      return `{${paramName}}`;
    }
    return part;
  });

  return {
    parameterizedPath: newParts.join('/'),
    pathParams,
  };
}

/**
 * Main OpenAPI 3.0.3 Specification Generator Engine
 */
export function generateOpenApiSpec(
  endpoints: ScannedEndpoint[],
  requests: RequestLog[],
  workspaceName: string = 'Proxync Workspace',
  languageHint: string = 'HTTP Node Server',
  serverList?: { url: string; description: string }[],
  existingDoc?: Record<string, unknown>
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  const tagsMap = new Map<string, string>();

  // Preserve and merge existing paths from previously generated OpenAPI spec (purging legacy noise/probes)
  if (existingDoc && existingDoc.paths && typeof existingDoc.paths === 'object') {
    Object.entries(existingDoc.paths as Record<string, Record<string, unknown>>).forEach(([p, methods]) => {
      // Drop default health check placeholder and legacy scanner probe paths
      if (p === '/api/health' && (endpoints.length > 0 || requests.length > 0)) {
        return;
      }
      if (isNoiseOrScannerProbe(p)) {
        return;
      }
      paths[p] = { ...methods };
    });
  }

  // Preserve existing tags (filtering out probe tags)
  if (existingDoc && Array.isArray(existingDoc.tags)) {
    (existingDoc.tags as { name: string; description?: string }[]).forEach((t) => {
      if (t && t.name && t.name !== 'Health') {
        const dummyPath = `/${t.name.toLowerCase()}`;
        if (!isNoiseOrScannerProbe(dummyPath)) {
          tagsMap.set(t.name, t.description || `Operations related to ${t.name}`);
        }
      }
    });
  }

  // Helper to ensure path exists in spec
  const getPathObj = (pathStr: string) => {
    if (!paths[pathStr]) {
      paths[pathStr] = {};
    }
    return paths[pathStr];
  };

  // 1. Ingestion of Static Codebase Scanned Endpoints
  endpoints.forEach((ep) => {
    const pathObj = getPathObj(ep.path);
    const methodLower = ep.method.toLowerCase();
    const resourceTag = inferResourceTag(ep.path, ep.tag);

    const pathParameters = ep.pathParams.map((pName) => ({
      name: pName,
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `Path parameter ${pName}`,
    }));

    pathObj[methodLower] = {
      summary: `${ep.method} ${ep.path}`,
      description: `Endpoint scanned from codebase file: ${ep.fileSource}`,
      tags: [resourceTag],
      'x-proxync-source': 'code',
      'x-proxync-file': ep.fileSource,
      parameters: pathParameters,
      responses: {
        '200': {
          description: 'Successful Response',
          content: {
            'application/json': {
              schema: { type: 'object', properties: {} },
            },
          },
        },
      },
    };

    tagsMap.set(resourceTag, `Operations related to ${resourceTag}`);
  });

  // 2. Ingestion & Schema Enrichment from Live Captured Traffic
  requests.forEach((req) => {
    if (!req.path) return;

    // Reject automated scanner/bot probes, SPA HTML fallbacks, and bundler noise
    if (isNoiseOrScannerProbe(req.path, req.bodyPreview, req.headers)) {
      return;
    }

    // Only ingest completed requests with valid HTTP status (exclude pending, 502 Bad Gateway, 503, 404 bot probes)
    const rawStatus = req.status;
    if (rawStatus === 'pending' || rawStatus === 502 || rawStatus === 503 || rawStatus === 504 || rawStatus === '502' || rawStatus === 404 || rawStatus === '404') {
      return;
    }

    // Remove query params, strip protocol/host if absolute URL, and parameterize dynamic IDs e.g. /api/todos/todo-123 -> /api/todos/{id}
    let urlPath = req.path.split('?')[0].trim();
    if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
      try {
        urlPath = new URL(urlPath).pathname;
      } catch {
        urlPath = urlPath.replace(/^https?:\/\/[^/]+/, '');
      }
    }
    if (!urlPath.startsWith('/')) {
      urlPath = '/' + urlPath;
    }

    const { parameterizedPath, pathParams } = parameterizePath(urlPath);
    const methodLower = (req.method || 'GET').toLowerCase();

    // Check if path matches an existing parameterized path e.g. /api/users/{id}
    let matchedPath = parameterizedPath;
    for (const registeredPath of Object.keys(paths)) {
      const regexPattern = '^' + registeredPath.replace(/\{[a-zA-Z0-9_]+\}/g, '[^/]+') + '$';
      if (new RegExp(regexPattern).test(urlPath)) {
        matchedPath = registeredPath;
        break;
      }
    }

    const resourceTag = inferResourceTag(matchedPath);
    const pathObj = getPathObj(matchedPath);
    const methodOperation = (pathObj[methodLower] as Record<string, unknown>) || {
      summary: `${req.method} ${matchedPath}`,
      description: 'Captured live traffic HTTP endpoint',
      tags: [resourceTag],
      'x-proxync-source': 'traffic',
      responses: {},
    };

    // Always ensure semantic resource tag, source, port, server, and tunnel metadata are set
    methodOperation.tags = [resourceTag];
    methodOperation['x-proxync-source'] = 'traffic';
    if (req.port) {
      methodOperation['x-proxync-port'] = req.port;
    }
    if (req.serverName) {
      methodOperation['x-proxync-server'] = req.serverName;
    }
    if (req.tunnelUrl) {
      methodOperation['x-proxync-tunnel-url'] = req.tunnelUrl;
    }
    // Attach path parameters if path contains dynamic parameter templates like {id}
    if (pathParams.length > 0 && !methodOperation.parameters) {
      methodOperation.parameters = pathParams.map((pName) => ({
        name: pName,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `Path parameter ${pName}`,
      }));
    }

    // Attach per-endpoint server definitions matching its active public tunnel & local port
    if (req.tunnelUrl || req.port) {
      const opServers: { url: string; description: string }[] = [];
      if (req.tunnelUrl) {
        opServers.push({
          url: req.tunnelUrl,
          description: `Proxync Tunnel (${req.subdomain ? `${req.subdomain} - ` : ''}Port :${req.port || 'live'})`,
        });
      }
      if (req.port) {
        opServers.push({
          url: `http://localhost:${req.port}`,
          description: `Local Server (${req.serverName || `Port :${req.port}`})`,
        });
      }
      methodOperation.servers = opServers;
    }

    // Parse status code
    const statusCode = String(req.status || '200');
    const responsesObj = (methodOperation.responses as Record<string, unknown>) || {};

    // Infer Response Schema from captured response body (or fallback to body preview)
    const respSchema = inferSchemaFromRawBody(req.responseBodyPreview || req.bodyPreview);
    responsesObj[statusCode] = {
      description: `Status ${statusCode} HTTP Response`,
      content: {
        'application/json': {
          schema: respSchema || { type: 'object' },
        },
      },
    };

    methodOperation.responses = responsesObj;

    // Infer Request Body for POST/PUT/PATCH methods
    if (['post', 'put', 'patch'].includes(methodLower) && req.bodyPreview) {
      const reqSchema = inferSchemaFromRawBody(req.bodyPreview);
      if (reqSchema) {
        methodOperation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: reqSchema,
            },
          },
        };
      }
    }

    pathObj[methodLower] = methodOperation;
    tagsMap.set(resourceTag, `Operations related to ${resourceTag}`);
  });

  // Default fallback if paths empty
  if (Object.keys(paths).length === 0) {
    paths['/api/health'] = {
      get: {
        summary: 'API Health Check',
        description: 'Default placeholder endpoint until workspace code or traffic is scanned',
        tags: ['Health'],
        'x-proxync-source': 'default',
        responses: {
          '200': {
            description: 'System healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', example: 100 },
                  },
                },
              },
            },
          },
        },
      },
    };
    tagsMap.set('Health', 'System health checks');
  }

  // Construct final OpenAPI 3.0.3 document
  const tagsList = Array.from(tagsMap.entries()).map(([name, description]) => ({ name, description }));

  // Derive global servers from serverList or captured requests
  const finalServers: { url: string; description: string }[] = [];
  if (serverList && serverList.length > 0) {
    finalServers.push(...serverList);
  } else {
    const seenUrls = new Set<string>();
    requests.forEach((r) => {
      if (r.tunnelUrl && !seenUrls.has(r.tunnelUrl)) {
        seenUrls.add(r.tunnelUrl);
        finalServers.push({
          url: r.tunnelUrl,
          description: `Proxync Tunnel (${r.subdomain ? `${r.subdomain} - ` : ''}Port :${r.port || 'live'})`,
        });
      }
      if (r.port) {
        const localUrl = `http://localhost:${r.port}`;
        if (!seenUrls.has(localUrl)) {
          seenUrls.add(localUrl);
          finalServers.push({
            url: localUrl,
            description: `Local Server (${r.serverName || `Port :${r.port}`})`,
          });
        }
      }
    });
    if (finalServers.length === 0) {
      finalServers.push({ url: 'http://localhost:3000', description: 'Local Development Server' });
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: `${workspaceName} API`,
      description: `Automatically generated OpenAPI specification for ${workspaceName} (${languageHint}). Generated by Proxync Studio.`,
      version: '1.0.0',
    },
    servers: finalServers,
    tags: tagsList,
    paths,
  };
}

/**
 * Converts OpenAPI Spec to Postman Collection v2.1 JSON
 */
export function exportSwaggerToPostmanCollection(
  openApiDoc: Record<string, unknown>
): Record<string, unknown> {
  const info = (openApiDoc.info || {}) as { title?: string; description?: string };
  const paths = (openApiDoc.paths || {}) as Record<string, Record<string, unknown>>;

  const tagFolders = new Map<string, any[]>();

  Object.entries(paths).forEach(([pathStr, methods]) => {
    Object.entries(methods).forEach(([methodStr, details]) => {
      const op = details as {
        summary?: string;
        description?: string;
        tags?: string[];
        requestBody?: any;
      };

      const tag = op.tags && op.tags[0] ? op.tags[0] : 'General';
      if (!tagFolders.has(tag)) {
        tagFolders.set(tag, []);
      }

      // Convert path parameter braces {id} to Postman syntax :id
      const postmanPath = pathStr.replace(/\{([a-zA-Z0-9_]+)\}/g, ':$1');
      const urlParts = postmanPath.split('/').filter(Boolean);

      // Extract raw body if present
      let rawBody = '';
      if (op.requestBody?.content?.['application/json']?.schema) {
        rawBody = JSON.stringify(op.requestBody.content['application/json'].schema, null, 2);
      }

      const postmanItem = {
        name: op.summary || pathStr,
        request: {
          method: methodStr.toUpperCase(),
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          body: rawBody
            ? {
                mode: 'raw',
                raw: rawBody,
                options: {
                  raw: {
                    language: 'json',
                  },
                },
              }
            : undefined,
          url: {
            raw: `{{baseUrl}}${postmanPath}`,
            host: ['{{baseUrl}}'],
            path: urlParts,
          },
          description: op.description || '',
        },
        response: [],
      };

      tagFolders.get(tag)!.push(postmanItem);
    });
  });

  const collectionItems = Array.from(tagFolders.entries()).map(([tagName, items]) => ({
    name: tagName,
    item: items,
  }));

  return {
    info: {
      name: info.title || 'Proxync Exported Collection',
      description: info.description || 'Exported from Proxync OpenAPI Spec Generator',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string',
      },
    ],
    item: collectionItems,
  };
}

/**
 * Converts OpenAPI Spec JSON object to formatted YAML string
 */
export function exportOpenApiToYaml(obj: Record<string, unknown>, indentLevel: number = 0): string {
  const indent = ' '.repeat(indentLevel);
  let yamlStr = '';

  Object.entries(obj).forEach(([key, val]) => {
    if (val === undefined) return;

    if (val === null) {
      yamlStr += `${indent}${key}: null\n`;
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        yamlStr += `${indent}${key}: []\n`;
      } else {
        yamlStr += `${indent}${key}:\n`;
        val.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            const nested = exportOpenApiToYaml(item as Record<string, unknown>, indentLevel + 4);
            const firstLineIndex = nested.indexOf('\n');
            const formattedItem = nested.substring(0, firstLineIndex).trimStart();
            const rest = nested.substring(firstLineIndex + 1);
            yamlStr += `${indent}  - ${formattedItem}\n${rest}`;
          } else {
            yamlStr += `${indent}  - ${JSON.stringify(item)}\n`;
          }
        });
      }
    } else if (typeof val === 'object') {
      yamlStr += `${indent}${key}:\n${exportOpenApiToYaml(val as Record<string, unknown>, indentLevel + 2)}`;
    } else if (typeof val === 'string') {
      if (val.includes('\n') || val.includes(':') || val.includes('#')) {
        yamlStr += `${indent}${key}: ${JSON.stringify(val)}\n`;
      } else {
        yamlStr += `${indent}${key}: ${val}\n`;
      }
    } else {
      yamlStr += `${indent}${key}: ${String(val)}\n`;
    }
  });

  return yamlStr;
}

/**
 * Imports a Postman Collection JSON object into OpenAPI 3.0 format
 */
export function importPostmanToOpenApi(postmanJson: Record<string, unknown>): Record<string, unknown> {
  const info = (postmanJson.info || {}) as { name?: string; description?: string };
  const items = (postmanJson.item || []) as any[];

  const paths: Record<string, Record<string, unknown>> = {};

  const processPostmanItem = (item: any, tag: string = 'General') => {
    if (item.item && Array.isArray(item.item)) {
      // It's a folder
      const folderTag = item.name || tag;
      item.item.forEach((subItem: any) => processPostmanItem(subItem, folderTag));
    } else if (item.request) {
      const req = item.request;
      const method = (req.method || 'GET').toLowerCase();

      let urlPath = '/';
      if (typeof req.url === 'string') {
        urlPath = req.url.replace(/^https?:\/\/[^/]+/, '');
      } else if (req.url && req.url.path) {
        urlPath = '/' + (Array.isArray(req.url.path) ? req.url.path.join('/') : req.url.path);
      }

      // Convert Postman :id params to OpenAPI {id}
      urlPath = urlPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

      if (!paths[urlPath]) {
        paths[urlPath] = {};
      }

      paths[urlPath][method] = {
        summary: item.name || `${method.toUpperCase()} ${urlPath}`,
        description: req.description || '',
        tags: [tag],
        responses: {
          '200': {
            description: 'Successful Response',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      };
    }
  };

  items.forEach((it) => processPostmanItem(it));

  return {
    openapi: '3.0.3',
    info: {
      title: info.name || 'Imported Postman OpenAPI Spec',
      description: info.description || 'Converted from Postman Collection JSON',
      version: '1.0.0',
    },
    paths,
  };
}

/**
 * Converts OpenAPI Spec / Postman JSON into array of SavedRequest items for PostmanView
 */
export function importSwaggerToSavedRequests(openApiDoc: Record<string, unknown>): any[] {
  const collection = exportSwaggerToPostmanCollection(openApiDoc);
  const items = (collection.item || []) as any[];
  const newRequests: any[] = [];

  items.forEach((folderItem: any) => {
    const folderName = folderItem.name || 'Imported Swagger';
    const subItems = folderItem.item || [];

    subItems.forEach((reqItem: any) => {
      const req = reqItem.request || {};
      const method = (req.method || 'GET').toUpperCase();
      const rawUrl = typeof req.url === 'string' ? req.url : req.url?.raw || '/';
      const path = rawUrl.replace(/^\{\{baseUrl\}\}/, '').replace(/^https?:\/\/[^/]+/, '');

      let bodyStr = '';
      if (req.body?.raw) {
        bodyStr = req.body.raw;
      }

      const cleanItemName = stripMethodPrefix(reqItem.name || path || '/');

      newRequests.push({
        id: `imported-swg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: cleanItemName || path || '/',
        method,
        path: path || '/',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        source: 'manual',
        collectionName: folderName,
      });
    });
  });

  return newRequests;
}

