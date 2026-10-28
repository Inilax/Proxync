pub use proxync_core::storage::{
    LogsSummary, SystemInfo,
    install_panic_hook, init_app_log_header,
};

use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    proxync_core::storage::scan_directory(path).await
}

#[tauri::command]
pub async fn read_file_content(root_path: String, rel_path: String) -> Result<String, String> {
    proxync_core::storage::read_file_content(root_path, rel_path).await
}

#[tauri::command]
pub async fn open_file_in_editor(file_path: String, line_number: Option<u32>, editor: Option<String>) -> Result<(), String> {
    proxync_core::storage::open_file_in_editor(file_path, line_number, editor).await
}

#[tauri::command]
pub async fn get_local_ip() -> Result<String, String> {
    proxync_core::storage::get_local_ip().await
}

#[tauri::command]
pub async fn save_app_state(state: String) -> Result<(), String> {
    proxync_core::storage::save_app_state(state).await
}

#[tauri::command]
pub async fn load_app_state() -> Result<String, String> {
    proxync_core::storage::load_app_state().await
}

#[tauri::command]
pub async fn append_log_entry(category: String, line: String) -> Result<(), String> {
    proxync_core::storage::append_log_entry(category, line).await
}

#[tauri::command]
pub async fn clear_log_files() -> Result<(), String> {
    proxync_core::storage::clear_log_files().await
}

#[tauri::command]
pub async fn open_logs_folder() -> Result<(), String> {
    proxync_core::storage::open_logs_folder().await
}

#[tauri::command]
pub async fn read_logs_summary() -> Result<LogsSummary, String> {
    proxync_core::storage::read_logs_summary().await
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    proxync_core::storage::get_system_info().await
}

#[tauri::command]
pub async fn save_support_bundle_dialog(app: tauri::AppHandle, json_content: String) -> Result<Option<String>, String> {
    let default_name = format!(
        "proxync-support-bundle-{}.json",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    );

    let file_path = app.dialog()
        .file()
        .add_filter("JSON Diagnostic Bundle", &["json"])
        .set_file_name(&default_name)
        .blocking_save_file();

    if let Some(path) = file_path {
        let path_str = path.to_string();
        std::fs::write(&path_str, json_content).map_err(|e| format!("Failed to write support bundle: {}", e))?;
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}
