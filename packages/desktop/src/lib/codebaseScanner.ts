import { invoke } from '@tauri-apps/api/core';

export interface ScannedEndpoint {
  id: string;
  method: string; // 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'
  path: string; // e.g. '/api/users/{id}'
  rawPath: string; // e.g. '/api/users/:id' or '/api/users/[id]'
  pathParams: string[]; // e.g. ['id']
  tag: string; // e.g. 'Users'
  fileSource: string; // e.g. 'src/controllers/userController.ts'
  lineNumber?: number; // 1-indexed line number where route is defined
  compiledRegex?: RegExp; // Cached compiled regex for path matching
  description?: string;
}

/**
 * Normalizes dynamic path parameters into OpenAPI standard `{param}` format.
 * Examples:
 *   /api/users/:id -> /api/users/{id}
 *   /api/users/[id] -> /api/users/{id}
 *   /api/users/<id> -> /api/users/{id}
 *   /api/users/{id} -> /api/users/{id}
 */
export function normalizeOpenApiPath(rawPath: string): { normalizedPath: string; pathParams: string[] } {
  let path = rawPath.trim();

  // Ensure path starts with slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Remove query strings if present in route definition
  if (path.includes('?')) {
    path = path.split('?')[0];
  }

  const pathParams: string[] = [];

  // Convert Express style `:id` -> `{id}`
  path = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
    if (!pathParams.includes(paramName)) pathParams.push(paramName);
    return `{${paramName}}`;
  });

  // Convert Next.js / Remix style `[id]` or `[...slug]` -> `{id}`
  path = path.replace(/\[(?:\.\.\.)?([a-zA-Z0-9_]+)\]/g, (_, paramName) => {
    if (!pathParams.includes(paramName)) pathParams.push(paramName);
    return `{${paramName}}`;
  });

  // Convert Flask / Python style `<id>` or `<type:id>` -> `{id}`
  path = path.replace(/<([^>]+)>/g, (_, content) => {
    const parts = content.split(':');
    const paramName = parts[parts.length - 1].trim();
    if (!pathParams.includes(paramName)) pathParams.push(paramName);
    return `{${paramName}}`;
  });

  // Extract pre-existing `{id}` params
  const existingMatches = path.match(/\{([a-zA-Z0-9_]+)\}/g);
  if (existingMatches) {
    existingMatches.forEach((m) => {
      const pName = m.replace(/[\{\}]/g, '');
      if (!pathParams.includes(pName)) pathParams.push(pName);
    });
  }

  return { normalizedPath: path, pathParams };
}

/**
 * Extracts controller tag from file path or class name
 */
export function deriveControllerTag(relPath: string): string {
  const parts = relPath.split(/[/\\]/);
  const fileName = parts[parts.length - 1] || 'Default';

  // Strip extension
  const baseName = fileName.replace(/\.(ts|js|jsx|tsx|py|go|java|cs|rs)$/i, '');

  // Strip common suffixes
  const cleanName = baseName
    .replace(/(Controller|Router|Routes|Service|Handler|Api|View|Route)$/i, '')
    .replace(/^(app|index|main|route)$/i, '');

  if (cleanName && cleanName.length > 1) {
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }

  // Use parent directory if baseName is index/route
  if (parts.length > 1) {
    const parentDir = parts[parts.length - 2];
    if (parentDir && parentDir !== 'src' && parentDir !== 'pages' && parentDir !== 'app' && parentDir !== 'api') {
      return parentDir.charAt(0).toUpperCase() + parentDir.slice(1);
    }
  }

  return 'General';
}

/**
 * Parses route definitions from source code text content
 */
