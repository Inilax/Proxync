import type { SchemaDriftReport, SchemaDriftItem } from './types';
import type { OpenApiSchema } from './openApiGenerator';
import {
  inferJsonSchemaFromValue,
  parameterizePath,
  isNoiseOrScannerProbe,
} from './openApiGenerator';

/**
 * Escapes regex literals first, then converts {param} placeholders into regex groups.
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

// ─── Inline Levenshtein Distance & Case Normalization ─────────────────────────
// ponytail: pure stdlib Levenshtein algorithm with snake_case/camelCase normalization.
// Upgrade path: benchmark vs fastest-levenshtein if payload schemas exceed 100 properties.
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Robust rename detection:
 * 1. Matches any length snake_case <-> camelCase (e.g. userId <-> user_id, shippingAddress <-> shipping_address)
 * 2. Matches minor typos or spelling changes within edit distance <= 2
 */
export function isRenameCandidate(a: string, b: string): boolean {
  if (a === b) return false;

  // 1. Exact letter match ignoring underscores and case
  const normA = a.replace(/_/g, '').toLowerCase();
  const normB = b.replace(/_/g, '').toLowerCase();
  if (normA === normB && normA.length > 1) {
    return true;
  }

  // 2. Levenshtein edit distance <= 2
  return levenshtein(a.toLowerCase(), b.toLowerCase()) <= 2;
}

/**
 * Safe JSON parser cleaning HTTP/1.1 chunked transfer encoding headers.
 * Returns null if the string is invalid JSON or truncated, preventing false drift alerts.
 */
export function cleanAndParseJson(bodyStr?: string | null): unknown | null {
  if (!bodyStr || !bodyStr.trim()) return null;
  let clean = bodyStr.trim();

  // Strip leading HTTP/1.1 chunked hex size prefix (e.g. "2a\r\n{..." or "1f\n{...")
  if (/^[0-9a-fA-F]+\r?\n/.test(clean)) {
    clean = clean.replace(/^[0-9a-fA-F]+\r?\n/, '').trim();
  }

  // Strip trailing chunk terminator if present (e.g. "\r\n0" or "\n0")
  clean = clean.replace(/\r?\n0(?:\r?\n)*$/, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Truncated chunk or non-JSON body — fail safely with null
    return null;
  }
}

// ─── Resolve Baseline Schema from live OpenAPI Specification ─────────────────

export interface BaselineResolution {
  schema: OpenApiSchema;
  statusDocumented: boolean;
  docPath: string;
}

/**
 * Resolves the baseline OpenAPI schema for a given runtime request method & path.
 * Uses codebaseScanner's compileEndpointRegex for parameter template matching.
 */
export function resolveBaselineSchema(
  openApiDoc: Record<string, unknown>,
  method: string,
  rawPath: string,
  statusCode: string,
): BaselineResolution | null {
  const paths = openApiDoc.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths || typeof paths !== 'object') return null;

  let cleanReqPath = rawPath.split('?')[0].trim();
  if (cleanReqPath.startsWith('http://') || cleanReqPath.startsWith('https://')) {
    try {
      cleanReqPath = new URL(cleanReqPath).pathname;
    } catch {
      cleanReqPath = cleanReqPath.replace(/^https?:\/\/[^/]+/, '');
    }
  }
  cleanReqPath = cleanReqPath.replace(/\/+$/, '') || '/';
  const methodLower = method.toLowerCase();

  let matchedDocPath: string | null = null;
  let matchedPathObj: Record<string, unknown> | null = null;

  // 1. Exact static path match
  if (paths[cleanReqPath]) {
    matchedDocPath = cleanReqPath;
    matchedPathObj = paths[cleanReqPath];
  } else {
    // 2. Parameterized path template match (e.g. /api/users/{id} against /api/users/123)
    for (const [docPath, pathObj] of Object.entries(paths)) {
      if (docPath === cleanReqPath) {
        matchedDocPath = docPath;
        matchedPathObj = pathObj;
        break;
      }
      try {
        const reg = compileEndpointRegex(docPath);
        if (reg.test(cleanReqPath)) {
          matchedDocPath = docPath;
          matchedPathObj = pathObj;
          break;
        }
      } catch {
        // Continue to next path if regex compilation fails
      }
    }
  }

  if (!matchedDocPath || !matchedPathObj) return null;

  const operation = matchedPathObj[methodLower] as Record<string, unknown> | undefined;
  if (!operation || typeof operation !== 'object') return null;

  const responses = operation.responses as Record<string, unknown> | undefined;
  if (!responses || typeof responses !== 'object') return null;

  const statusDocumented = statusCode in responses;
  // Use exact status response or fall back to '200' / '201' / 'default'
  const responseEntry = (responses[statusCode] ??
    responses['200'] ??
    responses['201'] ??
    responses['default']) as Record<string, unknown> | undefined;

  if (!responseEntry) return null;

  const schema = (responseEntry as any)?.content?.['application/json']?.schema as OpenApiSchema | undefined;
  if (!schema) return null;

  return {
    schema,
    statusDocumented,
    docPath: matchedDocPath,
  };
}

