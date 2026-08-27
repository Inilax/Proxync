use tauri::Emitter;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use futures_util::{StreamExt, SinkExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use reqwest::Client;
use lazy_static::lazy_static;
use base64::prelude::*;
use tokio::io::AsyncBufReadExt;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

lazy_static! {
    static ref ACTIVE_TUNNELS: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref LOCALTUNNEL_PROCESSES: Arc<Mutex<HashMap<String, tokio::process::Child>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref RECON_PROCESS_CACHE: Arc<Mutex<HashMap<u16, ProcessCandidate>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref PROXY_HANDLE: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>> = Arc::new(Mutex::new(None));
}

#[tauri::command]
async fn scan_ports() -> Result<Vec<u16>, String> {
    let common_ports = vec![3000u16, 3001, 4000, 4200, 5000, 5173, 8000, 8080, 8888];

    // Probe all ports concurrently — worst case is one timeout (~100ms) not N timeouts
    let probes: Vec<_> = common_ports.iter().map(|&port| async move {
        let addr = format!("127.0.0.1:{}", port);
        let alive = tokio::time::timeout(
            std::time::Duration::from_millis(150),
            tokio::net::TcpStream::connect(&addr),
        ).await.is_ok();
        (port, alive)
    }).collect();

    let results = futures_util::future::join_all(probes).await;
    let active = results.into_iter().filter_map(|(port, alive)| if alive { Some(port) } else { None }).collect();
    Ok(active)
}

#[derive(Serialize, Clone)]
struct ProcessCandidate {
    id: String,
    name: String,
    port: u16,
    pid: Option<u32>,
    command: Option<String>,
    directory: Option<String>,
    executable: Option<String>,
    framework: Option<String>,
    access: String,
    uptime: Option<String>,
}

fn get_pid_for_port(port: u16) -> Option<u32> {
    let mut cmd = std::process::Command::new("netstat");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args(&["-ano"])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    for line in stdout.lines() {
        if line.contains("LISTENING") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 {
                let local_addr = parts[1];
                if local_addr.ends_with(&format!(":{}", port)) {
                    if let Some(pid_str) = parts.last() {
                        if let Ok(pid) = pid_str.parse::<u32>() {
                            return Some(pid);
                        }
                    }
                }
            }
        }
    }
    None
}

fn get_process_info(pid: u32) -> Option<(Option<String>, Option<String>, Option<String>)> {
    let ps_cmd = format!(
        "Get-CimInstance Win32_Process -Filter 'ProcessId = {}' | Select-Object -Property Name, ExecutablePath, CommandLine | ConvertTo-Json",
        pid
    );
    let mut cmd = std::process::Command::new("powershell");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args(&["-Command", &ps_cmd])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    let val: serde_json::Value = serde_json::from_str(&stdout).ok()?;
    
    let name = val.get("Name").and_then(|v| v.as_str()).map(|s| s.to_string());
    let exec_path = val.get("ExecutablePath").and_then(|v| v.as_str()).map(|s| s.to_string());
    let cmd_line = val.get("CommandLine").and_then(|v| v.as_str()).map(|s| s.to_string());
    
    Some((name, exec_path, cmd_line))
}

fn is_absolute_win_path(s: &str) -> bool {
    let mut chars = s.chars();
    let first = chars.next();
    let second = chars.next();
    let third = chars.next();
    
    first.map(|c| c.is_ascii_alphabetic()).unwrap_or(false)
        && second == Some(':')
        && third == Some('\\')
}

fn resolve_directory(exec_path: &Option<String>, cmd_line: &Option<String>) -> String {
    if let Some(cmd) = cmd_line {
        let mut best_dir = None;
        for word in cmd.split_whitespace() {
            let clean_word = word.trim_matches('"').trim_matches('\'');
            if is_absolute_win_path(clean_word) {
                let path = std::path::Path::new(clean_word);
                if path.exists() {
                    let dir = if path.is_dir() {
                        Some(path.to_path_buf())
                    } else {
                        path.parent().map(|p| p.to_path_buf())
                    };
                    
                    if let Some(d) = dir {
                        let dir_str = d.to_string_lossy().to_string();
                        if !dir_str.contains("nodejs") && !dir_str.contains("npm") && !dir_str.contains("AppData") {
                            if let Some(node_modules_idx) = dir_str.find("\\node_modules") {
                                best_dir = Some(dir_str[..node_modules_idx].to_string());
                            } else {
                                best_dir = Some(dir_str);
                            }
                            break;
                        }
                    }
                }
            }
        }
        if let Some(bd) = best_dir {
            return bd;
        }
    }
    
    if let Some(exec) = exec_path {
        if let Some(parent) = std::path::Path::new(exec).parent() {
            return parent.to_string_lossy().to_string();
        }
    }
    
    "unknown".to_string()
}

