use tauri::Emitter;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use lazy_static::lazy_static;
use tokio::net::TcpListener;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

lazy_static! {
    static ref PROXY_HANDLE: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>> = Arc::new(Mutex::new(None));
}

pub async fn stop_proxy() -> bool {
    let mut proxy_lock = PROXY_HANDLE.lock().await;
    if let Some(handle) = proxy_lock.take() {
        handle.abort();
        true
    } else {
        false
    }
}

#[tauri::command]
pub async fn start_proxy(app: tauri::AppHandle, local_port: u16) -> Result<u16, String> {
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
