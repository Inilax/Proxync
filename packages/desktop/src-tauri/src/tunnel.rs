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

use crate::proxy::stop_proxy;

lazy_static! {
    static ref ACTIVE_TUNNELS: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref LOCALTUNNEL_PROCESSES: Arc<Mutex<HashMap<String, tokio::process::Child>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref HTTP_CLIENT: Client = Client::builder()
        .tcp_nodelay(true)
        .pool_idle_timeout(std::time::Duration::from_secs(90))
        .pool_max_idle_per_host(10)
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_else(|_| Client::new());
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

struct TempDirGuard(std::path::PathBuf);

impl Drop for TempDirGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

#[tauri::command]
pub async fn open_tunnel(app: tauri::AppHandle, tunnel_id: String, local_port: u16, token: String, workspace_id: String, relay_url: Option<String>) -> Result<(), String> {
    let relay_ws_url = relay_url.unwrap_or_else(|| "ws://localhost:3939/relay".to_string());
    let relay_ws_url = relay_ws_url.as_str();
    
    // ponytail: 2s timeout on relay WebSocket — fails fast when no local relay server is running
    let (ws_stream, _) = tokio::time::timeout(
        std::time::Duration::from_secs(2),
        connect_async(relay_ws_url.to_string()),
    ).await.map_err(|_| "Relay connection timed out".to_string())?.map_err(|e| e.to_string())?;
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
            // Check service liveness on 127.0.0.1 with fallback to [::1] (IPv6)
            let is_alive = tokio::net::TcpStream::connect(format!("127.0.0.1:{}", local_port)).await.is_ok()
                || tokio::net::TcpStream::connect(format!("[::1]:{}", local_port)).await.is_ok();

            if !is_alive {
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
                            let tunnel_id_clone = tunnel_id.clone();
                            
                            tokio::spawn(async move {
                                let mut safe_headers = HashMap::new();
                                for (k, v) in &req_data.headers {
                                    let lower = k.to_lowercase();
                                    let display_val = if lower == "authorization" || lower == "cookie" || lower == "set-cookie" || lower == "x-api-key" || lower == "api-key" {
                                        "[REDACTED]".to_string()
                                    } else {
                                        v.clone()
                                    };
                                    safe_headers.insert(k.clone(), display_val);
                                }

                                let req_meta = serde_json::json!({
                                    "requestId": req_data.request_id,
                                    "method": req_data.method,
                                    "path": req_data.path,
                                    "port": local_port,
                                    "tunnelId": tunnel_id_clone,
                                    "headers": safe_headers,
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

                                let start_instant = std::time::Instant::now();
                                let response = req_builder.send().await;
                                let duration_ms = start_instant.elapsed().as_millis() as u64;
                                
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
                                    "durationMs": duration_ms,
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
pub async fn close_tunnel(tunnel_id: String, local_port: Option<u16>) -> Result<(), String> {
    let mut found = false;

    let mut tunnels = ACTIVE_TUNNELS.lock().await;
    if let Some(handle) = tunnels.remove(&tunnel_id) {
        handle.abort();
        found = true;
    }

    let mut lt_procs = LOCALTUNNEL_PROCESSES.lock().await;
    if let Some(mut child) = lt_procs.remove(&tunnel_id) {
        if let Some(pid) = child.id() {
            #[cfg(target_os = "windows")]
            {
                let mut cmd = std::process::Command::new("taskkill");
                cmd.creation_flags(0x08000000);
                let _ = cmd.args(&["/F", "/T", "/PID", &pid.to_string()]).output();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = child.kill().await;
            }
        } else {
            let _ = child.kill().await;
        }
        found = true;
    }

    if stop_proxy(local_port).await {
        found = true;
    }

    if found {
        Ok(())
    } else {
        Err("Tunnel not found".to_string())
    }
}

#[tauri::command]
pub async fn open_localtunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
    subdomain: Option<String>
) -> Result<String, String> {
    let mut cmd = tokio::process::Command::new("cmd");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    cmd.args(&["/C", "npx", "-y", "localtunnel@2.0.2", "--port", &local_port.to_string()]);
    if let Some(sub) = subdomain {
        let clean_sub: String = sub
            .to_lowercase()
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
            .collect();
        let clean_sub = clean_sub.trim_matches('-').to_string();
        if !clean_sub.is_empty() {
            cmd.args(&["--subdomain", &clean_sub]);
        }
    }
    cmd.stdout(std::process::Stdio::piped());
    
    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn localtunnel: {}", e))?;
    let stdout = child.stdout.take().ok_or("Failed to open localtunnel stdout".to_string())?;
    
    let (tx, rx) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        let mut reader = tokio::io::BufReader::new(stdout).lines();
        let mut tx_opt = Some(tx);
        while let Ok(Some(line)) = reader.next_line().await {
            if let Some(tx_sender) = tx_opt.take() {
                if line.contains("your url is:") {
                    let resolved = line.replace("your url is:", "").trim().to_string();
                    let _ = tx_sender.send(Ok(resolved));
                } else {
                    tx_opt = Some(tx_sender);
                }
            }
        }
        if let Some(tx_sender) = tx_opt {
            let _ = tx_sender.send(Err("localtunnel process exited without returning URL".to_string()));
        }
    });

    let timeout_duration = std::time::Duration::from_secs(15);
    let url = match tokio::time::timeout(timeout_duration, rx).await {
        Ok(Ok(Ok(resolved_url))) => resolved_url,
        Ok(Ok(Err(err))) => {
            let _ = child.kill().await;
            return Err(err);
        }
        _ => {
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
pub async fn open_cloudflare_tunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
) -> Result<String, String> {
    let mut cmd = tokio::process::Command::new("cmd");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let local_target = format!("localhost:{}", local_port);
    cmd.args(&[
        "/C",
        "npx",
        "-y",
        "--package=cloudflared",
        "cloudflared",
        "tunnel",
        "--metrics",
        "localhost:0",
        "--no-autoupdate",
        "--url",
        &format!("http://{}", local_target),
        "--http-host-header",
        &local_target,
    ]);
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn cloudflared: {}", e))?;
    let stderr = child.stderr.take().ok_or("Failed to open cloudflared stderr".to_string())?;

    let (tx, rx) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        let mut reader = tokio::io::BufReader::new(stderr).lines();
        let mut tx_opt = Some(tx);
        while let Ok(Some(line)) = reader.next_line().await {
            if let Some(tx_sender) = tx_opt.take() {
                if line.contains(".trycloudflare.com") {
                    if let Some(start_idx) = line.find("https://") {
                        let rest = &line[start_idx..];
                        let url = rest
                            .split_whitespace()
                            .next()
                            .unwrap_or("")
                            .trim_matches(|c| c == '|' || c == ' ' || c == '\r' || c == '\n')
                            .to_string();
                        if !url.is_empty() {
                            let _ = tx_sender.send(Ok(url));
                            continue;
                        }
                    }
                }
                tx_opt = Some(tx_sender);
            }
        }
        if let Some(tx_sender) = tx_opt {
            let _ = tx_sender.send(Err("cloudflared process exited without returning URL".to_string()));
        }
    });

    let timeout_duration = std::time::Duration::from_secs(25);
    let url = match tokio::time::timeout(timeout_duration, rx).await {
        Ok(Ok(Ok(resolved_url))) => resolved_url,
        Ok(Ok(Err(err))) => {
            let _ = child.kill().await;
            return Err(err);
        }
        _ => {
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
pub async fn open_native_tunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
    subdomain: String,
) -> Result<String, String> {
    let raw_sub = subdomain.trim();
    let clean_subdomain: String = if raw_sub.is_empty() || raw_sub == "auto" {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(12345678);
        format!("px-{:x}", ts % 0xffffffff)
    } else {
        let filtered: String = raw_sub
            .to_lowercase()
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
            .collect();
        filtered.trim_matches('-').to_string()
    };

    if clean_subdomain.is_empty() {
        return Err("Invalid subdomain format".to_string());
    }

    let temp_dir = std::env::temp_dir().join(format!("proxync_ssh_{}", tunnel_id));
    let _ = std::fs::remove_dir_all(&temp_dir);
    let _ = std::fs::create_dir_all(&temp_dir);
    let _guard = TempDirGuard(temp_dir.clone());
    
    let key_path = temp_dir.join("id_ed25519");
    let pub_path = temp_dir.join("id_ed25519.pub");
    
    let key_path_for_keygen = key_path.clone();
    let key_gen_success = tokio::task::spawn_blocking(move || {
        let mut keygen_cmd = std::process::Command::new("ssh-keygen");
        #[cfg(target_os = "windows")]
        keygen_cmd.creation_flags(0x08000000);
        keygen_cmd
            .args(&["-t", "ed25519", "-f", key_path_for_keygen.to_str().unwrap_or(""), "-q", "-N", ""])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }).await.unwrap_or(false);

    if !key_gen_success || !key_path.exists() || !pub_path.exists() {
        return Err("Failed to generate ephemeral SSH keypair. Ensure ssh-keygen is available.".to_string());
    }

    let known_hosts_path = temp_dir.join("known_hosts");
    let ssh_host = std::env::var("PROXYNC_SSH_HOST")
        .unwrap_or_else(|_| "104.208.83.199".to_string());
    let strict_host_checking = "yes";

    // Pre-seed known_hosts with official Proxync SSH host key to enforce StrictHostKeyChecking=yes
    let pinned_host_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDyV3ZNPsHhwJaW6akzFMg/KAE7F1K4WamVtMaeP/vi9 root@Proxync-tunnel";
    let seed_entry = format!(
        "[{}]:2222 {}\n[104.208.83.199]:2222 {}\n[api.proxync.dev]:2222 {}\n",
        ssh_host, pinned_host_key, pinned_host_key, pinned_host_key
    );
    let _ = std::fs::write(&known_hosts_path, seed_entry);

    if let Ok(pub_key) = std::fs::read_to_string(&pub_path) {
        let body_json = serde_json::json!({
            "subdomain": clean_subdomain,
            "publicKey": pub_key.trim()
        });

        let api_url = std::env::var("PROXYNC_API_URL")
            .unwrap_or_else(|_| "https://api.proxync.dev/api/tunnel/sign-jit-cert".to_string());

        let api_secret = std::env::var("PROXYNC_API_SECRET_TOKEN").unwrap_or_default();
        
        let mut jit_registered = false;
        
        // Enforce strict HTTPS for JIT key registration and host key exchange
        if let Ok(resp) = HTTP_CLIENT.post(&api_url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", api_secret))
            .json(&body_json)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            if let Ok(parsed) = resp.json::<serde_json::Value>().await {
                if parsed.get("success").and_then(|v| v.as_bool()).unwrap_or(false) || parsed.get("hostKey").is_some() {
                    jit_registered = true;
                    if let Some(host_key) = parsed.get("hostKey").and_then(|v| v.as_str()) {
                        if !host_key.trim().is_empty() {
                            let entry = format!("[{}]:2222 {}\n", ssh_host, host_key.trim());
                            let _ = std::fs::write(&known_hosts_path, entry);
                        }
                    }
                }
            }
        }

        if !jit_registered {
            return Err("Failed to register ephemeral public key with Proxync tunnel server. Please check your internet connection.".to_string());
        }
        
        // Give sish 500ms to absorb the new pubkey from disk into its in-memory key store.
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    let active_key_path = key_path;

    #[cfg(target_os = "windows")]
    {
        if let Ok(username) = std::env::var("USERNAME") {
            let trimmed = username.trim();
            if !trimmed.is_empty() {
                let key_str = active_key_path.to_str().unwrap_or("").to_string();
                let user_arg = format!("{}:(R)", trimmed);
                let _ = tokio::task::spawn_blocking(move || {
                    std::process::Command::new("icacls")
                        .args(&[key_str.as_str(), "/inheritance:r", "/grant:r", user_arg.as_str()])
                        .creation_flags(0x08000000)
                        .output()
                }).await;
            }
        }
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&active_key_path, std::fs::Permissions::from_mode(0o600));
    }

    let mut cmd = tokio::process::Command::new("ssh");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    cmd.args(&[
        "-i", active_key_path.to_str().unwrap(),
        "-N",
        "-o", &format!("StrictHostKeyChecking={}", strict_host_checking),
        "-o", &format!("UserKnownHostsFile={}", known_hosts_path.to_str().unwrap()),
        "-o", if cfg!(target_os = "windows") { "GlobalKnownHostsFile=NUL" } else { "GlobalKnownHostsFile=/dev/null" },
        "-o", "ServerAliveInterval=30",
        "-o", "ServerAliveCountMax=3",
        "-o", "TCPKeepAlive=yes",
        "-o", "Ciphers=chacha20-poly1305@openssh.com,aes128-gcm@openssh.com",
        "-o", "Compression=no",
        "-o", "ConnectTimeout=5",
        "-o", "IPQoS=throughput",
        "-p", "2222",
        &format!("-R {}:80:127.0.0.1:{}", clean_subdomain, local_port),
        &format!("{}@{}", clean_subdomain, ssh_host),
    ]);
    
    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn ssh: {}", e))?;
    
    // Await SSH handshake & remote forwarding bind confirmation (~1.5s) so the URL never 404s on first click
    let start_wait = std::time::Instant::now();
    while start_wait.elapsed() < std::time::Duration::from_millis(2000) {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(format!("SSH tunnel process exited prematurely with status: {}", status));
        }
        if start_wait.elapsed() >= std::time::Duration::from_millis(1600) {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    let mut lt_procs = LOCALTUNNEL_PROCESSES.lock().await;
    lt_procs.insert(tunnel_id.clone(), child);
    
    let tunnel_id_clone = tunnel_id.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        let _active_guard = _guard;
        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
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
    
    Ok(format!("https://{}.proxync.dev", clean_subdomain))
}
