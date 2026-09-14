fn get_base_data_dir() -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    let mut dir = if let Ok(appdata) = std::env::var("APPDATA") {
        std::path::PathBuf::from(appdata)
    } else if let Ok(userprofile) = std::env::var("USERPROFILE") {
        std::path::PathBuf::from(userprofile).join("AppData").join("Roaming")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    #[cfg(target_os = "macos")]
    let mut dir = if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join("Library").join("Application Support")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    #[cfg(target_os = "linux")]
    let mut dir = if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        std::path::PathBuf::from(xdg)
    } else if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".config")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let mut dir = if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".config")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    dir.push("Proxync");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn get_data_filepath() -> std::path::PathBuf {
    let mut dir = get_base_data_dir();
    dir.push("data.json");
    dir
}

fn get_logs_dir() -> std::path::PathBuf {
    let mut dir = get_base_data_dir();
    dir.push("logs");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct LogsSummary {
    pub logs_dir: String,
    pub app_log_bytes: u64,
    pub traffic_log_bytes: u64,
    pub app_log_lines: usize,
    pub traffic_log_lines: usize,
}

pub const MAX_APP_LOG_BYTES: u64 = 5 * 1024 * 1024; // 5 MB
pub const MAX_TRAFFIC_LOG_BYTES: u64 = 10 * 1024 * 1024; // 10 MB

pub fn check_and_rotate_log(file_path: &std::path::Path, max_bytes: u64, is_app_log: bool) {
    if let Ok(meta) = std::fs::metadata(file_path) {
        if meta.len() >= max_bytes {
            let old_path = file_path.with_extension("log.old");
            let _ = std::fs::remove_file(&old_path);
            let _ = std::fs::rename(file_path, &old_path);
            if is_app_log {
                let now = get_current_iso_timestamp();
                let banner = build_system_banner(None);
                let rotation_entry = format!(
                    "[{}] [WARN] [SYSTEM] Log rotated: previous log exceeded 5MB and was archived to app.log.old\n",
                    now
                );
                let _ = std::fs::write(file_path, format!("{}\n\n{}", banner.trim_start(), rotation_entry));
            }
        }
    }
}

#[tauri::command]
pub async fn append_log_entry(category: String, line: String) -> Result<(), String> {
    use std::io::Write;
    let logs_dir = get_logs_dir();
    let (filename, max_bytes, is_app_log) = match category.as_str() {
        "traffic" => ("traffic.log", MAX_TRAFFIC_LOG_BYTES, false),
        _ => ("app.log", MAX_APP_LOG_BYTES, true),
    };
    let file_path = logs_dir.join(filename);

    check_and_rotate_log(&file_path, max_bytes, is_app_log);

    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| e.to_string())?;
    
    writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn clear_log_files() -> Result<(), String> {
    let logs_dir = get_logs_dir();
    let app_log = logs_dir.join("app.log");
    let traffic_log = logs_dir.join("traffic.log");
    let _ = std::fs::write(&traffic_log, "");

    // Clean up archive files if present
    let _ = std::fs::remove_file(logs_dir.join("app.log.old"));
    let _ = std::fs::remove_file(logs_dir.join("traffic.log.old"));

    let now = get_current_iso_timestamp();
    let banner = build_system_banner(Some(&now));
    let initial_entry = format!(
        "[{}] [INFO] [SYSTEM] Log history cleared by user request | previousLogsPurged=true\n",
        now
    );
    let full_content = format!("{}\n\n{}", banner.trim_start(), initial_entry);

    std::fs::write(&app_log, full_content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_logs_folder() -> Result<(), String> {
    let logs_dir = get_logs_dir();
    let path_str = logs_dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn read_logs_summary() -> Result<LogsSummary, String> {
    let logs_dir = get_logs_dir();
    let app_log_path = logs_dir.join("app.log");
    let traffic_log_path = logs_dir.join("traffic.log");

    let app_bytes = std::fs::metadata(&app_log_path).map(|m| m.len()).unwrap_or(0);
    let traffic_bytes = std::fs::metadata(&traffic_log_path).map(|m| m.len()).unwrap_or(0);

    let app_lines = if app_bytes > 0 {
        std::fs::read_to_string(&app_log_path).map(|s| s.lines().count()).unwrap_or(0)
    } else {
        0
    };

    let traffic_lines = if traffic_bytes > 0 {
        std::fs::read_to_string(&traffic_log_path).map(|s| s.lines().count()).unwrap_or(0)
    } else {
        0
    };

    Ok(LogsSummary {
        logs_dir: logs_dir.to_string_lossy().to_string(),
        app_log_bytes: app_bytes,
        traffic_log_bytes: traffic_bytes,
        app_log_lines: app_lines,
        traffic_log_lines: traffic_lines,
    })
}

#[tauri::command]
pub async fn save_app_state(state: String) -> Result<(), String> {
    let filepath = get_data_filepath();
    std::fs::write(&filepath, state).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_app_state() -> Result<String, String> {
    let filepath = get_data_filepath();
    if !filepath.exists() {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(&filepath).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_local_ip() -> Result<String, String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.connect("8.8.8.8:80").map_err(|e| e.to_string())?;
    let local_addr = socket.local_addr().map_err(|e| e.to_string())?;
    Ok(local_addr.ip().to_string())
}

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let root = std::path::Path::new(&path);
    if !root.is_dir() {
        return Err("Provided path is not a directory".to_string());
    }

    // ponytail: 3-layer defence against symlink infinite loops:
    //   1. Canonical path cycle detection (HashSet<PathBuf>) — primary fix
    //   2. Max recursion depth of 16 from root — hard safety net
    //   3. Graceful error recovery on every fallible I/O call
    // Upgrade path: expose MAX_SCAN_DEPTH via AppSettings if users need deeper scans.
    const MAX_SCAN_DEPTH: usize = 16;

    fn visit_dirs(
        dir: &std::path::Path,
        files: &mut Vec<String>,
        root: &std::path::Path,
        depth: usize,
        visited: &mut std::collections::HashSet<std::path::PathBuf>,
    ) -> std::io::Result<()> {
        if depth >= MAX_SCAN_DEPTH {
            return Ok(());
        }

        let read_dir = match std::fs::read_dir(dir) {
            Ok(rd) => rd,
            Err(_) => return Ok(()), // Permission denied or unreadable — skip gracefully
        };

        for entry in read_dir {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue, // Skip unreadable entries without aborting the scan
            };

            let path = entry.path();

            if path.is_dir() {
                // Skip common non-source directories to avoid wasted I/O
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if matches!(
                    name,
                    "node_modules"
                        | "target"
                        | ".git"
                        | "build"
                        | "bin"
                        | ".gradle"
                        | ".venv"
                        | "venv"
                        | "env"
                        | ".next"
                        | ".nuxt"
                        | ".turbo"
                        | "dist"
                        | "out"
                        | ".idea"
                        | ".vscode"
                ) {
                    continue;
                }

                // Cycle detection: resolve to the true physical path.
                // path.is_dir() follows symlinks transparently, so we must canonicalize
                // to detect when two different paths point to the same real directory.
                // If canonicalize fails (broken/dangling symlink) we skip gracefully.
                let canonical = match std::fs::canonicalize(&path) {
                    Ok(c) => c,
                    Err(_) => continue,
                };
                // visited.insert returns false if the canonical path was already in the set
                if !visited.insert(canonical) {
                    continue; // Already visited — loop or duplicate traversal blocked
                }

                visit_dirs(&path, files, root, depth + 1, visited)?;
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext = ext.to_lowercase();
                    if matches!(
                        ext.as_str(),
                        "java" | "ts" | "js" | "py" | "go" | "cs" | "controller"
                    ) {
                        // strip_prefix is safe on non-UTF-8 filenames (unlike raw string slicing).
                        // to_string_lossy() replaces invalid bytes with U+FFFD instead of panicking.
                        if let Ok(rel_path) = path.strip_prefix(root) {
                            let rel = rel_path.to_string_lossy().to_string();
                            files.push(rel);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    let mut visited = std::collections::HashSet::new();
    // Seed with the canonical root so symlinks pointing directly back to root
    // are caught immediately at depth 1 without needing a recursion
    if let Ok(canonical_root) = std::fs::canonicalize(root) {
        visited.insert(canonical_root);
    }
    visit_dirs(root, &mut files, root, 0, &mut visited).map_err(|e| e.to_string())?;
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    // Test 1: Circular symlink (loop_link -> dir itself) must NOT crash.
    // Without the fix, this hangs the process until a stack overflow kills the app.
    // With cycle detection, the loop is killed the moment loop_link is seen the second time.
    #[tokio::test]
    #[cfg(unix)]
    async fn test_scan_circular_symlink_does_not_crash() {
        let dir = tempfile::tempdir().unwrap();
        // loop_link -> dir (points back to its own parent)
        std::os::unix::fs::symlink(dir.path(), dir.path().join("loop_link")).unwrap();

        let result = scan_directory(dir.path().to_str().unwrap().to_string()).await;
        assert!(result.is_ok()); // Must complete — not crash or hang
        assert!(result.unwrap().is_empty()); // No source files in the temp dir
    }

    // Test 2: Legitimate symlinked DIRECTORY with real API files must BE scanned.
    // Proves that cycle detection only blocks loops — not valid cross-package symlinks.
    #[tokio::test]
    #[cfg(unix)]
    async fn test_scan_legitimate_symlinked_directory_is_included() {
        let dir = tempfile::tempdir().unwrap();
        let external_dir = tempfile::tempdir().unwrap();
        fs::write(external_dir.path().join("api.ts"), "export const r = '';").unwrap();

        // shared_api -> external_dir (monorepo-style symlinked shared module)
        std::os::unix::fs::symlink(external_dir.path(), dir.path().join("shared_api")).unwrap();

        let result = scan_directory(dir.path().to_str().unwrap().to_string()).await;
        let files = result.unwrap();
        assert!(files.iter().any(|f| f.contains("api.ts")));
    }

    // Test 3: Symlinked FILE (not folder) must also be collected.
    // This is the critical test proving we do NOT blanket-skip all symlinks —
    // only directory loops are blocked. Symlinked .ts files must still be scanned.
    #[tokio::test]
    #[cfg(unix)]
    async fn test_scan_symlinked_file_is_included() {
        let dir = tempfile::tempdir().unwrap();
        let external_dir = tempfile::tempdir().unwrap();
        fs::write(external_dir.path().join("routes.ts"), "export const r = '';").unwrap();

        // Symlink a single FILE into project root (not a folder)
        std::os::unix::fs::symlink(
            external_dir.path().join("routes.ts"),
            dir.path().join("routes.ts"),
        )
        .unwrap();

        let result = scan_directory(dir.path().to_str().unwrap().to_string()).await;
        let files = result.unwrap();
        assert!(files.iter().any(|f| f.contains("routes.ts")));
    }

    // Test 4: Depth guard — file at depth 20 must NOT appear (MAX_SCAN_DEPTH = 16).
    // Depth is counted from root (depth 0), so level 20 is 4 levels beyond the hard limit.
    #[tokio::test]
    async fn test_scan_max_depth_guard_stops_at_16() {
        let dir = tempfile::tempdir().unwrap();
        let mut current = dir.path().to_path_buf();
        for _ in 0..20 {
            current = current.join("deep");
            fs::create_dir_all(&current).unwrap();
        }
        fs::write(current.join("buried.ts"), "export const x = 1;").unwrap();

        let result = scan_directory(dir.path().to_str().unwrap().to_string()).await;
        let files = result.unwrap();
        assert!(
            files.iter().all(|f| !f.contains("buried.ts")),
            "File at depth 20 must not be returned — depth guard must have stopped at 16"
        );
    }
}

#[tauri::command]
pub async fn read_file_content(root_path: String, rel_path: String) -> Result<String, String> {
    let root = std::path::Path::new(&root_path);
    let canonical_root = std::fs::canonicalize(root)
        .map_err(|e| format!("Invalid root directory: {}", e))?;
    
    let clean_rel = rel_path.trim_start_matches('/').trim_start_matches('\\');
    let target = root.join(clean_rel);
    
    let canonical_target = std::fs::canonicalize(&target)
        .map_err(|e| format!("File does not exist: {}", e))?;
    
    // CSO Path Traversal Guard: verify the target does not escape the canonical root directory
    if !canonical_target.starts_with(&canonical_root) {
        return Err("Access denied: Path traversal detected".to_string());
    }
    
    std::fs::read_to_string(canonical_target).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_file_in_editor(file_path: String, line_number: Option<u32>, editor: Option<String>) -> Result<(), String> {
    let ed = editor.unwrap_or_else(|| "vscode".to_string()).to_lowercase();
    let line = line_number.unwrap_or(1);
    let binary_name = if ed == "cursor" { "cursor" } else { "code" };
    let scheme = if ed == "cursor" { "cursor" } else { "vscode" };

    // --- TIER 1: Direct CLI with Exact Line Jump (-g <path>:<line>) ---
    #[cfg(target_os = "windows")]
    {
        let normalized_path = file_path.replace('/', "\\");
        let goto_arg = format!("{}:{}", normalized_path, line);

        // 1a. Try <binary>.cmd (standard Windows CLI batch wrapper)
        let cmd_name = format!("{}.cmd", binary_name);
        if let Ok(mut child) = std::process::Command::new(&cmd_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // 1b. Try raw binary in PATH
        if let Ok(mut child) = std::process::Command::new(binary_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 2: OS URI Protocol Handler (vscode://file/... or cursor://file/...) ---
        let norm_uri_path = file_path.replace('\\', "/");
        let uri = format!("{}://file/{}:{}", scheme, norm_uri_path, line);
        if let Ok(mut child) = std::process::Command::new("cmd").args(&["/c", "start", "", &uri]).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 3: OS Default Associated Application Fallback ---
        let _ = std::process::Command::new("cmd").args(&["/c", "start", "", &normalized_path]).spawn();
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let goto_arg = format!("{}:{}", file_path, line);

        // 1a. Try CLI binary in standard PATH
        if let Ok(mut child) = std::process::Command::new(binary_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // 1b. Check common macOS paths (/usr/local/bin, /opt/homebrew/bin, Application bundle bin)
        let mac_candidates = [
            format!("/usr/local/bin/{}", binary_name),
            format!("/opt/homebrew/bin/{}", binary_name),
            if ed == "cursor" {
                "/Applications/Cursor.app/Contents/Resources/app/bin/cursor".to_string()
            } else {
                "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code".to_string()
            },
        ];
        for candidate in &mac_candidates {
            if std::path::Path::new(candidate).exists() {
                if let Ok(mut child) = std::process::Command::new(candidate).arg("-g").arg(&goto_arg).spawn() {
                    if child.wait().map(|s| s.success()).unwrap_or(false) {
                        return Ok(());
                    }
                }
            }
        }

        // --- TIER 2: macOS URL Scheme (`open vscode://file/...`) ---
        let uri = format!("{}://file/{}:{}", scheme, file_path, line);
        if let Ok(mut child) = std::process::Command::new("open").arg(&uri).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 3: macOS Default App Fallback (`open <file_path>`) ---
        let _ = std::process::Command::new("open").arg(&file_path).spawn();
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let goto_arg = format!("{}:{}", file_path, line);

        // 1a. Try CLI binary in PATH
        if let Ok(mut child) = std::process::Command::new(binary_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // 1b. Check common Linux paths (/usr/bin, /usr/local/bin, /snap/bin)
        let linux_candidates = [
            format!("/usr/bin/{}", binary_name),
            format!("/usr/local/bin/{}", binary_name),
            format!("/snap/bin/{}", binary_name),
        ];
        for candidate in &linux_candidates {
            if std::path::Path::new(candidate).exists() {
                if let Ok(mut child) = std::process::Command::new(candidate).arg("-g").arg(&goto_arg).spawn() {
                    if child.wait().map(|s| s.success()).unwrap_or(false) {
                        return Ok(());
                    }
                }
            }
        }

        // --- TIER 2: Linux XDG URL Scheme (`xdg-open vscode://file/...`) ---
        let uri = format!("{}://file/{}:{}", scheme, file_path, line);
        if let Ok(mut child) = std::process::Command::new("xdg-open").arg(&uri).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 3: Linux XDG Default App Fallback (`xdg-open <file_path>`) ---
        let _ = std::process::Command::new("xdg-open").arg(&file_path).spawn();
        return Ok(());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok(())
    }
}

use tauri_plugin_dialog::DialogExt;

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
        std::fs::write(&path_str, json_content).map_err(|e| e.to_string())?;
        return Ok(Some(path_str));
    }

    Ok(None)
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub distro: String,
    pub arch: String,
    pub bitness: String,
    pub formatted: String,
    pub hostname: String,
    pub local_ip: String,
    pub webview_version: String,
    pub pid: u32,
}

pub fn get_hostname_sync() -> String {
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        return name;
    }
    if let Ok(name) = std::env::var("HOSTNAME") {
        return name;
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(name) = std::fs::read_to_string("/etc/hostname") {
            let trimmed = name.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
        if let Ok(output) = std::process::Command::new("hostname").output() {
            let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !name.is_empty() {
                return name;
            }
        }
    }
    "localhost".to_string()
}

pub fn get_local_ip_sync() -> String {
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(local_addr) = socket.local_addr() {
                return local_addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

pub fn get_system_info_sync() -> SystemInfo {
    let info = os_info::get();
    let os_type = info.os_type();
    let os_type_str = os_type.to_string();
    let os_name = match os_type {
        os_info::Type::Windows => "Windows".to_string(),
        os_info::Type::Macos => "macOS".to_string(),
        os_info::Type::Linux => "Linux".to_string(),
        _ => os_type_str.clone(),
    };
    let os_version = info.version().to_string();
    let edition = info.edition().unwrap_or("").trim();

    // Prevent duplicate OS prefix (e.g. "Windows Windows 11 Professional")
    let distro = if !edition.is_empty() {
        if edition.to_lowercase().starts_with(&os_type_str.to_lowercase()) {
            edition.to_string()
        } else {
            format!("{} {}", os_type_str, edition)
        }
    } else {
        os_type_str.clone()
    };

    let arch = info.architecture().unwrap_or(std::env::consts::ARCH).to_string();
    let bitness = info.bitness().to_string();

    let formatted = if !edition.is_empty() {
        if edition.to_lowercase().starts_with(&os_type_str.to_lowercase()) {
            format!("{} {} ({}, {})", edition, os_version, bitness, arch)
        } else {
            format!("{} {} {} ({}, {})", os_type_str, edition, os_version, bitness, arch)
        }
    } else {
        format!("{} {} ({}, {})", os_type_str, os_version, bitness, arch)
    };

    let hostname = get_hostname_sync();
    let local_ip = get_local_ip_sync();
    let webview_version = tauri::webview_version().unwrap_or_else(|_| "Unknown".to_string());
    let pid = std::process::id();

    SystemInfo {
        os_name,
        os_version,
        distro,
        arch,
        bitness,
        formatted,
        hostname,
        local_ip,
        webview_version,
        pid,
    }
}

fn get_current_iso_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let millis = duration.subsec_millis();

    let days = secs / 86400;
    let rem_secs = secs % 86400;
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;
    let s = rem_secs % 60;

    let z = days as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };

    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z", year, m, d, hours, mins, s, millis)
}

static SESSION_BOOT_TIME: std::sync::OnceLock<String> = std::sync::OnceLock::new();

pub fn get_session_boot_time() -> &'static str {
    SESSION_BOOT_TIME.get_or_init(get_current_iso_timestamp)
}

pub fn build_system_banner(last_cleared: Option<&str>) -> String {
    let sys = get_system_info_sync();
    let boot_time = get_session_boot_time();
    let cleared_str = last_cleared.unwrap_or("Never (Active Session)");

    format!(
r#"
╔══════════════════════════════════════════════════════════════════════════════╗
║                     PROXYNC STUDIO ENGINE DIAGNOSTICS                        ║
║                     ─────────────────────────────────                        ║
║  SYSTEM ENVIRONMENT & HARDWARE FINGERPRINT                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Host Platform:    {:<58}║
║  Kernel / Build:   {:<58}║
║  Architecture:     {:<58}║
║  Local Hostname:   {:<58}║
║  Local Network IP: {:<58}║
║  Process ID (PID): {:<58}║
║  WebView Engine:   {:<58}║
║  Application Ver:  {:<58}║
║  Diagnostic Mode:  {:<58}║
║  Session Boot:     {:<58}║
║  Last Cleared:     {:<58}║
╚══════════════════════════════════════════════════════════════════════════════╝"#,
        format!("{} [{}]", sys.distro, sys.bitness),
        sys.os_version,
        sys.arch,
        sys.hostname,
        sys.local_ip,
        sys.pid.to_string(),
        sys.webview_version,
        "Proxync v0.2.2 (Engine: Tauri v2.11 Core)",
        "Standard (app.log active, traffic.log on-demand)",
        boot_time,
        cleared_str
    )
}

pub fn log_panic_sync(payload: &str) {
    use std::io::Write;
    let logs_dir = get_logs_dir();
    let app_log_path = logs_dir.join("app.log");
    let now = get_current_iso_timestamp();
    if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(&app_log_path) {
        let _ = writeln!(
            file,
            "\n[FATAL_CRASH_DUMP] [{}] [SYSTEM] Process panic occurred:\n{}\n",
            now, payload
        );
    }
}

pub fn install_panic_hook() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        log_panic_sync(&format!("{}", info));
        default_hook(info);
    }));
}

pub fn init_app_log_header() {
    use std::io::Write;
    let logs_dir = get_logs_dir();
    let app_log_path = logs_dir.join("app.log");
    
    // Ensure boot time is registered
    let _ = get_session_boot_time();
    let banner = build_system_banner(None);

    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&app_log_path)
    {
        let _ = writeln!(file, "{}", banner.trim_start());
    }
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    Ok(get_system_info_sync())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_system_info() {
        let res = get_system_info().await;
        assert!(res.is_ok(), "Failed to retrieve system info");
        let info = res.unwrap();
        assert!(!info.os_name.is_empty(), "OS name must not be empty");
        assert!(!info.arch.is_empty(), "Architecture must not be empty");
        assert!(!info.formatted.is_empty(), "Formatted string must not be empty");
        assert!(!info.hostname.is_empty(), "Hostname must not be empty");
        assert!(!info.local_ip.is_empty(), "Local IP must not be empty");
        assert!(!info.webview_version.is_empty(), "WebView version must not be empty");
        assert!(info.pid > 0, "PID must be greater than 0");
        assert!(
            !info.distro.contains("Windows Windows"),
            "Distro must not have duplicate 'Windows Windows' prefix: {}",
            info.distro
        );
        assert!(
            !info.formatted.contains("Windows Windows"),
            "Formatted string must not have duplicate 'Windows Windows' prefix: {}",
            info.formatted
        );
    }

    #[tokio::test]
    async fn test_clear_log_files_populates_system_banner() {
        let res = clear_log_files().await;
        assert!(res.is_ok(), "clear_log_files must succeed");

        let logs_dir = get_logs_dir();
        let app_log = logs_dir.join("app.log");
        let content = std::fs::read_to_string(&app_log).expect("Failed to read app.log");
        assert!(content.contains("SYSTEM ENVIRONMENT & HARDWARE FINGERPRINT"), "app.log must contain system header");
        assert!(content.contains("Last Cleared:"), "app.log must contain Last Cleared field");
        assert!(content.contains("Process ID (PID):"), "app.log must contain PID field");
        assert!(content.contains("WebView Engine:"), "app.log must contain WebView Engine field");
        assert!(content.contains("Log history cleared by user request"), "app.log must contain log clear event line");
    }

    #[test]
    fn test_log_rotation_logic() {
        let temp_dir = std::env::temp_dir().join(format!("proxync_test_rot_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let test_log = temp_dir.join("app.log");
        let old_log = temp_dir.join("app.log.old");

        // Write content exceeding 20 bytes
        let _ = std::fs::write(&test_log, "01234567890123456789extra");
        check_and_rotate_log(&test_log, 20, true);

        assert!(old_log.exists(), "Old log file must exist after rotation");
        let old_content = std::fs::read_to_string(&old_log).unwrap();
        assert!(old_content.contains("0123456789"), "Old log content preserved");

        let new_content = std::fs::read_to_string(&test_log).unwrap();
        assert!(new_content.contains("Log rotated: previous log exceeded"), "New log must have rotation notice");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}