#[tauri::command]
async fn scan_processes(bypass_cache: bool) -> Result<Vec<ProcessCandidate>, String> {
    let ports = scan_ports().await?;
    let mut candidates = Vec::new();
    
    let mut cache = RECON_PROCESS_CACHE.lock().await;
    cache.retain(|port, _| ports.contains(port));
    
    for port in ports {
        if !bypass_cache {
            if let Some(cached) = cache.get(&port) {
                candidates.push(cached.clone());
                continue;
            }
        }
        
        let framework = match port {
            3000 | 3001 => "Node app",
            4000 => "GraphQL service",
            4200 => "Angular app",
            5000 => "Flask or .NET app",
            5173 => "Vite server",
            8000 => "Django or FastAPI app",
            8080 => "HTTP service",
            8888 => "Notebook server",
            _ => "Development server",
        };

        let mut candidate = ProcessCandidate {
            id: format!("port-{}", port),
            name: framework.to_string(),
            port,
            pid: None,
            command: Some(format!("localhost:{}", port)),
            directory: Some("unknown".to_string()),
            executable: Some("unknown".to_string()),
            framework: Some(framework.to_string()),
            access: "ready".to_string(),
            uptime: Some("live".to_string()),
        };

        if let Some(pid) = get_pid_for_port(port) {
            candidate.pid = Some(pid);
            if let Some((name, exec_path, cmd_line)) = get_process_info(pid) {
                if let Some(n) = name {
                    candidate.name = n;
                }
                if let Some(ref exec) = exec_path {
                    candidate.executable = Some(exec.clone());
                }
                candidate.directory = Some(resolve_directory(&exec_path, &cmd_line));
            }
        }

        cache.insert(port, candidate.clone());
        candidates.push(candidate);
    }
    
    Ok(candidates)
}

#[derive(Deserialize, Serialize)]
struct TunnelRegisterPayload {
    event: String,
    data: RegisterData,
}

#[derive(Deserialize, Serialize)]
struct RegisterData {
    #[serde(rename = "tunnelId")]
    tunnel_id: String,
    token: String,
    #[serde(rename = "workspaceId")]
    workspace_id: String,
}

#[derive(Deserialize, Serialize, Debug)]
struct WsMessage {
    event: String,
    data: serde_json::Value,
}

#[derive(Deserialize, Debug)]
struct HttpRequestPayload {
    #[serde(rename = "requestId")]
    request_id: String,
    method: String,
    path: String,
    headers: HashMap<String, String>,
    body: String,
}

