#[tauri::command]
pub async fn start_proxy(
    app: tauri::AppHandle,
    local_port: u16,
    basic_auth: Option<String>,
) -> Result<u16, String> {
    let tx = crate::bridge::get_or_init(&app);
    proxync_core::proxy::start_proxy_with_auth(tx, local_port, basic_auth).await
}

#[tauri::command]
pub async fn start_path_router(
    app: tauri::AppHandle,
    routes: Vec<String>,
    basic_auth: Option<String>,
) -> Result<u16, String> {
    let tx = crate::bridge::get_or_init(&app);
    let mut parsed = Vec::new();
    for s in routes {
        parsed.push(proxync_core::proxy::parse_route(&s)?);
    }
    proxync_core::proxy::start_path_router(tx, parsed, basic_auth).await
}
