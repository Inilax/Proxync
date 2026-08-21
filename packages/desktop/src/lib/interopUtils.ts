import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { RequestLog, SavedRequest } from './types';
import { showToast } from './toast';

/**
 * Resolves full target URL
 */
function resolveUrl(req: RequestLog | SavedRequest, baseUrl?: string): string {
  let fullUrl = req.path || '/';
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    const host = baseUrl || 'http://localhost:3000';
    fullUrl = `${host.replace(/\/+$/, '')}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
  }
  return fullUrl;
}

/**
 * Generates a ready-to-run terminal cURL command string from a RequestLog or SavedRequest.
 */
export function generateCurlCommand(req: RequestLog | SavedRequest, baseUrl?: string): string {
  const method = (req.method || 'GET').toUpperCase();
  const fullUrl = resolveUrl(req, baseUrl);
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
 * Generates a JavaScript Fetch code snippet.
 */
export function generateFetchSnippet(req: RequestLog | SavedRequest, baseUrl?: string): string {
  const method = (req.method || 'GET').toUpperCase();
  const fullUrl = resolveUrl(req, baseUrl);
  const headers = req.headers || {};
  const body = 'bodyPreview' in req ? req.bodyPreview : 'body' in req ? req.body : '';

  const options: Record<string, any> = { method };
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  if (body && !['GET', 'HEAD'].includes(method)) {
    try {
      options.body = JSON.parse(body);
    } catch {
      options.body = body;
    }
  }

  return `const response = await fetch("${fullUrl}", ${JSON.stringify(options, null, 2)});\nconst data = await response.json();\nconsole.log(data);`;
}

/**
 * Generates a Python requests code snippet.
 */
export function generatePythonSnippet(req: RequestLog | SavedRequest, baseUrl?: string): string {
  const method = (req.method || 'GET').toUpperCase();
  const fullUrl = resolveUrl(req, baseUrl);
  const headers = req.headers || {};
  const body = 'bodyPreview' in req ? req.bodyPreview : 'body' in req ? req.body : '';

  const lines = ['import requests', ''];
  lines.push(`url = "${fullUrl}"`);
  lines.push(`headers = ${JSON.stringify(headers, null, 4)}`);

  if (body && !['GET', 'HEAD'].includes(method)) {
    try {
      JSON.parse(body);
      lines.push(`payload = ${body}`);
      lines.push(`response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)`);
    } catch {
      lines.push(`payload = """${body}"""`);
      lines.push(`response = requests.${method.toLowerCase()}(url, headers=headers, data=payload)`);
    }
  } else {
    lines.push(`response = requests.${method.toLowerCase()}(url, headers=headers)`);
  }

  lines.push('print(response.status_code)');
  lines.push('print(response.json())');
  return lines.join('\n');
}

/**
 * Generates a Go net/http code snippet.
 */
export function generateGoSnippet(req: RequestLog | SavedRequest, baseUrl?: string): string {
  const method = (req.method || 'GET').toUpperCase();
  const fullUrl = resolveUrl(req, baseUrl);
  const body = 'bodyPreview' in req ? req.bodyPreview : 'body' in req ? req.body : '';

  return `package main

import (
\t"bytes"
\t"fmt"
\t"io"
\t"net/http"
)

func main() {
\turl := "${fullUrl}"
\tbody := []byte(${body ? `\`${body}\`` : 'nil'})
\treq, err := http.NewRequest("${method}", url, bytes.NewBuffer(body))
\tif err != nil {
\t\tpanic(err)
\t}

\tclient := &http.Client{}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tout, _ := io.ReadAll(resp.Body)
\tfmt.Println(resp.Status)
\tfmt.Println(string(out))
}`;
}

/**
 * Generates a Rust Reqwest code snippet.
 */
export function generateRustSnippet(req: RequestLog | SavedRequest, baseUrl?: string): string {
  const method = (req.method || 'GET').toUpperCase();
  const fullUrl = resolveUrl(req, baseUrl);
  const body = 'bodyPreview' in req ? req.bodyPreview : 'body' in req ? req.body : '';

  return `use reqwest::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client.${method.toLowerCase()}("${fullUrl}")
        ${body && !['GET', 'HEAD'].includes(method) ? `.body(r#"${body}"#)\n        .header("Content-Type", "application/json")` : ''}
        .send()
        .await?;

    println!("Status: {}", res.status());
    println!("Body: {}", res.text().await?);
    Ok(())
}`;
}

/**
 * Opens VS Code or Cursor at the specified project root file path and 1-indexed line number.
 * Formats URI safely for Windows drive letters (e.g. vscode://file/E:/project/src/controller.ts:42).
 */
export async function openInEditor(
  projectRootPath: string,
  relativePath?: string,
  lineNumber?: number,
  editor: 'vscode' | 'cursor' = 'vscode'
): Promise<void> {
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

    const editorName = editor === 'cursor' ? 'Cursor' : 'VS Code';
    let launched = false;

    // 1. Try native Rust open_file_in_editor command (invokes code/cursor CLI or Windows shell URI)
    try {
      await invoke('open_file_in_editor', {
        filePath: fullPath,
        lineNumber: lineNumber || 1,
        editor,
      });
      launched = true;
    } catch {
      // 2. Fallback to Tauri plugin-opener
      const scheme = editor === 'cursor' ? 'cursor' : 'vscode';
      const editorUri = `${scheme}://file/${fullPath}${lineNumber && lineNumber > 0 ? `:${lineNumber}` : ''}`;
      try {
        await openUrl(editorUri);
        launched = true;
      } catch {
        launched = false;
      }
    }

    try {
      await navigator.clipboard.writeText(`${fullPath}${lineNumber ? `:${lineNumber}` : ''}`);
    } catch {
      // Ignore clipboard permission errors
    }

    if (launched) {
      showToast(`Opening in ${editorName}: ${normRel || normRoot}:${lineNumber || 1}`, 'success');
    } else {
      showToast(`Copied path to clipboard: ${normRel || normRoot}:${lineNumber || 1}`, 'info');
    }
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : 'Unable to launch editor link', 'error');
  }
}

/**
 * Backward-compatible helper for VS Code
 */
export async function openInVSCode(projectRootPath: string, relativePath?: string, lineNumber?: number): Promise<void> {
  return openInEditor(projectRootPath, relativePath, lineNumber, 'vscode');
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