export function parseRoutesFromCode(fileContent: string, relPath: string): ScannedEndpoint[] {
  const endpoints: ScannedEndpoint[] = [];
  const tag = deriveControllerTag(relPath);

  // 1. Express / Fastify / Connect patterns:
  // e.g. app.get('/api/users/:id', ...), router.post('/login', ...)
  const expressRegex = /(?:app|router|fastify|server)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match: RegExpExecArray | null;

  while ((match = expressRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];
    const { normalizedPath, pathParams } = normalizeOpenApiPath(rawPath);

    endpoints.push({
      id: `${relPath}-${method}-${rawPath}-${endpoints.length}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag,
      fileSource: relPath,
    });
  }

  // 2. NestJS / TypeScript Decorators:
  // e.g. @Get(':id'), @Post('/users'), @Controller('users')
  const nestControllerMatch = fileContent.match(/@Controller\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/i);
  const controllerPrefix = nestControllerMatch ? nestControllerMatch[1] : '';

  const nestMethodRegex = /@(Get|Post|Put|Delete|Patch|Options|Head)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/gi;
  while ((match = nestMethodRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const subPath = match[2] || '';
    const fullRawPath = `/${controllerPrefix}/${subPath}`.replace(/\/+/g, '/');
    const { normalizedPath, pathParams } = normalizeOpenApiPath(fullRawPath);

    endpoints.push({
      id: `${relPath}-nest-${method}-${fullRawPath}-${endpoints.length}`,
      method,
      path: normalizedPath,
      rawPath: fullRawPath,
      pathParams,
      tag: controllerPrefix ? controllerPrefix.charAt(0).toUpperCase() + controllerPrefix.slice(1) : tag,
      fileSource: relPath,
    });
  }

  // 3. Next.js App Router / Pages Router file convention:
  // e.g. app/api/users/[id]/route.ts
  if (relPath.includes('api/') || relPath.includes('pages/api/')) {
    let routePath = relPath;
    // Strip src/, app/, pages/
    routePath = routePath.replace(/^.*?(?:api\/|pages\/api\/)/i, '/api/');
    routePath = routePath.replace(/\/(route|index)\.(ts|js|tsx|jsx)$/i, '');
    routePath = routePath.replace(/\.(ts|js|tsx|jsx)$/i, '');

    // Check HTTP handlers exported in the file
    const exportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    exportedMethods.forEach((method) => {
      const handlerRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`, 'i');
      if (handlerRegex.test(fileContent)) {
        const { normalizedPath, pathParams } = normalizeOpenApiPath(routePath);
        endpoints.push({
          id: `${relPath}-next-${method}-${routePath}`,
          method,
          path: normalizedPath,
          rawPath: routePath,
          pathParams,
          tag: 'API',
          fileSource: relPath,
        });
      }
    });
  }

  // 4. Python (FastAPI / Flask / Django):
  // e.g. @app.get("/items/{item_id}") or @router.post("/login")
  const pythonRegex = /@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = pythonRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];
    const { normalizedPath, pathParams } = normalizeOpenApiPath(rawPath);

    endpoints.push({
      id: `${relPath}-py-${method}-${rawPath}-${endpoints.length}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag: tag || 'Python API',
      fileSource: relPath,
    });
  }

  // 5. Spring Boot / Java:
  // e.g. @GetMapping("/users/{id}"), @PostMapping
  const springRegex = /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]*)['"`]\s*\)/gi;
  while ((match = springRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2] || '/';
    const { normalizedPath, pathParams } = normalizeOpenApiPath(rawPath);

    endpoints.push({
      id: `${relPath}-spring-${method}-${rawPath}-${endpoints.length}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag: tag || 'Spring Controller',
      fileSource: relPath,
    });
  }

  // 6. Go (Gin / Chi / Gorilla Mux / Fiber):
  // e.g. r.GET("/api/v1/users/:id", ...)
  const goRegex = /(?:r|router|app|grp|api|v1)\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["`]([^"`]+)["`]/gi;
  while ((match = goRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];
    const { normalizedPath, pathParams } = normalizeOpenApiPath(rawPath);

    endpoints.push({
      id: `${relPath}-go-${method}-${rawPath}-${endpoints.length}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag: tag || 'Go API',
      fileSource: relPath,
    });
  }

  return endpoints;
}

/**
 * Reads project files via native Rust command and parses all API route signatures
 */
