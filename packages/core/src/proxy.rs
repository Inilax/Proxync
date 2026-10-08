use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use lazy_static::lazy_static;
use tokio::net::TcpListener;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::events::{EventSender, ProxyncEvent};
use base64::prelude::*;

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

// ponytail: 50 MB upload cap — prevents OOM on large multipart uploads over public tunnels.
// Upgrade path: make configurable via AppSettings if users request larger limits.
const MAX_UPLOAD_BODY_BYTES: usize = 50 * 1024 * 1024; // 50 MB

/// Validates and parses Basic Auth credentials in "username:password" format.
/// In accordance with RFC 7617, the username must not contain unescaped colons.
/// Splits strictly on the first colon (.split_once(':')) so passwords can contain colons.
pub fn parse_basic_auth_credentials(cred: &str) -> Result<(String, String), String> {
    let trimmed = cred.trim();
    let (username, password) = trimmed
        .split_once(':')
        .ok_or_else(|| "Invalid basic auth format: missing colon separator between username and password".to_string())?;

    let username = username.trim();
    if username.is_empty() {
        return Err("Basic auth username cannot be empty".to_string());
    }
    if username.contains(':') {
        return Err("Basic auth username cannot contain colons".to_string());
    }

    Ok((username.to_string(), password.to_string()))
}

