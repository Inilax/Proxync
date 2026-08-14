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
pub async fn close_tunnel(tunnel_id: String) -> Result<(), String> {
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

    if stop_proxy().await {
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
pub async fn open_cloudflare_tunnel(
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
        raw_sub
            .to_lowercase()
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
            .collect()
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
    
    let key_gen_success = {
        let mut keygen_cmd = std::process::Command::new("ssh-keygen");
        #[cfg(target_os = "windows")]
        keygen_cmd.creation_flags(0x08000000);
        keygen_cmd
            .args(&["-t", "ed25519", "-f", key_path.to_str().unwrap(), "-q", "-N", ""])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    };

    if !key_gen_success || !key_path.exists() || !pub_path.exists() {
        return Err("Failed to generate ephemeral SSH keypair. Ensure ssh-keygen is available.".to_string());
    }

    let known_hosts_path = temp_dir.join("known_hosts");
    let ssh_host = std::env::var("PROXYNC_SSH_HOST")
        .unwrap_or_else(|_| "104.208.83.199".to_string());
    let mut strict_host_checking = "accept-new";

    if let Ok(pub_key) = std::fs::read_to_string(&pub_path) {
        let body_json = serde_json::json!({
            "subdomain": clean_subdomain,
            "publicKey": pub_key.trim()
        });

        let api_url = std::env::var("PROXYNC_API_URL")
            .unwrap_or_else(|_| "https://api.proxync.dev/api/tunnel/sign-jit-cert".to_string());

        let api_secret = std::env::var("PROXYNC_API_SECRET_TOKEN")
            .unwrap_or_else(|_| "proxync_default_secret_2026".to_string());
        
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| e.to_string())?;

        // CSO Hardening: Use native reqwest HTTP request instead of spawning curl subprocess
        if let Ok(resp) = client.post(&api_url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", api_secret))
            .json(&body_json)
            .send()
            .await
        {
            if let Ok(parsed) = resp.json::<serde_json::Value>().await {
                if let Some(host_key) = parsed.get("hostKey").and_then(|v| v.as_str()) {
                    if !host_key.trim().is_empty() {
                        let entry = format!("[{}]:2222 {}\n", ssh_host, host_key.trim());
                        let _ = std::fs::write(&known_hosts_path, entry);
                        strict_host_checking = "yes";
                    }
                }
            }
        }
        
        // Short delay to allow sish inotify watcher to reload keys into memory
        tokio::time::sleep(std::time::Duration::from_millis(350)).await;
    }
    let active_key_path = key_path;

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("icacls")
            .args(&[active_key_path.to_str().unwrap(), "/inheritance:r"])
            .creation_flags(0x08000000)
            .output();
        let _ = std::process::Command::new("icacls")
            .args(&[active_key_path.to_str().unwrap(), "/grant:r", &format!("{}:(R)", std::env::var("USERNAME").unwrap_or_else(|_| "Everyone".to_string()))])
            .creation_flags(0x08000000)
            .output();
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
        "-o", "ServerAliveInterval=30",
        "-p", "2222",
        &format!("-R {}:80:127.0.0.1:{}", clean_subdomain, local_port),
        &format!("{}@{}", clean_subdomain, ssh_host),
    ]);
    
    let child = cmd.spawn().map_err(|e| format!("Failed to spawn ssh: {}", e))?;
    
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