export async function scanCodebaseEndpoints(
  projectRootPath: string,
  scannedFiles: string[]
): Promise<ScannedEndpoint[]> {
  if (!projectRootPath || !scannedFiles || scannedFiles.length === 0) {
    return [];
  }

  const allEndpoints: ScannedEndpoint[] = [];
  const seenKeys = new Set<string>();

  // Filter relevant source files
  const targetFiles = scannedFiles.filter((f) => {
    const lower = f.toLowerCase();
    return (
      (lower.includes('controller') ||
        lower.includes('route') ||
        lower.includes('api') ||
        lower.includes('handler') ||
        lower.includes('server') ||
        lower.includes('app') ||
        lower.includes('main') ||
        lower.includes('index')) &&
      !lower.includes('test') &&
      !lower.includes('spec') &&
      !lower.includes('.d.ts')
    );
  });

  // Limit file parsing batch size for performance
  const batch = targetFiles.slice(0, 60);

  for (const relPath of batch) {
    try {
      const content = await invoke<string>('read_file_content', {
        rootPath: projectRootPath,
        relPath,
      });

      if (content) {
        const parsed = parseRoutesFromCode(content, relPath);
        for (const ep of parsed) {
          const key = `${ep.method}:${ep.path}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allEndpoints.push(ep);
          }
        }
      }
    } catch (err) {
      // Continue reading remaining files
    }
  }

  return allEndpoints.map((ep) => ({
    ...ep,
    compiledRegex: compileEndpointRegex(ep.path),
  }));
}

/**
 * Escapes regex literals first, then converts {param} / :param placeholders into regex groups.
 */
export function compileEndpointRegex(openApiPath: string): RegExp {
  let pattern = openApiPath.trim();
  if (pattern.includes('?')) {
    pattern = pattern.split('?')[0];
  }
  pattern = pattern.replace(/\/+$/, '');
  if (!pattern.startsWith('/')) {
    pattern = '/' + pattern;
  }

  // 1. Escape literal regex characters
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 2. Convert escaped parameters back into regex matchers
  // \{param\} -> [^/]+
  const regexString = '^' + escaped.replace(/\\\{[a-zA-Z0-9_]+\\\}/g, '([^/]+)') + '/?$';

  return new RegExp(regexString, 'i');
}

export interface RouteMatchResult {
  exactMatch: ScannedEndpoint | null;
  nearMissMatch: ScannedEndpoint | null;
  nearMissScore?: number;
}

/**
 * Matches a live incoming request against scanned codebase endpoints.
 * Precedence: Exact Static > Dynamic Regex Match > 3-Tier Near-Miss Scoring
 */
export function matchRequestToScannedRoute(
  method: string,
  rawPath: string,
  endpoints: ScannedEndpoint[]
): RouteMatchResult {
  if (!rawPath || endpoints.length === 0) {
    return { exactMatch: null, nearMissMatch: null };
  }

  const reqMethod = (method || 'GET').toUpperCase();
  // Strip query params and trailing slash
  let reqPath = rawPath.split('?')[0].trim().replace(/\/+$/, '');
  if (!reqPath.startsWith('/')) reqPath = '/' + reqPath;

  const candidateEndpoints = endpoints.filter(
    (e) => e.method.toUpperCase() === reqMethod || e.method.toUpperCase() === 'ALL'
  );

  // 1. Check Exact Static Match first (Literal equality outranks regex)
  const exactStatic = candidateEndpoints.find(
    (e) => e.path.replace(/\/+$/, '') === reqPath && !e.path.includes('{')
  );
  if (exactStatic) {
    return { exactMatch: exactStatic, nearMissMatch: null };
  }

  // 2. Check Dynamic Regex Match (Memoized Regex)
  for (const ep of candidateEndpoints) {
    const reg = ep.compiledRegex || compileEndpointRegex(ep.path);
    if (reg.test(reqPath)) {
      return { exactMatch: ep, nearMissMatch: null };
    }
  }

  // 3. 3-Tier Near-Miss Scoring Algorithm (when exact match fails)
  // Formula: +10 literal match, +5 param match, -5 literal mismatch, -10 segment count diff
  const reqSegments = reqPath.split('/').filter(Boolean);

  let bestNearMiss: ScannedEndpoint | null = null;
  let highestScore = -Infinity;

  for (const ep of candidateEndpoints) {
    const scannedPathClean = ep.path.split('?')[0].trim().replace(/\/+$/, '');
    const scannedSegments = scannedPathClean.split('/').filter(Boolean);

    let score = 0;

    // Aligned segment comparison
    const maxLen = Math.min(reqSegments.length, scannedSegments.length);
    for (let i = 0; i < maxLen; i++) {
      const reqSeg = reqSegments[i];
      const scanSeg = scannedSegments[i];

      if (scanSeg.startsWith('{') && scanSeg.endsWith('}')) {
        score += 5; // Parameter match
      } else if (reqSeg.toLowerCase() === scanSeg.toLowerCase()) {
        score += 10; // Literal match
      } else {
        score -= 5; // Literal mismatch penalty
      }
    }

    // Segment count differential penalty (-10 per missing/extra segment)
    const segmentDiff = Math.abs(scannedSegments.length - reqSegments.length);
    score -= segmentDiff * 10;

    if (score > highestScore && score >= 5) {
      highestScore = score;
      bestNearMiss = ep;
    }
  }

  return {
    exactMatch: null,
    nearMissMatch: bestNearMiss,
    nearMissScore: bestNearMiss ? highestScore : undefined,
  };
}

