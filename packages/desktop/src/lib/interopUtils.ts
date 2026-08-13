import { openUrl } from '@tauri-apps/plugin-opener';
import type { RequestLog, SavedRequest } from './types';
import { showToast } from './toast';

/**
 * Generates a ready-to-run terminal cURL command string from a RequestLog or SavedRequest.
 */
export function generateCurlCommand(req: RequestLog | SavedRequest, baseUrl?: string): string {
  const method = (req.method || 'GET').toUpperCase();
  let fullUrl = req.path || '/';

  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    const host = baseUrl || 'http://localhost:3000';
    fullUrl = `${host.replace(/\/+$/, '')}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
  }

  const parts: string[] = [`curl -X ${method} "${fullUrl}"`];

  const headers = req.headers || {};
  Object.entries(headers).forEach(([key, val]) => {
    if (key && val) {
      parts.push(`-H "${key}: ${val.replace(/"/g, '\\"')}"`);
    }
  });

  const body = 'bodyPreview' in req ? req.bodyPreview : 'body' in req ? req.body : '';
  if (body && !['GET', 'HEAD'].includes(method)) {
    parts.push(`-d '${body.replace(/'/g, "\\'")}'`);
  }

  return parts.join(' \\\n  ');
}

/**
 * Opens VS Code at the specified project root file path and 1-indexed line number.
 * Formats URI safely for Windows drive letters (e.g. vscode://file/E:/to-do/src/controller.ts:42).
 */
export async function openInVSCode(projectRootPath: string, relativePath?: string, lineNumber?: number): Promise<void> {
  try {
    const root = (projectRootPath || '').trim();

    const normRoot = (root || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const normRel = (relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');

    let fullPath = normRoot;
    if (normRoot && normRel) {
      if (normRel.startsWith(normRoot)) {
        fullPath = normRel;
      } else {
        fullPath = `${normRoot}/${normRel}`;
      }
    } else if (normRel) {
      fullPath = normRel;
    }

    const vscodeUri = `vscode://file/${fullPath}${lineNumber && lineNumber > 0 ? `:${lineNumber}` : ''}`;

    let launched = false;
    try {
      await openUrl(vscodeUri);
      launched = true;
    } catch {
      launched = false;
    }

    // Copy formatted path to clipboard as immediate failproof action
    try {
      await navigator.clipboard.writeText(`${fullPath}${lineNumber ? `:${lineNumber}` : ''}`);
    } catch {
      // Ignore clipboard permission errors
    }

    if (launched) {
      showToast(`Opened in VS Code: ${normRel || normRoot}:${lineNumber || 1}`, 'success');
    } else {
      showToast(`Copied path to clipboard: ${normRel || normRoot}:${lineNumber || 1}`, 'info');
    }
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : 'Unable to launch VS Code link', 'error');
  }
}

/**
 * Opens the target URL in default browser using Tauri plugin opener.
 */
export async function openInBrowser(url: string): Promise<void> {
  try {
    if (!url) return;
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}`;
    }
    await openUrl(target);
    showToast(`Opened ${target} in browser`, 'success');
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : 'Unable to open browser URL', 'error');
  }
}
