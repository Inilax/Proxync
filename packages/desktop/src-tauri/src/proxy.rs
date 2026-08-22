use tauri::Emitter;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use lazy_static::lazy_static;
use tokio::net::TcpListener;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

lazy_static! {
    static ref PROXY_HANDLES: Arc<Mutex<HashMap<u16, (u16, Vec<tokio::task::JoinHandle<()>>)>>> = Arc::new(Mutex::new(HashMap::new()));
}

pub async fn stop_proxy(local_port: Option<u16>) -> bool {
    let mut proxies = PROXY_HANDLES.lock().await;
    if let Some(port) = local_port {
        if let Some((_proxy_port, handles)) = proxies.remove(&port) {
            for handle in handles {
                handle.abort();
            }
            return true;
        }
    } else {
        if !proxies.is_empty() {
            for (_, (_proxy_port, handles)) in proxies.drain() {
                for handle in handles {
                    handle.abort();
                }
            }
            return true;
        }
    }
    false
}

#[tauri::command]
pub async fn start_proxy(app: tauri::AppHandle, local_port: u16) -> Result<u16, String> {
    let mut map = PROXY_HANDLES.lock().await;
    if let Some((_, old_handles)) = map.remove(&local_port) {
        for handle in old_handles {
            handle.abort();
        }
    }

    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let proxy_port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let proxy_app = app.clone();
    let listener_handle = tokio::spawn(async move {
        while let Ok((mut client_stream, _)) = listener.accept().await {
            let app_clone = proxy_app.clone();
            tokio::spawn(async move {
                // Connect to target service on 127.0.0.1 with fallback to [::1] (for IPv6-only servers like Vite)
                let target_stream_res = match TcpStream::connect(format!("127.0.0.1:{}", local_port)).await {
                    Ok(s) => Ok(s),
                    Err(_) => TcpStream::connect(format!("[::1]:{}", local_port)).await,
                };
                let mut target_stream = match target_stream_res {
                    Ok(stream) => stream,
                    Err(_) => {
                        // Target server is offline / restarting: serve branded 502 Bad Gateway standby page
                        let html_body = format!(
                            r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>502 - Target Server Offline | Proxync</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box;">
  <div style="text-align: center; max-width: 480px; width: 100%; padding: 36px 28px; background: #151d2f; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <div style="font-size: 36px; margin-bottom: 12px;">🟡</div>
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">Local Service Offline</h2>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">Proxync public tunnel is <b style="color: #f8fafc;">active</b> in standby mode. Waiting for your local server on <span style="background:#1e293b; padding:2px 8px; border-radius:4px; color:#38bdf8; font-family:monospace; font-weight:600;">port {}</span> to respond.</p>
    <p style="color: #64748b; font-size: 12px; margin: 0;">Start or restart your local development server to resume live traffic on this URL.</p>
  </div>
</body>
</html>"#,
                            local_port
                        );
                        let resp = format!(
                            "HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            html_body.len(),
                            html_body
                        );
                        let _ = client_stream.write_all(resp.as_bytes()).await;
                        let _ = client_stream.shutdown().await;
                        return;
                    }
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
                            let key = k.trim();
                            let val = v.trim();
                            let lower_key = key.to_lowercase();
                            let display_val = if lower_key == "authorization" || lower_key == "cookie" || lower_key == "set-cookie" || lower_key == "x-api-key" || lower_key == "api-key" {
                                "[REDACTED]".to_string()
                            } else {
                                val.to_string()
                            };
                            headers.insert(key.to_string(), display_val);
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
                    "port": local_port,
                    "headers": headers,
                    "bodyPreview": body_preview,
                    "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()
                });
                let _ = app_clone.emit("request:log", req_meta);

                let mut modified_req = req_str.to_string();

                // Normalize Host header so frameworks like Vite / Next with strict host validation accept tunnel traffic
                if let Some(parts) = parts_split.get(0) {
                    let mut new_headers = Vec::new();
                    for line in parts.lines() {
                        if line.to_lowercase().starts_with("host:") {
                            new_headers.push(format!("Host: localhost:{}", local_port));
                        } else {
                            new_headers.push(line.to_string());
                        }
                    }
                    let body_suffix = if parts_split.len() > 1 { parts_split[1] } else { "" };
                    modified_req = format!("{}\r\n\r\n{}", new_headers.join("\r\n"), body_suffix);
                }

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

                let start_instant = std::time::Instant::now();
                let app_c = app_clone.clone();
                let req_id_c = req_id.clone();
                tokio::spawn(async move {
                    let mut res_buf = vec![0u8; 16384];
                    if let Ok(n_res) = target_read.read(&mut res_buf).await {
                        let duration_ms = start_instant.elapsed().as_millis() as u64;
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
                                "durationMs": duration_ms,
                                "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()
                            });
                            let _ = app_c.emit("request:log:response", res_meta);

                            let _ = client_write.write_all(&res_buf[..n_res]).await;
                        }
                    }

                    let _ = tokio::io::copy(&mut target_read, &mut client_write).await;
                    let _ = client_write.shutdown().await;
                });

                let _ = tokio::io::copy(&mut client_read, &mut target_write).await;
                let _ = target_write.shutdown().await;
            });
        }
    });

    let app_liveness = app.clone();
    let liveness_handle = tokio::spawn(async move {
        // Initial pause before first probe
        tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;
        let mut last_status = "ACTIVE";
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

            let is_v4 = tokio::time::timeout(
                tokio::time::Duration::from_millis(250),
                TcpStream::connect(format!("127.0.0.1:{}", local_port)),
            )
            .await
            .map(|r| r.is_ok())
            .unwrap_or(false);

            let is_alive = if is_v4 {
                true
            } else {
                tokio::time::timeout(
                    tokio::time::Duration::from_millis(250),
                    TcpStream::connect(format!("[::1]:{}", local_port)),
                )
                .await
                .map(|r| r.is_ok())
                .unwrap_or(false)
            };

            let new_status = if is_alive { "ACTIVE" } else { "STANDBY" };
            if new_status != last_status {
                last_status = new_status;
                let _ = app_liveness.emit(
                    "tunnel:status-changed",
                    serde_json::json!({
                        "port": local_port,
                        "status": new_status
                    }),
                );
            }
        }
    });

    map.insert(local_port, (proxy_port, vec![listener_handle, liveness_handle]));
    Ok(proxy_port)
}

