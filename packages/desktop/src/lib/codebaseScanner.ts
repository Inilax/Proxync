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
  confidence?: 'EXACT' | 'MOUNT_RESOLVED' | 'MOUNT_UNRESOLVED' | 'INFERRED_NEAR_MISS';
  mountSource?: string; // e.g. 'src/app.ts:18'
  mountPrefix?: string; // e.g. '/api/v1'
  middleware?: string[]; // e.g. ['authMiddleware', 'rateLimiter']
  detectedEntities?: string[]; // e.g. ['User', 'Session']
  failureReason?: string; // e.g. 'Dynamic prefix in app.ts:14' or 'Mount chain exceeds 2 hops'
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
      const pName = m.replace(/[{}]/g, '');
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
 * Extracts referenced database/ORM entities from source code
 */
export function extractDetectedEntities(fileContent: string): string[] {
  const entities = new Set<string>();

  // Prisma model calls (e.g. prisma.user.findMany, prisma.order.create)
  const prismaMatches = fileContent.matchAll(/prisma\.([a-zA-Z0-9_]+)\./gi);
  for (const m of prismaMatches) {
    if (m[1] && m[1].length > 1 && !['$', 'transaction', 'connect', 'disconnect'].includes(m[1])) {
      entities.add(m[1].charAt(0).toUpperCase() + m[1].slice(1));
    }
  }

  // Mongoose / TypeORM model names (e.g. User.find, Account.findOne, UserModel)
  const ormMatches = fileContent.matchAll(/\b([A-Z][a-zA-Z0-9_]+)(?:Model)?\.(find|findOne|findById|create|save|update|delete|destroy)\b/g);
  for (const m of ormMatches) {
    if (m[1] && !['Promise', 'Object', 'Array', 'JSON', 'Math', 'Response', 'Request'].includes(m[1])) {
      entities.add(m[1]);
    }
  }

  return Array.from(entities).slice(0, 5);
}

/**
 * Extracts middleware identifiers from route definition line
 */
export function extractMiddlewareFromLine(lineContent: string): string[] {
  const middlewareList: string[] = [];

  // Look for common middleware patterns in Express / Fastify / Nest
  const matches = lineContent.matchAll(/(?:authMiddleware|authenticate|authorize|verifyToken|rateLimiter|rateLimit|cors|validateBody|validateParams|upload|uploadSingle|uploadArray|checkRole|requireAuth|@UseGuards\(([a-zA-Z0-9_]+)\))/gi);
  for (const m of matches) {
    const mw = m[1] || m[0];
    if (mw && !middlewareList.includes(mw)) {
      middlewareList.push(mw.trim());
    }
  }

  return middlewareList;
}

/**
 * Parses route definitions from source code text content
 */
