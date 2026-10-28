use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

/// All events that flow from core logic to any frontend (desktop GUI or CLI).
/// Replaces the 7 `app.emit()` calls that were Tauri-specific.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ProxyncEvent {
    /// A new HTTP request was captured by the proxy or relay tunnel.
    RequestLog {
        id: String,
        method: String,
        path: String,
        port: u16,
        headers: serde_json::Value,
        body_preview: String,
        tunnel_id: Option<String>,
        timestamp: u128,
    },
    /// The response for a previously captured request.
    ResponseLog {
        id: String,
        request_id: String,
        status: u16,
        duration_ms: u64,
        response_headers: serde_json::Value,
        response_body_preview: Option<String>,
        timestamp: u128,
    },
    /// Local server liveness changed (ACTIVE ↔ STANDBY).
    TunnelStatusChanged {
        port: u16,
        status: String,
    },
    /// A tunnel subprocess exited unexpectedly.
    TunnelAutoClosed {
        tunnel_id: String,
    },
}

pub type EventSender = broadcast::Sender<ProxyncEvent>;
pub type EventReceiver = broadcast::Receiver<ProxyncEvent>;

/// Create a broadcast channel for core events.
/// Buffer of 256 — enough for burst traffic without blocking.
pub fn create_event_channel() -> (EventSender, EventReceiver) {
    broadcast::channel(256)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_broadcast_event_channel() {
        let (tx, mut rx) = create_event_channel();
        let event = ProxyncEvent::TunnelStatusChanged {
            port: 3000,
            status: "ACTIVE".to_string(),
        };
        tx.send(event).expect("send event");
        match rx.recv().await.expect("receive event") {
            ProxyncEvent::TunnelStatusChanged { port, status } => {
                assert_eq!(port, 3000);
                assert_eq!(status, "ACTIVE");
            }
            _ => panic!("unexpected event variant"),
        }
    }
}