#[derive(Serialize, Debug)]
struct HttpResponsePayload {
    #[serde(rename = "requestId")]
    request_id: String,
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

#[tauri::command]
async fn open_tunnel(app: tauri::AppHandle, tunnel_id: String, local_port: u16, token: String, workspace_id: String, relay_url: Option<String>) -> Result<(), String> {
    // Use the provided relay URL or fall back to the default dev URL
    let relay_ws_url = relay_url.unwrap_or_else(|| "ws://localhost:3939/relay".to_string());
    let relay_ws_url = relay_ws_url.as_str();
    
    let (ws_stream, _) = connect_async(relay_ws_url.to_string()).await.map_err(|e| e.to_string())?;
    let (mut write, mut read) = ws_stream.split();

    let reg_msg = TunnelRegisterPayload {
        event: "tunnel:register".to_string(),
        data: RegisterData {
            tunnel_id: tunnel_id.clone(),
            token,
            workspace_id,
        }
    };
    
    write.send(Message::Text(serde_json::to_string(&reg_msg).unwrap().into())).await.map_err(|e| e.to_string())?;

    let tunnel_id_watcher = tunnel_id.clone();
    let app_watcher = app.clone();
    tokio::spawn(async move {
        let mut failures = 0;
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            let addr = format!("127.0.0.1:{}", local_port);
            if tokio::time::timeout(
                std::time::Duration::from_millis(100),
                tokio::net::TcpStream::connect(&addr)
            ).await.is_err() {
                failures += 1;
                if failures >= 3 {
                    let mut tunnels = ACTIVE_TUNNELS.lock().await;
                    if let Some(handle) = tunnels.remove(&tunnel_id_watcher) {
                        handle.abort();
                    }
                    let _ = app_watcher.emit("tunnel:auto-closed", serde_json::json!({ "tunnelId": tunnel_id_watcher }));
                    break;
                }
            } else {
                failures = 0;
            }
        }
    });

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let _ = write.send(msg).await;
        }
    });

    let client = Client::new();
    let tunnel_id_clone = tunnel_id.clone();

    let handle = tokio::spawn(async move {
        while let Some(msg) = read.next().await {
            if let Ok(Message::Text(txt)) = msg {
                if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(txt.as_str()) {
                    if ws_msg.event == "http:request" {
                        if let Ok(req_data) = serde_json::from_value::<HttpRequestPayload>(ws_msg.data) {
                            let client = client.clone();
                            let tx = tx.clone();
                            let app_clone = app.clone();
                            
                            tokio::spawn(async move {
                                let req_meta = serde_json::json!({
                                    "requestId": req_data.request_id,
                                    "method": req_data.method,
                                    "path": req_data.path,
                                    "headers": req_data.headers,
                                    "bodyPreview": req_data.body,
                                    "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()
                                });
                                let _ = app_clone.emit("request:log", req_meta);

                                let url = format!("http://localhost:{}{}", local_port, req_data.path);
                                
                                let mut req_builder = match req_data.method.as_str() {
                                    "GET" => client.get(&url),
                                    "POST" => client.post(&url),
                                    "PUT" => client.put(&url),
                                    "DELETE" => client.delete(&url),
                                    "PATCH" => client.patch(&url),
                                    _ => client.get(&url),
                                };

                                for (k, v) in req_data.headers {
                                    if k.to_lowercase() != "host" && k.to_lowercase() != "content-length" && k.to_lowercase() != "accept-encoding" {
                                        req_builder = req_builder.header(k, v);
                                    }
                                }

                                if !req_data.body.is_empty() {
                                    req_builder = req_builder.body(req_data.body);
                                }

                                let response = req_builder.send().await;
                                
                                let mut res_payload = HttpResponsePayload {
                                    request_id: req_data.request_id,
                                    status: 502,
                                    headers: HashMap::new(),
                                    body: String::new(),
                                };

                                if let Ok(res) = response {
                                    res_payload.status = res.status().as_u16();
                                    for (k, v) in res.headers() {
                                        if let Ok(v_str) = v.to_str() {
                                            res_payload.headers.insert(k.to_string(), v_str.to_string());
                                        }
                                    }
                                    if let Ok(bytes) = res.bytes().await {
                                        res_payload.body = BASE64_STANDARD.encode(&bytes);
                                    }
                                }

                                let res_meta = serde_json::json!({
                                    "requestId": res_payload.request_id,
                                    "status": res_payload.status,
                                    "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()
                                });
                                let _ = app_clone.emit("request:log:response", res_meta);

                                let out_msg = WsMessage {
                                    event: "http:response".to_string(),
                                    data: serde_json::to_value(res_payload).unwrap(),
                                };

                                let _ = tx.send(Message::Text(serde_json::to_string(&out_msg).unwrap().into()));
                            });
                        }
                    }
                }
            }
        }
    });

    let mut tunnels = ACTIVE_TUNNELS.lock().await;
    tunnels.insert(tunnel_id_clone, handle);

    Ok(())
}

#[tauri::command]
async fn close_tunnel(tunnel_id: String) -> Result<(), String> {
    let mut found = false;

    let mut tunnels = ACTIVE_TUNNELS.lock().await;
    if let Some(handle) = tunnels.remove(&tunnel_id) {
        handle.abort();
        found = true;
    }

    let mut lt_procs = LOCALTUNNEL_PROCESSES.lock().await;
    if let Some(mut child) = lt_procs.remove(&tunnel_id) {
        let _ = child.kill().await;
        found = true;
    }

    let mut proxy_lock = PROXY_HANDLE.lock().await;
    if let Some(handle) = proxy_lock.take() {
        handle.abort();
        found = true;
    }

    if found {
        Ok(())
    } else {
        Err("Tunnel not found".to_string())
    }
}

