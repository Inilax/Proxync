use proxync_core::cli_installer::{
    check_cli_status as core_check,
    install_cli_to_path as core_install,
    uninstall_cli_from_path as core_uninstall,
    CliStatus,
};

#[tauri::command]
pub fn check_cli_status() -> Result<CliStatus, String> {
    Ok(core_check())
}

#[tauri::command]
pub async fn install_cli_to_path() -> Result<String, String> {
    core_install().await
}

#[tauri::command]
pub fn uninstall_cli_from_path() -> Result<String, String> {
    core_uninstall()
}
