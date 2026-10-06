mod bridge;
mod recon;
mod proxy;
mod storage;
mod http;
mod tunnel;
mod cli;

use recon::{scan_ports, scan_processes, resolve_process_directory, probe_port, probe_tcp_latency};
use tunnel::{open_tunnel, close_tunnel, close_all_tunnels, open_cloudflare_tunnel, open_native_tunnel};
use proxy::start_proxy;
use storage::{
    scan_directory, read_file_content, get_local_ip, save_app_state, load_app_state,
    append_log_entry, clear_log_files, open_logs_folder, read_logs_summary, open_file_in_editor,
    save_support_bundle_dialog, get_system_info
};
use http::execute_http_request;
use cli::{check_cli_status, install_cli_to_path, uninstall_cli_from_path};

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    storage::install_panic_hook();
    storage::init_app_log_header();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::AppleScript, Some(vec!["--autostart"])))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                if let Ok(menu) = tauri::menu::Menu::default(app.handle()) {
                    let _ = app.set_menu(menu);
                }
            }
            let _ = app;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_ports, 
            scan_processes,
            resolve_process_directory,
            probe_port,
            probe_tcp_latency,
            open_tunnel, 
            close_tunnel,
            close_all_tunnels,
            open_cloudflare_tunnel,
            open_native_tunnel,
            scan_directory,
            read_file_content,
            open_file_in_editor,
            get_local_ip,
            save_app_state,
            load_app_state,
            start_proxy,
            execute_http_request,
            append_log_entry,
            clear_log_files,
            open_logs_folder,
            read_logs_summary,
            save_support_bundle_dialog,
            get_system_info,
            check_cli_status,
            install_cli_to_path,
            uninstall_cli_from_path
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = tauri::async_runtime::block_on(close_all_tunnels());
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let _ = tauri::async_runtime::block_on(close_all_tunnels());
            }
        });
}