// ─── Deep Schema Diffing Engine ──────────────────────────────────────────────

/**
 * Deep-diffs baseline OpenAPI schema against runtime inferred schema.
 */
export function diffSchemas(
  baseline: OpenApiSchema,
  current: OpenApiSchema,
  fieldPath: string = '',
): SchemaDriftItem[] {
  const items: SchemaDriftItem[] = [];

  // 1. Nullability Check
  if (current.nullable && !baseline.nullable) {
    items.push({
      path: fieldPath || '(root)',
      changeType: 'BREAKING_NULLABILITY',
      severity: 'breaking',
      expected: `${baseline.type ?? 'value'} (non-null)`,
      actual: 'null',
      message: `Field '${fieldPath || '(root)'}' expected non-null ${baseline.type ?? 'value'}, received null`,
      suggestion: `Ensure backend returns non-null ${baseline.type ?? 'value'}, or mark field as nullable in OpenAPI spec`,
    });
    return items;
  }

  // 2. Type Mismatch Check (with compatible widening check)
  if (baseline.type && current.type && baseline.type !== current.type) {
    const isWidening = baseline.type === 'integer' && current.type === 'number';
    items.push({
      path: fieldPath || '(root)',
      changeType: isWidening ? 'NON_BREAKING_TYPE_WIDENED' : 'BREAKING_TYPE_MISMATCH',
      severity: isWidening ? 'warning' : 'breaking',
      expected: baseline.type,
      actual: current.type,
      message: `Field '${fieldPath || '(root)'}' type changed: expected '${baseline.type}', received '${current.type}'`,
      suggestion: isWidening
        ? `Update OpenAPI contract type from 'integer' to 'number' to match runtime type widening`
        : `Check backend serializer: field changed from '${baseline.type}' to '${current.type}'`,
    });
    return items;
  }

  // 3. Array Item Recursion
  if (baseline.type === 'array' && current.type === 'array' && baseline.items && current.items) {
    const subItems = diffSchemas(baseline.items, current.items, `${fieldPath}[*]`);
    subItems.forEach((si) => {
      items.push({
        ...si,
        // Preserve warning severity for additive changes within array items
        changeType: si.severity === 'breaking' ? 'BREAKING_ARRAY_ITEM_MISMATCH' : si.changeType,
      });
    });
  }

  // 4. Object Property Diff with Rename Detection
  if (baseline.type === 'object' && baseline.properties) {
    const baseFields = Object.keys(baseline.properties);
    const currFields = current.properties ? Object.keys(current.properties) : [];

    const missingFields: string[] = [];
    const addedFields: string[] = [];

    baseFields.forEach((bf) => {
      if (!currFields.includes(bf)) missingFields.push(bf);
    });
    currFields.forEach((cf) => {
      if (!baseFields.includes(cf)) addedFields.push(cf);
    });

    const usedAdded = new Set<string>();
    const usedMissing = new Set<string>();

    // Detect Renames (Levenshtein distance <= 2 or case normalization match)
    missingFields.forEach((mf) => {
      const renamed = addedFields.find((af) => !usedAdded.has(af) && isRenameCandidate(mf, af));
      if (renamed) {
        usedAdded.add(renamed);
        usedMissing.add(mf);
        const fp = fieldPath ? `${fieldPath}.${mf}` : mf;
        items.push({
          path: fp,
          changeType: 'BREAKING_FIELD_RENAMED',
          severity: 'breaking',
          expected: mf,
          actual: renamed,
          message: `Field '${mf}' appears renamed to '${renamed}' in runtime payload`,
          suggestion: `Ensure frontend/backend naming alignment: revert to '${mf}' or sync OpenAPI spec to '${renamed}'`,
        });
      }
    });

    // Remaining missing fields -> BREAKING_FIELD_REMOVED
    missingFields
      .filter((f) => !usedMissing.has(f))
      .forEach((mf) => {
        const fp = fieldPath ? `${fieldPath}.${mf}` : mf;
        items.push({
          path: fp,
          changeType: 'BREAKING_FIELD_REMOVED',
          severity: 'breaking',
          expected: baseline.properties![mf].type ?? 'value',
          actual: 'undefined (missing)',
          message: `Expected field '${mf}' is missing from runtime response payload`,
          suggestion: `Ensure backend includes '${mf}', or remove it from OpenAPI spec if deprecated`,
        });
      });

    // Remaining added fields -> NON_BREAKING_FIELD_ADDED
    addedFields
      .filter((f) => !usedAdded.has(f))
      .forEach((af) => {
        const fp = fieldPath ? `${fieldPath}.${af}` : af;
        items.push({
          path: fp,
          changeType: 'NON_BREAKING_FIELD_ADDED',
          severity: 'warning',
          expected: '(not in contract)',
          actual: current.properties?.[af]?.type ?? 'value',
          message: `Undeclared field '${af}' returned in runtime response`,
          suggestion: `Add '${af}' to OpenAPI contract to document it for client consumers`,
        });
      });

    // Recurse into common properties
    baseFields
      .filter((f) => currFields.includes(f) && current.properties?.[f])
      .forEach((f) => {
        const fp = fieldPath ? `${fieldPath}.${f}` : f;
        items.push(...diffSchemas(baseline.properties![f], current.properties![f], fp));
      });
  }

  return items;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main schema drift detection entry point.
 * Called from App.tsx on intercepted proxy traffic and manual workbench replays.
 *
 * Returns null when:
 * - Body is empty or not valid JSON
 * - Path is a scanner/bundler probe
 * - OpenAPI spec is not yet generated
 * - Route is not documented in OpenAPI spec
 */
export function detectSchemaDrift(
  method: string,
  rawPath: string,
  statusCode: number | string,
  responseBodyPreview: string | null | undefined,
  openApiDoc: Record<string, unknown>,
): SchemaDriftReport | null {
  // Guard 1: No body preview
  if (!responseBodyPreview?.trim()) return null;

  // Guard 2: Noise / scanner probes
  if (isNoiseOrScannerProbe(rawPath)) return null;

  // Guard 3: OpenAPI spec empty
  if (!openApiDoc.paths || Object.keys(openApiDoc.paths as object).length === 0) return null;

  // Guard 4: Safe JSON parse (strips chunked encoding; returns null on error to avoid false positives)
  const parsedJson = cleanAndParseJson(responseBodyPreview);
  if (parsedJson === null) return null;

  const statusStr = String(statusCode);
  const numStatus = typeof statusCode === 'number' ? statusCode : parseInt(statusStr, 10);

  // Guard 5: Route documented in OpenAPI spec
  const resolved = resolveBaselineSchema(openApiDoc, method, rawPath, statusStr);
  if (!resolved) return null;

  const { parameterizedPath } = parameterizePath(rawPath.split('?')[0]);
  const routeKey = `${method.toUpperCase()} ${resolved.docPath || parameterizedPath}`;
  const driftItems: SchemaDriftItem[] = [];

  // Check for undocumented HTTP status
  if (!resolved.statusDocumented) {
    driftItems.push({
      path: '(status)',
      changeType: 'STATUS_UNDOCUMENTED',
      severity: 'warning',
      expected: '(documented status code)',
      actual: statusStr,
      message: `Response status ${statusStr} is not documented in OpenAPI contract for ${routeKey}`,
      suggestion: `Add status ${statusStr} to the responses map in OpenAPI specification`,
    });
  }

  // Hardening Rule: If 4xx/5xx error and status is not documented, do NOT compare error body against 200 OK schema
  const isUndocumentedError = numStatus >= 400 && !resolved.statusDocumented;
  if (!isUndocumentedError) {
    const actualSchema = inferJsonSchemaFromValue(parsedJson);
    driftItems.push(...diffSchemas(resolved.schema, actualSchema));
  }

  const breakingCount = driftItems.filter((i) => i.severity === 'breaking').length;
  const warningCount = driftItems.filter((i) => i.severity === 'warning').length;

  return {
    routeKey,
    method: method.toUpperCase(),
    path: resolved.docPath || parameterizedPath,
    statusCode,
    hasDrift: driftItems.length > 0,
    breakingCount,
    warningCount,
    items: driftItems,
    detectedAt: new Date().toISOString(),
    baselineSchemaSnapshot: JSON.stringify(resolved.schema),
    actualSchemaSnapshot: JSON.stringify(inferJsonSchemaFromValue(parsedJson)),
  };
}

/**
 * 1-click contract sync: reconciles the runtime response payload into the live OpenAPI document.
 * Returns an immutable copy of the updated OpenAPI specification.
 */
export function syncOpenApiWithPayload(
  openApiDoc: Record<string, unknown>,
  method: string,
  rawPath: string,
  statusCode: string,
  responseBodyPreview: string,
): Record<string, unknown> {
  const parsed = cleanAndParseJson(responseBodyPreview);
  if (parsed === null) return openApiDoc;

  const newSchema = inferJsonSchemaFromValue(parsed);
  const { parameterizedPath } = parameterizePath(rawPath.split('?')[0]);

  let cleanReqPath = rawPath.split('?')[0].trim();
  if (cleanReqPath.startsWith('http://') || cleanReqPath.startsWith('https://')) {
    try {
      cleanReqPath = new URL(cleanReqPath).pathname;
    } catch {
      cleanReqPath = cleanReqPath.replace(/^https?:\/\/[^/]+/, '');
    }
  }
  cleanReqPath = cleanReqPath.replace(/\/+$/, '') || '/';
  const paths = { ...((openApiDoc.paths as Record<string, Record<string, unknown>>) ?? {}) };
  const methodLower = method.toLowerCase();

  // Find target documented path or create new parameterized entry
  let targetPath = parameterizedPath;
  for (const docPath of Object.keys(paths)) {
    if (docPath === cleanReqPath) {
      targetPath = docPath;
      break;
    }
    try {
      if (compileEndpointRegex(docPath).test(cleanReqPath)) {
        targetPath = docPath;
        break;
      }
    } catch {
      // Continue searching
    }
  }

  const pathObj = { ...(paths[targetPath] ?? {}) };
  const operation = { ...((pathObj[methodLower] as Record<string, unknown>) ?? {}) };
  const responses = { ...((operation.responses as Record<string, unknown>) ?? {}) };

  responses[statusCode] = {
    ...((responses[statusCode] as object) ?? {}),
    description: `Status ${statusCode} HTTP Response (Synced from live traffic)`,
    content: {
      'application/json': { schema: newSchema },
    },
  };

  operation.responses = responses;
  pathObj[methodLower] = operation;
  paths[targetPath] = pathObj;

  return { ...openApiDoc, paths };
}

/**
 * Generates an executive Markdown bug report for Slack / Jira / GitHub PRs.
 */
export function generateDriftBugReportMarkdown(report: SchemaDriftReport): string {
  const header =
    `## 🚨 API Contract Drift Report — \`${report.routeKey}\`\n\n` +
    `| Metric | Value |\n` +
    `|---|---|\n` +
    `| **Endpoint** | \`${report.method} ${report.path}\` |\n` +
    `| **Status Code** | \`${report.statusCode}\` |\n` +
    `| **Detected At** | ${new Date(report.detectedAt).toLocaleString()} |\n` +
    `| **Breaking Violations** | **${report.breakingCount}** |\n` +
    `| **Additive Changes** | **${report.warningCount}** |\n\n` +
    `### Detailed Violations\n\n` +
    `| Field Path | Change Type | Severity | Expected Contract | Actual Runtime | Actionable Suggestion |\n` +
    `|---|---|---|---|---|---|\n`;

  const rows = report.items
    .map(
      (i) =>
        `| \`${i.path}\` | \`${i.changeType}\` | **${i.severity.toUpperCase()}** | \`${i.expected}\` | \`${i.actual}\` | ${i.suggestion} |`
    )
    .join('\n');

  return header + rows + '\n';
}
