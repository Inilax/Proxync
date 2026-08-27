import type { ScannedEndpoint } from './codebaseScanner';
import type { RequestLog } from './types';
import { stripMethodPrefix } from '../components/views/SharedComponents';

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

  try {
    const parsed = JSON.parse(bodyStr);
    return inferJsonSchemaFromValue(parsed);
  } catch {
    // If not JSON, default to text payload schema
    return { type: 'string', example: bodyStr.slice(0, 100) };
  }
}

/**
 * Main OpenAPI 3.0.3 Specification Generator Engine
 */
export function generateOpenApiSpec(
  endpoints: ScannedEndpoint[],
  requests: RequestLog[],
  workspaceName: string = 'Proxync Workspace',
  languageHint: string = 'HTTP Node Server'
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  const tagsMap = new Map<string, string>();

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
      tags: [ep.tag],
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

    tagsMap.set(ep.tag, `Endpoints belonging to ${ep.tag} controller`);
  });

  // 2. Ingestion & Schema Enrichment from Live Captured Traffic
  requests.forEach((req) => {
    if (!req.path || req.path === '/favicon.ico') return;

    // Remove query params from path
    const urlPath = req.path.split('?')[0];
    const methodLower = (req.method || 'GET').toLowerCase();

    // Check if path matches an existing parameterized path e.g. /api/users/{id}
    let matchedPath = urlPath;
    for (const registeredPath of Object.keys(paths)) {
      const regexPattern = '^' + registeredPath.replace(/\{[a-zA-Z0-9_]+\}/g, '[^/]+') + '$';
      if (new RegExp(regexPattern).test(urlPath)) {
        matchedPath = registeredPath;
        break;
      }
    }

    const pathObj = getPathObj(matchedPath);
    const methodOperation = (pathObj[methodLower] as Record<string, unknown>) || {
      summary: `${req.method} ${matchedPath}`,
      description: 'Captured live traffic HTTP endpoint',
      tags: ['Captured Traffic'],
      responses: {},
    };

    // Parse status code
    const statusCode = String(req.status || '200');
    const responsesObj = (methodOperation.responses as Record<string, unknown>) || {};

    // Infer Response Schema from captured body
    const respSchema = inferSchemaFromRawBody(req.bodyPreview);
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
    tagsMap.set('Captured Traffic', 'Endpoints recorded from live proxy traffic');
  });

  // Default fallback if paths empty
  if (Object.keys(paths).length === 0) {
    paths['/api/health'] = {
      get: {
        summary: 'API Health Check',
        description: 'Default placeholder endpoint until workspace code or traffic is scanned',
        tags: ['Health'],
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

  return {
    openapi: '3.0.3',
    info: {
      title: `${workspaceName} API`,
      description: `Automatically generated OpenAPI specification for ${workspaceName} (${languageHint}). Generated by Proxync Studio.`,
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
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