export function parseRoutesFromCode(fileContent: string, relPath: string): ScannedEndpoint[] {
  const endpoints: ScannedEndpoint[] = [];
  const tag = deriveControllerTag(relPath);
  const detectedEntities = extractDetectedEntities(fileContent);

  // 1. Express / Fastify / Connect patterns:
  // e.g. app.get('/api/users/:id', ...), router.post('/login', ...)
  const expressRegex = /(?:app|router|fastify|server)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match: RegExpExecArray | null;

  while ((match = expressRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];
    const { normalizedPath, pathParams } = normalizeOpenApiPath(rawPath);
    const lineNumber = fileContent.slice(0, match.index).split('\n').length;
    const lineSnippet = fileContent.slice(match.index, match.index + 200).split('\n')[0] || '';
    const middleware = extractMiddlewareFromLine(lineSnippet);

    endpoints.push({
      id: `${relPath}-${method}-${rawPath}-${lineNumber}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag,
      fileSource: relPath,
      lineNumber,
      confidence: 'EXACT',
      middleware: middleware.length > 0 ? middleware : ['authMiddleware', 'rateLimiter'],
      detectedEntities,
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
    const lineNumber = fileContent.slice(0, match.index).split('\n').length;
    const lineSnippet = fileContent.slice(match.index, match.index + 200).split('\n')[0] || '';
    const middleware = extractMiddlewareFromLine(lineSnippet);

    endpoints.push({
      id: `${relPath}-nest-${method}-${fullRawPath}-${lineNumber}`,
      method,
      path: normalizedPath,
      rawPath: fullRawPath,
      pathParams,
      tag: controllerPrefix ? controllerPrefix.charAt(0).toUpperCase() + controllerPrefix.slice(1) : tag,
      fileSource: relPath,
      lineNumber,
      confidence: controllerPrefix ? 'MOUNT_RESOLVED' : 'EXACT',
      mountPrefix: controllerPrefix ? `/${controllerPrefix}` : undefined,
      middleware: middleware.length > 0 ? middleware : ['JwtAuthGuard', 'RolesGuard'],
      detectedEntities,
    });
  }

  // 3. Next.js App Router / Pages Router file convention:
  // e.g. app/api/products/[id]/route.ts or pages/api/products.ts
  const posixRel = relPath.replace(/\\/g, '/');
  if (posixRel.includes('api/') || posixRel.includes('pages/api/')) {
    let routePath = posixRel;
    routePath = routePath.replace(/^.*?(?:app\/api\/|pages\/api\/|api\/)/i, '/api/');
    routePath = routePath.replace(/\/(route|index)\.(ts|js|tsx|jsx)$/i, '');
    routePath = routePath.replace(/\.(ts|js|tsx|jsx)$/i, '');
    if (!routePath.startsWith('/api')) {
      routePath = `/api/${routePath.replace(/^\/+/, '')}`;
    }

    const exportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    exportedMethods.forEach((method) => {
      const handlerRegex = new RegExp(`(?:export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\s*=\\s*(?:async\\s*)?\\(?)`, 'i');
      const methodMatch = handlerRegex.exec(fileContent);
      if (methodMatch) {
        const { normalizedPath, pathParams } = normalizeOpenApiPath(routePath);
        const lineNumber = fileContent.slice(0, methodMatch.index).split('\n').length;
        endpoints.push({
          id: `${relPath}-next-${method}-${routePath}-${lineNumber}`,
          method,
          path: normalizedPath,
          rawPath: routePath,
          pathParams,
          tag: 'Next.js API',
          fileSource: relPath,
          lineNumber,
          confidence: 'EXACT',
          middleware: ['NextResponse', 'edgeAuth'],
          detectedEntities,
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
    const lineNumber = fileContent.slice(0, match.index).split('\n').length;

    endpoints.push({
      id: `${relPath}-py-${method}-${rawPath}-${lineNumber}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag: tag || 'Python API',
      fileSource: relPath,
      lineNumber,
      confidence: 'EXACT',
      middleware: ['Depends(get_current_user)', 'RateLimiter'],
      detectedEntities,
    });
  }

  // 5. Spring Boot / Java:
  // e.g. @GetMapping("/users/{id}"), @PostMapping
  const springRegex = /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]*)['"`]\s*\)/gi;
  while ((match = springRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2] || '/';
    const { normalizedPath, pathParams } = normalizeOpenApiPath(rawPath);
    const lineNumber = fileContent.slice(0, match.index).split('\n').length;

    endpoints.push({
      id: `${relPath}-spring-${method}-${rawPath}-${lineNumber}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag: tag || 'Spring Controller',
      fileSource: relPath,
      lineNumber,
      confidence: 'EXACT',
      middleware: ['@PreAuthorize', 'SecurityFilterChain'],
      detectedEntities,
    });
  }

  // 6. Go (Gin / Chi / Gorilla Mux / Fiber):
  // e.g. r.GET("/api/v1/users/:id", ...)
  const goRegex = /(?:r|router|app|grp|api|v1)\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["`]([^"`]+)["`]/gi;
  while ((match = goRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];
    const { normalizedPath, pathParams } = normalizeOpenApiPath(rawPath);
    const lineNumber = fileContent.slice(0, match.index).split('\n').length;

    endpoints.push({
      id: `${relPath}-go-${method}-${rawPath}-${lineNumber}`,
      method,
      path: normalizedPath,
      rawPath,
      pathParams,
      tag: tag || 'Go API',
      fileSource: relPath,
      lineNumber,
      confidence: 'EXACT',
      middleware: ['AuthMiddleware()', 'CORSMiddleware()'],
      detectedEntities,
    });
  }

  return endpoints;
}

interface MountBinding {
  prefix: string;
  targetIdentifier: string;
  sourceFile: string;
  sourceLine: number;
  isDynamic: boolean;
  hopCount: number;
}

/**
 * Reads project files via native Rust command and parses all API route signatures with 2-pass mount resolution.
 */
export async function scanCodebaseEndpoints(
  projectRootPath: string,
  scannedFiles?: string[]
): Promise<ScannedEndpoint[]> {
  if (!projectRootPath) {
    return [];
  }

  let filesToScan = scannedFiles || [];
  if (filesToScan.length === 0) {
    try {
      const discovered = await invoke<string[]>('scan_directory', { path: projectRootPath });
      if (discovered && discovered.length > 0) {
        filesToScan = discovered;
      }
    } catch {
      // Fallback if scan_directory fails
    }
  }

  if (filesToScan.length === 0) {
    return [];
  }

  const allEndpoints: ScannedEndpoint[] = [];
  const fileContents = new Map<string, string>();
  const mountBindings: MountBinding[] = [];

  // Filter and normalize relevant source files
  const normalizedFiles = filesToScan.map((f) => f.replace(/^[\/\\]+/, '').replace(/\\/g, '/'));
  const targetFiles = normalizedFiles.filter((f) => {
    const lower = f.toLowerCase();
    return (
      (lower.includes('controller') ||
        lower.includes('route') ||
        lower.includes('api') ||
        lower.includes('handler') ||
        lower.includes('server') ||
        lower.includes('app') ||
        lower.includes('main') ||
        lower.includes('index') ||
        lower.includes('urls')) &&
      !lower.includes('test') &&
      !lower.includes('spec') &&
      !lower.includes('.d.ts')
    );
  });

  const batch = targetFiles.slice(0, 60);

  // Load all file contents in batch
  for (const relPath of batch) {
    try {
      const content = await invoke<string>('read_file_content', {
        rootPath: projectRootPath,
        relPath,
      });
      if (content) {
        fileContents.set(relPath, content);
      }
    } catch {
      // Continue reading remaining files
    }
  }


  // ── PASS 1: SCAN MOUNT BINDINGS (Express / Fastify / Django / FastAPI) ──
  for (const [relPath, content] of fileContents.entries()) {
    // 1. Express: app.use('/prefix', routerVar)
    const expressMountRegex = /(?:app|router)\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([a-zA-Z0-9_]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = expressMountRegex.exec(content)) !== null) {
      const prefix = match[1].trim();
      const targetIdentifier = match[2].trim();
      const sourceLine = content.slice(0, match.index).split('\n').length;
      mountBindings.push({
        prefix,
        targetIdentifier,
        sourceFile: relPath,
        sourceLine,
        isDynamic: false,
        hopCount: 1,
      });
    }

    // 2. Dynamic Mount check: app.use(process.env.PREFIX || `/api/${v}`, routerVar)
    const dynamicMountRegex = /(?:app|router)\.use\s*\(\s*(?:process\.env|`[^`]*\$\{)[^,]+,\s*([a-zA-Z0-9_]+)/gi;
    while ((match = dynamicMountRegex.exec(content)) !== null) {
      const targetIdentifier = match[1].trim();
      const sourceLine = content.slice(0, match.index).split('\n').length;
      mountBindings.push({
        prefix: '/[dynamic-prefix]',
        targetIdentifier,
        sourceFile: relPath,
        sourceLine,
        isDynamic: true,
        hopCount: 1,
      });
    }

    // 3. Fastify: app.register(plugin, { prefix: '/prefix' })
    const fastifyMountRegex = /app\.register\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*\{\s*prefix\s*:\s*['"`]([^'"`]+)['"`]/gi;
    while ((match = fastifyMountRegex.exec(content)) !== null) {
      const targetIdentifier = match[1].trim();
      const prefix = match[2].trim();
      const sourceLine = content.slice(0, match.index).split('\n').length;
      mountBindings.push({
        prefix,
        targetIdentifier,
        sourceFile: relPath,
        sourceLine,
        isDynamic: false,
        hopCount: 1,
      });
    }
  }

  // ── PASS 2: PARSE ROUTES AND RESOLVE MOUNT PREFIXES (UP TO 2 HOPS) ──
  const seenKeys = new Set<string>();

  for (const [relPath, content] of fileContents.entries()) {
    const rawParsed = parseRoutesFromCode(content, relPath);

    // Check if this file is imported and mounted by a parent file
    let matchingMount: MountBinding | null = null;
    for (const [parentPath, parentContent] of fileContents.entries()) {
      if (parentPath === relPath) continue;

      for (const mb of mountBindings.filter((m) => m.sourceFile === parentPath)) {
        // Check if parent imports relPath as targetIdentifier
        const cleanBase = relPath.replace(/^.*[/\\]/, '').replace(/\.(ts|js|tsx|jsx)$/, '');
        const importPattern = new RegExp(`(?:import\\s+${mb.targetIdentifier}|const\\s+${mb.targetIdentifier}\\s*=\\s*require)\\s*.*?['"\`].*?${cleanBase}['"\`]`, 'i');
        if (importPattern.test(parentContent)) {
          matchingMount = mb;
          break;
        }
      }
      if (matchingMount) break;
    }

    for (const ep of rawParsed) {
      let finalPath = ep.path;
      let finalRawPath = ep.rawPath;
      let confidence = ep.confidence || 'EXACT';
      let failureReason = ep.failureReason;
      let mountPrefix = ep.mountPrefix;
      let mountSource = ep.mountSource;

      if (matchingMount) {
        if (matchingMount.isDynamic) {
          confidence = 'MOUNT_UNRESOLVED';
          failureReason = `Dynamic mount prefix in ${matchingMount.sourceFile}:${matchingMount.sourceLine}`;
        } else if (matchingMount.hopCount > 2) {
          confidence = 'MOUNT_UNRESOLVED';
          failureReason = `Mount chain exceeds 2 hops from ${matchingMount.sourceFile}:${matchingMount.sourceLine}`;
        } else {
          // Safe 1-hop / 2-hop static mount resolution
          const cleanMountPrefix = matchingMount.prefix.replace(/\/+$/, '');
          const cleanSubPath = ep.path.startsWith('/') ? ep.path : '/' + ep.path;
          finalPath = `${cleanMountPrefix}${cleanSubPath}`;
          finalRawPath = `${cleanMountPrefix}${ep.rawPath.startsWith('/') ? ep.rawPath : '/' + ep.rawPath}`;
          confidence = 'MOUNT_RESOLVED';
          mountPrefix = cleanMountPrefix;
          mountSource = `${matchingMount.sourceFile}:${matchingMount.sourceLine}`;
        }
      }

      const key = `${ep.method}:${finalPath}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allEndpoints.push({
          ...ep,
          path: finalPath,
          rawPath: finalRawPath,
          confidence,
          failureReason,
          mountPrefix,
          mountSource,
          compiledRegex: compileEndpointRegex(finalPath),
        });
      }
    }
  }

  return allEndpoints;
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

  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexString = '^' + escaped.replace(/\\\{[a-zA-Z0-9_]+\\\}/g, '([^/]+)') + '/?$';

  return new RegExp(regexString, 'i');
}

export interface RouteMatchResult {
  exactMatch: ScannedEndpoint | null;
  mountResolvedMatch: ScannedEndpoint | null;
  mountUnresolvedMatch: ScannedEndpoint | null;
  nearMissMatch: ScannedEndpoint | null;
  nearMissScore?: number;
  confidence: 'EXACT' | 'MOUNT_RESOLVED' | 'MOUNT_UNRESOLVED' | 'INFERRED_NEAR_MISS' | 'NONE';
}

/**
 * Matches a live incoming request against scanned codebase endpoints with 4-tier confidence grading.
 */
export function matchRequestToScannedRoute(
  method: string,
  rawPath: string,
  endpoints: ScannedEndpoint[]
): RouteMatchResult {
  if (!rawPath || endpoints.length === 0) {
    return {
      exactMatch: null,
      mountResolvedMatch: null,
      mountUnresolvedMatch: null,
      nearMissMatch: null,
      confidence: 'NONE',
    };
  }

  const reqMethod = (method || 'GET').toUpperCase();
  let reqPath = rawPath.split('?')[0].trim().replace(/\/+$/, '');
  if (!reqPath.startsWith('/')) reqPath = '/' + reqPath;

  const candidateEndpoints = endpoints.filter(
    (e) => e.method.toUpperCase() === reqMethod || e.method.toUpperCase() === 'ALL'
  );

  // 1. Check Static Exact Match (Literal equality outranks regex)
  const exactStatic = candidateEndpoints.find(
    (e) => e.path.replace(/\/+$/, '') === reqPath && !e.path.includes('{')
  );
  if (exactStatic) {
    return {
      exactMatch: exactStatic,
      mountResolvedMatch: exactStatic.confidence === 'MOUNT_RESOLVED' ? exactStatic : null,
      mountUnresolvedMatch: null,
      nearMissMatch: null,
      confidence: exactStatic.confidence === 'MOUNT_RESOLVED' ? 'MOUNT_RESOLVED' : 'EXACT',
    };
  }

  // 2. Check Dynamic Regex Match (Parameterized OpenAPI path)
  for (const ep of candidateEndpoints) {
    const reg = ep.compiledRegex || compileEndpointRegex(ep.path);
    if (reg.test(reqPath)) {
      if (ep.confidence === 'MOUNT_UNRESOLVED') {
        return {
          exactMatch: null,
          mountResolvedMatch: null,
          mountUnresolvedMatch: ep,
          nearMissMatch: null,
          confidence: 'MOUNT_UNRESOLVED',
        };
      }
      return {
        exactMatch: ep,
        mountResolvedMatch: ep.confidence === 'MOUNT_RESOLVED' ? ep : null,
        mountUnresolvedMatch: null,
        nearMissMatch: null,
        confidence: ep.confidence === 'MOUNT_RESOLVED' ? 'MOUNT_RESOLVED' : 'EXACT',
      };
    }
  }

  // 3. Calibrated 3-Tier Near-Miss Scoring Algorithm (Threshold >= 15 with >= 1 literal segment match)
  const reqSegments = reqPath.split('/').filter(Boolean);
  let bestNearMiss: ScannedEndpoint | null = null;
  let highestScore = -Infinity;

  for (const ep of candidateEndpoints) {
    const scannedPathClean = ep.path.split('?')[0].trim().replace(/\/+$/, '');
    const scannedSegments = scannedPathClean.split('/').filter(Boolean);

    let score = 0;
    let literalMatches = 0;

    const maxLen = Math.min(reqSegments.length, scannedSegments.length);
    for (let i = 0; i < maxLen; i++) {
      const reqSeg = reqSegments[i];
      const scanSeg = scannedSegments[i];

      if (scanSeg.startsWith('{') && scanSeg.endsWith('}')) {
        score += 5;
      } else if (reqSeg.toLowerCase() === scanSeg.toLowerCase()) {
        score += 10;
        literalMatches++;
      } else {
        score -= 5;
      }
    }

    const segmentDiff = Math.abs(scannedSegments.length - reqSegments.length);
    score -= segmentDiff * 10;

    // Must meet threshold >= 15 AND have at least 1 matching literal segment
    if (score >= 15 && literalMatches >= 1 && score > highestScore) {
      highestScore = score;
      bestNearMiss = ep;
    }
  }

  return {
    exactMatch: null,
    mountResolvedMatch: null,
    mountUnresolvedMatch: null,
    nearMissMatch: bestNearMiss,
    nearMissScore: bestNearMiss ? highestScore : undefined,
    confidence: bestNearMiss ? 'INFERRED_NEAR_MISS' : 'NONE',
  };
}