#[tauri::command]
async fn open_localtunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
    subdomain: Option<String>
) -> Result<String, String> {
    let mut cmd = tokio::process::Command::new("cmd");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    cmd.args(&["/C", "npx", "-y", "localtunnel", "--port", &local_port.to_string()]);
    if let Some(sub) = subdomain {
        let clean_sub = sub.replace(" ", "-").to_lowercase();
        cmd.args(&["--subdomain", &clean_sub]);
    }
    cmd.stdout(std::process::Stdio::piped());
    
    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn localtunnel: {}", e))?;
    let stdout = child.stdout.take().ok_or("Failed to open localtunnel stdout".to_string())?;
    
    let mut reader = tokio::io::BufReader::new(stdout).lines();
    
    let timeout_duration = std::time::Duration::from_secs(10);
    let read_url_task = async {
        while let Some(line) = reader.next_line().await.unwrap_or(None) {
            if line.contains("your url is:") {
                let resolved = line.replace("your url is:", "").trim().to_string();
                return Ok(resolved);
            }
        }
        Err("Localtunnel exited without returning a URL".to_string())
    };
    
    let url = match tokio::time::timeout(timeout_duration, read_url_task).await {
        Ok(Ok(resolved_url)) => {
            resolved_url
        }
        Ok(Err(e)) => return Err(e),
        Err(_) => {
            let _ = child.kill().await;
            return Err("Timed out waiting for localtunnel URL".to_string());
        }
    };
    
    let mut lt_procs = LOCALTUNNEL_PROCESSES.lock().await;
    lt_procs.insert(tunnel_id.clone(), child);
    
    let tunnel_id_clone = tunnel_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        let mut has_child = true;
        while has_child {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            let mut procs = LOCALTUNNEL_PROCESSES.lock().await;
            if let Some(child_proc) = procs.get_mut(&tunnel_id_clone) {
                if let Ok(Some(_)) = child_proc.try_wait() {
                    procs.remove(&tunnel_id_clone);
                    let _ = app_clone.emit("tunnel:auto-closed", serde_json::json!({ "tunnelId": tunnel_id_clone }));
                    has_child = false;
                }
            } else {
                has_child = false;
            }
        }
    });
    
    Ok(url)
}

#[tauri::command]
async fn open_cloudflare_tunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
) -> Result<String, String> {
    let mut cmd = tokio::process::Command::new("cmd");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    cmd.args(&["/C", "npx", "-y", "--package=cloudflared", "cloudflared", "tunnel", "--url", &format!("http://127.0.0.1:{}", local_port)]);
    cmd.stderr(std::process::Stdio::piped());
    
    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn cloudflared: {}", e))?;
    let stderr = child.stderr.take().ok_or("Failed to open cloudflared stderr".to_string())?;
    
    let mut reader = tokio::io::BufReader::new(stderr).lines();
    
    let timeout_duration = std::time::Duration::from_secs(20);
    let read_url_task = async {
        while let Some(line) = reader.next_line().await.unwrap_or(None) {
            if line.contains(".trycloudflare.com") {
                if let Some(start_idx) = line.find("https://") {
                    let rest = &line[start_idx..];
                    let url = rest.split_whitespace()
                        .next()
                        .unwrap_or("")
                        .trim_matches(|c| c == '|' || c == ' ' || c == '\r' || c == '\n')
                        .to_string();
                    if !url.is_empty() {
                        return Ok(url);
                    }
                }
            }
        }
        Err("cloudflared exited or timed out without returning a URL".to_string())
    };
    
    let url = match tokio::time::timeout(timeout_duration, read_url_task).await {
        Ok(Ok(resolved_url)) => {
            resolved_url
        }
        Ok(Err(e)) => {
            let _ = child.kill().await;
            return Err(e);
        }
        Err(_) => {
            let _ = child.kill().await;
            return Err("Timed out waiting for trycloudflare URL".to_string());
        }
    };
    
    let mut lt_procs = LOCALTUNNEL_PROCESSES.lock().await;
    lt_procs.insert(tunnel_id.clone(), child);
    
    let tunnel_id_clone = tunnel_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        let mut has_child = true;
        while has_child {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            let mut procs = LOCALTUNNEL_PROCESSES.lock().await;
            if let Some(child_proc) = procs.get_mut(&tunnel_id_clone) {
                if let Ok(Some(_)) = child_proc.try_wait() {
                    procs.remove(&tunnel_id_clone);
                    let _ = app_clone.emit("tunnel:auto-closed", serde_json::json!({ "tunnelId": tunnel_id_clone }));
                    has_child = false;
                }
            } else {
                has_child = false;
            }
        }
    });
    
    Ok(url)
}

