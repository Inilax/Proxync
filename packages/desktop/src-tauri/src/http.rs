use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct NativeHttpResponsePayload {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

fn default_user_agent() -> &'static str {
    if cfg!(target_os = "windows") {
        concat!("Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProxyncStudio/", env!("CARGO_PKG_VERSION"))
    } else if cfg!(target_os = "macos") {
        concat!("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ProxyncStudio/", env!("CARGO_PKG_VERSION"))
    } else {
        concat!("Mozilla/5.0 (X11; Linux x86_64) ProxyncStudio/", env!("CARGO_PKG_VERSION"))
    }
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
        .user_agent(default_user_agent())
        .build()
        .map_err(|e| e.to_string())?;

    let req_method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut req_builder = client.request(req_method, &url);

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_user_agent() {
        let ua = default_user_agent();
        assert!(ua.contains("ProxyncStudio/"));
        #[cfg(target_os = "windows")]
        assert!(ua.contains("Windows NT 10.0; Win64; x64"));
        #[cfg(target_os = "macos")]
        assert!(ua.contains("Macintosh; Intel Mac OS X"));
        #[cfg(target_os = "linux")]
        assert!(ua.contains("X11; Linux x86_64"));
    }
}