/// Extracts the HTTP Authorization header from raw header string and verifies against expected Basic Auth credentials.
/// Handles base64 decoding, splits only on the first colon, and checks username & password.
pub fn verify_basic_auth(header_str: &str, expected_user: &str, expected_pass: &str) -> bool {
    for line in header_str.lines() {
        let trimmed = line.trim();
        if trimmed.to_ascii_lowercase().starts_with("authorization:") {
            if let Some((_, val)) = trimmed.split_once(':') {
                let auth_val = val.trim();
                if let Some(token) = auth_val.strip_prefix("Basic ").or_else(|| auth_val.strip_prefix("basic ")) {
                    if let Ok(decoded_bytes) = BASE64_STANDARD.decode(token.trim()) {
                        if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
                            if let Some((user, pass)) = decoded_str.split_once(':') {
                                if user == expected_user && pass == expected_pass {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    false
}

pub async fn start_proxy(tx: EventSender, local_port: u16) -> Result<u16, String> {
    start_proxy_with_auth(tx, local_port, None).await
}

pub async fn start_proxy_with_auth(
    tx: EventSender,
    local_port: u16,
    basic_auth: Option<String>,
) -> Result<u16, String> {
    let mut map = PROXY_HANDLES.lock().await;
    if let Some((_, old_handles)) = map.remove(&local_port) {
        for handle in old_handles {
            handle.abort();
        }
    }

    let auth_expected: Option<Arc<(String, String)>> = match basic_auth {
        Some(cred) if !cred.trim().is_empty() => {
            let (u, p) = parse_basic_auth_credentials(&cred)?;
            Some(Arc::new((u, p)))
        }
        _ => None,
    };

    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let proxy_port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let proxy_tx = tx.clone();
    let listener_handle = tokio::spawn(async move {
        while let Ok((mut client_stream, _)) = listener.accept().await {
            let tx_clone = proxy_tx.clone();
            let auth_clone = auth_expected.clone();
            tokio::spawn(async move {
                // ponytail: dynamic header reading until \r\n\r\n delimiter; 2 MB safety cap prevents memory DoS
                const MAX_HEADER_BYTES: usize = 2 * 1024 * 1024; // 2 MB
                let mut req_buf = Vec::with_capacity(8192);
                let mut chunk = [0u8; 8192];
                let mut header_end: Option<usize> = None;

                loop {
                    let n = match client_stream.read(&mut chunk).await {
                        Ok(bytes) if bytes > 0 => bytes,
                        _ => break,
                    };
                    req_buf.extend_from_slice(&chunk[..n]);

                    if let Some(pos) = req_buf.windows(4).position(|w| w == b"\r\n\r\n") {
                        header_end = Some(pos + 4);
                        break;
                    }

                    if req_buf.len() > MAX_HEADER_BYTES {
                        let resp = "HTTP/1.1 431 Request Header Fields Too Large\r\nConnection: close\r\n\r\n";
                        let _ = client_stream.write_all(resp.as_bytes()).await;
                        let _ = client_stream.shutdown().await;
                        return;
                    }
                }

                let header_end_pos = match header_end {
                    Some(pos) => pos,
                    None => return, // Delimiter \r\n\r\n never arrived before EOF
                };

                let header_str = String::from_utf8_lossy(&req_buf[..header_end_pos]);

                // Basic Auth verification if configured (checked before probing backend service to prevent port/health leakage)
                if let Some(ref expected) = auth_clone {
                    if !verify_basic_auth(&header_str, &expected.0, &expected.1) {
                        let resp = "HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm=\"Proxync Tunnel\"\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 12\r\nConnection: close\r\n\r\nUnauthorized";
                        let _ = client_stream.write_all(resp.as_bytes()).await;
                        let _ = client_stream.shutdown().await;
                        return;
                    }
                }

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

                // 1. Detect WebSocket Upgrade requests (Vite HMR, Next Turbopack, Socket.io, NestJS, etc.)
                let is_ws_upgrade = header_str.lines().any(|l| {
                    let ll = l.to_lowercase();
                    ll.starts_with("upgrade:") && ll.contains("websocket")
                }) || header_str.lines().any(|l| {
                    let ll = l.to_lowercase();
                    ll.starts_with("connection:") && ll.contains("upgrade")
                });

                // 2. Detect SSE (Server-Sent Events) streams
                let is_sse = header_str.lines().any(|l| {
                    let ll = l.to_lowercase();
                    ll.starts_with("accept:") && ll.contains("text/event-stream")
                });

                // 3. Enforce upload size cap (50 MB)
                let mut content_length: usize = 0;
                for line in header_str.lines() {
                    let lower = line.to_lowercase();
                    if lower.starts_with("content-length:") {
                        if let Some((_, val)) = line.split_once(':') {
                            if let Ok(len) = val.trim().parse::<usize>() {
                                content_length = len;
                            }
                        }
                    }
                }
                if content_length > MAX_UPLOAD_BODY_BYTES {
                    let err_json = "{\"error\":\"Upload limit exceeded. Proxync limits uploads to 50 MB per request.\"}";
                    let resp = format!(
                        "HTTP/1.1 413 Payload Too Large\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        err_json.len(),
                        err_json
                    );
                    let _ = client_stream.write_all(resp.as_bytes()).await;
                    let _ = client_stream.shutdown().await;
                    return;
                }

                // 4. Header normalization & forwarding headers injection
                let mut incoming_host = String::new();
                let mut modified_headers = Vec::new();
                let mut safe_headers = HashMap::new();
                let mut method = "GET".to_string();
                let mut path = "/".to_string();

                for (idx, line) in header_str.lines().enumerate() {
                    if idx == 0 {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            method = parts[0].to_string();
                            path = parts[1].to_string();
                        }
                        modified_headers.push(line.to_string());
                        continue;
                    }
                    if let Some((k, v)) = line.split_once(':') {
                        let key = k.trim();
                        let val = v.trim();
                        let lower_key = key.to_lowercase();
                        if lower_key == "host" {
                            incoming_host = val.to_string();
                            modified_headers.push(format!("Host: localhost:{}", local_port));
                        } else if lower_key == "origin" {
                            // Rewrite Origin to match local dev server host so WebSocket origin checks pass
                            modified_headers.push(format!("Origin: http://localhost:{}", local_port));
                        } else if is_ws_upgrade && (lower_key == "connection" || lower_key == "upgrade" || lower_key.starts_with("sec-websocket-")) {
                            // Preserve WebSocket headers verbatim
                            modified_headers.push(line.to_string());
                        } else if !is_ws_upgrade && !is_sse && lower_key == "connection" {
                            modified_headers.push("Connection: close".to_string());
                        } else {
                            modified_headers.push(line.to_string());
                        }

                        let display_val = if lower_key == "authorization" || lower_key == "cookie" || lower_key == "set-cookie" || lower_key == "x-api-key" || lower_key == "api-key" {
                            "[REDACTED]".to_string()
                        } else {
                            val.to_string()
                        };
                        safe_headers.insert(key.to_string(), display_val);
                    }
                }

                // Inject Forwarded headers for reverse proxying
                modified_headers.push("X-Forwarded-Proto: https".to_string());
                modified_headers.push("X-Forwarded-For: 127.0.0.1".to_string());
                if !incoming_host.is_empty() {
                    modified_headers.push(format!("X-Forwarded-Host: {}", incoming_host));
                }
                if !is_ws_upgrade && !is_sse && !modified_headers.iter().any(|h| h.to_lowercase().starts_with("connection:")) {
                    modified_headers.push("Connection: close".to_string());
                }

                let modified_headers_str = format!("{}\r\n\r\n", modified_headers.join("\r\n"));
                let body_bytes = &req_buf[header_end_pos..];

                let req_id = format!("req-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
                let body_preview = String::from_utf8_lossy(&body_bytes[..body_bytes.len().min(4096)]).trim().to_string();

                let _ = tx_clone.send(ProxyncEvent::RequestLog {
                    id: req_id.clone(),
                    method: method.clone(),
                    path: path.clone(),
                    port: local_port,
                    headers: serde_json::json!(safe_headers),
                    body_preview,
                    tunnel_id: None,
                    timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
                });

                let start_instant = std::time::Instant::now();

                if target_stream.write_all(modified_headers_str.as_bytes()).await.is_err() {
                    return;
                }
                if !body_bytes.is_empty() {
                    if target_stream.write_all(body_bytes).await.is_err() {
                        return;
                    }
                }

                // Read initial response chunk to capture HTTP status code and latency duration
                let mut res_buf = vec![0u8; 16384];
                let mut n_res = match target_stream.read(&mut res_buf).await {
                    Ok(bytes) if bytes > 0 => bytes,
                    _ => return,
                };

                // ponytail: if headers were flushed in first TCP segment (e.g. Next.js/Node chunked encoding),
                // read the initial body segment into the buffer so responseBodyPreview is captured for schema drift.
                // BODY_CHUNK_TIMEOUT_MS: chosen to be > a Node.js event-loop tick (~16 ms) but imperceptible to the user.
                // Upgrade path: expose via AppSettings if users need tuning.
                const BODY_CHUNK_TIMEOUT_MS: u64 = 150;
                if !is_ws_upgrade && !is_sse {
                    if let Some(pos) = res_buf[..n_res].windows(4).position(|w| w == b"\r\n\r\n") {
                        let header_end = pos + 4;
                        if header_end == n_res && n_res < res_buf.len() {
                            if let Ok(Ok(extra)) = tokio::time::timeout(
                                std::time::Duration::from_millis(BODY_CHUNK_TIMEOUT_MS),
                                target_stream.read(&mut res_buf[n_res..]),
                            ).await {
                                n_res += extra;
                            }
                        }
                    }
                }

                let duration_ms = start_instant.elapsed().as_millis() as u64;
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

                // ── Response Body Preview Extraction (Schema Drift Engine) ──────────────────
                // ponytail: 4 KB IPC cap — high-frequency Tauri events; upgrade path: expose
                // cap as configurable AppSettings field if users need larger previews.
                const RESP_BODY_PREVIEW_BYTES: usize = 4096;

                let (response_headers_map, response_body_preview): (serde_json::Value, Option<String>) = {
                    if is_ws_upgrade || is_sse {
                        // Never capture streaming protocols — bidirectional relay follows immediately
                        (serde_json::json!({}), None)
                    } else {
                        let header_body_parts: Vec<&str> = res_str.splitn(2, "\r\n\r\n").collect();
                        let resp_header_section = header_body_parts.get(0).copied().unwrap_or("");
                        let resp_body_section   = header_body_parts.get(1).copied().unwrap_or("");

                        // Parse response headers into a JSON map (skip status line at index 0)
                        let mut resp_hdrs = serde_json::Map::new();
                        let mut content_type_val = String::new();
                        let mut content_encoding_val = String::new();
                        for line in resp_header_section.lines().skip(1) {
                            if let Some((k, v)) = line.split_once(':') {
                                let key_lc = k.trim().to_lowercase();
                                let val    = v.trim().to_string();
                                if key_lc == "content-type" { content_type_val = val.clone(); }
                                if key_lc == "content-encoding" { content_encoding_val = val.clone(); }
                                resp_hdrs.insert(k.trim().to_string(), serde_json::Value::String(val));
                            }
                        }

                        // Only capture body preview for JSON and when not compressed with gzip/br/deflate
                        let is_json = content_type_val.to_lowercase().contains("json");
                        let is_compressed = !content_encoding_val.is_empty() && content_encoding_val != "identity";

                        let body_preview = if is_json && !is_compressed && !resp_body_section.is_empty() {
                            let preview: String = resp_body_section
                                .trim()
                                .chars()
                                .take(RESP_BODY_PREVIEW_BYTES)
                                .collect();
                            if preview.is_empty() { None } else { Some(preview) }
                        } else {
                            None
                        };

                        (serde_json::Value::Object(resp_hdrs), body_preview)
                    }
                };

                let _ = tx_clone.send(ProxyncEvent::ResponseLog {
                    id: req_id.clone(),
                    request_id: req_id.clone(),
                    status,
                    duration_ms,
                    response_headers: response_headers_map,
                    response_body_preview,
                    timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
                });

                if client_stream.write_all(&res_buf[..n_res]).await.is_err() {
                    return;
                }

                // Full-duplex bidirectional stream for remaining traffic (WebSocket HMR, HTTP/1.1 chunked, SSE, uploads)
                let _ = tokio::io::copy_bidirectional(&mut client_stream, &mut target_stream).await;
            });
        }
    });

    let liveness_tx = tx.clone();
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
                let _ = liveness_tx.send(ProxyncEvent::TunnelStatusChanged {
                    port: local_port,
                    status: new_status.to_string(),
                });
            }
        }
    });

    map.insert(local_port, (proxy_port, vec![listener_handle, liveness_handle]));
    Ok(proxy_port)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::broadcast;

    fn test_event_sender() -> EventSender {
        let (tx, _rx) = broadcast::channel(16);
        tx
    }

    #[test]
    fn test_parse_basic_auth_credentials() {
        // Valid username and password
        let res = parse_basic_auth_credentials("alice:secret123");
        assert_eq!(res.unwrap(), ("alice".to_string(), "secret123".to_string()));

        // Password containing colons (split_once on first colon)
        let res = parse_basic_auth_credentials("bob:pass:word:with:colons");
        assert_eq!(res.unwrap(), ("bob".to_string(), "pass:word:with:colons".to_string()));

        // Missing colon
        assert!(parse_basic_auth_credentials("charlie").is_err());

        // Empty username
        assert!(parse_basic_auth_credentials(":password").is_err());
    }

    #[test]
    fn test_verify_basic_auth_logic() {
        let headers = "GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46c2VjcmV0MTIz\r\n\r\n";
        assert!(verify_basic_auth(headers, "admin", "secret123"));

        // Wrong password
        assert!(!verify_basic_auth(headers, "admin", "wrong"));

        // Wrong user
        assert!(!verify_basic_auth(headers, "user", "secret123"));

        // Missing auth header
        let no_auth = "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert!(!verify_basic_auth(no_auth, "admin", "secret123"));
    }

    #[tokio::test]
    async fn test_proxy_auth_flows() {
        // 1. Start mock target server
        let target_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target_port = target_listener.local_addr().unwrap().port();

        tokio::spawn(async move {
            while let Ok((mut stream, _)) = target_listener.accept().await {
                tokio::spawn(async move {
                    let mut buf = vec![0u8; 65536];
                    let _ = stream.read(&mut buf).await;
                    let resp = "HTTP/1.1 200 OK\r\nContent-Length: 5\r\nConnection: close\r\n\r\nHello";
                    let _ = stream.write_all(resp.as_bytes()).await;
                });
            }
        });

        // 2. Start proxy with auth "admin:pass123"
        let tx = test_event_sender();
        let proxy_port = start_proxy_with_auth(tx, target_port, Some("admin:pass123".to_string()))
            .await
            .unwrap();

        // 3. Request without auth -> 401 Unauthorized
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("401 Unauthorized"));
            assert!(res_str.contains("WWW-Authenticate: Basic"));
        }

        // 4. Request with invalid credentials -> 401 Unauthorized
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            // admin:wrong -> YWRtaW46d3Jvbmc=
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46d3Jvbmc=\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("401 Unauthorized"));
        }

        // 5. Request with correct credentials -> 200 OK
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            // admin:pass123 -> YWRtaW46cGFzczEyMw==
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46cGFzczEyMw==\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("200 OK"));
            assert!(res_str.contains("Hello"));
        }

        // 6. Test large headers > 16 KB (Issue 2)
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            let large_cookie = "X-Large-Cookie: ".to_string() + &"a".repeat(20000) + "\r\n";
            let req = format!(
                "GET / HTTP/1.1\r\nHost: localhost\r\n{}Authorization: Basic YWRtaW46cGFzczEyMw==\r\n\r\n",
                large_cookie
            );
            stream.write_all(req.as_bytes()).await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("200 OK"));
        }

        stop_proxy(Some(target_port)).await;
    }

    #[tokio::test]
    async fn test_offline_target_does_not_leak_502_before_auth() {
        // Bind an unused port and immediately close it so target is offline
        let dummy = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let offline_port = dummy.local_addr().unwrap().port();
        drop(dummy);

        let tx = test_event_sender();
        let proxy_port = start_proxy_with_auth(tx, offline_port, Some("admin:secret".to_string()))
            .await
            .unwrap();

        // Unauthenticated client probing offline target -> must receive 401 Unauthorized, NOT 502!
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("401 Unauthorized"));
            assert!(!res_str.contains("502 Bad Gateway"));
        }

        // Authenticated client probing offline target -> gets 502 Bad Gateway
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            // admin:secret -> YWRtaW46c2VjcmV0
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46c2VjcmV0\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 1024];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("502 Bad Gateway"));
        }

        stop_proxy(Some(offline_port)).await;
    }
}

