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

#[tauri::command]
pub async fn append_log_entry(category: String, line: String) -> Result<(), String> {
    use std::io::Write;
    let logs_dir = get_logs_dir();
    let filename = match category.as_str() {
        "traffic" => "traffic.log",
        _ => "app.log",
    };
    let file_path = logs_dir.join(filename);
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
    let _ = std::fs::write(&app_log, "");
    let _ = std::fs::write(&traffic_log, "");
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


