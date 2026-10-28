use std::sync::OnceLock;
use tauri::Emitter;
use proxync_core::events::{create_event_channel, EventSender, ProxyncEvent};

// ponytail: one global bridge per process. Spawned on first use, lives until app exit.
// Ceiling: AppHandle is stable for Tauri app lifetime (guaranteed by Tauri internals).
// Upgrade: if multi-window isolation is ever needed, key by window label.
static EVENT_SENDER: OnceLock<EventSender> = OnceLock::new();

/// Return the shared broadcast sender, spawning exactly one relay task on first call.
/// Both tunnel.rs and proxy.rs call this — no direct cross-module dependency needed.
pub(crate) fn get_or_init(app: &tauri::AppHandle) -> EventSender {
    EVENT_SENDER.get_or_init(|| {
        let (tx, mut rx) = create_event_channel();
        let app_clone = app.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                match rx.recv().await {
                    Ok(event) => match event {
                        ProxyncEvent::RequestLog { id, method, path, port, headers, body_preview, tunnel_id, timestamp } => {
                            let _ = app_clone.emit("request:log", serde_json::json!({
                                "requestId": id,
                                "method": method,
                                "path": path,
                                "port": port,
                                "headers": headers,
                                "bodyPreview": body_preview,
                                "tunnelId": tunnel_id,
                                "timestamp": timestamp,
                            }));
                        }
                        ProxyncEvent::ResponseLog { id, request_id, status, duration_ms, response_headers, response_body_preview, timestamp } => {
                            let _ = app_clone.emit("request:log:response", serde_json::json!({
                                "id": id,
                                "requestId": request_id,
                                "status": status,
                                "durationMs": duration_ms,
                                "responseHeaders": response_headers,
                                "responseBodyPreview": response_body_preview,
                                "timestamp": timestamp,
                            }));
                        }
                        ProxyncEvent::TunnelAutoClosed { tunnel_id } => {
                            let _ = app_clone.emit("tunnel:auto-closed", serde_json::json!({
                                "tunnelId": tunnel_id,
                            }));
                        }
                        ProxyncEvent::TunnelStatusChanged { port, status } => {
                            let _ = app_clone.emit("tunnel:status-changed", serde_json::json!({
                                "port": port,
                                "status": status,
                            }));
                        }
                    },
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                }
            }
        });
        tx
    }).clone()
}
