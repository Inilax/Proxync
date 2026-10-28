#[tauri::command]
pub async fn close_tunnel(tunnel_id: String, local_port: Option<u16>) -> Result<(), String> {
    proxync_core::tunnel::close_tunnel(tunnel_id, local_port).await
}

#[tauri::command]
pub async fn close_all_tunnels() -> Result<(), String> {
    proxync_core::tunnel::close_all_tunnels().await
}

#[tauri::command]
pub async fn open_tunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
    token: String,
    workspace_id: String,
    relay_url: Option<String>,
) -> Result<(), String> {
    let tx = crate::bridge::get_or_init(&app);
    proxync_core::tunnel::open_tunnel(tx, tunnel_id, local_port, token, workspace_id, relay_url).await
}

#[tauri::command]
pub async fn open_cloudflare_tunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
) -> Result<String, String> {
    let tx = crate::bridge::get_or_init(&app);
    proxync_core::tunnel::open_cloudflare_tunnel(tx, tunnel_id, local_port).await
}

#[tauri::command]
pub async fn open_native_tunnel(
    app: tauri::AppHandle,
    tunnel_id: String,
    local_port: u16,
    subdomain: String,
) -> Result<String, String> {
    let tx = crate::bridge::get_or_init(&app);
    proxync_core::tunnel::open_native_tunnel(tx, tunnel_id, local_port, subdomain).await
}