#[tauri::command]
async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let root = std::path::Path::new(&path);
    if !root.is_dir() {
        return Err("Provided path is not a directory".to_string());
    }

    fn visit_dirs(dir: &std::path::Path, files: &mut Vec<String>, root_len: usize) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in std::fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if name == "node_modules" || name == "target" || name == ".git" || name == "build" || name == "bin" || name == ".gradle" {
                        continue;
                    }
                    visit_dirs(&path, files, root_len)?;
                } else {
                    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                        let ext = ext.to_lowercase();
                        if ext == "java" || ext == "ts" || ext == "js" || ext == "py" || ext == "go" || ext == "cs" || ext == "controller" {
                            let rel_path = path.to_str().unwrap_or("")[root_len..].to_string();
                            files.push(rel_path);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    visit_dirs(root, &mut files, root.to_str().unwrap_or("").len()).map_err(|e| e.to_string())?;
    Ok(files)
}

#[tauri::command]
async fn read_file_content(root_path: String, rel_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&root_path).join(rel_path.trim_start_matches('/').trim_start_matches('\\'));
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_local_ip() -> Result<String, String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.connect("8.8.8.8:80").map_err(|e| e.to_string())?;
    let local_addr = socket.local_addr().map_err(|e| e.to_string())?;
    Ok(local_addr.ip().to_string())
}

fn get_data_filepath() -> std::path::PathBuf {
    let mut dir = if let Ok(appdata) = std::env::var("APPDATA") {
        std::path::PathBuf::from(appdata)
    } else if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".config")
    } else {
        std::env::current_dir().unwrap_or_default()
    };
    dir.push("Proxync");
    let _ = std::fs::create_dir_all(&dir);
    dir.push("data.json");
    dir
}

