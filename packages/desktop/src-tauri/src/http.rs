pub use proxync_core::http::NativeHttpResponsePayload;
use std::collections::HashMap;

#[tauri::command]
pub async fn execute_http_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<NativeHttpResponsePayload, String> {
    proxync_core::http::execute_http_request(method, url, headers, body).await
}
