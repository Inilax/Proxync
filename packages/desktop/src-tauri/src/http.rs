use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
