mod recon;
mod proxy;
mod storage;
mod http;
mod tunnel;

use recon::{scan_ports, scan_processes, resolve_process_directory};
use tunnel::{open_tunnel, close_tunnel, open_localtunnel, open_cloudflare_tunnel, open_native_tunnel};
use proxy::start_proxy;
use storage::{scan_directory, read_file_content, get_local_ip, save_app_state, load_app_state};
use http::execute_http_request;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::AppleScript, Some(vec!["--autostart"])))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_ports, 
            scan_processes,
            resolve_process_directory,
            open_tunnel, 
            close_tunnel,
            open_localtunnel,
            open_cloudflare_tunnel,
            open_native_tunnel,
            scan_directory,
            read_file_content,
            get_local_ip,
            save_app_state,
            load_app_state,
            start_proxy,
            execute_http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
