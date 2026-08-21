use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const MAX_HTTP_BODY_BYTES: usize = 10 * 1024 * 1024; // 10MB safety ceiling

#[derive(Serialize, Deserialize)]
pub struct NativeHttpResponsePayload {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[tauri::command]
pub async fn execute_http_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<NativeHttpResponsePayload, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProxyncStudio/0.2.1")
        .build()
        .map_err(|e| e.to_string())?;

    let req_method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut req_builder = client.request(req_method, &url);

    let has_user_agent = headers.keys().any(|k| k.eq_ignore_ascii_case("user-agent"));
    if !has_user_agent {
        req_builder = req_builder.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProxyncStudio/0.2.1");
    }

    for (k, v) in headers {
        req_builder = req_builder.header(&k, &v);
    }

    if let Some(b) = body {
        if !b.is_empty() && method != "GET" && method != "HEAD" {
            req_builder = req_builder.body(b);
        }
    }

    let mut res = req_builder.send().await.map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = res.status().as_u16();

    let mut res_headers = HashMap::new();
    for (k, v) in res.headers() {
        if let Ok(v_str) = v.to_str() {
            res_headers.insert(k.as_str().to_string(), v_str.to_string());
        }
    }

    // Bounded streaming reader: protects against OOM attacks on massive payloads
    let mut body_bytes = Vec::new();
    let mut truncated = false;

    while let Ok(Some(chunk)) = res.chunk().await {
        if body_bytes.len() + chunk.len() > MAX_HTTP_BODY_BYTES {
            let remaining = MAX_HTTP_BODY_BYTES.saturating_sub(body_bytes.len());
            if remaining > 0 {
                body_bytes.extend_from_slice(&chunk[..remaining]);
            }
            truncated = true;
            break;
        }
        body_bytes.extend_from_slice(&chunk);
    }

    let mut body_text = String::from_utf8_lossy(&body_bytes).to_string();
    if truncated {
        body_text.push_str("\n\n[PROXYNC NOTICE: Response body truncated at 10MB limit]");
    }

    Ok(NativeHttpResponsePayload {
        status,
        headers: res_headers,
        body: body_text,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_http_body_bytes_limit() {
        assert_eq!(MAX_HTTP_BODY_BYTES, 10 * 1024 * 1024);
    }
}
