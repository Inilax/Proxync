import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { invoke } from '@tauri-apps/api/core';

interface RequestPlaygroundProps {
  workspace: any;
  activeTunnel: any;
  prefillRequest?: any; // To allow prefilling from traffic log
}

interface HeaderRow {
  key: string;
  value: string;
}

interface DiscoveredEndpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  headers?: Record<string, string>;
  body?: string;
}

export function RequestPlayground({ workspace, activeTunnel, prefillRequest }: RequestPlaygroundProps) {
  // Postman REST Panel States
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/');
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);

  // AI & Local Scanner States
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [projectPath, setProjectPath] = useState('');
  const [scannedFiles, setScannedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [endpoints, setEndpoints] = useState<DiscoveredEndpoint[]>([]);

  // Prefill handler (e.g. from TunnelsView)
  useEffect(() => {
    if (prefillRequest) {
      setMethod(prefillRequest.method || 'GET');
      setPath(prefillRequest.path || '/');
      const rows = Object.entries(prefillRequest.headers || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setHeaders(rows.length > 0 ? rows : [{ key: 'Content-Type', value: 'application/json' }]);
      setBody(prefillRequest.bodyPreview || '');
      showToast('Populated request from history', 'info');
    }
  }, [prefillRequest]);

  // Handle header row additions
  const addHeaderRow = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeaderRow = (index: number, key: string, value: string) => {
    const updated = [...headers];
    updated[index] = { key, value };
    setHeaders(updated);
  };
  const deleteHeaderRow = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  // Save OpenRouter key locally
  const handleSaveApiKey = (key: string) => {
    setOpenRouterKey(key);
    localStorage.setItem('openrouter_api_key', key);
  };

  // Submit REST Request
  const handleSendRequest = async () => {
    if (!activeTunnel) {
      showToast('Please start a tunnel first', 'info');
      return;
    }
    setLoading(true);
    setResponse(null);

    // Map headers array back to record
    const headersRecord: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) {
        headersRecord[h.key.trim()] = h.value;
      }
    });

    try {
      const startTime = Date.now();
      const resData = await api.requests.execute(
        workspace.id,
        activeTunnel.id,
        method,
        path.trim(),
        headersRecord,
        body
      );
      const duration = Date.now() - startTime;

      let decodedBody = '';
      if (resData.body) {
        try {
          // Decode base64 body
          const binStr = atob(resData.body);
          decodedBody = binStr;
          // Attempt pretty format JSON
          const parsed = JSON.parse(binStr);
          decodedBody = JSON.stringify(parsed, null, 2);
        } catch {
          decodedBody = atob(resData.body);
        }
      }

      setResponse({
        status: resData.status,
        headers: resData.headers || {},
        body: decodedBody,
        duration,
      });
      showToast('Request completed!', 'success');
    } catch (err: any) {
      showToast(err.message ?? 'Execution failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Scan local directories using Tauri Rust plugin
  const handleScanDirectory = async () => {
    if (!projectPath.trim()) return;
    setScanning(true);
    try {
      const files: string[] = await invoke('scan_directory', { path: projectPath.trim() });
      setScannedFiles(files);
      const defaults: Record<string, boolean> = {};
      files.forEach((f) => {
        // Auto-select files matching "controller" or "route"
        const lower = f.toLowerCase();
        defaults[f] = lower.includes('controller') || lower.includes('route') || lower.includes('resource') || files.length <= 15;
      });
      setSelectedFiles(defaults);
      showToast(`Scanned ${files.length} candidate files`, 'success');
    } catch (err: any) {
      showToast(err.message || String(err), 'error');
    } finally {
      setScanning(false);
    }
  };

  // Generate OpenAPI spec via OpenRouter
  const handleGenerateSwagger = async () => {
    const activeFiles = Object.entries(selectedFiles)
      .filter(([_, checked]) => checked)
      .map(([file]) => file);

    if (activeFiles.length === 0) {
      showToast('Please select at least one file to scan', 'info');
      return;
    }
    if (!openRouterKey.trim()) {
      showToast('Please enter your OpenRouter API Key', 'info');
      return;
    }

    setGenerating(true);
    try {
      // 1. Read files content
      const fileContents: string[] = [];
      for (const file of activeFiles.slice(0, 10)) { // limit to 10 files for token safety
        const content: string = await invoke('read_file_content', {
          rootPath: projectPath.trim(),
          relPath: file,
        });
        fileContents.push(`File: ${file}\n\`\`\`\n${content}\n\`\`\``);
      }

      // 2. Query OpenRouter
      const prompt = `You are a Swagger/OpenAPI endpoint discovery agent.
Analyze the following code files and extract all HTTP routes/endpoints.
Output ONLY a valid raw JSON array of endpoints matching the following schema.
No explanations, no markdown wrappers (no \`\`\`json block).

Schema elements:
[
  {
    "path": "/api/v1/users",
    "method": "POST",
    "summary": "Create user",
    "description": "Optional detailed description",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\\n  \\"name\\": \\"John Doe\\"\\n}"
  }
]

Code files content:
${fileContents.join('\n\n')}
`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://proxync.local',
          'X-Title': 'Proxync Swagger Generator',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash:free',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter Error (${res.status}): ${errText}`);
      }

      const json = await res.json();
      const contentText = json.choices?.[0]?.message?.content || '';
      
      // Clean up markdown block wraps if model ignored instructions
      const cleanJsonStr = contentText
        .trim()
        .replace(/^```json/, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();

      const parsed: DiscoveredEndpoint[] = JSON.parse(cleanJsonStr);
      setEndpoints(parsed);
      showToast(`AI discovered ${parsed.length} endpoints successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message ?? 'AI parsing failed. Check API Key or file sizes.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectEndpoint = (ep: DiscoveredEndpoint) => {
    setMethod(ep.method || 'GET');
    setPath(ep.path || '/');
    if (ep.headers) {
      const rows = Object.entries(ep.headers).map(([k, v]) => ({ key: k, value: v }));
      setHeaders(rows.length > 0 ? rows : [{ key: 'Content-Type', value: 'application/json' }]);
    }
    if (ep.body) {
      setBody(typeof ep.body === 'string' ? ep.body : JSON.stringify(ep.body, null, 2));
    }
    showToast(`Loaded ${ep.method} ${ep.path} to playground`, 'info');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, height: '100%', overflow: 'hidden' }}>
      
      {/* LEFT: REST Request Playground */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 8 }}>
        <div className="card" style={{ flexShrink: 0 }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚡</span> HTTP Request Playground
          </h3>
          
          {/* Method & URL */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="form-input"
              style={{ width: 110, padding: 8 }}
            >
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              className="form-input"
              placeholder="/api/v1/resource"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleSendRequest}
              disabled={loading || !activeTunnel}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0 24px' }}
            >
              {loading ? <span className="spinner" /> : 'Send'}
            </button>
          </div>

          {!activeTunnel && (
            <div style={{ fontSize: 12, color: 'var(--yellow)', marginBottom: 12 }}>
              ⚠️ Please share a local port to generate an active tunnel before executing requests.
            </div>
          )}

          {/* Headers list */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Headers</span>
              <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={addHeaderRow}>+ Add Header</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {headers.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Key"
                    value={h.key}
                    onChange={(e) => updateHeaderRow(i, e.target.value, h.value)}
                    style={{ fontSize: 12, padding: 6 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Value"
                    value={h.value}
                    onChange={(e) => updateHeaderRow(i, h.key, e.target.value)}
                    style={{ fontSize: 12, padding: 6 }}
                  />
                  <button className="btn btn-ghost" style={{ padding: '0 8px' }} onClick={() => deleteHeaderRow(i)}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Request Body */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Body (JSON/Text)</span>
            <textarea
              className="form-input"
              rows={4}
              placeholder='{"key": "value"}'
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Response Panel */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
          <h3 className="card-title">Response</h3>
          {!response ? (
            <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 24, marginBottom: 8 }}>📤</span>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Send a request to see the response output</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <div>Status: <strong style={{ color: response.status >= 400 ? 'var(--red)' : 'var(--green)' }}>{response.status}</strong></div>
                <div>Time: <strong style={{ color: 'var(--text-secondary)' }}>{response.duration}ms</strong></div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>HEADERS</div>
                  <div style={{ background: 'var(--bg-elevated)', padding: 8, borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', maxHeight: 100, overflowY: 'auto' }}>
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k}><span style={{ color: 'var(--blue)' }}>{k}</span>: {String(v)}</div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>BODY</div>
                  <pre style={{
                    flex: 1, background: 'var(--bg-elevated)', padding: 12, borderRadius: 6,
                    fontSize: 12, fontFamily: 'var(--font-mono)', overflow: 'auto',
                    margin: 0, whiteSpace: 'pre-wrap', minHeight: 120
                  }}>
                    {response.body || '[Empty Response]'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: AI Swagger Spec Discovery */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 8 }}>
        
        {/* Local Folder Scanner Settings */}
        <div className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🤖</span> AI Endpoint Scanner
          </h3>
          
          {/* API Key */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              OpenRouter API Key (Supports free models, e.g. Gemini 2.5 Flash Free)
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Paste openrouter api key..."
              value={openRouterKey}
              onChange={(e) => handleSaveApiKey(e.target.value)}
              style={{ fontSize: 12, padding: 8 }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Get a free API key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>openrouter.ai</a>
            </div>
          </div>

          {/* Directory Path */}
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Absolute path to backend project folder (e.g. C:\dev\my-app)"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button
              onClick={handleScanDirectory}
              disabled={scanning || !projectPath}
              className="btn btn-ghost"
              style={{ width: 'auto', padding: '0 16px' }}
            >
              {scanning ? 'Scanning...' : 'Scan Folder'}
            </button>
          </div>
        </div>

        {/* Scanned Files List */}
        {scannedFiles.length > 0 && (
          <div className="card" style={{ maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Discovered Source Files ({scannedFiles.length})</h4>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', padding: '4px 10px', fontSize: 11 }}
                onClick={handleGenerateSwagger}
                disabled={generating}
              >
                {generating ? 'Processing files with AI...' : 'Generate API Spec'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {scannedFiles.map((file) => (
                <label key={file} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', padding: '4px 6px', background: 'rgba(255,255,255,0.01)', borderRadius: 4 }}>
                  <input
                    type="checkbox"
                    checked={!!selectedFiles[file]}
                    onChange={(e) => setSelectedFiles({ ...selectedFiles, [file]: e.target.checked })}
                  />
                  <code>{file}</code>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Discovered Endpoints List */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Discovered API endpoints</h3>
          {endpoints.length === 0 ? (
            <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 24, marginBottom: 8 }}>🔍</span>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Scan files above to auto-generate Swagger paths</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
              {endpoints.map((ep, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectEndpoint(ep)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  className="endpoint-item-hover"
                >
                  <span className={`tunnel-status-badge`} style={{
                    minWidth: 54, textAlign: 'center', fontSize: 10,
                    background: ep.method === 'GET' ? 'var(--blue-dim)' : ep.method === 'POST' ? 'var(--green-dim)' : 'var(--orange-dim)',
                    color: ep.method === 'GET' ? 'var(--blue)' : ep.method === 'POST' ? 'var(--green)' : 'var(--orange)'
                  }}>{ep.method}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <code style={{ fontSize: 12, fontWeight: 600 }}>{ep.path}</code>
                    {ep.summary && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ep.summary}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