#[tauri::command]
async fn save_app_state(state: String) -> Result<(), String> {
    let filepath = get_data_filepath();
    std::fs::write(&filepath, state).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_app_state() -> Result<String, String> {
    let filepath = get_data_filepath();
    if !filepath.exists() {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(&filepath).map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_proxy(app: tauri::AppHandle, local_port: u16) -> Result<u16, String> {
    use tokio::net::TcpListener;
    use tokio::net::TcpStream;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let mut handle_lock = PROXY_HANDLE.lock().await;
    if let Some(handle) = handle_lock.take() {
        handle.abort();
    }

    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let proxy_port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let handle = tokio::spawn(async move {
        while let Ok((mut client_stream, _)) = listener.accept().await {
            let app_clone = app.clone();
            tokio::spawn(async move {
                let target_addr = format!("127.0.0.1:{}", local_port);
                let mut target_stream = match TcpStream::connect(&target_addr).await {
                    Ok(stream) => stream,
                    Err(_) => return,
                };

                let mut req_buf = vec![0u8; 16384];
                let n_req = match client_stream.read(&mut req_buf).await {
                    Ok(bytes) if bytes > 0 => bytes,
                    _ => return,
                };

                let req_id = format!("req-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
                let req_str = String::from_utf8_lossy(&req_buf[..n_req]);
                let mut method = "GET".to_string();
                let mut path = "/".to_string();

                if let Some(req_line) = req_str.lines().next() {
                    let parts: Vec<&str> = req_line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        method = parts[0].to_string();
                        path = parts[1].to_string();
                    }
                }

                let mut headers = HashMap::new();
                let mut body_preview = String::new();

                let parts_split: Vec<&str> = req_str.splitn(2, "\r\n\r\n").collect();
                if let Some(header_part) = parts_split.get(0) {
                    for line in header_part.lines().skip(1) {
                        if let Some((k, v)) = line.split_once(':') {
                            headers.insert(k.trim().to_string(), v.trim().to_string());
                        }
                    }
                }
                if let Some(body_part) = parts_split.get(1) {
                    body_preview = body_part.trim().to_string();
                }

                let req_meta = serde_json::json!({
                    "id": req_id.clone(),
                    "method": method,
                    "path": path,
                    "headers": headers,
                    "bodyPreview": body_preview,
                    "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()
                });
                let _ = app_clone.emit("request:log", req_meta);

                let mut modified_req = req_str.to_string();
                if modified_req.contains("Connection: keep-alive") || modified_req.contains("connection: keep-alive") {
                    modified_req = modified_req
                        .replace("Connection: keep-alive", "Connection: close")
                        .replace("connection: keep-alive", "connection: close");
                } else if !modified_req.contains("Connection: close") && !modified_req.contains("connection: close") {
                    modified_req = modified_req.replace("\r\n\r\n", "\r\nConnection: close\r\n\r\n");
                }

                if target_stream.write_all(modified_req.as_bytes()).await.is_err() {
                    return;
                }

                let (mut client_read, mut client_write) = client_stream.into_split();
                let (mut target_read, mut target_write) = target_stream.into_split();

                let app_c = app_clone.clone();
                let req_id_c = req_id.clone();
                tokio::spawn(async move {
                    let mut res_buf = vec![0u8; 16384];
                    if let Ok(n_res) = target_read.read(&mut res_buf).await {
                        if n_res > 0 {
                            let res_str = String::from_utf8_lossy(&res_buf[..n_res]);
                            let mut status: u16 = 200;
                            if let Some(status_line) = res_str.lines().next() {
                                let parts: Vec<&str> = status_line.split_whitespace().collect();
                                if parts.len() >= 2 {
                                    if let Ok(code) = parts[1].parse::<u16>() {
                                        status = code;
                                    }
                                }
                            }

                            let res_meta = serde_json::json!({
                                "requestId": req_id_c,
                                "status": status,
                                "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()
                            });
                            let _ = app_c.emit("request:log:response", res_meta);

                            let _ = client_write.write_all(&res_buf[..n_res]).await;
                        }
                    }

                    let _ = tokio::io::copy(&mut target_read, &mut client_write).await;
                });

                let _ = tokio::io::copy(&mut client_read, &mut target_write).await;
            });
        }
    });

    *handle_lock = Some(handle);
    Ok(proxy_port)
}

#[derive(Serialize, Deserialize)]
struct NativeHttpResponsePayload {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

#[tauri::command]
async fn execute_http_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<NativeHttpResponsePayload, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .danger_accept_invalid_certs(true)
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProxyncStudio/0.2.0")
        .build()
        .map_err(|e| e.to_string())?;

    let req_method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut req_builder = client.request(req_method, &url);

    let has_user_agent = headers.keys().any(|k| k.eq_ignore_ascii_case("user-agent"));
    if !has_user_agent {
        req_builder = req_builder.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProxyncStudio/0.2.0");
    }

    for (k, v) in headers {
        req_builder = req_builder.header(&k, &v);
    }

    if let Some(b) = body {
        if !b.is_empty() && method != "GET" && method != "HEAD" {
            req_builder = req_builder.body(b);
        }
    }

    let res = req_builder.send().await.map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = res.status().as_u16();

    let mut res_headers = HashMap::new();
    for (k, v) in res.headers() {
        if let Ok(v_str) = v.to_str() {
            res_headers.insert(k.as_str().to_string(), v_str.to_string());
        }
    }

    let bytes = res.bytes().await.map_err(|e| format!("Failed to read response body: {}", e))?;
    let body_text = String::from_utf8_lossy(&bytes).to_string();

    Ok(NativeHttpResponsePayload {
        status,
        headers: res_headers,
        body: body_text,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::AppleScript, Some(vec!["--autostart"])))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_ports, 
            scan_processes,
            open_tunnel, 
            close_tunnel,
            open_localtunnel,
            open_cloudflare_tunnel,
            scan_directory,
            read_file_content,
            get_local_ip,
            save_app_state,
            load_app_state,
            start_proxy,
            execute_http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
