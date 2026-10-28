pub use proxync_core::recon::ProcessCandidate;

#[tauri::command]
pub async fn scan_ports() -> Result<Vec<u16>, String> {
    proxync_core::recon::scan_ports().await
}

#[tauri::command]
pub async fn scan_processes(bypass_cache: bool) -> Result<Vec<ProcessCandidate>, String> {
    proxync_core::recon::scan_processes(bypass_cache).await
}

#[tauri::command]
pub async fn resolve_process_directory(port: u16, pid: Option<u32>) -> Result<String, String> {
    proxync_core::recon::resolve_process_directory(port, pid).await
}

#[tauri::command]
pub async fn probe_port(port: u16) -> Result<bool, String> {
    proxync_core::recon::probe_port(port).await
}

#[tauri::command]
pub async fn probe_tcp_latency(host: String, port: u16) -> Result<u64, String> {
    proxync_core::recon::probe_tcp_latency(host, port).await
}
